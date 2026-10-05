import { z } from "zod";
import * as f from "../format.js";
import { Confirm, Contact, type Ctx, tool, WRITES } from "./common.js";

const Birthdate = z
  .string()
  .regex(/^(\d{4}-)?\d{2}-\d{2}$|^--\d{2}-\d{2}$/, "use YYYY-MM-DD, or MM-DD when the year isn't known")
  .nullable()
  .describe("YYYY-MM-DD, or MM-DD if the year isn't known; null clears it");

const Profile = {
  last_name: z.string().max(100).nullable().optional(),
  nickname: z.string().max(100).nullable().optional(),
  gender: z.string().nullable().optional().describe("A gender name, e.g. Woman, Man, Rather not say (monica_reference kind=genders)"),
  birthdate: Birthdate.optional(),
  description: z.string().max(1000).nullable().optional().describe("A short line about them"),
  job: z.string().max(255).nullable().optional(),
  company: z.string().max(255).nullable().optional(),
  how_you_met: z.string().max(1000).nullable().optional().describe("How you met: the story"),
  met_through: Contact.nullable().optional().describe("Who introduced you: a contact's name or id"),
  first_met: z
    .string()
    .regex(/^(\d{4}-)?\d{2}-\d{2}$|^--\d{2}-\d{2}$/, "use YYYY-MM-DD, or MM-DD when the year isn't known")
    .nullable()
    .optional()
    .describe("When you first met: YYYY-MM-DD, or MM-DD if the year isn't known; null clears it"),
  first_met_reminder: z.boolean().optional().describe("With first_met: a yearly reminder of the day"),
  deceased: z.boolean().optional(),
  deceased_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().describe("YYYY-MM-DD"),
};

const Include = z
  .array(z.enum(["fields", "notes", "activities", "reminders", "tasks", "calls", "conversations", "gifts", "debts"]))
  .default(["fields", "notes", "activities", "reminders"])
  .describe("What to add to the profile (5 most recent of each)");

export const ContactsInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("search"), query: z.string().min(1).describe("Name, nickname, email or other text"), limit: z.number().int().min(1).max(50).default(10) }),
  z.object({
    action: z.literal("list"),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(25),
    sort: z.enum(["name", "recently_added", "recently_updated"]).default("name"),
  }),
  z.object({ action: z.literal("get"), contact: Contact, include: Include }),
  z.object({ action: z.literal("create"), first_name: z.string().min(1).max(100), ...Profile }),
  z.object({ action: z.literal("update"), contact: Contact, first_name: z.string().min(1).max(100).optional(), ...Profile }),
  z.object({ action: z.literal("delete"), contact: Contact, confirm: Confirm }),
]);

// Monica's create/update take the whole profile: its date and deceased flags
// are required, and a field left out is cleared. So an update starts from
// the contact as it is.
function profileBody(cur: any) {
  const b = cur?.information?.dates?.birthdate ?? {};
  const d = cur?.information?.dates?.deceased_date ?? {};
  const body: Record<string, any> = {
    first_name: cur?.first_name,
    last_name: cur?.last_name ?? null,
    nickname: cur?.nickname ?? null,
    description: cur?.description ?? null,
    is_birthdate_known: !!b.date,
    is_deceased: !!cur?.is_dead,
    is_deceased_date_known: !!d.date,
  };
  if (b.date) {
    if (b.is_age_based) {
      body.birthdate_is_age_based = true;
      body.birthdate_age = new Date().getFullYear() - new Date(b.date).getFullYear();
    } else {
      body.birthdate_day = Number(b.date.slice(8, 10));
      body.birthdate_month = Number(b.date.slice(5, 7));
      if (!b.is_year_unknown) body.birthdate_year = Number(b.date.slice(0, 4));
    }
  }
  if (d.date) Object.assign(body, { deceased_date_day: Number(d.date.slice(8, 10)), deceased_date_month: Number(d.date.slice(5, 7)), deceased_date_year: Number(d.date.slice(0, 4)) });
  return body;
}

