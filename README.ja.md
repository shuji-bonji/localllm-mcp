# @shuji-bonji/localllm-mcp

neko8 のローカル LLM（LiteLLM / Ollama, OpenAI 互換）を、Claude に**構造化ツール**として公開する MCP サーバ。Claude がオーケストレータとして `chat` / `list_models` を呼び、ローカル LLM に補完を委譲できる。

> 設計の背景: [localllm-construction-practice / agent-bridge/mcp-wrapper.md](https://github.com/shuji-bonji/localllm-construction-practice/blob/main/agent-bridge/mcp-wrapper.md)

## 提供ツール

| ツール | 役割 | 内部呼び出し |
| --- | --- | --- |
| `list_models` | 利用可能なモデルエイリアス一覧 | `GET :4000/v1/models` |
| `chat` | 補完を取得（`prompt` か `messages`、`system`・`temperature` 任意） | `POST :4000/v1/chat/completions` |

`model` 省略時は `gemma-smart`。エイリアスは LiteLLM 側の定義に従う。

## セットアップ

```sh
npm install
npm run build
```

## 環境変数

| 変数 | 既定 | 説明 |
| --- | --- | --- |
| `LOCALLLM_BASE` | `http://neko8.local:4000` | OpenAI 互換ベースURL（末尾 `/v1` は付けない） |
| `LOCALLLM_API_KEY` | （空） | LiteLLM に master key を設定している場合のみ |
| `LOCALLLM_TIMEOUT_MS` | `120000` | リクエストタイムアウト |

## Claude への登録

`.mcp.json`（Claude Code）または `claude_desktop_config.json` に追加:

```json
{
  "mcpServers": {
    "localllm": {
      "command": "node",
      "args": ["/absolute/path/to/localllm-mcp/build/index.js"],
      "env": { "LOCALLLM_BASE": "http://neko8.local:4000" }
    }
  }
}
```

## 開発

```sh
npm run dev          # tsx watch
DEBUG=1 npm start    # デバッグログ（stderr）
npm run check        # biome（lint + format）
npm test             # vitest
```

## 動作確認（neko8 が必要）

```sh
# ビルド後、stdio で起動できることの簡易確認
LOCALLLM_BASE=http://neko8.local:4000 node build/index.js
# → stderr に "[localllm-mcp] running on stdio (base=...)" が出れば起動成功
```

## ライセンス

MIT
