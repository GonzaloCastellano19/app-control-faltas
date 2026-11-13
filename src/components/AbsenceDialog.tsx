import { Trash2, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { summarizeModule } from '../lib/calc';
import { todayISO } from '../lib/dates';
import { STATUS_LABEL, fmtHours } from '../lib/format';
import type { Absence, AbsenceStatus } from '../lib/types';
import { checkAbsence, parsePositive } from '../lib/validation';
import { newId, useStore } from '../state/store';
import { Button, StatePill, inputClass } from './ui';

type Target = { mode: 'add'; moduleId?: string } | { mode: 'edit'; absence: Absence };

const DialogContext = createContext<{ openAdd: (moduleId?: string) => void; openEdit: (a: Absence) => void } | null>(null);

export function useAbsenceDialog() {
  const value = useContext(DialogContext);
  if (!value) throw new Error('useAbsenceDialog debe usarse dentro de AbsenceDialogProvider');
  return value;
}

export function useDeleteAbsence() {
  const { dispatch, showToast } = useStore();
  return useCallback(
    (absence: Absence) => {
      dispatch({ type: 'deleteAbsence', id: absence.id });
      showToast('Falta eliminada', () => dispatch({ type: 'upsertAbsence', absence }));
    },
    [dispatch, showToast],
  );
}

export function AbsenceDialogProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<Target | null>(null);
  const value = useMemo(
    () => ({
      openAdd: (moduleId?: string) => setTarget({ mode: 'add', moduleId }),
      openEdit: (absence: Absence) => setTarget({ mode: 'edit', absence }),
    }),
    [],
  );
  return (
    <DialogContext.Provider value={value}>
      {children}
      {target && <AbsenceForm key={target.mode === 'edit' ? target.absence.id : 'nueva'} target={target} onClose={() => setTarget(null)} />}
    </DialogContext.Provider>
  );
}

const STATUSES: AbsenceStatus[] = ['unclassified', 'justified', 'unjustified'];
const QUICK_HOURS = [1, 2, 3, 6];

function AbsenceForm({ target, onClose }: { target: Target; onClose: () => void }) {
  const { data, dispatch, showToast } = useStore();
  const deleteAbsence = useDeleteAbsence();
  const ref = useRef<HTMLDialogElement>(null);
  const editing = target.mode === 'edit' ? target.absence : null;

  const [moduleId, setModuleId] = useState(editing?.moduleId ?? (target.mode === 'add' ? target.moduleId : '') ?? '');
  const [date, setDate] = useState(editing ? (editing.date ?? '') : todayISO());
  const [hoursText, setHoursText] = useState(editing ? String(editing.hours) : '1');
  const [status, setStatus] = useState<AbsenceStatus>(editing?.status ?? 'unclassified');
  const [note, setNote] = useState(editing?.note ?? '');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const hours = parsePositive(hoursText) ?? NaN;
  const check = checkAbsence(
    { id: editing?.id, moduleId, date: date || null, hours, allowEmptyDate: editing?.date === null },
    data,
  );
  const hasErrors = Object.keys(check.errors).length > 0;

  const module = data.modules.find((m) => m.id === moduleId);
  const preview = useMemo(() => {
    if (!module || !Number.isFinite(hours)) return null;
    const draft: Absence = { id: editing?.id ?? 'borrador', moduleId, date: date || null, hours, status, note };
    return summarizeModule(module, [...data.absences.filter((a) => a.id !== draft.id), draft], data.settings);
  }, [module, hours, moduleId, date, status, note, editing, data]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;
    const absence: Absence = { id: editing?.id ?? newId(), moduleId, date: date || null, hours, status, note: note.trim() };
    dispatch({ type: 'upsertAbsence', absence });
    if (editing) {
      showToast('Falta actualizada', () => dispatch({ type: 'upsertAbsence', absence: editing }));
    } else {
      showToast(`Falta de ${fmtHours(hours)} añadida`, () => dispatch({ type: 'deleteAbsence', id: absence.id }));
    }
    onClose();
  };

  const showError = (field: keyof typeof check.errors) =>
    submitted && check.errors[field] ? (
      <p id={`error-${field}`} className="mt-1 text-xs text-bad-text">{check.errors[field]}</p>
    ) : null;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="titulo-falta"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-line bg-surface p-0 text-ink"
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="titulo-falta" className="text-lg font-semibold">{editing ? 'Editar falta' : 'Añadir falta'}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Cerrar" className="!min-h-9 !px-2"><X size={18} aria-hidden /></Button>
        </div>

        <div>
          <label htmlFor="falta-modulo" className="mb-1 block text-sm font-medium">Asignatura</label>
          <select id="falta-modulo" className={inputClass} value={moduleId} onChange={(e) => setModuleId(e.target.value)} aria-invalid={submitted && !!check.errors.moduleId}>
            <option value="">Elige una asignatura</option>
            {data.modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {showError('moduleId')}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="falta-fecha" className="mb-1 block text-sm font-medium">Fecha</label>
            <input id="falta-fecha" type="date" className={inputClass} value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} aria-invalid={submitted && !!check.errors.date} />
            {editing?.date === null && !date && <p className="mt-1 text-xs text-muted">Sin fecha por ahora. Añádela cuando la sepas.</p>}
            {showError('date')}
          </div>
          <div className="min-w-0">
            <label htmlFor="falta-horas" className="mb-1 block text-sm font-medium">Horas</label>
            <input id="falta-horas" className={inputClass} inputMode="decimal" value={hoursText} onChange={(e) => setHoursText(e.target.value)} aria-invalid={submitted && !!check.errors.hours} />
            <div className="mt-1.5 flex gap-1.5">
              {QUICK_HOURS.filter((h) => h <= data.settings.hoursPerDay).map((h) => (
                <button key={h} type="button" onClick={() => setHoursText(String(h))} aria-label={`${h} horas`} className="min-h-8 flex-1 rounded-lg bg-surface-2 text-xs font-medium text-muted hover:text-ink tabular-nums">{h}</button>
              ))}
            </div>
            {showError('hours')}
          </div>
        </div>

        <fieldset>
          <legend className="mb-1 text-sm font-medium">Justificación</legend>
          <div className="well grid grid-cols-3 gap-1 rounded-xl p-1">
            {STATUSES.map((s) => (
              <label key={s} className={`flex min-h-9 cursor-pointer items-center justify-center rounded-lg px-1 text-center text-xs font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand sm:text-sm ${status === s ? 'bg-surface text-ink shadow-card' : 'text-muted'}`}>
                <input type="radio" name="falta-estado" value={s} checked={status === s} onChange={() => setStatus(s)} className="sr-only" />
                {STATUS_LABEL[s]}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="falta-nota" className="mb-1 block text-sm font-medium">Nota <span className="font-normal text-muted">(opcional)</span></label>
          <input id="falta-nota" className={inputClass} maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Por ejemplo, cita médica" />
        </div>

        {check.warnings.map((w) => <p key={w} className="rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand-text">{w}</p>)}

        {preview && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm" aria-live="polite">
            <span className="tabular-nums">
              Tras guardar: {fmtHours(preview.counted)}
              {preview.limit !== null && ` de ${fmtHours(preview.limit)}`}
            </span>
            <StatePill state={preview.state} />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          {editing ? (
            <Button variant="danger" onClick={() => { deleteAbsence(editing); onClose(); }}><Trash2 size={15} aria-hidden />Eliminar</Button>
          ) : <span />}
          <div className="ml-auto flex gap-2">
            <Button onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="primary">{editing ? 'Guardar cambios' : 'Añadir falta'}</Button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
