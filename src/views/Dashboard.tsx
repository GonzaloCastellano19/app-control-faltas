import { History, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAbsenceDialog } from '../components/AbsenceDialog';
import { Alerts } from '../components/Alerts';
import { Legend, WeeklyChart } from '../components/Charts';
import { LimitBar } from '../components/LimitBar';
import { Skyline3D } from '../components/Skyline3D';
import { CountUp } from '../components/motion';
import { Button, Card, STATUS_MARK, StatePill } from '../components/ui';
import { getAlerts, smallestMargin, summarizeAll, totals } from '../lib/calc';
import { STATUS_LABEL, fmtHours, fmtNumber } from '../lib/format';
import type { AbsenceStatus } from '../lib/types';
import { useStore } from '../state/store';

const STATUSES: AbsenceStatus[] = ['unjustified', 'unclassified', 'justified'];

function Stat({ label, value, detail }: { label: string; value: React.ReactNode; detail: string }) {
  return (
    <Card tilt className="flex flex-col justify-center gap-1 p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-3xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm text-muted">{detail}</p>
    </Card>
  );
}

export function Dashboard({ onConfigure, onModules, onHistory }: {
  onConfigure: () => void;
  onModules: () => void;
  onHistory: (moduleId: string) => void;
}) {
  const { data } = useStore();
  const { openAdd } = useAbsenceDialog();
  const summaries = useMemo(() => summarizeAll(data), [data]);
  const sum = useMemo(() => totals(data.absences), [data.absences]);
  const alerts = getAlerts(summaries);
  const smallest = smallestMargin(summaries);
  const unset = summaries.filter((s) => s.state === 'unset').length;
  const days = sum.total / data.settings.hoursPerDay;

  const [pickedId, setPickedId] = useState<string | null>(null);
  const selected = summaries.find((s) => s.module.id === pickedId) ?? alerts[0] ?? smallest ?? summaries[0];
  const margin = selected.margin;

  return (
    <div className="stagger flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <Card className="min-w-0 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-1">
            <h2 className="text-base font-semibold">Mapa de faltas</h2>
            <Legend />
          </div>
          <Skyline3D summaries={summaries} selectedId={selected.module.id} onSelect={setPickedId} />
          <p className="px-2 pb-1 text-xs text-muted">Arrastra para girar y pulsa una torre para ver su detalle.</p>
          <div className="mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap">
            {summaries.map((s) => {
              const active = s.module.id === selected.module.id;
              return (
                <button
                  key={s.module.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPickedId(s.module.id)}
                  className={`btn min-h-9 shrink-0 rounded-lg px-2.5 text-xs font-medium ${active ? 'well text-brand-text' : 'text-muted hover:text-ink'}`}
                >
                  {s.module.shortName}
                </button>
              );
            })}
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Card tilt className="p-5">
            <p className="text-sm text-muted">Total de ausencias</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-5xl leading-none font-semibold tracking-tight tabular-nums"><CountUp value={sum.total} format={fmtNumber} /></span>
              <span className="text-lg text-muted">horas</span>
            </p>
            <p className="mt-1 text-sm text-muted">Equivalen a {fmtNumber(Number(days.toFixed(1)))} {days === 1 ? 'jornada' : 'jornadas'} de {fmtHours(data.settings.hoursPerDay)}</p>
            <div className="bar-track mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full">
              {STATUSES.map((s) => sum[s] > 0 && <span key={s} className="bar-fill" style={{ flexGrow: sum[s], background: STATUS_MARK[s] }} />)}
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2">
              {STATUSES.map((s) => (
                <div key={s} className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="size-2 shrink-0 rounded-[2px]" style={{ background: STATUS_MARK[s] }} aria-hidden />
                    {STATUS_LABEL[s]}
                  </dt>
                  <dd className="text-sm font-semibold tabular-nums">{fmtHours(sum[s])}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="flex flex-1 flex-col gap-3 p-5" aria-live="polite">
            <div className="flex flex-col items-start gap-2">
              <StatePill state={selected.state} />
              <h3 className="text-base leading-6 font-semibold">{selected.module.name}</h3>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs text-muted">Faltas</dt>
                <dd className="font-display text-2xl font-semibold tabular-nums">{fmtHours(selected.totalAbsent)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{margin !== null && margin < 0 ? 'Exceso' : 'Margen'}</dt>
                <dd className={margin === null ? 'pt-1.5 text-base font-semibold text-muted' : 'font-display text-2xl font-semibold tabular-nums'}>
                  {margin === null ? 'Sin calcular' : fmtHours(Math.abs(margin))}
                </dd>
              </div>
            </dl>
            <LimitBar summary={selected} warnAtPercent={data.settings.warnAtPercent} />
            <div className="mt-auto flex gap-2 pt-1">
              <Button className="flex-1" onClick={() => openAdd(selected.module.id)} aria-label={`Añadir falta en ${selected.module.name}`}><Plus size={15} aria-hidden />Añadir falta</Button>
              <Button variant="ghost" onClick={() => onHistory(selected.module.id)} aria-label={`Ver historial de ${selected.module.name}`}><History size={15} aria-hidden />Historial</Button>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Módulos en alerta" value={<CountUp value={alerts.length} format={(n) => String(Math.round(n))} />} detail={`De ${summaries.length - unset} con horas totales`} />
        <Stat
          label="Menor margen"
          value={!smallest ? 'Sin calcular' : smallest.margin! < 0 ? `−${fmtHours(-smallest.margin!)}` : <CountUp value={smallest.margin!} format={fmtHours} />}
          detail={!smallest ? 'Faltan horas totales' : smallest.margin! < 0 ? `${smallest.module.shortName} ha superado el límite` : smallest.module.shortName}
        />
        <Stat label="Sin horas totales" value={`${unset} de ${summaries.length}`} detail="Módulos sin límite calculado" />
      </div>

      <Alerts summaries={summaries} onConfigure={onConfigure} />

      <Card className="min-w-0 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Horas por semana</h2>
          <Legend />
        </div>
        <WeeklyChart absences={data.absences} />
      </Card>

      <Card className="p-5">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Margen por módulo</h2>
          <button type="button" onClick={onModules} className="text-sm font-medium text-brand-text hover:underline">Ver asignaturas</button>
        </div>
        <ul className="divide-y divide-line">
          {summaries.map((s) => (
            <li key={s.module.id} className="grid items-center gap-x-5 gap-y-2 py-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_10.5rem]">
              <div className="min-w-0">
                <p className="text-sm font-medium">{s.module.name}</p>
                <p className="text-sm text-muted tabular-nums">
                  {fmtHours(s.counted)}{s.limit !== null ? ` de ${fmtHours(s.limit)}` : ' acumuladas'}
                </p>
              </div>
              <LimitBar summary={s} warnAtPercent={data.settings.warnAtPercent} />
              <div className="md:justify-self-end"><StatePill state={s.state} /></div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
