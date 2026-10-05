// Reference lists, documents and photos, and the server's status.

import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { z } from "zod";
import * as f from "../format.js";
import { Confirm, Contact, Id, Limit, READS, tool, WRITES } from "./common.js";

const KINDS = {
  genders: { path: "/genders", show: (x: any) => ({ id: x.id, name: x.name }) },
  countries: { path: "/countries", show: (x: any) => ({ id: x.id, name: x.name, iso: x.iso }) },
  currencies: { path: "/currencies", show: (x: any) => ({ id: x.id, iso: x.iso, name: x.name, symbol: x.symbol }) },
  activity_types: { path: "/activitytypes", show: (x: any) => ({ id: x.id, name: x.name, category: x.activity_type_category?.name }) },
  relationship_types: { path: "/relationshiptypes", show: (x: any) => ({ id: x.id, name: x.name, reverse: x.name_reverse_relationship, group: x.relationship_type_group?.name }) },
  contact_field_types: { path: "/contactfieldtypes", show: (x: any) => ({ id: x.id, name: x.name, protocol: x.protocol, type: x.type }) },
  tags: { path: "/tags", show: (x: any) => ({ id: x.id, name: x.name }) },
} as const;

const EDITABLE = { activity_type: "/activitytypes", contact_field_type: "/contactfieldtypes", tag: "/tags" } as const;

export const referenceTool = tool({
  name: "monica_reference",
  description: [
    "Monica's reference lists, which other tools match names against: genders, countries, currencies, activity_types, relationship_types, contact_field_types, tags.",
    "• list — a list, optionally filtered by text.",
    "• create / rename / delete — your own activity types (e.g. 'climbing'), contact field types (e.g. Instagram, with an optional protocol such as https://instagram.com/), and tags. Deleting needs confirm: true.",
  ].join(" "),
  input: z.discriminatedUnion("action", [
    z.object({ action: z.literal("list"), kind: z.enum(Object.keys(KINDS) as [keyof typeof KINDS, ...(keyof typeof KINDS)[]]), filter: z.string().optional() }),
    z.object({
      action: z.literal("create"),
      kind: z.enum(["activity_type", "contact_field_type", "tag"]),
      name: z.string().min(1).max(255),
      category: z.string().optional().describe("activity_type: its category, e.g. Sport, Food, Simple activities"),
      protocol: z.string().max(255).optional().describe("contact_field_type: link prefix, e.g. mailto: or https://instagram.com/"),
    }),
    z.object({ action: z.literal("rename"), kind: z.enum(["activity_type", "contact_field_type", "tag"]), id: Id("item"), name: z.string().min(1).max(255) }),
    z.object({ action: z.literal("delete"), kind: z.enum(["activity_type", "contact_field_type", "tag"]), id: Id("item"), confirm: Confirm }),
  ]),
  annotations: { ...WRITES, title: "Monica reference lists" },
  async handler(ctx, input) {
    const m = ctx.monica;
    if (input.action === "list") {
      const k = KINDS[input.kind];
      let items = (await ctx.resolve.catalog(k.path)).map(k.show);
      if (input.filter) {
        const q = input.filter.toLowerCase();
        items = items.filter((x: any) => Object.values(x).some((v) => String(v ?? "").toLowerCase().includes(q)));
      }
      return { kind: input.kind, count: items.length, items };
    }
    const path = EDITABLE[input.kind];
    let out;
    if (input.action === "create") {
      const body: Record<string, any> = { name: input.name };
      if (input.kind === "activity_type") {
        const cats = await m.list("/activitytypecategories");
        const want = (input.category ?? "Simple activities").toLowerCase();
        const cat = cats.find((c: any) => c.name.toLowerCase() === want);
        if (!cat) throw new Error(`no activity category "${input.category}". Choose one of: ${cats.map((c: any) => c.name).join(", ")}`);
        body.activity_type_category_id = cat.id;
      }
      if (input.kind === "contact_field_type") Object.assign(body, { protocol: input.protocol ?? null, fontawesome_icon: null, delible: true, type: null });
      out = (await m.req("POST", path, body)).data;
    } else if (input.action === "rename") {
      const cur = (await m.req("GET", `${path}/${input.id}`)).data;
      const body: Record<string, any> = { name: input.name };
      if (input.kind === "activity_type") body.activity_type_category_id = cur.activity_type_category?.id;
      if (input.kind === "contact_field_type") Object.assign(body, { protocol: cur.protocol, fontawesome_icon: cur.fontawesome_icon, delible: cur.delible, type: cur.type });
      out = (await m.req("PUT", `${path}/${input.id}`, body)).data;
    } else {
      await m.req("DELETE", `${path}/${input.id}`);
      out = { removed: input.kind, id: input.id };
    }
    ctx.resolve.forget(path);
    return out.id ? { id: out.id, name: out.name } : out;
  },
});

