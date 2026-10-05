// Calls, conversations, reminders, tasks, gifts and debts, and the journal.

import { z } from "zod";
import * as f from "../format.js";
import { Confirm, Contact, Day, Id, Limit, today, tool, WRITES } from "./common.js";

// Monica sorts lists by creation only; these are then ordered by their date
const byDate = (a: any, b: any) => String(b.date).localeCompare(String(a.date));

const contactPath = async (ctx: any, contact: unknown, path: string) =>
  contact === undefined ? `/${path}` : `/contacts/${(await ctx.resolve.contact(contact)).id}/${path}`;

export const callsTool = tool({
  name: "monica_calls",
  description: [
    "Phone calls with contacts.",
    "• list — a contact's calls, or the most recent across everyone.",
    "• create — log a call (date: today by default) with what was said.",
    "• update / delete — by id (delete needs confirm: true).",
  ].join(" "),
  input: z.discriminatedUnion("action", [
    z.object({ action: z.literal("list"), contact: Contact.optional(), limit: Limit }),
    z.object({ action: z.literal("create"), contact: Contact, date: Day.optional(), content: z.string().max(100000).optional().describe("What was talked about") }),
    z.object({ action: z.literal("update"), id: Id("call"), date: Day.optional(), content: z.string().max(100000).nullable().optional() }),
    z.object({ action: z.literal("delete"), id: Id("call"), confirm: Confirm }),
  ]),
  annotations: { ...WRITES, title: "Monica calls" },
  async handler(ctx, input) {
    const m = ctx.monica;
    switch (input.action) {
      case "list":
        return { calls: (await m.page(await contactPath(ctx, input.contact, "calls"), { limit: input.limit, sort: "-created_at" })).data.map(f.call).sort(byDate) };
      case "create": {
        const c = await ctx.resolve.contact(input.contact);
        return f.call((await m.req("POST", "/calls", { contact_id: c.id, called_at: input.date ?? today(), content: input.content ?? null })).data);
      }
      case "update": {
        const cur = (await m.req("GET", `/calls/${input.id}`)).data;
        return f.call(
          (await m.req("PUT", `/calls/${input.id}`, { contact_id: cur.contact.id, called_at: input.date ?? f.day(cur.called_at), content: input.content !== undefined ? input.content : cur.content })).data,
        );
      }
      case "delete":
        await m.req("DELETE", `/calls/${input.id}`);
        return { removed: "call", id: input.id };
    }
  },
});

const Message = z.object({
  from: z.enum(["me", "them"]),
  text: z.string().min(1).max(100000),
  date: Day.optional().describe("YYYY-MM-DD; the conversation's date by default"),
});

export const conversationsTool = tool({
  name: "monica_conversations",
  description: [
    "Message threads with contacts (texts, emails, chats), kept as conversations of messages.",
    "• list — a contact's conversations, or the most recent across everyone.",
    "• get — one conversation with its messages.",
    "• create — record a conversation on a channel (a contact field type such as Email, Phone, Whatsapp, Telegram) with its messages.",
    "• add_message — append a message to a conversation.",
    "• delete — remove a conversation (confirm: true).",
  ].join(" "),
  input: z.discriminatedUnion("action", [
    z.object({ action: z.literal("list"), contact: Contact.optional(), limit: Limit }),
    z.object({ action: z.literal("get"), id: Id("conversation") }),
    z.object({
      action: z.literal("create"),
      contact: Contact,
      channel: z.string().min(1).describe("e.g. Email, Phone, Whatsapp, Telegram"),
      date: Day.optional(),
      messages: z.array(Message).max(200).default([]),
    }),
    z.object({ action: z.literal("add_message"), id: Id("conversation"), from: z.enum(["me", "them"]), text: z.string().min(1).max(100000), date: Day.optional() }),
    z.object({ action: z.literal("delete"), id: Id("conversation"), confirm: Confirm }),
  ]),
  annotations: { ...WRITES, title: "Monica conversations" },
  async handler(ctx, input) {
    const m = ctx.monica;
    const addMessage = (id: number, contactId: number, msg: { from: string; text: string; date?: string }, fallbackDate: string) =>
      m.req("POST", `/conversations/${id}/messages`, { contact_id: contactId, written_at: msg.date ?? fallbackDate, written_by_me: msg.from === "me", content: msg.text });
    switch (input.action) {
      case "list":
        return { conversations: (await m.page(await contactPath(ctx, input.contact, "conversations"), { limit: input.limit, sort: "-created_at" })).data.map(f.conversation).sort(byDate) };
      case "get":
        return f.conversation((await m.req("GET", `/conversations/${input.id}`)).data);
      case "create": {
        const c = await ctx.resolve.contact(input.contact);
        const channel = await ctx.resolve.contactFieldType(input.channel);
        const date = input.date ?? today();
        const conv = (await m.req("POST", "/conversations", { contact_id: c.id, contact_field_type_id: channel.id, happened_at: date })).data;
        for (const msg of input.messages) await addMessage(conv.id, c.id, msg, date);
        return f.conversation((await m.req("GET", `/conversations/${conv.id}`)).data);
      }
      case "add_message": {
        const conv = (await m.req("GET", `/conversations/${input.id}`)).data;
        await addMessage(input.id, conv.contact.id, input, f.day(conv.happened_at) ?? today());
        return f.conversation((await m.req("GET", `/conversations/${input.id}`)).data);
      }
      case "delete":
        await m.req("DELETE", `/conversations/${input.id}`);
        return { removed: "conversation", id: input.id };
    }
  },
});

