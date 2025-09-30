import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Logger } from 'pino';
import type { MonicaClient } from '../client/MonicaClient.js';

export interface ToolRegistrationContext {
  server: McpServer;
  client: MonicaClient;
  logger: Logger;
}
