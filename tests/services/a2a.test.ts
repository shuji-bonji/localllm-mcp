import { afterEach, describe, expect, it, vi } from "vitest";
import { delegateTask } from "../../src/services/a2a.js";

/** card 発見 → message/send の2回の fetch を順に返すモック */
function mockA2A(cardUrl: string, rpcResult: unknown) {
  const card = { ok: true, status: 200, statusText: "OK", json: async () => ({ url: cardUrl }) };
  const rpc = {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({ jsonrpc: "2.0", id: 1, result: rpcResult }),
    text: async () => "",
  };
  return vi
    .fn()
    .mockResolvedValueOnce(card as unknown as Response)
    .mockResolvedValueOnce(rpc as unknown as Response);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("delegateTask", () => {
  it("discovers the card url then extracts artifact text from the Task", async () => {
    vi.stubGlobal(
      "fetch",
      mockA2A("http://neko8.local:41241/a2a/jsonrpc", {
        kind: "task",
        id: "t1",
        status: { state: "completed" },
        artifacts: [{ parts: [{ kind: "text", text: "answer body" }] }],
        metadata: { rounds: 0, tools: [] },
      }),
    );
    const r = await delegateTask("refactor this");
    expect(r.state).toBe("completed");
    expect(r.text).toBe("answer body");
    expect(r.taskId).toBe("t1");
    expect(r.metadata).toEqual({ rounds: 0, tools: [] });
  });

  it("handles a direct message result (no Task)", async () => {
    vi.stubGlobal(
      "fetch",
      mockA2A("http://x/rpc", {
        kind: "message",
        parts: [{ kind: "text", text: "hi" }],
      }),
    );
    const r = await delegateTask("say hi", "http://x");
    expect(r.state).toBe("completed");
    expect(r.text).toBe("hi");
  });

  it("throws when the agent card is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as unknown as Response),
    );
    await expect(delegateTask("x")).rejects.toThrow(/agent card not found/);
  });

  it("throws on a JSON-RPC error", async () => {
    const card = { ok: true, status: 200, statusText: "OK", json: async () => ({ url: "http://x/rpc" }) };
    const rpc = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ jsonrpc: "2.0", id: 1, error: { code: -32000, message: "boom" } }),
      text: async () => "",
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(card as unknown as Response)
        .mockResolvedValueOnce(rpc as unknown as Response),
    );
    await expect(delegateTask("x", "http://x")).rejects.toThrow(/A2A error -32000: boom/);
  });
});
