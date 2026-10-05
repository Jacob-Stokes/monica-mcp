// Monica's responses, trimmed to what's useful in a conversation: names
// instead of nested objects, plain dates, no account or URL noise.

export const day = (v: string | null | undefined) => (v ? String(v).slice(0, 10) : null);

const clean = <T extends Record<string, any>>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0))) as T;

const who = (c: any) => (c ? clean({ id: c.id, name: c.complete_name ?? [c.first_name, c.last_name].filter(Boolean).join(" ") }) : null);

export function birthdate(info: any) {
  const b = info?.dates?.birthdate;
  if (!b?.date) return null;
  if (b.is_age_based) return `about ${new Date().getFullYear() - new Date(b.date).getFullYear()} years old`;
  return b.is_year_unknown ? `--${b.date.slice(5, 10)}` : day(b.date);
}

export function contactSummary(c: any) {
  return clean({
    id: c.id,
    name: c.complete_name,
    first_name: c.first_name,
    last_name: c.last_name,
    nickname: c.nickname,
    gender: c.gender,
    birthdate: birthdate(c.information),
    deceased: c.is_dead || null,
    starred: c.is_starred || null,
    job: c.information?.career?.job,
    company: c.information?.career?.company,
    tags: (c.tags ?? []).map((t: any) => t.name),
    last_activity_together: day(c.last_activity_together),
    last_called: day(c.last_called),
  });
}

export function contactDetail(c: any) {
  const info = c.information ?? {};
  const rel = info.relationships ?? {};
  const relationships = Object.values(rel).flatMap((g: any) =>
    (g?.contacts ?? []).map((r: any) => ({ id: r.relationship?.id, type: r.relationship?.name, contact: who(r.contact) })),
  );
  return clean({
    ...contactSummary(c),
    description: c.description,
    how_you_met: info.how_you_met?.general_information,
    first_met: day(info.how_you_met?.first_met_date?.date),
    food_preferences: info.food_preferences,
    deceased_date: day(info.dates?.deceased_date?.date),
    stay_in_touch_every_days: c.stay_in_touch_frequency,
    addresses: (c.addresses ?? []).map(address),
    relationships,
    statistics: c.statistics,
    created: day(c.created_at),
    updated: day(c.updated_at),
  });
}

export const field = (f: any) => clean({ id: f.id, type: f.contact_field_type?.name, value: f.content, labels: (f.labels ?? []).map((l: any) => l.name) });

export const address = (a: any) =>
  clean({
    id: a.id,
    name: a.name,
    street: a.street,
    city: a.city,
    province: a.province,
    postal_code: a.postal_code,
    country: a.country?.name ?? a.country?.iso,
  });

export const note = (n: any) => clean({ id: n.id, contact: who(n.contact), body: n.body, favorite: n.is_favorited || null, created: day(n.created_at), updated: day(n.updated_at) });

export const activity = (a: any) =>
  clean({
    id: a.id,
    date: day(a.happened_at),
    type: a.activity_type?.name,
    summary: a.summary,
    description: a.description,
    with: (a.attendees?.contacts ?? []).map(who),
  });

export const call = (c: any) => clean({ id: c.id, contact: who(c.contact), date: day(c.called_at), content: c.content, contact_called: c.contact_called });

export const conversation = (c: any) =>
  clean({
    id: c.id,
    contact: who(c.contact),
    date: day(c.happened_at),
    channel: c.contact_field_type?.name,
    messages: (c.messages ?? []).map((m: any) => clean({ id: m.id, from: m.written_by_me ? "me" : "them", date: day(m.written_at), text: m.content })),
  });

const REPEAT: Record<string, string> = { one_time: "once", day: "daily", week: "weekly", month: "monthly", year: "yearly" };

// The next date a reminder comes round on (today or later)
export function nextOccurrence(r: any, today = new Date().toISOString().slice(0, 10)): string | null {
  const start = day(r.initial_date);
  if (!start) return null;
  if (r.frequency_type === "one_time" || start >= today) return start >= today || r.frequency_type !== "one_time" ? start : null;
  const n = Math.max(1, r.frequency_number ?? 1);
  const [y, m, dd] = start.split("-").map(Number);
  // the k-th occurrence, counted from the start each time; months and years
  // keep the start's day, or the month's last day if it's shorter (31 Aug →
  // 30 Sep → 31 Oct)
  const nth = (k: number) => {
    if (r.frequency_type === "day" || r.frequency_type === "week") {
      return new Date(Date.UTC(y, m - 1, dd + k * n * (r.frequency_type === "week" ? 7 : 1)));
    }
    const months = (m - 1) + k * n * (r.frequency_type === "month" ? 1 : 12);
    const last = new Date(Date.UTC(y, months + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, months, Math.min(dd, last)));
  };
  for (let k = 1; k < 100000; k++) {
    const next = nth(k).toISOString().slice(0, 10);
    if (next >= today) return next;
  }
  return null;
}

export const reminder = (r: any) =>
  clean({
    id: r.id,
    contact: who(r.contact),
    title: r.title,
    description: r.description,
    starts: day(r.initial_date),
    repeats: r.frequency_type === "one_time" ? "once" : `${REPEAT[r.frequency_type] ?? r.frequency_type}${r.frequency_number > 1 ? ` (every ${r.frequency_number})` : ""}`,
    next: nextOccurrence(r),
  });

export const task = (t: any) => clean({ id: t.id, contact: who(t.contact), title: t.title, description: t.description, done: !!t.completed, done_on: day(t.completed_at), created: day(t.created_at) });

export const gift = (g: any) =>
  clean({ id: g.id, contact: who(g.contact), name: g.name, status: g.status, value: g.amount_with_currency ?? g.value, comment: g.comment, url: g.url, date: day(g.date) });

export const debt = (d: any) =>
  clean({
    id: d.id,
    contact: who(d.contact),
    direction: d.in_debt === "yes" ? "I owe them" : "they owe me",
    amount: d.amount_with_currency ?? d.amount,
    reason: d.reason,
    status: d.status === "complete" || d.status === "completed" ? "settled" : "outstanding",
    created: day(d.created_at),
  });

export const journalEntry = (j: any) => clean({ id: j.id, date: day(j.date), title: j.title, post: j.post });

export const media = (m: any) =>
  clean({ id: m.id, contact: who(m.contact), name: m.original_filename ?? m.filename, type: m.mime_type, size: m.filesize, url: m.link, created: day(m.created_at) });
