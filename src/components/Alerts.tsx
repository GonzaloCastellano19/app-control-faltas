import { CircleCheck, Info } from 'lucide-react';
import { getAlerts } from '../lib/calc';
import { fmtHours } from '../lib/format';
import type { ModuleSummary } from '../lib/types';
import { StatePill } from './ui';

function alertText(s: ModuleSummary): string {
  const of = `${fmtHours(s.counted)} de ${fmtHours(s.limit!)}`;
  if (s.state === 'exceeded') {
    return `${of}. Has superado el límite configurado en ${fmtHours(-s.margin!)}. Consulta con tutoría cómo lo aplica el centro.`;
  }
  if (s.state === 'reached') return `${of}. Estás justo en el límite configurado: margen de 0 h. Cualquier falta más lo superaría.`;
  return `${of}. Te quedan ${fmtHours(s.margin!)} de margen.`;
}

export function Alerts({ summaries, onConfigure }: { summaries: ModuleSummary[]; onConfigure: () => void }) {
  const alerts = getAlerts(summaries);
  const unset = summaries.filter((s) => s.state === 'unset');
  const known = summaries.length - unset.length;

  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      {alerts.map((s) => (
        <div key={s.module.id} className={`panel flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 ${s.state === 'exceeded' ? 'alert-critical' : ''}`}>
          <StatePill state={s.state} />
          <p className="min-w-0 flex-1 basis-64 text-sm"><strong className="font-semibold">{s.module.name}.</strong> {alertText(s)}</p>
        </div>
      ))}
      {alerts.length === 0 && known > 0 && (
        <p className="flex items-center gap-2 rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok-text">
          <CircleCheck size={16} className="shrink-0" aria-hidden />
          Ninguno de los {known} módulos con horas totales está cerca del límite.
        </p>
      )}
      {unset.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand-text">
          <Info size={16} className="shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 basis-56">
            {unset.length === 1 ? 'Un módulo no tiene' : `${unset.length} módulos no tienen`} horas totales, así que su límite no se puede calcular.
          </span>
          <button type="button" onClick={onConfigure} className="font-semibold underline underline-offset-2">Introducir horas</button>
        </p>
      )}
    </div>
  );
}
