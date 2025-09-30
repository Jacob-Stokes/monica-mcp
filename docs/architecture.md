# Monica CRM MCP Architecture

## Goals
- Expose a subset of Monica CRM functionality (contacts, interactions, tasks) through the Model Context Protocol so assistants such as Claude Desktop can query and mutate data.
- Remain tenant-agnostic: any Monica instance (self-hosted or hosted) should work with just a base URL and API token.
- Follow MCP provider best practices: stateless server, explicit tool/resource contracts, input validation, robust error handling, and observability hooks for debugging.

## High-Level Design
- **Runtime**: Node.js (≥18) with TypeScript, using `@modelcontextprotocol/sdk` to expose MCP tools/resources.
- **Server Entry Point**: `src/index.ts` creates an MCP server, registers Monica-specific tools/resources, and handles lifecycle events (connect/disconnect, health pings).
- **HTTP Client**: `src/client/MonicaClient.ts` wraps Monica's REST API with typed methods. Handles auth headers (`X-API-Key` or legacy `X-Auth-Token` & `X-User-Token`), pagination, rate limits, and error normalization.
- **Tools** (`src/tools/*.ts`):
  - `searchContacts`: fuzzy search contacts by name/email.
  - `getContact`: retrieve detailed profile by Monica contact ID.
  - `manageContact`: create, update, or delete contacts with a single action parameter.
  - `manageActivity`: list, inspect, and mutate Monica activities.
  - `manageAddress`: maintain contact addresses (list/detail/mutate) with one tool.
  - `manageContactField` / `manageContactFieldType`: keep custom contact handles synced and curate the field catalog.
  - `manageActivityType` / `manageActivityTypeCategory`: maintain the activity taxonomy used by activities.
  - `createContactNote`: post an interaction note (call, meeting, etc.).
  - `listTasks`: list upcoming tasks/reminders tied to a contact or globally.
  - Additional helpers (e.g., `addRelationship`, `logActivity`) can be layered later.
- **Resources** (`src/resources/*.ts`):
  - `contact` resource with streaming support to fetch details or attachments.
  - `timeline` resource streaming a contact's interactions/messages.
- **Configuration**:
  - `.env`/environment variables supply `MONICA_BASE_URL`, `MONICA_API_TOKEN`, plus optional `MONICA_USER_TOKEN` for legacy auth.
  - `src/config.ts` centralizes validation (using `zod`) and exposes typed config.
- **Logging & Diagnostics**: Structured logging via `pino` (defaults to concise JSON).  Diagnostic tool `healthCheck` tests connectivity to Monica API.

## Data Flow
1. MCP client invokes a tool (e.g., `searchContacts`) with structured input.
2. Tool handler validates input schema (via `zod`), calls into `MonicaClient`.
3. `MonicaClient` performs REST request, raising typed errors on non-2xx responses.
4. Handler maps Monica payload into concise MCP response with assistant-friendly fields and optional `context` attachments.
5. Errors propagate back as MCP `errors`, preserving Monica error messages but hiding secrets.

## Security & Multi-Tenancy
- No credentials stored on disk; environment variables or Claude Desktop secrets store API tokens per user.
- Support both Monica hosted (`https://app.monicahq.com`) and self-hosted domains via configurable base URL.
- Optional rate limiting / debounce to prevent flooding user instances.
- Enforce metadata redaction in logs (strip PII, tokens).

## Future Enhancements
- OAuth flow once Monica exposes it (currently token-based).
- Webhook listener to push updates via MCP streaming capabilities.
- Caching layer for read-heavy workloads.
