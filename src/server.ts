// The MCP server: lists the tools, validates each call against its schema,
// and returns results (or a plain explanation of what went wrong) as text.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { MonicaError } from "./monica.js";
import { zodToJsonSchema } from "./schema.js";
import type { Ctx, Tool } from "./tools/common.js";
import { contactsTool } from "./tools/contacts.js";
import { activitiesTool, contactInfoTool, notesTool, relationshipsTool } from "./tools/people.js";
import { callsTool, conversationsTool, giftsDebtsTool, journalTool, remindersTool, tasksTool } from "./tools/keeping-in-touch.js";
import { mediaTool, referenceTool, statusTool } from "./tools/account.js";

export const VERSION = "2.1.1";

export const TOOLS: Tool<any>[] = [
  contactsTool,
  contactInfoTool,
  relationshipsTool,
  notesTool,
  activitiesTool,
  callsTool,
  conversationsTool,
  remindersTool,
  tasksTool,
  giftsDebtsTool,
  journalTool,
  referenceTool,
  mediaTool,
  statusTool,
];

const INSTRUCTIONS = [
  "Monica is a personal CRM: the people in someone's life, what they've done together, what to remember and when to get in touch.",
  "Refer to people by name: every tool takes a contact's name or id, and says when a name is ambiguous.",
  "When a person comes up, monica_contacts search or get first. Log what happened with monica_activities, monica_calls or monica_conversations; things to remember go in monica_notes; follow-ups in monica_reminders or monica_tasks.",
  "Deleting anything needs confirm: true, and can't be undone: only delete when asked to.",
].join(" ");

function explain(e: unknown, tool: string): string {
  if (e instanceof z.ZodError) {
    return `Invalid input for ${tool}: ` + e.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
  }
  if (e instanceof MonicaError) return e.message;
  return e instanceof Error ? e.message : String(e);
}

export function createServer(ctx: Ctx): Server {
  const server = new Server({ name: "monica-mcp", version: VERSION }, { capabilities: { tools: {} }, instructions: INSTRUCTIONS });
  const byName = new Map(TOOLS.map((t) => [t.name, t]));

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: zodToJsonSchema(t.input), annotations: t.annotations })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const t = byName.get(req.params.name);
    if (!t) return { isError: true, content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }] };
    try {
      const input = t.input.parse(req.params.arguments ?? {});
      const out = await t.handler(ctx, input);
      return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
    } catch (e) {
      return { isError: true, content: [{ type: "text", text: explain(e, t.name) }] };
    }
  });

  return server;
}
