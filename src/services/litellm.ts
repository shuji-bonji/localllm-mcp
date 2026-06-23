/**
 * LiteLLM (OpenAI 互換) への外部 I/O。
 * neko8.local:4000 の /v1/* を叩く薄いクライアント。
 */

import { API_KEY, BASE_URL, REQUEST_TIMEOUT_MS } from "../config.js";
import type { ChatMessage, ChatResult } from "../types/index.js";
import { logger } from "../utils/logger.js";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }
  return headers;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${BASE_URL}${path}`, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** GET /v1/models — 利用可能なモデルエイリアス一覧 */
export async function listModels(): Promise<string[]> {
  const res = await request("/v1/models", { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GET /v1/models failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { data?: Array<{ id: string }> };
  const ids = (json.data ?? []).map((m) => m.id);
  logger.info("listModels", `${ids.length} model(s) from ${BASE_URL}`);
  return ids;
}

/** POST /v1/chat/completions — 補完を取得 */
export async function chatCompletion(
  model: string,
  messages: ChatMessage[],
  temperature?: number,
): Promise<ChatResult> {
  const body = JSON.stringify({
    model,
    messages,
    ...(temperature !== undefined ? { temperature } : {}),
  });
  const res = await request("/v1/chat/completions", {
    method: "POST",
    headers: authHeaders(),
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `POST /v1/chat/completions failed: ${res.status} ${res.statusText} ${text}`.trim(),
    );
  }
  const json = (await res.json()) as {
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
    usage?: unknown;
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  logger.info("chat", `model=${model} chars=${content.length}`);
  return { model: json.model ?? model, content, usage: json.usage };
}
