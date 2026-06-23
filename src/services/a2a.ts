/**
 * A2A クライアント (delegate_task 用) への外部 I/O。
 *
 * neko8-coding-agent (層2) に「ゴール」を委譲する薄いクライアント。
 * @a2a-js/sdk には依存せず、A2A の最小フロー
 *   ① Agent Card 発見 (GET /.well-known/agent-card.json)
 *   ② message/send (POST <card.url>)  ← JSON-RPC 2.0
 *   ③ 返ってきた Task から artifact テキストを抽出
 * を raw fetch で実装する (wrapper を軽量に保つため)。
 *
 * 判断の主体は neko8 側。Claude はゴールを渡して結果を受け取るだけ。
 */

import { A2A_AGENT_URL, A2A_TIMEOUT_MS } from "../config.js";
import type { DelegateTaskResult } from "../types/index.js";
import { logger } from "../utils/logger.js";

interface TextPart {
  kind: "text";
  text: string;
}
interface A2APart {
  kind: string;
  text?: string;
}
interface A2AArtifact {
  parts?: A2APart[];
}
interface A2ATask {
  kind: "task";
  id: string;
  status: { state: string; message?: { parts?: A2APart[] } };
  artifacts?: A2AArtifact[];
  metadata?: Record<string, unknown>;
}
interface JsonRpcResponse {
  result?: A2ATask | { kind: string; parts?: A2APart[] };
  error?: { code: number; message: string };
}

function isTextPart(p: A2APart): p is TextPart {
  return p.kind === "text" && typeof p.text === "string";
}

function partsToText(parts: A2APart[] | undefined): string {
  return (parts ?? [])
    .filter(isTextPart)
    .map((p) => p.text)
    .join("\n");
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Agent Card を発見し JSON-RPC エンドポイント URL を返す */
async function discoverRpcUrl(base: string): Promise<string> {
  const cardUrl = `${base}/.well-known/agent-card.json`;
  const res = await fetchWithTimeout(cardUrl, {}, 15_000);
  if (!res.ok) {
    throw new Error(`A2A agent card not found: GET ${cardUrl} → ${res.status} ${res.statusText}`);
  }
  const card = (await res.json()) as { url?: string };
  if (!card.url) {
    throw new Error(`A2A agent card has no "url" field: ${cardUrl}`);
  }
  return card.url;
}

/**
 * neko8-coding-agent にゴールを委譲する。
 * @param goal  自然言語のゴール (例: "この関数を async/await にリファクタして")
 * @param agentUrl  ベース URL。省略時は A2A_AGENT_URL
 */
export async function delegateTask(goal: string, agentUrl?: string): Promise<DelegateTaskResult> {
  const base = (agentUrl ?? A2A_AGENT_URL).replace(/\/+$/, "");
  const rpcUrl = await discoverRpcUrl(base);

  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "message/send",
    params: {
      message: {
        kind: "message",
        messageId: crypto.randomUUID(),
        role: "user",
        parts: [{ kind: "text", text: goal }],
      },
    },
  });

  const res = await fetchWithTimeout(
    rpcUrl,
    { method: "POST", headers: { "Content-Type": "application/json" }, body },
    A2A_TIMEOUT_MS,
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`A2A message/send failed: POST ${rpcUrl} → ${res.status} ${res.statusText} ${text}`.trim());
  }

  const json = (await res.json()) as JsonRpcResponse;
  if (json.error) {
    throw new Error(`A2A error ${json.error.code}: ${json.error.message}`);
  }
  const result = json.result;
  if (!result) {
    throw new Error("A2A response has no result");
  }

  // result が直接 Message のこともある (Task を作らない agent)
  if (result.kind !== "task") {
    const text = partsToText((result as { parts?: A2APart[] }).parts);
    logger.info("delegateTask", `direct message, chars=${text.length}`);
    return { state: "completed", text, agentUrl: base };
  }

  const task = result as A2ATask;
  const text = task.artifacts?.length
    ? task.artifacts.map((a) => partsToText(a.parts)).join("\n\n")
    : partsToText(task.status.message?.parts);

  logger.info("delegateTask", `task=${task.id} state=${task.status.state} chars=${text.length}`);
  return {
    state: task.status.state,
    text,
    taskId: task.id,
    agentUrl: base,
    ...(task.metadata ? { metadata: task.metadata } : {}),
  };
}
