import { addDays, mondayOf } from './dates';
import type { Absence } from './types';

export interface WeekBucket {
  week: string;
  justified: number;
  unjustified: number;
  unclassified: number;
}

/** Agrupa por semana las faltas con fecha, incluidas las semanas sin faltas. */
export function weeklyBuckets(absences: Absence[], today: string, maxWeeks = 16): WeekBucket[] {
  const dated = absences.filter((a): a is Absence & { date: string } => a.date !== null);
  if (dated.length === 0) return [];

  const lastWeek = mondayOf(today);
  const firstDated = mondayOf(dated.reduce((min, a) => (a.date < min ? a.date : min), dated[0].date));
  const earliestShown = addDays(lastWeek, -7 * (maxWeeks - 1));
  const start = firstDated > earliestShown ? firstDated : earliestShown;

  const buckets: WeekBucket[] = [];
  for (let week = start; week <= lastWeek; week = addDays(week, 7)) {
    buckets.push({ week, justified: 0, unjustified: 0, unclassified: 0 });
  }
  const byWeek = new Map(buckets.map((b) => [b.week, b]));
  for (const a of dated) {
    const bucket = byWeek.get(mondayOf(a.date));
    if (bucket) bucket[a.status] += a.hours;
  }
  return buckets;
}
