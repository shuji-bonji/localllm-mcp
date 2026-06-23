import { beforeEach, describe, expect, it, vi } from "vitest";
import { delegateTask } from "../../src/services/a2a.js";
import { chatCompletion, listModels } from "../../src/services/litellm.js";
import {
  handleChat,
  handleDelegateTask,
  handleListModels,
  toolHandlers,
} from "../../src/tools/handlers.js";

vi.mock("../../src/services/litellm.js", () => ({
  listModels: vi.fn(),
  chatCompletion: vi.fn(),
}));
vi.mock("../../src/services/a2a.js", () => ({
  delegateTask: vi.fn(),
}));

const mockedListModels = vi.mocked(listModels);
const mockedChat = vi.mocked(chatCompletion);
const mockedDelegate = vi.mocked(delegateTask);

beforeEach(() => {
  vi.clearAllMocks();
  mockedChat.mockResolvedValue({ model: "gemma-smart", content: "ok" });
  mockedDelegate.mockResolvedValue({
    state: "completed",
    text: "done",
    agentUrl: "http://neko8.local:41241",
  });
});

describe("toolHandlers registry", () => {
  it("registers list_models, chat and delegate_task", () => {
    expect(typeof toolHandlers.list_models).toBe("function");
    expect(typeof toolHandlers.chat).toBe("function");
    expect(typeof toolHandlers.delegate_task).toBe("function");
  });
});

describe("handleDelegateTask", () => {
  it("throws when goal is empty", async () => {
    await expect(handleDelegateTask({ goal: "  " })).rejects.toThrow();
    expect(mockedDelegate).not.toHaveBeenCalled();
  });

  it("forwards goal and agentUrl to delegateTask", async () => {
    await handleDelegateTask({ goal: "refactor", agentUrl: "http://x" });
    expect(mockedDelegate).toHaveBeenCalledWith("refactor", "http://x");
  });
});

describe("handleListModels", () => {
  it("wraps listModels result in { models }", async () => {
    mockedListModels.mockResolvedValue(["gemma-fast", "gemma-smart"]);
    await expect(handleListModels()).resolves.toEqual({ models: ["gemma-fast", "gemma-smart"] });
  });
});

describe("handleChat", () => {
  it("throws when neither prompt nor messages is given", async () => {
    await expect(handleChat({})).rejects.toThrow();
    expect(mockedChat).not.toHaveBeenCalled();
  });

  it("builds messages from prompt and defaults model to gemma-smart", async () => {
    await handleChat({ prompt: "hi" });
    expect(mockedChat).toHaveBeenCalledWith(
      "gemma-smart",
      [{ role: "user", content: "hi" }],
      undefined,
    );
  });

  it("prepends the system message", async () => {
    await handleChat({ prompt: "hi", system: "be terse" });
    expect(mockedChat).toHaveBeenCalledWith(
      "gemma-smart",
      [
        { role: "system", content: "be terse" },
        { role: "user", content: "hi" },
      ],
      undefined,
    );
  });

  it("prefers messages over prompt and forwards model + temperature", async () => {
    const messages = [{ role: "user" as const, content: "a" }];
    await handleChat({ model: "gemma-fast", messages, prompt: "ignored", temperature: 0.2 });
    expect(mockedChat).toHaveBeenCalledWith("gemma-fast", messages, 0.2);
  });
});
