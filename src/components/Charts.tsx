import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { weeklyBuckets } from '../lib/charts';
import { todayISO } from '../lib/dates';
import { STATUS_LABEL, fmtHours, fmtShortDate } from '../lib/format';
import type { Absence, AbsenceStatus, ModuleSummary } from '../lib/types';
import { STATUS_MARK } from './ui';

const ORDER: AbsenceStatus[] = ['unjustified', 'unclassified', 'justified'];

export function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {ORDER.map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: STATUS_MARK[s] }} aria-hidden />
          {STATUS_LABEL[s]}
        </li>
      ))}
    </ul>
  );
}

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: { dataKey?: unknown; value?: unknown }[];
}

function ChartTip({ active, label, payload, title }: TipProps & { title: (label: string) => string }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => Number(p.value) > 0);
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink shadow-lg">
      <p className="mb-1 font-medium">{title(String(label))}</p>
      {rows.length === 0 && <p className="text-muted">Sin faltas</p>}
      {rows.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-1.5 tabular-nums">
          <span className="size-2 rounded-[2px]" style={{ background: STATUS_MARK[p.dataKey as AbsenceStatus] }} aria-hidden />
          {STATUS_LABEL[p.dataKey as AbsenceStatus]}: {fmtHours(Number(p.value))}
        </p>
      ))}
    </div>
  );
}

const axisTick = { fill: 'var(--muted)', fontSize: 12 };

export function ModuleChart({ summaries }: { summaries: ModuleSummary[] }) {
  const rows = summaries.map((s) => ({
    name: s.module.shortName,
    justified: s.justified,
    unjustified: s.unjustified,
    unclassified: s.unclassified,
  }));
  return (
    <div style={{ height: rows.length * 30 + 34 }} role="img" aria-label={`Horas de falta por módulo: ${summaries.map((s) => `${s.module.shortName} ${fmtHours(s.totalAbsent)}`).join(', ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} stroke="var(--line)" />
          <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} height={22} />
          <YAxis type="category" dataKey="name" width={112} tick={axisTick} axisLine={false} tickLine={false} interval={0} />
          <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={(props) => <ChartTip {...(props as unknown as TipProps)} title={(l) => l} />} />
          {ORDER.map((s) => (
            <Bar key={s} dataKey={s} stackId="horas" fill={STATUS_MARK[s]} stroke="var(--surface)" strokeWidth={2} radius={4} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeeklyChart({ absences }: { absences: Absence[] }) {
  const weeks = weeklyBuckets(absences, todayISO());
  const undated = absences.filter((a) => a.date === null).reduce((t, a) => t + a.hours, 0);

  if (weeks.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line px-6 py-8 text-center">
        <p className="text-sm font-medium">Todavía no hay faltas con fecha</p>
        <p className="max-w-sm text-sm text-muted">Añade una falta nueva o pon fecha a las {fmtHours(undated)} iniciales desde Historial para verlas por semana.</p>
      </div>
    );
  }
  return (
    <>
      <div className="h-56" role="img" aria-label="Horas de falta por semana">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeks} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="week" tickFormatter={fmtShortDate} tick={axisTick} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={(props) => <ChartTip {...(props as unknown as TipProps)} title={(l) => `Semana del ${fmtShortDate(l)}`} />} />
            {ORDER.map((s) => (
              <Bar key={s} dataKey={s} stackId="horas" fill={STATUS_MARK[s]} stroke="var(--surface)" strokeWidth={2} radius={4} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {undated > 0 && <p className="mt-2 text-xs text-muted">{fmtHours(undated)} sin fecha no aparecen en esta gráfica.</p>}
    </>
  );
}
