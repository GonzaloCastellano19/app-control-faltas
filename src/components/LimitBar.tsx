import { fmtHours, fmtPercent } from '../lib/format';
import type { ModuleSummary } from '../lib/types';

const FILL = {
  ok: 'var(--mark-justified)',
  near: 'var(--mark-near)',
  reached: 'var(--mark-limit)',
} as const;

/** Regla de 0 al límite, con una marca donde empieza el aviso. */
export function LimitBar({ summary, warnAtPercent }: { summary: ModuleSummary; warnAtPercent: number }) {
  const { usedOfLimit, state, counted, limit, warnFrom } = summary;
  if (limit === null || usedOfLimit === null || warnFrom === null) {
    return (
      <div className="h-3 rounded-full border border-dashed border-line" role="img" aria-label="Sin límite calculado: faltan las horas totales" />
    );
  }
  const width = Math.min(usedOfLimit, 100);
  return (
    <div>
      <div
        className="bar-track relative h-3 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(counted, limit)}
        aria-valuetext={`${fmtHours(counted)} de ${fmtHours(limit)}, ${fmtPercent(usedOfLimit)} del límite`}
        aria-label={`Horas respecto al límite de ${summary.module.name}`}
      >
        <div
          className={`bar-fill h-full rounded-full ${state === 'exceeded' ? 'bar-over' : ''}`}
          style={{ width: `${width}%`, background: state === 'exceeded' ? undefined : FILL[state as keyof typeof FILL] }}
        />
        <span className="absolute inset-y-0 w-0.5 bg-muted opacity-60" style={{ left: `${warnAtPercent}%` }} aria-hidden />
      </div>
      <div className="mt-1.5 flex justify-between gap-3 text-xs text-muted tabular-nums">
        <span>Aviso desde {fmtHours(warnFrom)}</span>
        <span>Límite {fmtHours(limit)}</span>
      </div>
    </div>
  );
}
