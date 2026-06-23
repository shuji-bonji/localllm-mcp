import { afterEach, describe, expect, it, vi } from "vitest";
import { chatCompletion, listModels } from "../../src/services/litellm.js";

function mockFetch(payload: unknown, ok = true, status = 200) {
  const res = {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response;
  return vi.fn().mockResolvedValue(res);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listModels", () => {
  it("maps /v1/models data[].id to a string array", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: [{ id: "gemma-fast" }, { id: "gemma-smart" }] }));
    await expect(listModels()).resolves.toEqual(["gemma-fast", "gemma-smart"]);
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({}, false, 500));
    await expect(listModels()).rejects.toThrow(/v1\/models failed/);
  });
});

describe("chatCompletion", () => {
  it("returns content and model from the first choice", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        model: "gemma-smart",
        choices: [{ message: { content: "hello" } }],
        usage: { total_tokens: 3 },
      }),
    );
    await expect(chatCompletion("gemma-smart", [{ role: "user", content: "hi" }])).resolves.toEqual(
      { model: "gemma-smart", content: "hello", usage: { total_tokens: 3 } },
    );
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({}, false, 502));
    await expect(chatCompletion("gemma-smart", [{ role: "user", content: "hi" }])).rejects.toThrow(
      /chat\/completions failed/,
    );
  });
});