export const mediaTool = tool({
  name: "monica_media",
  description: [
    "Documents and photos attached to contacts. Choose kind, then:",
    "• list — a contact's, or everyone's.",
    "• upload — a file for a contact, from base64 content plus a filename (or, when this server runs on the same machine over stdio, a local path).",
    "• delete — by id (confirm: true).",
  ].join(" "),
  input: z.discriminatedUnion("action", [
    z.object({ action: z.literal("list"), kind: z.enum(["document", "photo"]), contact: Contact.optional(), limit: Limit }),
    z.object({
      action: z.literal("upload"),
      kind: z.enum(["document", "photo"]),
      contact: Contact,
      base64: z.string().optional().describe("The file's content, base64-encoded"),
      filename: z.string().max(255).optional().describe("With base64: the file's name, e.g. passport.pdf"),
      path: z.string().optional().describe("A local file (stdio only)"),
    }),
    z.object({ action: z.literal("delete"), kind: z.enum(["document", "photo"]), id: Id("document or photo"), confirm: Confirm }),
  ]),
  annotations: { ...WRITES, title: "Monica documents and photos" },
  async handler(ctx, input) {
    const m = ctx.monica;
    const path = input.kind === "document" ? "documents" : "photos";
    switch (input.action) {
      case "list": {
        const p = input.contact === undefined ? `/${path}` : `/contacts/${(await ctx.resolve.contact(input.contact)).id}/${path}`;
        return { [path]: (await m.page(p, { limit: input.limit })).data.map(f.media) };
      }
      case "upload": {
        const c = await ctx.resolve.contact(input.contact);
        let bytes: Buffer;
        let name: string;
        if (input.path) {
          if (!ctx.localFiles) throw new Error("path only works when this server runs locally over stdio; send base64 and filename instead");
          const info = await stat(input.path);
          if (info.size > 10 * 1024 * 1024) throw new Error("file is over 10 MB");
          bytes = await readFile(input.path);
          name = basename(input.path);
        } else if (input.base64 && input.filename) {
          bytes = Buffer.from(input.base64, "base64");
          name = input.filename;
        } else {
          throw new Error("give base64 and filename (or a local path over stdio)");
        }
        const form = new FormData();
        form.set("contact_id", String(c.id));
        form.set(input.kind, new Blob([new Uint8Array(bytes)]), name);
        return f.media((await m.req("POST", `/${path}`, form)).data);
      }
      case "delete":
        await m.req("DELETE", `/${path}/${input.id}`);
        return { removed: input.kind, id: input.id };
    }
  },
});

export const statusTool = tool({
  name: "monica_status",
  description: "Check the connection to Monica: the signed-in user, the instance and how many contacts it holds. Useful when other tools fail.",
  input: z.object({}),
  annotations: { ...READS, title: "Monica status" },
  async handler(ctx) {
    const me = (await ctx.monica.req("GET", "/me")).data;
    const contacts = await ctx.monica.page("/contacts", { limit: 1 });
    return {
      connected: true,
      user: [me.first_name, me.last_name].filter(Boolean).join(" ") || null,
      email: me.email,
      timezone: me.timezone ?? null,
      currency: me.currency?.iso ?? null,
      contacts: contacts.meta?.total ?? contacts.data.length,
    };
  },
});