const REPEAT = { once: "one_time", daily: "day", weekly: "week", monthly: "month", yearly: "year" } as const;

export const remindersTool = tool({
  name: "monica_reminders",
  description: [
    "Reminders about contacts (call Mum on Sunday, a birthday card every year). Monica emails them when due.",
    "• list — upcoming reminders, soonest first: a contact's, or everyone's within the next `days`.",
    "• create — a reminder on a date, once or repeating (daily, weekly, monthly, yearly, every N).",
    "• update / delete — by id (delete needs confirm: true).",
    "Birthday reminders are created by Monica itself when a birthdate is set.",
  ].join(" "),
  input: z.discriminatedUnion("action", [
    z.object({ action: z.literal("list"), contact: Contact.optional(), days: z.number().int().min(1).max(3660).default(90).describe("Without a contact: how far ahead") }),
    z.object({
      action: z.literal("create"),
      contact: Contact,
      title: z.string().min(1).max(255),
      date: Day.describe("The first (or only) date, YYYY-MM-DD"),
      repeat: z.enum(["once", "daily", "weekly", "monthly", "yearly"]).default("once"),
      every: z.number().int().min(1).max(100).default(1).describe("e.g. repeat=weekly, every=2: fortnightly"),
      description: z.string().max(100000).optional(),
    }),
    z.object({
      action: z.literal("update"),
      id: Id("reminder"),
      title: z.string().min(1).max(255).optional(),
      date: Day.optional(),
      repeat: z.enum(["once", "daily", "weekly", "monthly", "yearly"]).optional(),
      every: z.number().int().min(1).max(100).optional(),
      description: z.string().max(100000).nullable().optional(),
    }),
    z.object({ action: z.literal("delete"), id: Id("reminder"), confirm: Confirm }),
  ]),
  annotations: { ...WRITES, title: "Monica reminders" },
  async handler(ctx, input) {
    const m = ctx.monica;
    switch (input.action) {
      case "list": {
        // Monica keeps a deleted contact's reminders, with no contact: skip them
        const all = (await m.list(await contactPath(ctx, input.contact, "reminders"))).filter((r: any) => r.contact).map(f.reminder);
        const until = new Date(Date.now() + input.days * 86400e3).toISOString().slice(0, 10);
        const upcoming = all.filter((r: any) => r.next && (input.contact !== undefined || r.next <= until)).sort((a: any, b: any) => a.next.localeCompare(b.next));
        return { from: today(), ...(input.contact === undefined ? { until } : {}), reminders: upcoming };
      }
      case "create": {
        const c = await ctx.resolve.contact(input.contact);
        const body = { contact_id: c.id, title: input.title, description: input.description ?? null, initial_date: input.date, frequency_type: REPEAT[input.repeat], frequency_number: input.every };
        return f.reminder((await m.req("POST", "/reminders", body)).data);
      }
      case "update": {
        const cur = (await m.req("GET", `/reminders/${input.id}`)).data;
        const body = {
          contact_id: cur.contact.id,
          title: input.title ?? cur.title,
          description: input.description !== undefined ? input.description : cur.description,
          initial_date: input.date ?? f.day(cur.initial_date),
          frequency_type: input.repeat ? REPEAT[input.repeat] : cur.frequency_type,
          frequency_number: input.every ?? cur.frequency_number ?? 1,
        };
        return f.reminder((await m.req("PUT", `/reminders/${input.id}`, body)).data);
      }
      case "delete":
        await m.req("DELETE", `/reminders/${input.id}`);
        return { removed: "reminder", id: input.id };
    }
  },
});

