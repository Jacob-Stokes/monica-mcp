// Monica's REST API (Monica 4, "classic": /api/...). One request at a time
// through `req`; lists through `list`, which follows Monica's pagination.

import type { Config } from "./config.js";

export class MonicaError extends Error {
  constructor(
    public readonly method: string,
    public readonly path: string,
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(`Monica ${method} ${path} → HTTP ${status}${detail ? `: ${detail}` : ""}`);
  }
}

class RateLimited extends Error {
  constructor(public readonly retryAfter: number) {
    super("rate limited");
  }
}

export interface Page<T> {
  data: T[];
  meta?: { current_page: number; last_page: number; per_page: number; total: number };
}

// Monica explains validation errors as {"error":{"message":[...]}}
function explain(body: any): string {
  const m = body?.error?.message ?? body?.message;
  if (Array.isArray(m)) return m.join(" ");
  return typeof m === "string" ? m : "";
}

export class MonicaClient {
  private base: string;

  constructor(private cfg: Pick<Config, "MONICA_BASE_URL" | "MONICA_API_TOKEN" | "MONICA_TOKEN_TYPE" | "MONICA_USER_TOKEN" | "MONICA_TIMEOUT_MS">) {
    this.base = cfg.MONICA_BASE_URL.replace(/\/+$/, "") + "/api";
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { Accept: "application/json" };
    if (this.cfg.MONICA_TOKEN_TYPE === "apiKey") h["X-Api-Key"] = this.cfg.MONICA_API_TOKEN;
    else if (this.cfg.MONICA_TOKEN_TYPE === "legacy") {
      h["X-Auth-Token"] = this.cfg.MONICA_API_TOKEN;
      h["X-User-Token"] = this.cfg.MONICA_USER_TOKEN ?? "";
    } else h.Authorization = `Bearer ${this.cfg.MONICA_API_TOKEN}`;
    return h;
  }

  // Monica allows 60 API requests a minute by default (RATE_LIMIT_PER_MINUTE_API
  // on a self-hosted instance). Over it, it answers 429 with Retry-After: wait
  // that long and try again, as long as the wait is short enough for a client
  // to sit through.
  async req<T = any>(method: string, path: string, body?: unknown, query?: Record<string, string | number | undefined>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.once<T>(method, path, body, query);
      } catch (e) {
        if (!(e instanceof RateLimited) || attempt >= 2 || e.retryAfter > 45) {
          if (e instanceof RateLimited) {
            throw new MonicaError(method, path, 429, `Monica's API rate limit was reached; try again in ${e.retryAfter}s (a self-hosted Monica can raise RATE_LIMIT_PER_MINUTE_API, 60 by default)`);
          }
          throw e;
        }
        await new Promise((r) => setTimeout(r, (e.retryAfter + 1) * 1000));
      }
    }
  }

  private async once<T>(method: string, path: string, body?: unknown, query?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(this.base + path);
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    const init: RequestInit = { method, headers: this.headers(), signal: AbortSignal.timeout(this.cfg.MONICA_TIMEOUT_MS) };
    if (body instanceof FormData) init.body = body;
    else if (body !== undefined) {
      (init.headers as Record<string, string>)["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (e: any) {
      const why = e?.name === "TimeoutError" ? `no answer within ${this.cfg.MONICA_TIMEOUT_MS / 1000}s` : e?.cause?.code ?? e?.message;
      throw new MonicaError(method, path, 0, `can't reach Monica at ${this.cfg.MONICA_BASE_URL} (${why})`);
    }
    if (res.status === 429) throw new RateLimited(Number(res.headers.get("retry-after")) || 60);
    const text = await res.text();
    let data: any = undefined;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      // not JSON: an HTML error page, usually
    }
    if (!res.ok || data?.error) {
      let detail = explain(data);
      if (res.status === 401) detail = "the API token was refused (check MONICA_API_TOKEN and MONICA_TOKEN_TYPE)";
      if (res.status === 404 && !detail) detail = "not found";
      throw new MonicaError(method, path, res.status, detail || text.slice(0, 200));
    }
    return data as T;
  }

  // Every page of a list, up to `max` items
  async list<T = any>(path: string, query: Record<string, string | number | undefined> = {}, max = 1000): Promise<T[]> {
    const out: T[] = [];
    for (let page = 1; out.length < max; page++) {
      const res = await this.req<Page<T>>("GET", path, undefined, { ...query, limit: 100, page });
      // a few reference lists (countries, currencies) come keyed by id
      const items = Array.isArray(res.data) ? res.data : Object.values(res.data ?? {});
      out.push(...(items as T[]));
      if (!res.meta || res.meta.current_page >= res.meta.last_page || res.data.length === 0) break;
    }
    return out.slice(0, max);
  }

  // One page, with its totals
  page<T = any>(path: string, query: Record<string, string | number | undefined>) {
    return this.req<Page<T>>("GET", path, undefined, query);
  }
}
