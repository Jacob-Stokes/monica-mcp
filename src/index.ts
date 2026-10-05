#!/usr/bin/env node
// monica-mcp: Monica (the personal CRM, version 4) over MCP. Runs over stdio
// by default, for desktop clients; MCP_TRANSPORT=http serves Streamable HTTP.
// Logs go to stderr: stdout belongs to the MCP protocol over stdio.

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { startHttp } from "./http.js";
import { MonicaClient } from "./monica.js";
import { Resolver } from "./resolve.js";
import { createServer, VERSION } from "./server.js";

let cfg;
try {
  cfg = loadConfig();
} catch (e: any) {
  console.error(e.message);
  process.exit(1);
}

const monica = new MonicaClient(cfg);
const ctx = { monica, resolve: new Resolver(monica), localFiles: cfg.MCP_TRANSPORT === "stdio" };

// Not fatal: Monica may come up after this server, and every tool explains
// a connection failure itself.
monica
  .req("GET", "/me")
  .then((me) => console.error(`monica-mcp ${VERSION}: connected to ${cfg.MONICA_BASE_URL} as ${me.data?.email ?? "?"}`))
  .catch((e) => console.error(`monica-mcp ${VERSION}: can't reach Monica yet: ${e.message}`));

if (cfg.MCP_TRANSPORT === "http") {
  startHttp(cfg, () => createServer(ctx));
} else {
  await createServer(ctx).connect(new StdioServerTransport());
}
