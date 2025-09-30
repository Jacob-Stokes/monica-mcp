import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { appConfig } from './config.js';
import { logger } from './logger.js';
import { MonicaClient } from './client/MonicaClient.js';
import { registerTools } from './tools/registerTools.js';
import { registerResources } from './resources/registerResources.js';

async function main() {

  const server = new McpServer({
    name: 'monica-crm-mcp',
    version: '0.1.0'
  });

  const monicaClient = new MonicaClient({
    baseUrl: appConfig.baseUrl,
    token: appConfig.token,
    tokenType: appConfig.tokenType,
    userToken: appConfig.userToken,
    logger
  });

  registerTools({ server, client: monicaClient, logger });
  registerResources({ server, client: monicaClient, logger });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('Monica CRM MCP server connected. Awaiting requests...');

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down Monica MCP server.');
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down Monica MCP server.');
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error({ err: error }, 'Failed to start Monica MCP server');
  process.exit(1);
});
