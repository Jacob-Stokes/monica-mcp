# Monica MCP

An MCP server for [Monica](https://www.monicahq.com), the personal CRM: the people in a life, what happened with them, what to remember about them and when to get back in touch, available to any MCP client.

It targets **Monica 4** (the classic version, 4.1.2 being its latest release), through its REST API. Monica 5 is a separate rewrite, still in beta, with a different API.

[![ci](https://github.com/Jacob-Stokes/monica-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Jacob-Stokes/monica-mcp/actions/workflows/ci.yml)

## What it does

| Tool | For |
|---|---|
| `monica_contacts` | Search, list, read, create, update and delete contacts, including job, company and how they met. A contact's profile comes with its details, recent notes, activities and reminders. |
| `monica_contact_info` | Contact fields (email, phone, social profiles), postal addresses and tags. |
| `monica_relationships` | How contacts are related: partner, parent, friend, colleague… |
| `monica_notes` | Things to remember about someone. |
| `monica_activities` | Things done together, with one or more contacts. |
| `monica_calls` | Phone calls. |
| `monica_conversations` | Message threads, by channel. |
| `monica_reminders` | One-off and repeating reminders, listed by when they next come round. |
| `monica_tasks` | To-dos tied to a contact. |
| `monica_gifts_debts` | Gift ideas, gifts given and received, and money owed either way. |
| `monica_journal` | Journal entries. |
| `monica_reference` | Genders, countries, currencies, activity types, relationship types, contact field types and tags; adds custom ones. |
| `monica_media` | Documents and photos attached to contacts. |
| `monica_status` | Checks the connection. |

How it's built to behave:

- **People by name.** Every tool takes a contact's name or id. A name that matches several people is refused with the candidates and their ids; types, genders and countries are matched by name too.
- **Few tools, one action each call.** Fourteen tools, each with an `action`, rather than dozens. Inputs are validated before anything reaches Monica, and invalid ones are rejected with what's allowed (`date: use YYYY-MM-DD`, `no gender "Robot". Choose one of: Man, Woman, Rather not say`).
- **Safe edits.** Updates change only what's given and keep the rest. Monica's own update API clears anything left out, so the server reads the record first. Deleting anything needs `confirm: true`.
- **Compact answers.** Results are trimmed to what's useful: names instead of nested objects, plain dates, no API noise.
- **Gentle with Monica.** Monica allows 60 API requests a minute by default. The server remembers names it has already resolved, and waits and retries when Monica asks it to slow down.
- **Tested against a real Monica.** CI sets up Monica 4.1.2 from scratch and runs every tool against it ([`scripts/e2e.mjs`](scripts/e2e.mjs)).

## Install

Requires Node.js 20.12 or newer, a Monica 4 instance (self-hosted, or monicahq.com) and an API token from it (Settings → API → Create a new token).

### Desktop clients (stdio)

Most MCP clients take a configuration like this:

```json
{
  "mcpServers": {
    "monica": {
      "command": "npx",
      "args": ["-y", "github:Jacob-Stokes/monica-mcp"],
      "env": {
        "MONICA_BASE_URL": "https://monica.example.com",
        "MONICA_API_TOKEN": "the-token"
      }
    }
  }
}
```

Or from a clone: `git clone https://github.com/Jacob-Stokes/monica-mcp && cd monica-mcp && npm install`, then `"command": "node", "args": ["/path/to/monica-mcp/dist/index.js"]`.

### As a service (HTTP)

With `MCP_TRANSPORT=http`, the server speaks Streamable HTTP at `/mcp` and requires `MCP_BEARER_TOKEN` (or OAuth) on every request. The Docker image runs this way:

```bash
docker build -t monica-mcp https://github.com/Jacob-Stokes/monica-mcp.git
docker run -d -p 127.0.0.1:8080:8080 \
  -e MONICA_BASE_URL=https://monica.example.com -e MONICA_API_TOKEN=... -e MCP_BEARER_TOKEN=... \
  monica-mcp
```

[`compose.example.yml`](compose.example.yml) runs it next to a Monica container. For clients that log in with OAuth 2.1, set `MCP_OAUTH_ISSUER`, `MCP_OAUTH_CANONICAL_URL` and, if the issuer puts the client id in `aud`, `MCP_OAUTH_AUDIENCE`. `/health` answers without authentication.

## Configuration

| Variable | Default | |
|---|---|---|
| `MONICA_BASE_URL` | `https://app.monicahq.com` | The Monica instance |
| `MONICA_API_TOKEN` | required | Its API token |
| `MONICA_TOKEN_TYPE` | `bearer` | `apiKey` sends `X-Api-Key`; `legacy` sends `X-Auth-Token` with `MONICA_USER_TOKEN` |
| `MCP_TRANSPORT` | `stdio` | `http` to serve at `/mcp` |
| `PORT` | `8080` | HTTP only |
| `MCP_BEARER_TOKEN` | | HTTP: the token clients send |
| `MCP_OAUTH_ISSUER`, `MCP_OAUTH_CANONICAL_URL`, `MCP_OAUTH_AUDIENCE`, `MCP_OAUTH_JWKS_URI` | | HTTP: optional OAuth 2.1 |
| `MONICA_TIMEOUT_MS` | `15000` | Per request to Monica |

A `.env` file in the working directory is read when the variables aren't already set. Logs go to stderr.

A self-hosted Monica's API limit can be raised with `RATE_LIMIT_PER_MINUTE_API` in Monica's own environment; 60 a minute is tight for an assistant looking around.

## Upgrading from 1.x

2.0 is a rewrite. The Monica settings are unchanged, and `dist/index.js` is still the entry point, so existing client configurations keep working, but the tools are new:

| 1.x | 2.0 |
|---|---|
| `monica_search_contacts`, `monica_list_contacts` | `monica_contacts` (`search`, `list`) |
| `monica_manage_contact`, `monica_manage_contact_profile` | `monica_contacts` (`get`, `create`, `update`, `delete`) |
| `monica_manage_contact_field`, `monica_manage_contact_address`, `monica_manage_contact_tags` | `monica_contact_info` (`kind`: `field`, `address`, `tag`) |
| `monica_manage_relationship` | `monica_relationships` |
| `monica_manage_note`, `monica_manage_activity`, `monica_manage_call`, `monica_manage_conversation` | `monica_notes`, `monica_activities`, `monica_calls`, `monica_conversations` |
| `monica_manage_task_reminder` | `monica_reminders`, `monica_tasks` |
| `monica_manage_financial_record` | `monica_gifts_debts` |
| `monica_manage_media` | `monica_media` |
| `monica_browse_metadata`, `monica_manage_activity_type`, `monica_manage_contact_field_type`, `monica_manage_tag` | `monica_reference` |
| `monica_health_check` | `monica_status` |
| `monica_manage_group` | removed: Monica 4's API has no groups endpoint |
| resources `monica-contact://`, `monica-contact-notes://` | removed: `monica_contacts` `get` returns both |

New: `monica_journal`, the HTTP transport, OAuth, and a Docker image. Details in [CHANGELOG.md](CHANGELOG.md).

## Development

```bash
npm install
npm test                 # build, then unit tests and an HTTP transport test (no Monica needed)
MONICA_BASE_URL=... MONICA_API_TOKEN=... npm run e2e   # every tool against a real Monica
```

The end-to-end test works on contacts it creates itself and deletes them at the end; point it at a test instance all the same.

```text
src/
  index.ts      start-up: stdio or HTTP
  config.ts     environment variables
  monica.ts     Monica's API: auth, pagination, rate-limit retries, errors
  resolve.ts    names to ids (contacts, types, countries…)
  format.ts     compact results
  server.ts     tool registry, validation, error messages
  http.ts       Streamable HTTP, bearer and OAuth
  schema.ts     zod to flat JSON Schema
  tools/        the fourteen tools
```

## License

MIT
