import { useEffect, useState, type FormEvent } from 'react';
import { fmtHours } from '../lib/format';
import type { Module } from '../lib/types';
import { parsePositive } from '../lib/validation';
import { useStore } from '../state/store';
import { Button, inputClass } from './ui';

export function ModuleHoursForm({ module, onDone, autoFocus }: { module: Module; onDone?: () => void; autoFocus?: boolean }) {
  const { dispatch, showToast } = useStore();
  const [value, setValue] = useState(module.totalHours === null ? '' : String(module.totalHours));
  const [error, setError] = useState('');
  const fieldId = `horas-${module.id}${onDone ? '-tarjeta' : ''}`;

  useEffect(() => setValue(module.totalHours === null ? '' : String(module.totalHours)), [module.totalHours]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const raw = value.trim();
    if (raw === '') {
      if (module.totalHours !== null) {
        dispatch({ type: 'setModuleHours', moduleId: module.id, totalHours: null });
        showToast(`Horas de ${module.shortName} eliminadas`);
      }
      setError('');
      onDone?.();
      return;
    }
    const hours = parsePositive(raw);
    if (hours === null) {
      setError('Introduce un número mayor que 0.');
      return;
    }
    dispatch({ type: 'setModuleHours', moduleId: module.id, totalHours: hours });
    showToast(`${module.shortName}: ${fmtHours(hours)} totales guardadas`);
    setError('');
    onDone?.();
  };

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={fieldId} className="sr-only">
        Horas totales de {module.name}
      </label>
      <div className="flex gap-2">
        <input
          id={fieldId}
          className={inputClass}
          inputMode="decimal"
          placeholder="Horas totales"
          autoFocus={autoFocus}
          value={value}
          aria-invalid={!!error}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button type="submit" variant="secondary">Guardar</Button>
      </div>
      {error && <p className="mt-1 text-xs text-bad-text">{error}</p>}
    </form>
  );
}