function setBirthdate(body: Record<string, any>, v: string | null) {
  for (const k of ["birthdate_day", "birthdate_month", "birthdate_year", "birthdate_is_age_based", "birthdate_age"]) delete body[k];
  body.is_birthdate_known = v !== null;
  if (v === null) return;
  const m = v.replace(/^--/, "").split("-").map(Number);
  if (m.length === 3) [body.birthdate_year, body.birthdate_month, body.birthdate_day] = m;
  else [body.birthdate_month, body.birthdate_day] = m;
}

async function applyProfile(ctx: Ctx, body: Record<string, any>, input: any) {
  if (input.first_name !== undefined) body.first_name = input.first_name;
  for (const k of ["last_name", "nickname", "description"]) if (input[k] !== undefined) body[k] = input[k];
  if (input.gender !== undefined) body.gender_id = input.gender === null ? null : (await ctx.resolve.gender(input.gender)).id;
  if (input.birthdate !== undefined) setBirthdate(body, input.birthdate);
  if (input.deceased !== undefined) body.is_deceased = input.deceased;
  if (input.deceased_date !== undefined) {
    for (const k of ["deceased_date_day", "deceased_date_month", "deceased_date_year"]) delete body[k];
    body.is_deceased_date_known = input.deceased_date !== null;
    if (input.deceased_date) {
      body.is_deceased = true;
      [body.deceased_date_year, body.deceased_date_month, body.deceased_date_day] = input.deceased_date.split("-").map(Number);
    }
  }
}

// job, company and how you met have endpoints of their own
async function extras(ctx: Ctx, id: number, input: any) {
  if (input.job !== undefined || input.company !== undefined) {
    const cur = (await ctx.monica.req("GET", `/contacts/${id}`)).data.information?.career ?? {};
    await ctx.monica.req("PUT", `/contacts/${id}/work`, {
      job: input.job !== undefined ? input.job : cur.job ?? null,
      company: input.company !== undefined ? input.company : cur.company ?? null,
    });
  }
  // "How you met" is replaced as a whole too: start from what's there
  if ([input.how_you_met, input.met_through, input.first_met, input.first_met_reminder].some((v) => v !== undefined)) {
    const cur = (await ctx.monica.req("GET", `/contacts/${id}`)).data.information?.how_you_met ?? {};
    const met = cur.first_met_date ?? {};
    const body: Record<string, any> = {
      general_information: input.how_you_met !== undefined ? input.how_you_met : cur.general_information ?? null,
      met_through_contact_id:
        input.met_through === undefined ? cur.first_met_through_contact?.id ?? null : input.met_through === null ? null : (await ctx.resolve.contact(input.met_through)).id,
      is_date_known: !!met.date,
      is_age_based: !!met.is_age_based,
      day: null,
      month: null,
      year: null,
      age: null,
      add_reminder: input.first_met_reminder ?? false,
    };
    if (met.date && !met.is_age_based) {
      body.day = Number(met.date.slice(8, 10));
      body.month = Number(met.date.slice(5, 7));
      if (!met.is_year_unknown) body.year = Number(met.date.slice(0, 4));
    } else if (met.date) body.age = new Date().getFullYear() - new Date(met.date).getFullYear();
    if (input.first_met !== undefined) {
      Object.assign(body, { is_date_known: input.first_met !== null, is_age_based: false, day: null, month: null, year: null, age: null });
      if (input.first_met) {
        const parts = input.first_met.replace(/^--/, "").split("-").map(Number);
        if (parts.length === 3) [body.year, body.month, body.day] = parts;
        else [body.month, body.day] = parts;
      }
    }
    await ctx.monica.req("PUT", `/contacts/${id}/introduction`, body);
  }
}

// Monica's API sorts contacts by when they were added or updated only
const SORT = { recently_added: "-created_at", recently_updated: "-updated_at" } as const;

async function recent(ctx: Ctx, id: number, kind: string) {
  const path = { fields: "contactfields", notes: "notes", activities: "activities", reminders: "reminders", tasks: "tasks", calls: "calls", conversations: "conversations", gifts: "gifts", debts: "debts" }[kind]!;
  const page = await ctx.monica.page(`/contacts/${id}/${path}`, { limit: kind === "fields" ? 50 : 5, sort: kind === "fields" ? undefined : "-created_at" });
  const fmt: Record<string, (x: any) => any> = {
    fields: f.field, notes: f.note, activities: f.activity, reminders: f.reminder, tasks: f.task, calls: f.call, conversations: f.conversation, gifts: f.gift, debts: f.debt,
  };
  // the contact is implied here, so drop it from each item
  return page.data.map((x: any) => {
    const { contact, ...rest } = fmt[kind](x);
    return rest;
  });
}

