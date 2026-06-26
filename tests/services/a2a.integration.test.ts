/**
 * delegate_task の「実 HTTP 疎通」統合テスト。
 *
 * fetch モック (a2a.test.ts) では確かめられない、Agent Card 発見 (GET) →
 * JSON-RPC message/send (POST) → Task/artifact 抽出までを、実際の node:http
 * サーバ相手に検証する。サーバ応答は @a2a-js/sdk の message/send 出力形
 * (kind:'task' + artifacts[].parts[] + metadata) に忠実に作る。
 *
 * neko8 非依存。クロスリポ依存 (@a2a-js/sdk) も持ち込まないため CI で軽い。
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { type AddressInfo } from "node:net";
import { delegateTask } from "../../src/services/a2a.js";

let server: Server;
let base: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    const port = (server.address() as AddressInfo).port;
    if (req.method === "GET" && req.url === "/.well-known/agent-card.json") {
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          name: "neko8-coding-agent",
          url: `http://127.0.0.1:${port}/a2a/jsonrpc`,
          skills: [{ id: "coding-task" }],
        }),
      );
      return;
    }
    if (req.method === "POST" && req.url === "/a2a/jsonrpc") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const rpc = JSON.parse(body) as {
          id: number;
          params?: { message?: { parts?: { kind: string; text?: string }[] } };
        };
        const goal =
          rpc.params?.message?.parts?.find((p) => p.kind === "text")?.text ?? "";
        const task = {
          kind: "task",
          id: "task-int-1",
          status: { state: "completed", timestamp: new Date().toISOString() },
          artifacts: [
            {
              artifactId: "coding-result",
              name: "answer.md",
              parts: [{ kind: "text", text: `OK: ${goal}` }],
            },
          ],
          metadata: { rounds: 2, tools: ["rxjs"] },
        };
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ jsonrpc: "2.0", id: rpc.id, result: task }));
      });
      return;
    }
    res.statusCode = 404;
    res.end("not found");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

describe("delegateTask (real HTTP)", () => {
  it("Card 発見 → message/send → artifact テキストを抽出する", async () => {
    const r = await delegateTask("この関数を async/await にリファクタして", base);
    expect(r.state).toBe("completed");
    expect(r.text).toBe("OK: この関数を async/await にリファクタして");
    expect(r.taskId).toBe("task-int-1");
    expect(r.metadata).toEqual({ rounds: 2, tools: ["rxjs"] });
    expect(r.agentUrl).toBe(base);
  });

  it("Card の 404 を agent card not found として投げる", async () => {
    await expect(delegateTask("x", `${base}/nonexistent-base`)).rejects.toThrow(
      /agent card not found/,
    );
  });
});
