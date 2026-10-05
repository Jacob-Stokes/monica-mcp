// Names to ids. Tools take a contact, activity type, relationship type and
// so on by name (or id); this turns them into Monica's ids, and says plainly
// when a name matches nothing or several things.

import type { MonicaClient } from "./monica.js";

export type Ref = string | number;

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_]+/g, " ");

export class Resolver {
  private catalogs = new Map<string, Promise<any[]>>();
  // names already resolved to a contact, for a few minutes: saves a search
  // per call against Monica's rate limit when a conversation keeps
  // referring to the same people
  private names = new Map<string, { id: number; name: string; at: number }>();

  constructor(private monica: MonicaClient) {}

  // A reference list (genders, activity types, ...): cached for the server's
  // lifetime; refreshed after a change made through this server.
  catalog(path: string): Promise<any[]> {
    let p = this.catalogs.get(path);
    if (!p) {
      p = this.monica.list(path);
      p.catch(() => this.catalogs.delete(path));
      this.catalogs.set(path, p);
    }
    return p;
  }

  forget(path: string) {
    this.catalogs.delete(path);
  }

  // An item of a catalog by id or name (case- and underscore-insensitive)
  async pick(path: string, what: string, ref: Ref, names: (x: any) => string[] = (x) => [x.name]): Promise<any> {
    const items = await this.catalog(path);
    if (typeof ref === "number" || /^\d+$/.test(String(ref))) {
      const hit = items.find((x) => x.id === Number(ref));
      if (hit) return hit;
    }
    const want = norm(String(ref));
    const hit = items.find((x) => names(x).some((n) => n && norm(n) === want));
    if (hit) return hit;
    const choices = items.map((x) => names(x)[0]).filter(Boolean);
    throw new Error(`no ${what} "${ref}". Choose one of: ${choices.slice(0, 60).join(", ")}${choices.length > 60 ? ", …" : ""}`);
  }

  gender(ref: Ref) {
    return this.pick("/genders", "gender", ref);
  }
  activityType(ref: Ref) {
    return this.pick("/activitytypes", "activity type", ref);
  }
  relationshipType(ref: Ref) {
    return this.pick("/relationshiptypes", "relationship type", ref, (x) => [x.name, x.name_reverse_relationship]);
  }
  contactFieldType(ref: Ref) {
    return this.pick("/contactfieldtypes", "contact field type", ref, (x) => [x.name, x.type]);
  }
  country(ref: Ref) {
    return this.pick("/countries", "country", ref, (x) => [x.name, x.iso, x.id]);
  }
  currency(ref: Ref) {
    return this.pick("/currencies", "currency", ref, (x) => [x.iso, x.name]);
  }

  // A contact by id or name. A name searches Monica, then prefers an exact
  // match on the full name or nickname; several equally good matches are
  // an error listing them, so the caller can pick by id.
  async contact(ref: Ref): Promise<{ id: number; name: string }> {
    // an id is used as it is: the request that uses it fails if it's wrong
    if (typeof ref === "number" || /^\d+$/.test(String(ref))) return { id: Number(ref), name: "" };
    const q = String(ref).trim();
    if (!q) throw new Error("contact is empty: give a name or an id");
    const cached = this.names.get(norm(q));
    if (cached && Date.now() - cached.at < 300_000) return { id: cached.id, name: cached.name };
    const found = (await this.monica.page("/contacts", { query: q, limit: 25 })).data;
    if (found.length === 0) throw new Error(`no contact matches "${q}". Search with monica_contacts action=search, or create one.`);
    const want = norm(q);
    const exact = found.filter((c: any) =>
      [`${c.first_name ?? ""} ${c.last_name ?? ""}`, c.complete_name, c.nickname, c.first_name].some((n) => n && norm(n) === want),
    );
    const pool = exact.length ? exact : found;
    if (pool.length === 1) {
      this.names.set(want, { id: pool[0].id, name: pool[0].complete_name, at: Date.now() });
      return { id: pool[0].id, name: pool[0].complete_name };
    }
    const list = pool.slice(0, 10).map((c: any) => `${c.complete_name} (id ${c.id})`).join("; ");
    throw new Error(`"${q}" matches ${pool.length} contacts: ${list}. Pass the id instead.`);
  }

  // after a contact is deleted or renamed
  forgetContact(id: number) {
    for (const [k, v] of this.names) if (v.id === id) this.names.delete(k);
  }

  async contacts(refs: Ref[]) {
    const out = [];
    for (const r of refs) out.push(await this.contact(r));
    return out;
  }
}
