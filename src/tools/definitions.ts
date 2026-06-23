/**
 * MCP Tool 定義（入力スキーマ）
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const tools: Tool[] = [
  {
    name: "list_models",
    description:
      "neko8 の LiteLLM (:4000) で利用可能なモデルエイリアス一覧を返す。内部で GET /v1/models を呼ぶ。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "chat",
    description:
      "ローカル LLM (neko8) に補完を依頼する。messages か prompt のどちらかを渡す。model 省略時は gemma-smart。",
    inputSchema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          description: "LiteLLM エイリアス（例: gemma-fast / gemma-smart）。省略時 gemma-smart",
        },
        system: {
          type: "string",
          description: "system プロンプト（任意）",
        },
        prompt: {
          type: "string",
          description: "単発プロンプト。messages を使わない簡易用途向け",
        },
        messages: {
          type: "array",
          description: "OpenAI 形式の会話履歴。指定時は prompt より優先",
          items: {
            type: "object",
            properties: {
              role: { type: "string", enum: ["system", "user", "assistant", "tool"] },
              content: { type: "string" },
            },
            required: ["role", "content"],
            additionalProperties: false,
          },
        },
        temperature: {
          type: "number",
          description: "サンプリング温度（任意）",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "delegate_task",
    description:
      "neko8 の自律コーディングエージェント (A2A) にゴールを委譲する。chat と違い、手順の決定 (ツール選択・ラウンド数) は neko8 側が握る。単発補完で足りるなら chat を、自分で調べて多段で進めてほしいゴールなら delegate_task を使う。",
    inputSchema: {
      type: "object",
      properties: {
        goal: {
          type: "string",
          description: "委譲する自然言語のゴール（例: この関数を async/await にリファクタして）",
        },
        agentUrl: {
          type: "string",
          description: "A2A エージェントのベース URL（省略時 http://neko8.local:41241）",
        },
      },
      required: ["goal"],
      additionalProperties: false,
    },
  },
];
