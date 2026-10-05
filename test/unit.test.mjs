// Unit tests: no Monica needed. `npm test` builds first.
import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../dist/config.js";
import { nextOccurrence, birthdate, contactSummary } from "../dist/format.js";
import { Resolver } from "../dist/resolve.js";
import { TOOLS } from "../dist/server.js";
import { zodToJsonSchema } from "../dist/schema.js";

test("configuration: the 1.x variable names work, and mistakes are explained", () => {
  const c = loadConfig({ MONICA_API_TOKEN: "t", MONICA_BASE_URL: "https://crm.example.com" });
  assert.equal(c.MONICA_TOKEN_TYPE, "bearer");
  assert.equal(c.MCP_TRANSPORT, "stdio");
  assert.throws(() => loadConfig({}), /MONICA_API_TOKEN: required: a Monica API token/);
  assert.throws(() => loadConfig({ MONICA_API_TOKEN: "t", MONICA_TOKEN_TYPE: "legacy" }), /MONICA_USER_TOKEN/);
  assert.throws(() => loadConfig({ MONICA_API_TOKEN: "t", MCP_TRANSPORT: "http" }), /needs MCP_BEARER_TOKEN/);
  assert.equal(loadConfig({ MONICA_API_TOKEN: "t", MCP_TRANSPORT: "http", MCP_BEARER_TOKEN: "b", PORT: "7011" }).PORT, 7011);
});

test("every tool has a flat object schema, a description and annotations", () => {
  assert.equal(TOOLS.length, 14);
  for (const t of TOOLS) {
    const s = zodToJsonSchema(t.input);
    assert.equal(s.type, "object", t.name);
    assert.ok(!s.oneOf && !s.anyOf && !s.allOf, `${t.name}: no top-level oneOf/anyOf/allOf`);
    assert.ok(t.description.length > 80, `${t.name}: describe its actions`);
    assert.equal(typeof t.annotations.readOnlyHint, "boolean", t.name);
    assert.match(t.name, /^monica_[a-z_]+$/);
    if (s.properties.action) assert.ok(s.required.includes("action"), `${t.name}: action is required`);
  }
});

test("deleting needs confirm: true in every tool that deletes", () => {
  for (const t of TOOLS) {
    const s = zodToJsonSchema(t.input);
    const actions = s.properties.action?.enum ?? [];
    if (actions.includes("delete")) {
      assert.throws(() => t.input.parse({ action: "delete", id: 1, kind: "gift", contact: "x" }), /confirm/, t.name);
    }
  }
});

test("reminders: the next date a repeating reminder comes round on", () => {
  const today = "2026-10-05";
  assert.equal(nextOccurrence({ initial_date: "2026-12-01", frequency_type: "one_time" }, today), "2026-12-01");
  assert.equal(nextOccurrence({ initial_date: "2026-01-01", frequency_type: "one_time" }, today), null);
  assert.equal(nextOccurrence({ initial_date: "2026-01-05", frequency_type: "week", frequency_number: 2 }, today), "2026-10-12");
  assert.equal(nextOccurrence({ initial_date: "1990-10-04", frequency_type: "year", frequency_number: 1 }, today), "2027-10-04");
  assert.equal(nextOccurrence({ initial_date: "2026-08-31", frequency_type: "month", frequency_number: 1 }, today), "2026-10-31");
  assert.equal(nextOccurrence({ initial_date: "2026-08-31", frequency_type: "month", frequency_number: 1 }, "2026-09-02"), "2026-09-30");
  assert.equal(nextOccurrence({ initial_date: "2024-02-29", frequency_type: "year", frequency_number: 1 }, "2025-01-01"), "2025-02-28");
});

test("birthdates: full, without a year, or age-based", () => {
  assert.equal(birthdate({ dates: { birthdate: { date: "1815-12-10T00:00:00Z", is_year_unknown: false } } }), "1815-12-10");
  assert.equal(birthdate({ dates: { birthdate: { date: "2026-12-26T00:00:00Z", is_year_unknown: true } } }), "--12-26");
  assert.equal(birthdate({ dates: { birthdate: { date: null } } }), null);
  assert.deepEqual(contactSummary({ id: 1, complete_name: "Ada", first_name: "Ada", tags: [], is_dead: false }), { id: 1, name: "Ada", first_name: "Ada" });
});

function fakeMonica(contacts, catalogs = {}) {
  const calls = [];
  return {
    calls,
    async page(path, q) {
      calls.push(`${path}?${q.query ?? ""}`);
      return { data: contacts.filter((c) => c.complete_name.toLowerCase().includes(String(q.query).toLowerCase())) };
    },
    async list(path) {
      calls.push(path);
      return catalogs[path] ?? [];
    },
  };
}

test("contacts by name: exact matches win, ties are refused with ids, answers are remembered", async () => {
  const m = fakeMonica([
    { id: 1, first_name: "Sam", last_name: "Lee", complete_name: "Sam Lee" },
    { id: 2, first_name: "Sam", last_name: "Leeson", complete_name: "Sam Leeson" },
    { id: 3, first_name: "Samuel", last_name: "Lee", complete_name: "Samuel Lee", nickname: "Sammy" },
  ]);
  const r = new Resolver(m);
  assert.deepEqual(await r.contact("sam lee"), { id: 1, name: "Sam Lee" });
  await r.contact("Sam Lee");
  assert.equal(m.calls.filter((c) => c.startsWith("/contacts")).length, 1, "the second lookup is remembered");
  await assert.rejects(r.contact("Sam"), /matches 2 contacts: Sam Lee \(id 1\); Sam Leeson \(id 2\)/);
  await assert.rejects(r.contact("Nobody"), /no contact matches "Nobody"/);
  assert.deepEqual(await r.contact(42), { id: 42, name: "" }, "an id costs no request");
});

test("reference names: case and underscores don't matter, and unknown names list the choices", async () => {
  const m = fakeMonica([], {
    "/relationshiptypes": [{ id: 18, name: "bestfriend", name_reverse_relationship: "bestfriend" }, { id: 8, name: "parent", name_reverse_relationship: "child" }],
    "/contactfieldtypes": [{ id: 1, name: "Email", type: "email" }],
  });
  const r = new Resolver(m);
  assert.equal((await r.relationshipType("Child")).id, 8);
  assert.equal((await r.contactFieldType("EMAIL")).id, 1);
  await assert.rejects(r.relationshipType("nemesis"), /no relationship type "nemesis". Choose one of: bestfriend, parent/);
});
