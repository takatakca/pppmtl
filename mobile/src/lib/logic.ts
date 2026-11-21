// Pure ordering rules of the app, the same as the website's (src/lib/modifiers.ts, src/lib/pricing.ts,
// src/config/delivery.ts). The server checks and prices everything again; the app uses them to guide the customer.
// No React Native import here: test/logic.check.mjs runs this file with Node.
import type { CartLine, Item, ModifierChoice, ModifierGroup, Selections, TaxRate } from './types';

// ---------- options ----------
export function groupMin(group: ModifierGroup): number {
  return Math.max(0, group.min ?? (group.required ? 1 : 0));
}
export function groupMax(group: ModifierGroup): number {
  return Math.max(groupMin(group), group.max ?? 1, 1);
}
export function chosenIds(selections: Selections, groupId: string): string[] {
  const raw = selections?.[groupId];
  return typeof raw === 'string' ? raw.split(',').filter(Boolean) : [];
}
function withGroup(selections: Selections, groupId: string, ids: string[]): Selections {
  const next = { ...selections };
  if (ids.length) next[groupId] = ids.join(',');
  else delete next[groupId];
  return next;
}
/** Tap on an option: one-option groups swap it (a required one cannot be emptied), others toggle up to the max. */
export function toggleChoice(selections: Selections, group: ModifierGroup, choiceId: string): Selections {
  const current = chosenIds(selections, group.id);
  const max = groupMax(group);
  if (current.includes(choiceId)) {
    if (max === 1 && groupMin(group) >= 1) return selections;
    return withGroup(selections, group.id, current.filter((c) => c !== choiceId));
  }
  if (max === 1) return withGroup(selections, group.id, [choiceId]);
  if (current.length >= max) return selections;
  return withGroup(selections, group.id, [...current, choiceId]);
}
const usable = (c: ModifierChoice) => c.available !== false;
/** Required groups with a single possible option are chosen for the customer. */
export function defaultSelections(groups: ModifierGroup[]): Selections {
  const out: Selections = {};
  for (const group of groups) {
    const choices = group.choices.filter(usable);
    if (groupMin(group) >= 1 && choices.length === 1 && choices[0]) out[group.id] = choices[0].id;
  }
  return out;
}
/** Groups that still need a choice (fewer than their minimum). */
export function missingGroups(groups: ModifierGroup[], selections: Selections): ModifierGroup[] {
  return groups.filter((g) => new Set(chosenIds(selections, g.id)).size < groupMin(g));
}
export function optionsTotal(groups: ModifierGroup[], selections: Selections): number {
  let cents = 0;
  for (const group of groups) {
    const ids = chosenIds(selections, group.id);
    for (const c of group.choices) if (ids.includes(c.id)) cents += Math.round((c.priceDelta ?? 0) * 100);
  }
  return cents / 100;
}
export function keepKnownSelections(groups: ModifierGroup[], selections: Selections): Selections {
  let out: Selections = {};
  for (const group of groups) {
    const ids = chosenIds(selections, group.id).filter((id) => group.choices.some((c) => c.id === id));
    out = withGroup(out, group.id, ids.slice(0, groupMax(group)));
  }
  return out;
}
export function selectionSummary(groups: ModifierGroup[], selections: Selections, fr: boolean): string[] {
  return groups.flatMap((group) => {
    const ids = chosenIds(selections, group.id);
    const choices = group.choices.filter((c) => ids.includes(c.id));
    if (!choices.length) return [];
    return [`${fr ? group.labelFr : group.labelEn} : ${choices.map((c) => (fr ? c.labelFr : c.labelEn)).join(', ')}`];
  });
}
export function groupRule(group: ModifierGroup, fr: boolean): string {
  const min = groupMin(group);
  const max = groupMax(group);
  if (min >= 1) {
    if (min === max) return fr ? `Choisissez-en ${min}` : `Choose ${min}`;
    return fr ? `Choisissez-en ${min} à ${max}` : `Choose ${min} to ${max}`;
  }
  if (max > 1 && max < group.choices.length) return fr ? `Optionnel · jusqu’à ${max}` : `Optional · up to ${max}`;
  return fr ? 'Optionnel' : 'Optional';
}

