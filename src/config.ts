/**
 * 設定（環境変数からの取得・バージョン動的取得）
 * ハードコード禁止のため接続先・タイムアウトはすべてここに集約する。
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

/** package.json から動的取得したバージョン */
export const VERSION = pkg.version;

/** LiteLLM / Ollama の OpenAI 互換ベースURL（末尾の /v1 は含めない） */
export const BASE_URL = (process.env.LOCALLLM_BASE ?? "http://neko8.local:4000").replace(
  /\/+$/,
  "",
);

/** API キー（LiteLLM に master key を設定している場合のみ）。未設定可 */
export const API_KEY = process.env.LOCALLLM_API_KEY ?? "";

/** リクエストタイムアウト(ms)。省略時 120000 */
export const REQUEST_TIMEOUT_MS = Number(process.env.LOCALLLM_TIMEOUT_MS ?? 120_000);

/**
 * A2A エージェント (neko8-coding-agent) のベース URL（末尾スラッシュ除去）。
 * delegate_task はここから Agent Card を発見し JSON-RPC エンドポイントを解決する。
 */
export const A2A_AGENT_URL = (process.env.LOCALLLM_A2A_URL ?? "http://neko8.local:41241").replace(
  /\/+$/,
  "",
);

/** delegate_task のタイムアウト(ms)。自律ループは長くなりうるため既定を厚めに取る */
export const A2A_TIMEOUT_MS = Number(process.env.LOCALLLM_A2A_TIMEOUT_MS ?? 300_000);
