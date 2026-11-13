import { Download, Monitor, Moon, RotateCcw, Sun, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ModuleHoursForm } from '../components/ModuleHoursForm';
import { Button, Card, inputClass } from '../components/ui';
import { todayISO } from '../lib/dates';
import { fmtHours, fmtNumber } from '../lib/format';
import { parseData } from '../lib/storage';
import type { Settings as SettingsData } from '../lib/types';
import { parsePositive } from '../lib/validation';
import { useStore, type ThemeChoice } from '../state/store';

function NumberSetting({ id, label, help, field, max, suffix }: {
  id: string;
  label: string;
  help: string;
  field: 'limitPercent' | 'warnAtPercent' | 'hoursPerDay' | 'daysPerWeek';
  max: number;
  suffix: string;
}) {
  const { data, dispatch, showToast } = useStore();
  const [value, setValue] = useState(String(data.settings[field]).replace('.', ','));
  const [error, setError] = useState('');

  // Refleja cambios externos, como restaurar una copia.
  useEffect(() => setValue(String(data.settings[field]).replace('.', ',')), [data.settings, field]);

  const save = (e?: FormEvent) => {
    e?.preventDefault();
    const n = parsePositive(value);
    if (n === null || n > max) {
      setError(`Introduce un valor mayor que 0 y de ${fmtNumber(max)} como máximo.`);
      return;
    }
    setError('');
    if (n !== data.settings[field]) {
      dispatch({ type: 'setSettings', patch: { [field]: n } as Partial<SettingsData> });
      showToast(`${label}: ${fmtNumber(n)} ${suffix}`);
    }
  };

  return (
    <form onSubmit={save} noValidate className="grid items-start gap-x-6 gap-y-2 sm:grid-cols-[minmax(0,1fr)_11rem]">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <p className="text-sm text-muted">{help}</p>
      </div>
      <div>
        <div className="relative">
          <input id={id} className={`${inputClass} pr-16`} inputMode="decimal" value={value} aria-invalid={!!error} onChange={(e) => setValue(e.target.value)} onBlur={() => save()} />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">{suffix}</span>
        </div>
        {error && <p className="mt-1 text-xs text-bad-text">{error}</p>}
      </div>
    </form>
  );
}

const THEMES: { id: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { id: 'system', label: 'Sistema', Icon: Monitor },
  { id: 'light', label: 'Claro', Icon: Sun },
  { id: 'dark', label: 'Oscuro', Icon: Moon },
];

export function Settings() {
  const { data, dispatch, theme, setTheme, showToast, resetData } = useStore();
  const { settings } = data;
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importError, setImportError] = useState('');

  const exportData = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `asistencia-dam-${todayISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Copia descargada');
  };

  const importData = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = parseData(JSON.parse(await file.text()));
      if (!parsed) throw new Error('formato');
      const previous = data;
      dispatch({ type: 'replace', data: parsed });
      setImportError('');
      showToast('Copia restaurada', () => dispatch({ type: 'replace', data: previous }));
    } catch {
      setImportError('Ese archivo no es una copia válida de esta aplicación. Tus datos no han cambiado.');
    }
  };

  const reset = () => {
    const previous = data;
    resetData();
    setConfirmReset(false);
    showToast('Datos iniciales restaurados', () => dispatch({ type: 'replace', data: previous }));
  };

  return (
    <div className="stagger flex max-w-3xl flex-col gap-4">
      <Card className="flex flex-col gap-5 p-5">
        <h2 className="text-base font-semibold">Límite de faltas</h2>
        <NumberSetting id="ajuste-limite" label="Porcentaje de faltas" help="Se aplica a las horas totales de cada módulo." field="limitPercent" max={100} suffix="%" />
        <NumberSetting id="ajuste-aviso" label="Avisar a partir de" help="Porcentaje del límite desde el que un módulo pasa a «Cerca del límite»." field="warnAtPercent" max={100} suffix="%" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <label htmlFor="ajuste-justificadas" className="text-sm font-medium">Contar las justificadas para el límite</label>
            <p className="text-sm text-muted">Actívalo o desactívalo según lo que indique tu centro. Las faltas sin clasificar siempre cuentan.</p>
          </div>
          <input
            id="ajuste-justificadas"
            type="checkbox"
            role="switch"
            className="mt-1 size-5 shrink-0 accent-[var(--brand)]"
            checked={settings.countJustified}
            onChange={(e) => dispatch({ type: 'setSettings', patch: { countJustified: e.target.checked } })}
          />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold">Horas totales por módulo</h2>
        <p className="mt-1 text-sm text-muted">Usa las horas de tu programación didáctica. Deja el campo vacío para quitarlas.</p>
        <ul className="mt-2 divide-y divide-line">
          {data.modules.map((m) => (
            <li key={m.id} className="grid items-center gap-x-6 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
              <p className="text-sm font-medium">{m.name}</p>
              <ModuleHoursForm module={m} />
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col gap-5 p-5">
        <div>
          <h2 className="text-base font-semibold">Horario</h2>
          <p className="mt-1 text-sm text-muted tabular-nums">{fmtHours(settings.hoursPerDay * settings.daysPerWeek)} semanales. Las horas por día marcan el máximo de una falta con fecha.</p>
        </div>
        <NumberSetting id="ajuste-horas-dia" label="Horas por día" help="Duración de tu jornada." field="hoursPerDay" max={24} suffix="h" />
        <NumberSetting id="ajuste-dias" label="Días por semana" help="De lunes a viernes son 5." field="daysPerWeek" max={7} suffix="días" />
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold">Apariencia</h2>
        <div className="well mt-3 grid grid-cols-3 gap-1 rounded-xl p-1" role="radiogroup" aria-label="Tema">
          {THEMES.map(({ id, label, Icon }) => (
            <button key={id} type="button" role="radio" aria-checked={theme === id} onClick={() => setTheme(id)} className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-medium ${theme === id ? 'bg-surface text-ink shadow-card' : 'text-muted'}`}>
              <Icon size={15} aria-hidden />{label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold">Copia de seguridad</h2>
        <p className="mt-1 text-sm text-muted">Tus datos se guardan solo en este navegador. Si borras los datos del sitio o cambias de equipo, los perderás sin una copia.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={exportData}><Download size={15} aria-hidden />Descargar copia</Button>
          <Button onClick={() => fileRef.current?.click()}><Upload size={15} aria-hidden />Restaurar copia</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importData} aria-label="Archivo de copia" />
          {confirmReset ? (
            <>
              <Button variant="danger" onClick={reset}>Sí, volver a los datos iniciales</Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancelar</Button>
            </>
          ) : (
            <Button variant="danger" onClick={() => setConfirmReset(true)}><RotateCcw size={15} aria-hidden />Volver a los datos iniciales</Button>
          )}
        </div>
        {importError && <p className="mt-2 text-sm text-bad-text">{importError}</p>}
      </Card>
    </div>
  );
}
