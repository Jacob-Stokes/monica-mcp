# Monica CRM MCP Server

A Model Context Protocol (MCP) server that lets assistants such as Claude Desktop read from and write to any Monica CRM instance. It wraps Monica's REST API with a handful of assistant-friendly tools and resources so you can search contacts, inspect timelines, capture notes, and keep on top of tasks without leaving the chat.

## Features
- **Contact search & summaries** – find people by name/email and return normalized details with custom fields.
- **Contact management** – create, update, or delete contacts without leaving the assistant.
- **Contact info management** – view contact summaries, update profile details, and manage communication fields/addresses from one tool.
- **Activity tracking** – capture meetings/outings and review recent shared history.
- **Automatic ID resolution** – look up genders, countries, contact field types, activity types, and relationship types by name when executing tools.
- **Metadata browser** – inspect Monica catalogs (genders, countries, activity types, etc.) from one consolidated tool when you need raw IDs.
- **Stay-on-track actions** – create or update tasks and reminders together without juggling multiple tools.
- **Financial tracking** – log Monica gifts and debts through one shared tool.
- **Relationship management** – inspect existing links or connect two contacts with the right type.
- **Conversation logging** – capture message threads with contacts and keep channel context.
- **Call logging** – track phone conversations with quick notes and timestamps.
- **Group management** – curate contact groups and review who belongs in them.
- **Reminder scheduling** – set recurring nudges so you follow up with people on time.
- **Task management** – add follow-ups, update status, or retarget tasks to the right contact.
- **Note capture** – create and manage journal notes from assistant prompts.
- **Tag system** – organize and categorize contacts with custom tags.
- **Contact resources** – stream Monica contact profiles and recent notes as MCP resources.
- **Task visibility** – surface open/completed tasks globally or per contact.
- **Connectivity probe** – quick health check tool for debugging credentials.

## Prerequisites
- Node.js 18 or newer.
- A Monica CRM instance (self-hosted or hosted) with an API token.
- Optional: legacy user token if you still rely on `X-Auth-Token`/`X-User-Token` auth.

## Installation
```bash
npm install
```

## Configuration
Create a `.env` file (or set environment variables another way) with at least:

```
MONICA_API_TOKEN=your-token
# Defaults to https://app.monicahq.com; change for self-hosted instances
MONICA_BASE_URL=https://app.monicahq.com
# one of: bearer (default), apiKey, legacy
MONICA_TOKEN_TYPE=bearer
# Required only when MONICA_TOKEN_TYPE=legacy
MONICA_USER_TOKEN=optional-legacy-user-token
# Optional pino log level (fatal|error|warn|info|debug|trace|silent)
LOG_LEVEL=info
```

## Running the server
- **Develop:** `npm run dev`
- **Type-check:** `npm run typecheck`
- **Build:** `npm run build`
- **Start (compiled):** `npm run start`

The `dev` script launches the MCP server over stdio with live reload for local testing (e.g. using `mcp-cli`).

## Claude Desktop integration
Add the provider to your Claude Desktop `~/.claude-desktop/config.json` (or the equivalent per-platform path):

```json
{
  "mcpServers": {
    "monica-crm": {
      "command": "node",
      "args": ["/absolute/path/to/monica-crm-mcp/dist/index.js"],
      "env": {
        "MONICA_API_TOKEN": "your-token",
        "MONICA_BASE_URL": "https://app.monicahq.com"
      }
    }
  }
}
```

For development, you can swap `node dist/index.js` with `npm run dev --silent` to use the TypeScript entry point directly.

## Tools exposed

This Monica MCP server provides **17 tools** covering the most common CRM operations:

| Tool | Purpose |
| --- | --- |
| **Core Contact Management** | |
| `monica_search_contacts` | Search Monica CRM contacts by name, nickname, or email. Returns contact IDs and basic info for downstream tools. |
| `monica_manage_contact` | Retrieve summaries or manage profile fields, communication details, and addresses with a single `section` parameter. |
| `monica_manage_contact_profile` | Simplified wrapper to create/update/delete contact profiles (delegates to `monica_manage_contact` with `section="profile"`). |
| `monica_manage_contact_field` | Simplified wrapper to list/get/create/update/delete contact fields like email and phone (delegates to `monica_manage_contact` with `section="field"`). |
| `monica_manage_contact_address` | Simplified wrapper to list/get/create/update/delete contact addresses (delegates to `monica_manage_contact` with `section="address"`). |
| **Communication & Interactions** | |
| `monica_manage_conversation` | Manage conversations and their messages (list/get/create/update/delete plus message add/update/remove). Channel can be supplied by ID or name. |
| `monica_manage_call` | Log calls with contacts (list/get/create/update/delete) to capture quick phone notes. |
| `monica_manage_activity` | Track meetings/events with contacts. Accepts either `activityTypeId` or `activityTypeName`. |
| `monica_manage_note` | List, inspect, create, update, or delete notes attached to a contact. |
| **Planning & Follow-ups** | |
| `monica_manage_task_reminder` | Manage Monica tasks and reminders together—choose the item type to list/get/create/update/delete either resource. |
| `monica_manage_financial_record` | Manage Monica gifts and debts with a single tool (set `recordType` to "gift" or "debt"). |
| **Media & Files** | |
| `monica_manage_media` | Manage Monica documents and photos (set `mediaType` to "document" or "photo"; supports list/get/upload/delete with file path or base64 input). |
| **Relationships & Organization** | |
| `monica_manage_relationship` | List, inspect, create, update, or delete relationships between contacts. Accepts either `relationshipTypeId` or `relationshipTypeName`. |
| `monica_manage_group` | List, inspect, create, update, or delete contact groups and review their members. |
| `monica_manage_tag` | List, inspect, create, update, or delete tags used to categorize contacts. |
| **Metadata & System** | |
| `monica_browse_metadata` | Browse Monica catalogs (genders, countries, contact field types, activity types, relationship types) with optional name filtering. |
| `monica_health_check` | Verify that the configured Monica credentials work. |

## Resources exposed
| Resource URI | Description |
| --- | --- |
| `monica-contact://{contactId}` | JSON payload containing normalized contact profile data. |
| `monica-contact-notes://{contactId}` | JSON payload with the latest notes for the contact. |

Each resource supports auto-complete on `contactId` via Monica search so assistants can discover relevant IDs.

## Observability & safety
- Structured logging via `pino`, with token redaction.
- Requests run with a 15s timeout by default.
- Errors from Monica are wrapped as tool outputs (not protocol errors) so assistants can self-correct.

## Next steps
1. Expand tool coverage (activities, reminders, gifts) as needed.
2. Add caching or rate limiting for heavy workspaces.
3. Package the server as an executable for easier distribution.

Refer to `docs/architecture.md` for a deeper design walkthrough and Monica API references pulled from the upstream docs.
