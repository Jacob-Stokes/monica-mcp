// End-to-end test against a real Monica 4: starts the built server over
// stdio (as a desktop client would) and calls every tool. It works on
// contacts it creates itself, named "E2E <run>", and deletes them at the end.
//
//   MONICA_BASE_URL=... MONICA_API_TOKEN=... npm run e2e

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const run = Date.now().toString(36);
const A = `E2E Ada ${run}`, B = `E2E Charles ${run}`;
let failed = 0, passed = 0;
const created = [];

const client = new Client({ name: "e2e", version: "1" }, { capabilities: {} });
await client.connect(new StdioClientTransport({ command: "node", args: ["dist/index.js"], env: { ...process.env, MCP_TRANSPORT: "stdio" }, stderr: "ignore" }));

async function call(name, args) {
  const r = await client.callTool({ name, arguments: args });
  const text = r.content.map((c) => c.text).join("");
  if (r.isError) throw new Error(text);
  return JSON.parse(text);
}
async function check(label, fn) {
  try {
    const detail = await fn();
    passed++;
    console.log(`  PASS ${label}${detail ? ` — ${detail}` : ""}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${label}: ${e.message.slice(0, 300)}`);
  }
}
const expect = (cond, why) => { if (!cond) throw new Error(why); };
async function expectError(name, args, pattern) {
  try {
    await call(name, args);
  } catch (e) {
    expect(pattern.test(e.message), `wrong error: ${e.message}`);
    return e.message.slice(0, 90);
  }
  throw new Error("no error");
}

