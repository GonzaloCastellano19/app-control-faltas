import { History, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { fmtHours, fmtPercent } from '../lib/format';
import type { ModuleSummary } from '../lib/types';
import { useAbsenceDialog } from './AbsenceDialog';
import { LimitBar } from './LimitBar';
import { ModuleHoursForm } from './ModuleHoursForm';
import { Button, Card, StatePill } from './ui';

function marginLabel(s: ModuleSummary) {
  if (s.margin === null) return { label: 'Margen', value: 'Sin calcular' };
  if (s.margin < 0) return { label: 'Exceso', value: fmtHours(-s.margin) };
  return { label: 'Margen', value: fmtHours(s.margin) };
}

export function ModuleCard({ summary, limitPercent, warnAtPercent, onHistory }: {
  summary: ModuleSummary;
  limitPercent: number;
  warnAtPercent: number;
  onHistory: () => void;
}) {
  const { openAdd } = useAbsenceDialog();
  const [editing, setEditing] = useState(false);
  const s = summary;
  const margin = marginLabel(s);
  const showForm = editing || s.module.totalHours === null;

  return (
    <Card tilt className="flex flex-col gap-4 p-5">
      <div className="flex flex-col items-start gap-2">
        <StatePill state={s.state} />
        <h3 className="min-h-12 text-base leading-6 font-semibold">{s.module.name}</h3>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-xs text-muted">Faltas</dt>
          <dd className="font-display text-2xl font-semibold tabular-nums">{fmtHours(s.totalAbsent)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{margin.label}</dt>
          <dd className={`font-semibold tabular-nums ${s.margin === null ? 'pt-1.5 text-base text-muted' : 'font-display text-2xl'}`}>{margin.value}</dd>
        </div>
      </dl>

      <LimitBar summary={s} warnAtPercent={warnAtPercent} />

      {showForm ? (
        <div>
          <p className="mb-1.5 text-sm text-muted">
            {s.module.totalHours === null ? 'Introduce las horas totales para calcular el límite.' : 'Horas totales del módulo. Déjalo vacío para quitarlas.'}
          </p>
          <ModuleHoursForm module={s.module} autoFocus={editing} onDone={() => setEditing(false)} />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 text-sm text-muted">
          <p className="tabular-nums">
            {fmtPercent(limitPercent)} de {fmtHours(s.module.totalHours!)}
            {s.usedOfLimit !== null && `, ${fmtPercent(s.usedOfLimit)} usado`}
          </p>
          <Button variant="ghost" className="!min-h-8 !px-2" onClick={() => setEditing(true)} aria-label={`Editar horas totales de ${s.module.name}`}>
            <Pencil size={14} aria-hidden />
          </Button>
        </div>
      )}

      <div className="mt-auto flex gap-2">
        <Button className="flex-1" onClick={() => openAdd(s.module.id)} aria-label={`Añadir falta en ${s.module.name}`}><Plus size={15} aria-hidden />Añadir falta</Button>
        <Button variant="ghost" onClick={onHistory} aria-label={`Ver historial de ${s.module.name}`}><History size={15} aria-hidden />Historial</Button>
      </div>
    </Card>
  );
}