export const contactsTool = tool({
  name: "monica_contacts",
  description: [
    "People in Monica, the personal CRM. Actions:",
    "• search — find contacts by name, nickname, email or other text. Start here when a person is mentioned.",
    "• list — browse all contacts, a page at a time.",
    "• get — one contact's profile (birthdate, job, how you met, addresses, relationships, tags) plus their contact details, recent notes, activities and reminders; choose more with include.",
    "• create — add a contact. Only first_name is required.",
    "• update — change any profile field; fields left out are kept, null clears one.",
    "• delete — remove a contact and everything attached to it (confirm: true).",
    "Everywhere a contact is needed, a name works as well as an id; if a name matches several people, the error lists them with ids.",
  ].join(" "),
  input: ContactsInput,
  annotations: { ...WRITES, title: "Monica contacts" },
  async handler(ctx, input) {
    switch (input.action) {
      case "search": {
        const res = await ctx.monica.page("/contacts", { query: input.query, limit: input.limit });
        return { query: input.query, total: res.meta?.total ?? res.data.length, contacts: res.data.map(f.contactSummary) };
      }
      case "list": {
        if (input.sort === "name") {
          // by name: fetch them all (a personal CRM's worth) and sort here
          const all = (await ctx.monica.list("/contacts", {}, 5000)).sort((a: any, b: any) =>
            String(a.complete_name ?? "").localeCompare(String(b.complete_name ?? ""), undefined, { sensitivity: "base" }),
          );
          const start = (input.page - 1) * input.limit;
          return { page: input.page, pages: Math.max(1, Math.ceil(all.length / input.limit)), total: all.length, contacts: all.slice(start, start + input.limit).map(f.contactSummary) };
        }
        const res = await ctx.monica.page("/contacts", { page: input.page, limit: input.limit, sort: SORT[input.sort] });
        return { page: input.page, pages: res.meta?.last_page ?? 1, total: res.meta?.total ?? res.data.length, contacts: res.data.map(f.contactSummary) };
      }
      case "get": {
        const { id } = await ctx.resolve.contact(input.contact);
        const c = (await ctx.monica.req("GET", `/contacts/${id}`)).data;
        const out: Record<string, unknown> = f.contactDetail(c);
        for (const kind of input.include) out[kind] = await recent(ctx, id, kind);
        return out;
      }
      case "create": {
        const body = profileBody({ first_name: input.first_name });
        await applyProfile(ctx, body, input);
        const c = (await ctx.monica.req("POST", "/contacts", body)).data;
        await extras(ctx, c.id, input);
        return f.contactDetail((await ctx.monica.req("GET", `/contacts/${c.id}`)).data);
      }
      case "update": {
        const { id } = await ctx.resolve.contact(input.contact);
        const cur = (await ctx.monica.req("GET", `/contacts/${id}`)).data;
        const body = profileBody(cur);
        if (cur.gender && input.gender === undefined) body.gender_id = (await ctx.resolve.gender(cur.gender).catch(() => null))?.id;
        await applyProfile(ctx, body, input);
        await ctx.monica.req("PUT", `/contacts/${id}`, body);
        ctx.resolve.forgetContact(id);
        await extras(ctx, id, input);
        return f.contactDetail((await ctx.monica.req("GET", `/contacts/${id}`)).data);
      }
      case "delete": {
        const c = await ctx.resolve.contact(input.contact);
        const name = c.name || (await ctx.monica.req("GET", `/contacts/${c.id}`)).data.complete_name;
        // Monica keeps a deleted contact's reminders and tasks (and then fails
        // on them), so those go first
        for (const kind of ["reminders", "tasks"]) {
          for (const x of await ctx.monica.list(`/contacts/${c.id}/${kind}`)) await ctx.monica.req("DELETE", `/${kind}/${x.id}`);
        }
        await ctx.monica.req("DELETE", `/contacts/${c.id}`);
        ctx.resolve.forgetContact(c.id);
        return { deleted: { id: c.id, name } };
      }
    }
  },
});
