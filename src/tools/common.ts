// What every tool is made of, and the input pieces they share.

import { z } from "zod";
import type { MonicaClient } from "../monica.js";
import type { Resolver } from "../resolve.js";

export interface Ctx {
  monica: MonicaClient;
  resolve: Resolver;
  // documents and photos can be uploaded from a local path only over stdio,
  // where the server runs on the user's own machine
  localFiles: boolean;
}

export interface Annotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface Tool<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  input: S;
  annotations: Annotations;
  handler: (ctx: Ctx, input: z.infer<S>) => Promise<unknown>;
}

export const tool = <S extends z.ZodTypeAny>(t: Tool<S>) => t;

// Read-only tools change nothing; the others can delete (with confirm).
export const READS: Annotations = { readOnlyHint: true, openWorldHint: false };
export const WRITES: Annotations = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false };

export const Contact = z.union([z.string().min(1), z.number().int()]).describe("A contact's name (full name or nickname) or id");
export const Id = (what: string) => z.number().int().min(1).describe(`The ${what}'s id`);
export const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD").describe("YYYY-MM-DD");
export const Limit = z.number().int().min(1).max(100).default(20).describe("How many to return, newest first");
export const Confirm = z.literal(true).describe("Must be true: deleting can't be undone");

export const today = () => new Date().toISOString().slice(0, 10);