export const tasksTool = tool({
  name: "monica_tasks",
  description: [
    "To-dos tied to a contact (return their book, send the photos).",
    "• list — open tasks (or done ones with done: true), a contact's or everyone's.",
    "• create — a task for a contact.",
    "• update — change it, or mark it done / not done.",
    "• delete — remove it (confirm: true).",
  ].join(" "),
  input: z.discriminatedUnion("action", [
    z.object({ action: z.literal("list"), contact: Contact.optional(), done: z.boolean().default(false), limit: Limit }),
    z.object({ action: z.literal("create"), contact: Contact, title: z.string().min(1).max(255), description: z.string().max(100000).optional() }),
    z.object({ action: z.literal("update"), id: Id("task"), title: z.string().min(1).max(255).optional(), description: z.string().max(100000).nullable().optional(), done: z.boolean().optional() }),
    z.object({ action: z.literal("delete"), id: Id("task"), confirm: Confirm }),
  ]),
  annotations: { ...WRITES, title: "Monica tasks" },
  async handler(ctx, input) {
    const m = ctx.monica;
    switch (input.action) {
      case "list": {
        const all = (await m.list(await contactPath(ctx, input.contact, "tasks"), {}, 500)).filter((t: any) => t.contact).map(f.task);
        return { done: input.done, tasks: all.filter((t: any) => t.done === input.done).slice(0, input.limit) };
      }
      case "create": {
        const c = await ctx.resolve.contact(input.contact);
        return f.task((await m.req("POST", "/tasks", { contact_id: c.id, title: input.title, description: input.description ?? null, completed: false })).data);
      }
      case "update": {
        const cur = (await m.req("GET", `/tasks/${input.id}`)).data;
        const body = {
          contact_id: cur.contact.id,
          title: input.title ?? cur.title,
          description: input.description !== undefined ? input.description : cur.description,
          completed: input.done ?? !!cur.completed,
        };
        return f.task((await m.req("PUT", `/tasks/${input.id}`, body)).data);
      }
      case "delete":
        await m.req("DELETE", `/tasks/${input.id}`);
        return { removed: "task", id: input.id };
    }
  },
});

