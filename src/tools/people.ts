// Contact details, relationships, notes and activities.

import { z } from "zod";
import * as f from "../format.js";
import { Confirm, Contact, Day, Id, Limit, today, tool, WRITES } from "./common.js";

export const contactInfoTool = tool({
  name: "monica_contact_info",
  description: [
    "A contact's details: contact fields (email, phone, social profiles…), postal addresses, and tags. Choose kind, then:",
    "• list — the contact's fields, addresses or tags.",
    "• add — a field (type by name, e.g. Email, Phone, Instagram, plus value), an address, or tags (by name; new tags are created).",
    "• update — a field or address by its id.",
    "• remove — a field or address by id, or tags from the contact by name (confirm: true for fields and addresses).",
    "Field types: monica_reference kind=contact_field_types; new types can be added there.",
  ].join(" "),
  input: z.discriminatedUnion("action", [
    z.object({ action: z.literal("list"), kind: z.enum(["field", "address", "tag"]), contact: Contact }),
    z.object({
      action: z.literal("add"),
      kind: z.enum(["field", "address", "tag"]),
      contact: Contact,
      type: z.string().optional().describe("field: its type, e.g. Email, Phone, Telegram"),
      value: z.string().max(255).optional().describe("field: the email address, number, handle…"),
      name: z.string().max(255).optional().describe("address: a label, e.g. Home"),
      street: z.string().max(255).optional(),
      city: z.string().max(255).optional(),
      province: z.string().max(255).optional(),
      postal_code: z.string().max(255).optional(),
      country: z.string().optional().describe("address: country name or ISO code, e.g. GB"),
      tags: z.array(z.string().min(1).max(255)).optional().describe("tag: tag names"),
    }),
    z.object({
      action: z.literal("update"),
      kind: z.enum(["field", "address"]),
      id: Id("field or address"),
      type: z.string().optional(),
      value: z.string().max(255).optional(),
      name: z.string().max(255).optional(),
      street: z.string().max(255).optional(),
      city: z.string().max(255).optional(),
      province: z.string().max(255).optional(),
      postal_code: z.string().max(255).optional(),
      country: z.string().optional(),
    }),
    z.object({
      action: z.literal("remove"),
      kind: z.enum(["field", "address", "tag"]),
      id: z.number().int().min(1).optional().describe("field or address: its id"),
      contact: Contact.optional().describe("tag: the contact to untag"),
      tags: z.array(z.string().min(1)).optional().describe("tag: tag names to remove"),
      confirm: z.literal(true).optional().describe("field or address: must be true"),
    }),
  ]),
  annotations: { ...WRITES, title: "Monica contact details" },
  async handler(ctx, input) {
    const m = ctx.monica;
    if (input.kind === "tag") {
      if (input.action === "list") {
        const c = await ctx.resolve.contact(input.contact);
        return { contact: c.name ? c : { id: c.id }, tags: ((await m.req("GET", `/contacts/${c.id}`)).data.tags ?? []).map((t: any) => t.name) };
      }
      if (input.action === "add" || input.action === "remove") {
        if (!input.contact || !input.tags?.length) throw new Error("tag: give contact and tags");
        const c = await ctx.resolve.contact(input.contact);
        let tags: any[];
        if (input.action === "add") {
          tags = (await m.req("POST", `/contacts/${c.id}/setTags`, { tags: input.tags })).data.tags;
          ctx.resolve.forget("/tags");
        } else {
          const all = await m.list("/tags");
          const ids = input.tags.map((n) => {
            const t = all.find((x: any) => x.name.toLowerCase() === n.toLowerCase());
            if (!t) throw new Error(`no tag "${n}"`);
            return t.id;
          });
          tags = (await m.req("POST", `/contacts/${c.id}/unsetTag`, { tags: ids })).data.tags;
        }
        return { contact: c.name ? c : { id: c.id }, tags: (tags ?? []).map((t: any) => t.name) };
      }
    }
    const path = input.kind === "field" ? "contactfields" : "addresses";
    const fmt: (x: any) => Record<string, unknown> = input.kind === "field" ? f.field : f.address;
    switch (input.action) {
      case "list": {
        const c = await ctx.resolve.contact(input.contact);
        return { contact: c.name ? c : { id: c.id }, [input.kind === "field" ? "fields" : "addresses"]: (await m.list(`/contacts/${c.id}/${path}`)).map(fmt) };
      }
      case "add": {
        const c = await ctx.resolve.contact(input.contact);
        if (input.kind === "field") {
          if (!input.type || !input.value) throw new Error("field: give type and value");
          const t = await ctx.resolve.contactFieldType(input.type);
          return fmt((await m.req("POST", "/contactfields", { contact_id: c.id, contact_field_type_id: t.id, data: input.value })).data);
        }
        return fmt((await m.req("POST", "/addresses", await addressBody(ctx, { contact_id: c.id }, input))).data);
      }
      case "update": {
        const cur = (await m.req("GET", `/${path}/${input.id}`)).data;
        if (input.kind === "field") {
          const t = input.type ? await ctx.resolve.contactFieldType(input.type) : cur.contact_field_type;
          return fmt((await m.req("PUT", `/contactfields/${input.id}`, { contact_id: cur.contact.id, contact_field_type_id: t.id, data: input.value ?? cur.content })).data);
        }
        const base = { contact_id: cur.contact.id, name: cur.name, street: cur.street, city: cur.city, province: cur.province, postal_code: cur.postal_code, country: cur.country?.id };
        return fmt((await m.req("PUT", `/addresses/${input.id}`, await addressBody(ctx, base, input))).data);
      }
      case "remove": {
        if (!input.id || input.confirm !== true) throw new Error(`${input.kind}: give its id and confirm: true`);
        await m.req("DELETE", `/${path}/${input.id}`);
        return { removed: input.kind, id: input.id };
      }
    }
  },
});

