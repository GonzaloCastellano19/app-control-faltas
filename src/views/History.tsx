import { CalendarOff, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAbsenceDialog, useDeleteAbsence } from '../components/AbsenceDialog';
import { Button, Card, StatusBadge, inputClass } from '../components/ui';
import { totals } from '../lib/calc';
import { STATUS_LABEL, fmtDate, fmtHours, fmtMonth } from '../lib/format';
import type { Absence, AbsenceStatus } from '../lib/types';
import { useStore } from '../state/store';

const UNDATED = 'sin-fecha';

function groupByMonth(absences: Absence[]) {
  const sorted = [...absences].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const groups = new Map<string, Absence[]>();
  // Las faltas sin fecha van al final: no se sabe cuándo ocurrieron.
  for (const a of sorted.filter((x) => x.date)) {
    const key = a.date!.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  const undated = sorted.filter((x) => !x.date);
  if (undated.length) groups.set(UNDATED, undated);
  return [...groups.entries()];
}

export function History({ moduleFilter, setModuleFilter }: { moduleFilter: string; setModuleFilter: (id: string) => void }) {
  const { data } = useStore();
  const { openAdd, openEdit } = useAbsenceDialog();
  const deleteAbsence = useDeleteAbsence();
  const [status, setStatus] = useState<'all' | AbsenceStatus>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filtered = useMemo(
    () =>
      data.absences.filter((a) => {
        if (moduleFilter && a.moduleId !== moduleFilter) return false;
        if (status !== 'all' && a.status !== status) return false;
        if ((from || to) && !a.date) return false;
        if (from && a.date! < from) return false;
        if (to && a.date! > to) return false;
        return true;
      }),
    [data.absences, moduleFilter, status, from, to],
  );
  const groups = useMemo(() => groupByMonth(filtered), [filtered]);
  const sum = totals(filtered);
  const moduleName = (id: string) => data.modules.find((m) => m.id === id)?.name ?? id;
  const hasFilters = !!moduleFilter || status !== 'all' || !!from || !!to;
  const clear = () => { setModuleFilter(''); setStatus('all'); setFrom(''); setTo(''); };

  return (
    <div className="stagger flex flex-col gap-4">
      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0">
          <label htmlFor="filtro-modulo" className="mb-1 block text-xs text-muted">Asignatura</label>
          <select id="filtro-modulo" className={inputClass} value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
            <option value="">Todas</option>
            {data.modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor="filtro-estado" className="mb-1 block text-xs text-muted">Justificación</label>
          <select id="filtro-estado" className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="all">Todas</option>
            {(Object.keys(STATUS_LABEL) as AbsenceStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor="filtro-desde" className="mb-1 block text-xs text-muted">Desde</label>
          <input id="filtro-desde" type="date" className={inputClass} value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="min-w-0">
          <label htmlFor="filtro-hasta" className="mb-1 block text-xs text-muted">Hasta</label>
          <input id="filtro-hasta" type="date" className={inputClass} value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-muted">
        <p className="tabular-nums">
          {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}, {fmtHours(sum.total)}
        </p>
        {hasFilters && <button type="button" onClick={clear} className="font-medium text-brand-text hover:underline">Quitar filtros</button>}
      </div>

      {groups.length === 0 && (
        <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <CalendarOff size={22} className="text-muted" aria-hidden />
          <p className="text-sm text-muted">{hasFilters ? 'Ninguna falta coincide con estos filtros.' : 'No hay faltas registradas.'}</p>
          {hasFilters ? <Button onClick={clear}>Quitar filtros</Button> : <Button variant="primary" onClick={() => openAdd()}>Añadir falta</Button>}
        </Card>
      )}

      {groups.map(([key, rows]) => (
        <section key={key} aria-labelledby={`grupo-${key}`}>
          <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
            <h2 id={`grupo-${key}`} className="text-sm font-semibold first-letter:uppercase">
              {key === UNDATED ? 'Sin fecha' : fmtMonth(`${key}-01`)}
            </h2>
            <span className="text-sm text-muted tabular-nums">{fmtHours(totals(rows).total)}</span>
          </div>
          {key === UNDATED && <p className="mb-2 px-1 text-sm text-muted">Son acumulados sin día conocido. Edita cada uno para añadir la fecha y la justificación.</p>}
          <Card>
            <ul className="divide-y divide-line">
              {rows.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="text-sm font-medium">{moduleName(a.moduleId)}</p>
                    <p className="text-sm text-muted">
                      {a.date ? fmtDate(a.date) : 'Fecha sin indicar'}
                      {a.note && `. ${a.note}`}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                  <span className="w-12 text-right text-sm font-semibold tabular-nums">{fmtHours(a.hours)}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" className="!px-2.5" onClick={() => openEdit(a)} aria-label={`Editar falta de ${moduleName(a.moduleId)}`}><Pencil size={15} aria-hidden /></Button>
                    <Button variant="ghost" className="!px-2.5 hover:!text-bad-text" onClick={() => deleteAbsence(a)} aria-label={`Eliminar falta de ${moduleName(a.moduleId)}`}><Trash2 size={15} aria-hidden /></Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}