export const giftsDebtsTool = tool({
  name: "monica_gifts_debts",
  description: [
    "Gifts (ideas, given, received) and money owed between you and contacts. Choose kind, then:",
    "• list — a contact's, or everyone's.",
    "• create — gift: name, status (idea, offered, received), optional value, url, comment, date. debt: amount, direction (i_owe or they_owe), reason.",
    "• update — by id; a debt can be marked settled.",
    "• delete — by id (confirm: true).",
  ].join(" "),
  input: z.discriminatedUnion("action", [
    z.object({ action: z.literal("list"), kind: z.enum(["gift", "debt"]), contact: Contact.optional(), limit: Limit }),
    z.object({
      action: z.literal("create"),
      kind: z.enum(["gift", "debt"]),
      contact: Contact,
      name: z.string().max(255).optional().describe("gift: what it is"),
      status: z.enum(["idea", "offered", "received"]).optional().describe("gift: idea (default), offered (given by me), received"),
      value: z.number().min(0).optional().describe("gift: what it cost"),
      url: z.string().max(1000).optional(),
      comment: z.string().max(100000).optional(),
      date: Day.optional().describe("gift: when it was given or received"),
      amount: z.number().min(0).optional().describe("debt: how much"),
      direction: z.enum(["i_owe", "they_owe"]).optional().describe("debt: who owes whom"),
      reason: z.string().max(100000).optional().describe("debt: what for"),
    }),
    z.object({
      action: z.literal("update"),
      kind: z.enum(["gift", "debt"]),
      id: Id("gift or debt"),
      name: z.string().max(255).optional(),
      status: z.enum(["idea", "offered", "received"]).optional(),
      value: z.number().min(0).nullable().optional(),
      url: z.string().max(1000).nullable().optional(),
      comment: z.string().max(100000).nullable().optional(),
      date: Day.nullable().optional(),
      amount: z.number().min(0).optional(),
      direction: z.enum(["i_owe", "they_owe"]).optional(),
      reason: z.string().max(100000).nullable().optional(),
      settled: z.boolean().optional().describe("debt: paid back"),
    }),
    z.object({ action: z.literal("delete"), kind: z.enum(["gift", "debt"]), id: Id("gift or debt"), confirm: Confirm }),
  ]),
  annotations: { ...WRITES, title: "Monica gifts and debts" },
  async handler(ctx, input) {
    const m = ctx.monica;
    const path = input.kind === "gift" ? "gifts" : "debts";
    const fmt: (x: any) => Record<string, unknown> = input.kind === "gift" ? f.gift : f.debt;
    switch (input.action) {
      case "list":
        return { [path]: (await m.page(await contactPath(ctx, input.contact, path), { limit: input.limit, sort: "-created_at" })).data.map(fmt) };
      case "create": {
        const c = await ctx.resolve.contact(input.contact);
        if (input.kind === "gift") {
          if (!input.name) throw new Error("gift: give its name");
          const body = { contact_id: c.id, name: input.name, status: input.status ?? "idea", value: input.value ?? null, url: input.url ?? null, comment: input.comment ?? null, date: input.date ?? null };
          return fmt((await m.req("POST", "/gifts", body)).data);
        }
        if (input.amount === undefined || !input.direction) throw new Error("debt: give amount and direction");
        const body = { contact_id: c.id, in_debt: input.direction === "i_owe" ? "yes" : "no", status: "inprogress", amount: input.amount, reason: input.reason ?? null };
        return fmt((await m.req("POST", "/debts", body)).data);
      }
      case "update": {
        const cur = (await m.req("GET", `/${path}/${input.id}`)).data;
        const keep = (v: any, old: any) => (v !== undefined ? v : old);
        const body =
          input.kind === "gift"
            ? {
                contact_id: cur.contact.id,
                name: input.name ?? cur.name,
                status: input.status ?? cur.status,
                value: keep(input.value, cur.value),
                url: keep(input.url, cur.url),
                comment: keep(input.comment, cur.comment),
                date: keep(input.date, f.day(cur.date)),
              }
            : {
                contact_id: cur.contact.id,
                in_debt: input.direction ? (input.direction === "i_owe" ? "yes" : "no") : cur.in_debt,
                status: input.settled === undefined ? cur.status : input.settled ? "completed" : "inprogress",
                amount: input.amount ?? cur.amount,
                reason: keep(input.reason, cur.reason),
              };
        return fmt((await m.req("PUT", `/${path}/${input.id}`, body)).data);
      }
      case "delete":
        await m.req("DELETE", `/${path}/${input.id}`);
        return { removed: input.kind, id: input.id };
    }
  },
});

export const journalTool = tool({
  name: "monica_journal",
  description: [
    "The journal: dated entries about your own days, not tied to a contact.",
    "• list — recent entries. • get — one entry. • create — write an entry (date: today by default).",
    "• update — change it. • delete — remove it (confirm: true).",
  ].join(" "),
  input: z.discriminatedUnion("action", [
    z.object({ action: z.literal("list"), limit: Limit }),
    z.object({ action: z.literal("get"), id: Id("journal entry") }),
    z.object({ action: z.literal("create"), post: z.string().min(1).max(1000000), title: z.string().max(255).optional(), date: Day.optional() }),
    z.object({ action: z.literal("update"), id: Id("journal entry"), post: z.string().min(1).max(1000000).optional(), title: z.string().max(255).nullable().optional(), date: Day.optional() }),
    z.object({ action: z.literal("delete"), id: Id("journal entry"), confirm: Confirm }),
  ]),
  annotations: { ...WRITES, title: "Monica journal" },
  async handler(ctx, input) {
    const m = ctx.monica;
    switch (input.action) {
      case "list":
        return { entries: (await m.page("/journal", { limit: input.limit, sort: "-created_at" })).data.map(f.journalEntry) };
      case "get":
        return f.journalEntry((await m.req("GET", `/journal/${input.id}`)).data);
      case "create":
        return f.journalEntry((await m.req("POST", "/journal", { title: input.title ?? null, post: input.post, date: input.date ?? today() })).data);
      case "update": {
        const cur = (await m.req("GET", `/journal/${input.id}`)).data;
        const body = { title: input.title !== undefined ? input.title : cur.title, post: input.post ?? cur.post, date: input.date ?? f.day(cur.date) };
        return f.journalEntry((await m.req("PUT", `/journal/${input.id}`, body)).data);
      }
      case "delete":
        await m.req("DELETE", `/journal/${input.id}`);
        return { removed: "journal entry", id: input.id };
    }
  },
});