async function addressBody(ctx: any, base: Record<string, any>, input: any) {
  const body = { ...base };
  for (const k of ["name", "street", "city", "province", "postal_code"]) if (input[k] !== undefined) body[k] = input[k];
  if (input.country) body.country = (await ctx.resolve.country(input.country)).id;
  return body;
}

export const relationshipsTool = tool({
  name: "monica_relationships",
  description: [
    "How contacts are related. A relationship reads 'contact is <type> of other', e.g. contact=Alice, type=parent, other=Bob means Alice is Bob's parent; Monica records the reverse (Bob is Alice's child) itself.",
    "• list — a contact's relationships.",
    "• add — relate two contacts.",
    "• update — change a relationship's type.",
    "• remove — delete a relationship (confirm: true).",
    "Types include partner, spouse, date, ex, parent, child, sibling, grandparent, uncle, cousin, friend, bestfriend, colleague, boss, mentor (monica_reference kind=relationship_types).",
  ].join(" "),
  input: z.discriminatedUnion("action", [
    z.object({ action: z.literal("list"), contact: Contact }),
    z.object({ action: z.literal("add"), contact: Contact, type: z.string().min(1), other: Contact }),
    z.object({ action: z.literal("update"), id: Id("relationship"), type: z.string().min(1) }),
    z.object({ action: z.literal("remove"), id: Id("relationship"), confirm: Confirm }),
  ]),
  annotations: { ...WRITES, title: "Monica relationships" },
  async handler(ctx, input) {
    const m = ctx.monica;
    const rel = (r: any) => ({ id: r.id, contact: r.contact_is?.complete_name, is: r.relationship_type?.name ?? r.relationship?.name, of: r.of_contact?.complete_name });
    switch (input.action) {
      case "list": {
        const c = await ctx.resolve.contact(input.contact);
        return { contact: c.name ? c : { id: c.id }, relationships: (await m.list(`/contacts/${c.id}/relationships`)).map(rel) };
      }
      case "add": {
        const [a, b] = await ctx.resolve.contacts([input.contact, input.other]);
        const t = await ctx.resolve.relationshipType(input.type);
        return rel((await m.req("POST", "/relationships", { contact_is: a.id, relationship_type_id: t.id, of_contact: b.id })).data);
      }
      case "update": {
        const t = await ctx.resolve.relationshipType(input.type);
        return rel((await m.req("PUT", `/relationships/${input.id}`, { relationship_type_id: t.id })).data);
      }
      case "remove":
        await m.req("DELETE", `/relationships/${input.id}`);
        return { removed: "relationship", id: input.id };
    }
  },
});

