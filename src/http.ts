// Streamable HTTP at /mcp, for running as a service (a home server, behind
// an MCP gateway or a tunnel). Every request needs either the static bearer
// token or, when OAuth is configured, a valid JWT from the issuer.
//
//   POST/GET/DELETE /mcp                      MCP (one session per client)
//   GET /health                               liveness, no auth
//   GET /.well-known/oauth-protected-resource  RFC 9728 metadata (OAuth only)

import { randomUUID, timingSafeEqual } from "node:crypto";
import { createServer as createHttp, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { Config } from "./config.js";

const sameToken = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function startHttp(cfg: Config, makeServer: () => Server) {
  const oauth = cfg.MCP_OAUTH_ISSUER
    ? {
        issuer: cfg.MCP_OAUTH_ISSUER,
        audience: cfg.MCP_OAUTH_AUDIENCE ?? cfg.MCP_OAUTH_CANONICAL_URL,
        resource: cfg.MCP_OAUTH_CANONICAL_URL,
        jwks: createRemoteJWKSet(new URL(cfg.MCP_OAUTH_JWKS_URI ?? new URL("jwks/", cfg.MCP_OAUTH_ISSUER.replace(/\/?$/, "/")).toString())),
      }
    : null;
  const metadataPath = "/.well-known/oauth-protected-resource";
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  async function authorized(req: IncomingMessage): Promise<boolean> {
    const h = req.headers.authorization ?? "";
    if (!h.toLowerCase().startsWith("bearer ")) return false;
    const token = h.slice(7).trim();
    if (cfg.MCP_BEARER_TOKEN && sameToken(token, cfg.MCP_BEARER_TOKEN)) return true;
    if (oauth) {
      try {
        await jwtVerify(token, oauth.jwks, { issuer: oauth.issuer, ...(oauth.audience ? { audience: oauth.audience } : {}) });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  const json = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
    res.writeHead(status, { "Content-Type": "application/json", ...headers });
    res.end(JSON.stringify(body));
  };

  const http = createHttp(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname === "/health") return json(res, 200, { ok: true, service: "monica-mcp" });
    if (oauth && url.pathname === metadataPath) {
      return json(res, 200, { resource: oauth.resource, authorization_servers: [oauth.issuer], bearer_methods_supported: ["header"] });
    }
    if (url.pathname !== "/mcp") return json(res, 404, { error: "not found" });
    if (!(await authorized(req))) {
      const challenge = oauth?.resource ? `Bearer resource_metadata="${oauth.resource}${metadataPath}"` : "Bearer";
      return json(res, 401, { error: "unauthorized" }, { "WWW-Authenticate": challenge });
    }
    const id = req.headers["mcp-session-id"];
    const sid = Array.isArray(id) ? id[0] : id;
    if (sid) {
      const t = sessions.get(sid);
      // an unknown session (e.g. from before a restart): 404 tells the
      // client to start a new one
      if (!t) return json(res, 404, { jsonrpc: "2.0", error: { code: -32001, message: "Session not found" }, id: null });
      return t.handleRequest(req, res);
    }
    if (req.method !== "POST") return json(res, 400, { error: "start a session with POST /mcp" });
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID(), onsessioninitialized: (s): void => { sessions.set(s, transport); } });
    transport.onclose = () => transport.sessionId && sessions.delete(transport.sessionId);
    await makeServer().connect(transport);
    return transport.handleRequest(req, res);
  });

  http.listen(cfg.PORT, () => console.error(`monica-mcp listening on :${cfg.PORT} (Streamable HTTP at /mcp${oauth ? ", OAuth on" : ""})`));
  return http;
}
