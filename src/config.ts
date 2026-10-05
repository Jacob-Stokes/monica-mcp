// Settings, from the environment (and a .env file next to the working
// directory, if there is one). The Monica names are the same as in 1.x, so
// existing client configurations keep working.

import { existsSync } from "node:fs";
import { z } from "zod";

if (existsSync(".env") && !process.env.MONICA_API_TOKEN) {
  try {
    process.loadEnvFile(".env");
  } catch {
    // unreadable .env: the checks below say what's missing
  }
}

const Env = z.object({
  MONICA_BASE_URL: z.string().url().default("https://app.monicahq.com"),
  MONICA_API_TOKEN: z
    .string({ required_error: "required: a Monica API token (in Monica: Settings → API → Personal access token)" })
    .min(1, "required: a Monica API token (in Monica: Settings → API → Personal access token)"),
  // bearer (default), apiKey (X-Api-Key) or legacy (X-Auth-Token + X-User-Token)
  MONICA_TOKEN_TYPE: z.enum(["bearer", "apiKey", "legacy"]).default("bearer"),
  MONICA_USER_TOKEN: z.string().optional(),
  // stdio (default, for desktop clients) or http (Streamable HTTP at /mcp)
  MCP_TRANSPORT: z.enum(["stdio", "http"]).default("stdio"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  MCP_BEARER_TOKEN: z.string().optional(),
  MCP_OAUTH_ISSUER: z.string().url().optional(),
  MCP_OAUTH_CANONICAL_URL: z.string().url().optional(),
  MCP_OAUTH_AUDIENCE: z.string().optional(),
  MCP_OAUTH_JWKS_URI: z.string().url().optional(),
  MONICA_TIMEOUT_MS: z.coerce.number().int().min(1000).default(15000),
});

export type Config = z.infer<typeof Env>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const blank = (v: string | undefined) => (v === "" ? undefined : v);
  const parsed = Env.safeParse(Object.fromEntries(Object.entries(env).map(([k, v]) => [k, blank(v)])));
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`monica-mcp: configuration problem\n${problems}`);
  }
  const c = parsed.data;
  if (c.MONICA_TOKEN_TYPE === "legacy" && !c.MONICA_USER_TOKEN) {
    throw new Error("monica-mcp: MONICA_TOKEN_TYPE=legacy needs MONICA_USER_TOKEN too");
  }
  if (c.MCP_TRANSPORT === "http" && !c.MCP_BEARER_TOKEN && !c.MCP_OAUTH_ISSUER) {
    throw new Error("monica-mcp: MCP_TRANSPORT=http needs MCP_BEARER_TOKEN (or OAuth settings), so the server isn't open to anyone who can reach it");
  }
  return c;
}