export const notesTool = tool({
  name: "monica_notes",
  description: [
    "Notes about contacts: things to remember about someone.",
    "• list — a contact's notes, or the most recent notes across everyone.",
    "• get — one note in full.",
    "• create / update — write a note about a contact; favorite pins it.",
    "• delete — remove a note (confirm: true).",
  ].join(" "),
  input: z.discriminatedUnion("action", [
    z.object({ action: z.literal("list"), contact: Contact.optional(), limit: Limit }),
    z.object({ action: z.literal("get"), id: Id("note") }),
    z.object({ action: z.literal("create"), contact: Contact, body: z.string().min(1).max(100000), favorite: z.boolean().default(false) }),
    z.object({ action: z.literal("update"), id: Id("note"), body: z.string().min(1).max(100000).optional(), favorite: z.boolean().optional() }),
    z.object({ action: z.literal("delete"), id: Id("note"), confirm: Confirm }),
  ]),
  annotations: { ...WRITES, title: "Monica notes" },
  async handler(ctx, input) {
    const m = ctx.monica;
    switch (input.action) {
      case "list": {
        const path = input.contact ? `/contacts/${(await ctx.resolve.contact(input.contact)).id}/notes` : "/notes";
        return { notes: (await m.page(path, { limit: input.limit, sort: "-created_at" })).data.map(f.note) };
      }
      case "get":
        return f.note((await m.req("GET", `/notes/${input.id}`)).data);
      case "create": {
        const c = await ctx.resolve.contact(input.contact);
        return f.note((await m.req("POST", "/notes", { contact_id: c.id, body: input.body, is_favorited: input.favorite })).data);
      }
      case "update": {
        const cur = (await m.req("GET", `/notes/${input.id}`)).data;
        return f.note(
          (await m.req("PUT", `/notes/${input.id}`, { contact_id: cur.contact.id, body: input.body ?? cur.body, is_favorited: input.favorite ?? cur.is_favorited })).data,
        );
      }
      case "delete":
        await m.req("DELETE", `/notes/${input.id}`);
        return { removed: "note", id: input.id };
    }
  },
});

export const activitiesTool = tool({
  name: "monica_activities",
  description: [
    "Things done together with contacts (a coffee, a trip, a dinner).",
    "• list — a contact's activities, or the most recent across everyone.",
    "• get — one activity.",
    "• create — log an activity with one or more contacts, a summary and a date (today by default), optionally typed (e.g. 'ate at a restaurant', 'went to a bar'; monica_reference kind=activity_types).",
    "• update — change any of it; contacts, if given, replace the list.",
    "• delete — remove an activity (confirm: true).",
  ].join(" "),
  input: z.discriminatedUnion("action", [
    z.object({ action: z.literal("list"), contact: Contact.optional(), limit: Limit }),
    z.object({ action: z.literal("get"), id: Id("activity") }),
    z.object({
      action: z.literal("create"),
      contacts: z.array(Contact).min(1).describe("Who it was with"),
      summary: z.string().min(1).max(255),
      date: Day.optional().describe("YYYY-MM-DD; today by default"),
      type: z.string().optional().describe("An activity type name"),
      description: z.string().max(100000).optional(),
    }),
    z.object({
      action: z.literal("update"),
      id: Id("activity"),
      contacts: z.array(Contact).min(1).optional(),
      summary: z.string().min(1).max(255).optional(),
      date: Day.optional(),
      type: z.string().nullable().optional(),
      description: z.string().max(100000).nullable().optional(),
    }),
    z.object({ action: z.literal("delete"), id: Id("activity"), confirm: Confirm }),
  ]),
  annotations: { ...WRITES, title: "Monica activities" },
  async handler(ctx, input) {
    const m = ctx.monica;
    switch (input.action) {
      case "list": {
        const path = input.contact ? `/contacts/${(await ctx.resolve.contact(input.contact)).id}/activities` : "/activities";
        // Monica sorts lists by creation only: newest entries, ordered by date
        const items = (await m.page(path, { limit: input.limit, sort: "-created_at" })).data.map(f.activity);
        return { activities: items.sort((a: any, b: any) => String(b.date).localeCompare(String(a.date))) };
      }
      case "get":
        return f.activity((await m.req("GET", `/activities/${input.id}`)).data);
      case "create": {
        const people = await ctx.resolve.contacts(input.contacts);
        const body: Record<string, any> = { summary: input.summary, description: input.description ?? null, happened_at: input.date ?? today(), contacts: people.map((p) => p.id) };
        if (input.type) body.activity_type_id = (await ctx.resolve.activityType(input.type)).id;
        return f.activity((await m.req("POST", "/activities", body)).data);
      }
      case "update": {
        const cur = (await m.req("GET", `/activities/${input.id}`)).data;
        const body: Record<string, any> = {
          summary: input.summary ?? cur.summary,
          description: input.description !== undefined ? input.description : cur.description,
          happened_at: input.date ?? f.day(cur.happened_at),
          contacts: input.contacts ? (await ctx.resolve.contacts(input.contacts)).map((p) => p.id) : (cur.attendees?.contacts ?? []).map((c: any) => c.id),
          activity_type_id: input.type === undefined ? cur.activity_type?.id ?? null : input.type === null ? null : (await ctx.resolve.activityType(input.type)).id,
        };
        return f.activity((await m.req("PUT", `/activities/${input.id}`, body)).data);
      }
      case "delete":
        await m.req("DELETE", `/activities/${input.id}`);
        return { removed: "activity", id: input.id };
    }
  },
});