try {
  const tools = (await client.listTools()).tools;
  await check("lists 14 tools with flat object schemas and annotations", () => {
    expect(tools.length === 14, `${tools.length} tools`);
    for (const t of tools) {
      expect(t.inputSchema.type === "object" && !t.inputSchema.oneOf && !t.inputSchema.anyOf, `${t.name} schema not flat`);
      expect(t.annotations && typeof t.annotations.readOnlyHint === "boolean", `${t.name} has no annotations`);
    }
    return tools.map((t) => t.name.replace("monica_", "")).join(", ");
  });
  await check("status", async () => { const s = await call("monica_status", {}); expect(s.connected, "not connected"); return `${s.email}, ${s.contacts} contacts`; });

  // contacts
  let ada;
  await check("contacts create (full profile)", async () => {
    ada = await call("monica_contacts", { action: "create", first_name: "E2E Ada", last_name: run, nickname: "Countess", gender: "Woman", birthdate: "1815-12-10", job: "Mathematician", company: "Analytical Engine", how_you_met: "At a soirée", description: "Wrote the first program" });
    created.push(ada.id);
    expect(ada.birthdate === "1815-12-10" && ada.job === "Mathematician" && ada.how_you_met === "At a soirée" && ada.gender === "Woman", JSON.stringify(ada));
    return `id ${ada.id}`;
  });
  let charles;
  await check("contacts create (birthdate without year)", async () => {
    charles = await call("monica_contacts", { action: "create", first_name: "E2E Charles", last_name: run, birthdate: "12-26" });
    created.push(charles.id);
    expect(charles.birthdate === "--12-26", charles.birthdate);
  });
  await check("contacts update keeps what isn't changed", async () => {
    const u = await call("monica_contacts", { action: "update", contact: A, nickname: "Enchantress", company: "Royal Society" });
    expect(u.nickname === "Enchantress" && u.birthdate === "1815-12-10" && u.job === "Mathematician" && u.company === "Royal Society" && u.gender === "Woman", JSON.stringify(u));
  });
  await check("contacts how you met: who introduced them and when, kept across updates", async () => {
    const u = await call("monica_contacts", { action: "update", contact: ada.id, met_through: B, first_met: "1833-06-05" });
    expect(u.met_through?.id === charles.id && u.first_met === "1833-06-05" && u.how_you_met === "At a soirée", JSON.stringify(u));
    const v = await call("monica_contacts", { action: "update", contact: ada.id, how_you_met: "At Babbage's soirée" });
    expect(v.met_through?.id === charles.id && v.first_met === "1833-06-05" && v.how_you_met === "At Babbage's soirée", JSON.stringify(v));
    const w = await call("monica_contacts", { action: "update", contact: ada.id, first_met: "06-05", met_through: null });
    expect(w.first_met === "--06-05" && !w.met_through, JSON.stringify(w));
  });
  await check("contacts update clears with null", async () => {
    const u = await call("monica_contacts", { action: "update", contact: ada.id, description: null, birthdate: null });
    expect(!u.description && !u.birthdate && u.nickname === "Enchantress", JSON.stringify(u));
  });
  await check("contacts search", async () => { const s = await call("monica_contacts", { action: "search", query: run }); expect(s.total === 2, `total ${s.total}`); });
  await check("contacts list", async () => { const l = await call("monica_contacts", { action: "list", sort: "recently_added", limit: 5 }); expect(l.contacts.some((c) => c.id === ada.id), "missing"); });
  await check("a name that matches several contacts is refused, with ids", () => expectError("monica_contacts", { action: "get", contact: "E2E" }, /matches 2 contacts.*id/));
  await check("an unknown gender lists the choices", () => expectError("monica_contacts", { action: "update", contact: ada.id, gender: "Robot" }, /Choose one of: .*Woman/));

  // details
  await check("contact_info add field / list / update / remove", async () => {
    const fld = await call("monica_contact_info", { action: "add", kind: "field", contact: A, type: "email", value: `ada-${run}@example.com` });
    expect(fld.type === "Email", JSON.stringify(fld));
    const up = await call("monica_contact_info", { action: "update", kind: "field", id: fld.id, value: `ada2-${run}@example.com` });
    expect(up.value.startsWith("ada2"), up.value);
    const l = await call("monica_contact_info", { action: "list", kind: "field", contact: A });
    expect(l.fields.length === 1, JSON.stringify(l));
    await call("monica_contact_info", { action: "remove", kind: "field", id: fld.id, confirm: true });
  });
  await check("contact_info address with country by name", async () => {
    const a = await call("monica_contact_info", { action: "add", kind: "address", contact: A, name: "Home", street: "12 St James's Square", city: "London", country: "United Kingdom" });
    expect(a.country && a.city === "London", JSON.stringify(a));
    const u = await call("monica_contact_info", { action: "update", kind: "address", id: a.id, postal_code: "SW1Y 4JH" });
    expect(u.city === "London" && u.postal_code === "SW1Y 4JH", JSON.stringify(u));
  });
  await check("contact_info tags add / remove", async () => {
    const t = await call("monica_contact_info", { action: "add", kind: "tag", contact: A, tags: [`e2e-${run}`, `poet-${run}`] });
    expect(t.tags.length === 2, JSON.stringify(t));
    const r = await call("monica_contact_info", { action: "remove", kind: "tag", contact: A, tags: [`poet-${run}`] });
    expect(r.tags.length === 1, JSON.stringify(r));
  });
  await check("removing without confirm is refused", () => expectError("monica_contact_info", { action: "remove", kind: "field", id: 1 }, /confirm/));

  // relationships
  await check("relationships add / list / update / remove", async () => {
    const r = await call("monica_relationships", { action: "add", contact: A, type: "friend", other: B });
    expect(r.is === "friend", JSON.stringify(r));
    const l = await call("monica_relationships", { action: "list", contact: B });
    expect(l.relationships.length >= 1, JSON.stringify(l));
    const u = await call("monica_relationships", { action: "update", id: r.id, type: "colleague" });
    expect(u.is === "colleague", JSON.stringify(u));
    await call("monica_relationships", { action: "remove", id: r.id, confirm: true });
  });

  // notes, activities, calls, conversations
  await check("notes create / update / list / get / delete", async () => {
    const n = await call("monica_notes", { action: "create", contact: A, body: "Loves Bernoulli numbers" });
    const u = await call("monica_notes", { action: "update", id: n.id, favorite: true });
    expect(u.favorite && u.body === "Loves Bernoulli numbers", JSON.stringify(u));
    const l = await call("monica_notes", { action: "list", contact: A });
    expect(l.notes.length === 1, JSON.stringify(l));
    expect((await call("monica_notes", { action: "get", id: n.id })).id === n.id, "get");
    await call("monica_notes", { action: "delete", id: n.id, confirm: true });
  });
  await check("activities create with two people and a type / update / list", async () => {
    const a = await call("monica_activities", { action: "create", contacts: [A, B], summary: "Engine demo", type: "ate at a restaurant", date: "2026-09-01" });
    expect(a.with.length === 2 && a.type === "ate at a restaurant" && a.date === "2026-09-01", JSON.stringify(a));
    const u = await call("monica_activities", { action: "update", id: a.id, summary: "Engine demo, round two" });
    expect(u.with.length === 2 && u.type === "ate at a restaurant" && u.date === "2026-09-01", JSON.stringify(u));
    expect((await call("monica_activities", { action: "list", contact: B })).activities.length === 1, "list");
  });
  await check("calls create / update", async () => {
    const c = await call("monica_calls", { action: "create", contact: A, content: "Talked about looms" });
    const u = await call("monica_calls", { action: "update", id: c.id, content: "Talked about looms and engines" });
    expect(u.content.includes("engines"), JSON.stringify(u));
  });
  await check("conversations create with messages / add_message", async () => {
    const c = await call("monica_conversations", { action: "create", contact: A, channel: "Telegram", messages: [{ from: "me", text: "Hello!" }, { from: "them", text: "Hi Charles" }] });
    expect(c.channel === "Telegram" && c.messages.length === 2, JSON.stringify(c));
    const u = await call("monica_conversations", { action: "add_message", id: c.id, from: "me", text: "See you Tuesday" });
    expect(u.messages.length === 3, JSON.stringify(u));
  });

  // follow-ups
  await check("reminders create (fortnightly) / list upcoming / update", async () => {
    const r = await call("monica_reminders", { action: "create", contact: A, title: `Check in ${run}`, date: "2026-01-05", repeat: "weekly", every: 2 });
    expect(r.repeats.includes("weekly") && r.next >= new Date().toISOString().slice(0, 10), JSON.stringify(r));
    const l = await call("monica_reminders", { action: "list", days: 30 });
    expect(l.reminders.some((x) => x.id === r.id), "not upcoming");
    const u = await call("monica_reminders", { action: "update", id: r.id, repeat: "monthly", every: 1 });
    expect(u.repeats === "monthly" && u.title === `Check in ${run}`, JSON.stringify(u));
  });
  await check("tasks create / done / list", async () => {
    const t = await call("monica_tasks", { action: "create", contact: A, title: "Return the notes" });
    await call("monica_tasks", { action: "update", id: t.id, done: true });
    const open = await call("monica_tasks", { action: "list", contact: A });
    const done = await call("monica_tasks", { action: "list", contact: A, done: true });
    expect(open.tasks.length === 0 && done.tasks.length === 1 && done.tasks[0].title === "Return the notes", JSON.stringify({ open, done }));
  });
  await check("gifts and debts", async () => {
    const g = await call("monica_gifts_debts", { action: "create", kind: "gift", contact: A, name: "A slide rule", status: "idea", value: 30 });
    const g2 = await call("monica_gifts_debts", { action: "update", kind: "gift", id: g.id, status: "offered" });
    expect(g2.status === "offered" && g2.name === "A slide rule", JSON.stringify(g2));
    const d = await call("monica_gifts_debts", { action: "create", kind: "debt", contact: B, amount: 12.5, direction: "they_owe", reason: "Lunch" });
    expect(d.direction === "they owe me" && d.status === "outstanding", JSON.stringify(d));
    const d2 = await call("monica_gifts_debts", { action: "update", kind: "debt", id: d.id, settled: true });
    expect(d2.status === "settled" && d2.reason === "Lunch", JSON.stringify(d2));
  });
  await check("contacts get includes the lot", async () => {
    const g = await call("monica_contacts", { action: "get", contact: A, include: ["fields", "notes", "activities", "reminders", "tasks", "calls", "conversations", "gifts", "debts"] });
    expect(g.activities.length === 1 && g.calls.length === 1 && g.conversations.length === 1 && g.gifts.length === 1 && g.reminders.length === 1 && g.addresses.length === 1, JSON.stringify(g).slice(0, 300));
  });

  // journal, reference, media
  await check("journal create / update / delete", async () => {
    const j = await call("monica_journal", { action: "create", title: `E2E ${run}`, post: "A fine day" });
    const u = await call("monica_journal", { action: "update", id: j.id, post: "A very fine day" });
    expect(u.post === "A very fine day" && u.title === `E2E ${run}`, JSON.stringify(u));
    await call("monica_journal", { action: "delete", id: j.id, confirm: true });
  });
  await check("reference list and filter", async () => {
    const r = await call("monica_reference", { action: "list", kind: "relationship_types", filter: "friend" });
    expect(r.items.some((x) => x.name === "bestfriend"), JSON.stringify(r));
  });
  await check("reference create / rename / delete an activity type and a field type", async () => {
    const at = await call("monica_reference", { action: "create", kind: "activity_type", name: `climbing-${run}`, category: "Sport" });
    await call("monica_reference", { action: "rename", kind: "activity_type", id: at.id, name: `bouldering-${run}` });
    const used = await call("monica_activities", { action: "create", contacts: [B], summary: "Wall", type: `bouldering-${run}` });
    expect(used.type === `bouldering-${run}`, JSON.stringify(used));
    await call("monica_activities", { action: "delete", id: used.id, confirm: true });
    await call("monica_reference", { action: "delete", kind: "activity_type", id: at.id, confirm: true });
    const ft = await call("monica_reference", { action: "create", kind: "contact_field_type", name: `Mastodon-${run}`, protocol: "https://" });
    const fld = await call("monica_contact_info", { action: "add", kind: "field", contact: B, type: `mastodon-${run}`, value: "@charles@example.social" });
    expect(fld.type === `Mastodon-${run}`, JSON.stringify(fld));
    await call("monica_contact_info", { action: "remove", kind: "field", id: fld.id, confirm: true });
    await call("monica_reference", { action: "delete", kind: "contact_field_type", id: ft.id, confirm: true });
  });
  await check("media upload a document (base64) / list / delete", async () => {
    const d = await call("monica_media", { action: "upload", kind: "document", contact: A, base64: Buffer.from("Notes on the engine\n").toString("base64"), filename: "notes.txt" });
    const l = await call("monica_media", { action: "list", kind: "document", contact: A });
    expect(l.documents.some((x) => x.id === d.id), JSON.stringify(l));
    await call("monica_media", { action: "delete", kind: "document", id: d.id, confirm: true });
  });
  await check("bad input names the problem", () => expectError("monica_reminders", { action: "create", contact: A, title: "x", date: "next tuesday" }, /date: use YYYY-MM-DD/));
} finally {
  for (const id of created) {
    await call("monica_contacts", { action: "delete", contact: id, confirm: true }).catch((e) => console.log(`  cleanup of contact ${id} failed: ${e.message}`));
  }
  const left = await call("monica_contacts", { action: "search", query: run }).catch(() => ({ total: "?" }));
  const reminders = await call("monica_reminders", { action: "list", days: 3660 }).catch(() => ({ reminders: [] }));
  const orphans = reminders.reminders.filter((r) => r.title?.includes(run)).length;
  console.log(`  cleanup: ${created.length} contacts deleted, ${left.total} left matching this run, ${orphans} of its reminders left`);
  if (left.total !== 0 || orphans) failed++;
  await client.close();
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