// ---------- money ----------
/** One unit with these options, in cents (null without a published price). */
export function unitCents(item: Pick<Item, 'price' | 'modifierGroups'>, selections: Selections): number | null {
  if (item.price === null) return null;
  return Math.round((item.price + optionsTotal(item.modifierGroups, selections)) * 100);
}
export function subtotalCents(lines: CartLine[], itemOf: (id: string) => Item | undefined): number {
  return lines.reduce((sum, line) => {
    const item = itemOf(line.itemId);
    const unit = item ? unitCents(item, line.selections) : null;
    return sum + (unit ?? 0) * line.quantity;
  }, 0);
}
export const QUEBEC_TAX_RATES: TaxRate[] = [
  { name: 'TPS', rate: 500_000 },
  { name: 'TVQ', rate: 997_500 },
];
export function taxesFor(cents: number, rates: TaxRate[] = QUEBEC_TAX_RATES): number {
  return rates.reduce((sum, r) => sum + Math.round((cents * r.rate) / 10_000_000), 0);
}
export function tipFromPercent(subtotal: number, percent: number): number {
  return Math.round((subtotal * percent) / 100);
}
export interface Totals { subtotal: number; deliveryFee: number; taxes: number; tip: number; total: number }
/** Taxes apply to the food and the delivery fee, never to the tip (as on the website). */
export function checkoutTotals(input: { subtotal: number; deliveryFee: number; tip: number; taxRates?: TaxRate[] }): Totals {
  const taxes = taxesFor(input.subtotal + input.deliveryFee, input.taxRates);
  return { subtotal: input.subtotal, deliveryFee: input.deliveryFee, taxes, tip: input.tip, total: input.subtotal + input.deliveryFee + taxes + input.tip };
}
/** "14,99 $" in French, "$14.99" in English. */
export function money(cents: number | null, lang: 'fr' | 'en'): string {
  if (cents === null || !Number.isFinite(cents)) return '';
  const value = (cents / 100).toFixed(2);
  return lang === 'fr' ? `${value.replace('.', ',')} $` : `$${value}`;
}
export const dollars = (value: number | null) => (value === null ? null : Math.round(value * 100));

// ---------- delivery ----------
export function postalCodeOf(text: string | null | undefined): string | null {
  const m = /\b([ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z])\s?(\d[ABCEGHJ-NPRSTV-Z]\d)\b/i.exec(text ?? '');
  return m ? `${m[1]} ${m[2]}`.toUpperCase() : null;
}
export function deliversTo(postalCode: string | null, areas: string[]): boolean {
  return Boolean(postalCode && areas.includes(postalCode.slice(0, 3).toUpperCase()));
}
/** The one-line address the kitchen ticket, the courier and Clover read (same as the website). */
export function deliveryAddressLine(a: { street: string; unit?: string; city?: string; postalCode: string; instructions?: string }): string {
  const where = [
    a.street.trim(),
    a.unit?.trim() ? `App. ${a.unit.trim()}` : '',
    `${(a.city ?? '').trim() || 'Montréal'}, QC ${postalCodeOf(a.postalCode) ?? a.postalCode.trim()}`,
  ].filter(Boolean).join(', ');
  const note = a.instructions?.trim();
  return (note ? `${where} — ${note}` : where).slice(0, 300);
}

// ---------- contact ----------
export function phoneDigits(text: string): string {
  return text.replace(/\D/g, '');
}
export function validPhone(text: string): boolean {
  const d = phoneDigits(text);
  return d.length === 10 || (d.length === 11 && d.startsWith('1'));
}
export function validEmail(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text.trim());
}

// ---------- hours ----------
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
/** Open now? Hours are every day; `closes` before `opens` means after midnight. Montréal time. */
export function isOpenAt(hours: { opens: string; closes: string } | null, minutesOfDay: number): boolean | null {
  if (!hours) return null;
  const open = toMinutes(hours.opens);
  const close = toMinutes(hours.closes);
  if (open === close) return true;
  return close > open ? minutesOfDay >= open && minutesOfDay < close : minutesOfDay >= open || minutesOfDay < close;
}
/** Minutes since midnight in Montréal. */
export function montrealMinutes(date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montreal', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    return h * 60 + m;
  } catch {
    return date.getHours() * 60 + date.getMinutes();
  }
}
export function formatTime(hhmm: string, lang: 'fr' | 'en'): string {
  const [h, m] = hhmm.split(':').map(Number);
  const hh = h ?? 0;
  const mm = m ?? 0;
  if (lang === 'fr') return mm ? `${hh} h ${String(mm).padStart(2, '0')}` : `${hh} h`;
  const suffix = hh >= 12 ? 'p.m.' : 'a.m.';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return mm ? `${h12}:${String(mm).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`;
}

// ---------- search ----------
/** Accent-free lower case, for search. */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
export function searchItems(items: Item[], query: string): Item[] {
  const words = fold(query).split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [];
  return items
    .map((item) => {
      const hay = fold(`${item.name.fr} ${item.name.en} ${item.search}`);
      const name = fold(`${item.name.fr} ${item.name.en}`);
      if (!words.every((w) => hay.includes(w))) return null;
      const score = words.reduce((s, w) => s + (name.includes(w) ? 2 : 1), 0) + (item.badges.includes('popular') ? 1 : 0);
      return { item, score };
    })
    .filter((x): x is { item: Item; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);
}

// ---------- receipts ----------
export const ACTIVE_STATUSES = ['CREATED', 'SUBMITTED', 'ACCEPTED', 'PREPARING', 'READY'];
export const STATUS_STEPS = ['SUBMITTED', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'] as const;
/** How far along the timeline an order is (0..4), -1 for cancelled or failed. */
export function statusStep(status: string): number {
  if (status === 'CANCELLED' || status === 'FAILED') return -1;
  if (status === 'CREATED') return 0;
  return Math.max(0, STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number]));
}
export function randomHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
