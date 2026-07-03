/**
 * Tool ハンドラ群 + ディスパッチ用 Map
 *
 * 新しいツールを追加するときは:
 *   1. `handleXxx` 関数を実装
 *   2. 下の toolHandlers に 1 行追加
 * だけでよい。
 */

import { DEFAULT_MODEL } from "../constants.js";
import { delegateTask } from "../services/a2a.js";
import { chatCompletion, listModels } from "../services/litellm.js";
import type { ChatArgs, ChatMessage, DelegateTaskArgs } from "../types/index.js";

export async function handleListModels(): Promise<{ models: string[] }> {
  const models = await listModels();
  return { models };
}

export async function handleChat(args: ChatArgs): Promise<unknown> {
  const model = args.model ?? DEFAULT_MODEL;

  let messages: ChatMessage[];
  if (Array.isArray(args.messages) && args.messages.length > 0) {
    messages = args.messages;
  } else if (typeof args.prompt === "string" && args.prompt.length > 0) {
    messages = [{ role: "user", content: args.prompt }];
  } else {
    throw new Error("chat: `messages`（非空配列）か `prompt`（非空文字列）のどちらかが必要です");
  }

  if (args.system) {
    messages = [{ role: "system", content: args.system }, ...messages];
  }

  return chatCompletion(model, messages, args.temperature);
}

export async function handleDelegateTask(args: DelegateTaskArgs): Promise<unknown> {
  if (typeof args.goal !== "string" || args.goal.trim().length === 0) {
    throw new Error("delegate_task: `goal`（非空文字列）が必要です");
  }
  if (args.skill !== undefined && (typeof args.skill !== "string" || args.skill.trim() === "")) {
    throw new Error("delegate_task: `skill` は非空文字列で指定してください");
  }
  return delegateTask(args.goal, args.agentUrl, args.skill);
}

/**
 * Tool ハンドラの Map
 * 引数型は各ハンドラ側で検査するため any を許容（境界でのみ許容）。
 */
// biome-ignore lint/suspicious/noExplicitAny: MCP ハンドラ境界での any は許容
export const toolHandlers: Record<string, (args: any) => Promise<unknown>> = {
  list_models: handleListModels,
  chat: handleChat,
  delegate_task: handleDelegateTask,
};
