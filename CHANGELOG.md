# Changelog

## 2.0.0

A rewrite: fewer, clearer tools, and checked against a real Monica 4.1.2.

**Tools.** 21 tools become 14, each with an `action`. The [README](README.md#upgrading-from-1x) maps the old names to the new.
- Contacts, relationship types, activity types, contact field types, genders and countries are referred to by name or id. An ambiguous contact name is refused with the candidates and their ids.
- Invalid input is refused before reaching Monica, with what's allowed.
- Deleting anything needs `confirm: true`.
- Updates keep every field that isn't given: Monica's update API clears fields left out (a contact's birthdate, for one), so the server sends the current values with the change.
- Contact updates also cover `job`, `company` and `how_you_met`.
- `monica_reminders` lists reminders by when they next come round, including repeating ones.
- New: `monica_journal`.
- Removed: groups, which Monica 4's API doesn't have, and the two resources, whose content `monica_contacts get` returns.

**Monica's quirks handled:**
- Rate limits: names already resolved are remembered, and on HTTP 429 the server waits for Monica's `Retry-After` and retries.
- Paginated reference lists, such as the 27 relationship types, are read in full.
- Lists Monica can only sort by creation (activities, calls, conversations) are ordered by date.
- Reminders and tasks of deleted contacts, which Monica keeps, are left out of lists, and deleting a contact removes its reminders and tasks first.

**Running it:**
- stdio, as before, or Streamable HTTP with a bearer token and optional OAuth 2.1 (`MCP_TRANSPORT=http`).
- A Docker image.
- `npx -y github:Jacob-Stokes/monica-mcp`.
- Configuration is unchanged (`MONICA_BASE_URL`, `MONICA_API_TOKEN`, `MONICA_TOKEN_TYPE`, `MONICA_USER_TOKEN`).

**Quality:**
- Unit tests and an HTTP transport test.
- An end-to-end test of every tool against a fresh Monica 4.1.2 in CI.
- An MIT LICENSE file.

## 0.1.0

The first version.
