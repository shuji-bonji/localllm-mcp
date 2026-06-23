# @shuji-bonji/localllm-mcp

An MCP server that exposes a local LLM (neko8 LiteLLM / Ollama, OpenAI-compatible) to Claude as **structured tools**. Claude acts as the orchestrator and delegates completions to the local LLM via `chat` / `list_models`.

> 日本語版: [README.ja.md](./README.ja.md)
> Design notes: [localllm-construction-practice / agent-bridge/mcp-wrapper.md](https://github.com/shuji-bonji/localllm-construction-practice/blob/main/agent-bridge/mcp-wrapper.md)

## Tools

| Tool | Purpose | Underlying call |
| --- | --- | --- |
| `list_models` | List available model aliases | `GET :4000/v1/models` |
| `chat` | Get a completion (`prompt` or `messages`; optional `system` / `temperature`) | `POST :4000/v1/chat/completions` |

`model` defaults to `gemma-smart`. Aliases follow the LiteLLM configuration.

## Setup

```sh
npm install
npm run build
```

## Environment

| Variable | Default | Description |
| --- | --- | --- |
| `LOCALLLM_BASE` | `http://neko8.local:4000` | OpenAI-compatible base URL (do not append `/v1`) |
| `LOCALLLM_API_KEY` | (empty) | Only if LiteLLM has a master key |
| `LOCALLLM_TIMEOUT_MS` | `120000` | Request timeout |

## Register with Claude

Add to `.mcp.json` (Claude Code) or `claude_desktop_config.json`:

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

## Development

```sh
npm run dev          # tsx watch
DEBUG=1 npm start    # debug logs (stderr)
npm run check        # biome (lint + format)
npm test             # vitest
```

## License

MIT
