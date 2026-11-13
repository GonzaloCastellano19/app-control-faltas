import type { Absence, AppData, LimitState, Module, ModuleSummary, Settings } from './types';

/** Evita que restos de coma flotante confundan «alcanzado» con «superado». */
const clean = (n: number) => Math.round(n * 1e6) / 1e6;

export function getLimitState(counted: number, limit: number | null, warnFrom: number | null): LimitState {
  if (limit === null || warnFrom === null) return 'unset';
  if (counted > limit) return 'exceeded';
  if (counted === limit) return 'reached';
  if (counted >= warnFrom) return 'near';
  return 'ok';
}

export function summarizeModule(module: Module, absences: Absence[], settings: Settings): ModuleSummary {
  const own = absences.filter((a) => a.moduleId === module.id);
  const sum = (status: Absence['status']) => clean(own.filter((a) => a.status === status).reduce((t, a) => t + a.hours, 0));
  const justified = sum('justified');
  const unjustified = sum('unjustified');
  const unclassified = sum('unclassified');
  const totalAbsent = clean(justified + unjustified + unclassified);
  const counted = settings.countJustified ? totalAbsent : clean(unjustified + unclassified);

  const hasTotal = module.totalHours !== null && module.totalHours > 0;
  const limit = hasTotal ? clean((module.totalHours! * settings.limitPercent) / 100) : null;
  const warnFrom = limit === null ? null : clean((limit * settings.warnAtPercent) / 100);

  return {
    module,
    totalAbsent,
    justified,
    unjustified,
    unclassified,
    counted,
    limit,
    warnFrom,
    margin: limit === null ? null : clean(limit - counted),
    usedOfLimit: limit === null ? null : (counted / limit) * 100,
    shareOfModule: hasTotal ? (counted / module.totalHours!) * 100 : null,
    state: getLimitState(counted, limit, warnFrom),
  };
}

export const summarizeAll = (data: AppData) =>
  data.modules.map((m) => summarizeModule(m, data.absences, data.settings));

const SEVERITY: Record<LimitState, number> = { exceeded: 3, reached: 2, near: 1, ok: 0, unset: 0 };

/** Módulos que requieren atención, del más grave al más leve. */
export const getAlerts = (summaries: ModuleSummary[]) =>
  summaries
    .filter((s) => SEVERITY[s.state] > 0)
    .sort((a, b) => SEVERITY[b.state] - SEVERITY[a.state] || (a.margin ?? 0) - (b.margin ?? 0));

export function smallestMargin(summaries: ModuleSummary[]): ModuleSummary | null {
  const known = summaries.filter((s) => s.margin !== null);
  return known.length ? known.reduce((min, s) => (s.margin! < min.margin! ? s : min)) : null;
}

export function totals(absences: Absence[]) {
  const by = (status: Absence['status']) => clean(absences.filter((a) => a.status === status).reduce((t, a) => t + a.hours, 0));
  const justified = by('justified');
  const unjustified = by('unjustified');
  const unclassified = by('unclassified');
  return { justified, unjustified, unclassified, total: clean(justified + unjustified + unclassified) };
}
