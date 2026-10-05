// The HTTP transport, with a stand-in for Monica: auth, health, sessions.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const listen = (srv) => new Promise((r) => srv.listen(0, "127.0.0.1", () => r(srv.address().port)));
async function freePort() {
  const s = createServer();
  const port = await listen(s);
  await new Promise((r) => s.close(r));
  return port;
}

test("HTTP: health is open, /mcp needs the bearer token, unknown sessions get 404, tools work", async (t) => {
  const monica = createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.headers.authorization !== "Bearer monica-token") return res.writeHead(401).end("{}");
    if (req.url.startsWith("/api/me")) return res.end(JSON.stringify({ data: { email: "me@example.com", first_name: "Me" } }));
    if (req.url.startsWith("/api/contacts")) return res.end(JSON.stringify({ data: [], meta: { current_page: 1, last_page: 1, per_page: 1, total: 7 } }));
    res.writeHead(404).end(JSON.stringify({ message: "not found" }));
  });
  const monicaPort = await listen(monica);
  const port = await freePort();
  const server = spawn(process.execPath, ["dist/index.js"], {
    env: { PATH: process.env.PATH, MONICA_BASE_URL: `http://127.0.0.1:${monicaPort}`, MONICA_API_TOKEN: "monica-token", MCP_TRANSPORT: "http", PORT: String(port), MCP_BEARER_TOKEN: "mcp-token" },
    stdio: ["ignore", "ignore", "pipe"],
  });
  t.after(() => { server.kill(); monica.closeAllConnections(); monica.close(); });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${base}/health`)).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }

  assert.equal((await fetch(`${base}/health`)).status, 200);
  assert.equal((await fetch(`${base}/mcp`, { method: "POST" })).status, 401);
  assert.equal((await fetch(`${base}/mcp`, { method: "POST", headers: { Authorization: "Bearer wrong" } })).status, 401);
  const stale = await fetch(`${base}/mcp`, { method: "POST", headers: { Authorization: "Bearer mcp-token", "mcp-session-id": "gone", "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: "{}" });
  assert.equal(stale.status, 404);

  const client = new Client({ name: "test", version: "1" }, { capabilities: {} });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { Authorization: "Bearer mcp-token" } } }));
  assert.equal((await client.listTools()).tools.length, 14);
  const status = await client.callTool({ name: "monica_status", arguments: {} });
  assert.deepEqual(JSON.parse(status.content[0].text), { connected: true, user: "Me", email: "me@example.com", timezone: null, currency: null, contacts: 7 });
  const bad = await client.callTool({ name: "monica_notes", arguments: { action: "delete", id: 3 } });
  assert.equal(bad.isError, true);
  assert.match(bad.content[0].text, /confirm/);
  await client.close();
});
