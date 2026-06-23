#!/usr/bin/env node

/**
 * localllm-mcp
 * neko8 のローカル LLM (LiteLLM / Ollama, OpenAI 互換) を
 * Claude に構造化ツール (chat / list_models) として公開する MCP サーバ。
 *
 * 設計の背景:
 *   localllm-construction-practice/agent-bridge/mcp-wrapper.md
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { BASE_URL, VERSION } from "./config.js";
import { SERVER_NAME } from "./constants.js";
import { tools } from "./tools/definitions.js";
import { toolHandlers } from "./tools/handlers.js";
import { logger } from "./utils/logger.js";

const server = new Server({ name: SERVER_NAME, version: VERSION }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const handler = toolHandlers[name];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    const result = await handler(args ?? {});
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`tool:${name}`, "failed", err instanceof Error ? err : undefined);
    return {
      content: [{ type: "text", text: JSON.stringify({ error: message }, null, 2) }],
      isError: true,
    };
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info(SERVER_NAME, `running on stdio (base=${BASE_URL})`);
}

main().catch((err) => {
  logger.error(SERVER_NAME, "failed to start", err instanceof Error ? err : undefined);
  process.exit(1);
});
