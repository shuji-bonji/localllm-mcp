/**
 * 共有型
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface ChatArgs {
  /** LiteLLM エイリアス（省略時 DEFAULT_MODEL） */
  model?: string;
  /** system プロンプト（任意） */
  system?: string;
  /** 単発プロンプト（messages を使わない簡易用途向け） */
  prompt?: string;
  /** OpenAI 形式の会話履歴（prompt より優先） */
  messages?: ChatMessage[];
  /** サンプリング温度（任意） */
  temperature?: number;
}

export type ListModelsArgs = Record<string, never>;

export interface ChatResult {
  model: string;
  content: string;
  usage?: unknown;
}

export interface DelegateTaskArgs {
  /** neko8-coding-agent に委譲する自然言語のゴール */
  goal: string;
  /** A2A エージェントのベース URL（省略時 A2A_AGENT_URL） */
  agentUrl?: string;
}

export interface DelegateTaskResult {
  /** Task の最終状態 (completed / failed / canceled 等) */
  state: string;
  /** artifact から抽出した回答テキスト */
  text: string;
  /** A2A Task ID（生成された場合） */
  taskId?: string;
  /** 実際に問い合わせたエージェントのベース URL */
  agentUrl: string;
  /** 完了時に neko8 が返すメタ情報 (rounds / tools 等) */
  metadata?: Record<string, unknown>;
}
