import { describe, expect, it } from 'vitest';
import { weeklyBuckets } from './charts';
import { isValidISODate, isWeekend, mondayOf } from './dates';
import { createInitialData } from './seed';
import { DATA_KEY, loadData, parseData } from './storage';
import type { Absence } from './types';
import { checkAbsence, parsePositive } from './validation';

const data = createInitialData();
const memory = (initial: Record<string, string> = {}) => {
  const items = { ...initial };
  return { items, getItem: (k: string) => items[k] ?? null, setItem: (k: string, v: string) => void (items[k] = v) };
};

describe('fechas', () => {
  it('rechaza fechas imposibles', () => {
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2026-11-04')).toBe(true);
  });
  it('calcula el lunes y el fin de semana', () => {
    expect(mondayOf('2026-11-04')).toBe('2026-11-02');
    expect(mondayOf('2026-11-08')).toBe('2026-11-02');
    expect(isWeekend('2026-11-07')).toBe(true);
    expect(isWeekend('2026-11-06')).toBe(false);
  });
});

describe('validación de faltas', () => {
  const base = { moduleId: 'di', date: '2026-11-03', hours: 2, allowEmptyDate: false };
  const today = '2026-11-04';

  it('acepta una falta correcta', () => {
    expect(checkAbsence(base, data, today)).toEqual({ errors: {}, warnings: [] });
  });
  it('exige fecha salvo en faltas ya sin fecha', () => {
    expect(checkAbsence({ ...base, date: null }, data, today).errors.date).toBeTruthy();
    expect(checkAbsence({ ...base, date: null, allowEmptyDate: true }, data, today).errors.date).toBeUndefined();
  });
  it('rechaza fechas futuras, horas no válidas y más de una jornada', () => {
    expect(checkAbsence({ ...base, date: '2026-11-05' }, data, today).errors.date).toBeTruthy();
    expect(checkAbsence({ ...base, hours: 0 }, data, today).errors.hours).toBeTruthy();
    expect(checkAbsence({ ...base, hours: 7 }, data, today).errors.hours).toBeTruthy();
  });
  it('permite un acumulado sin fecha mayor que una jornada', () => {
    expect(checkAbsence({ ...base, date: null, hours: 9, allowEmptyDate: true }, data, today).errors).toEqual({});
  });
  it('avisa del fin de semana y de un día que supera la jornada', () => {
    expect(checkAbsence({ ...base, date: '2026-11-01' }, data, today).warnings).toHaveLength(1);
    const absences: Absence[] = [{ id: 'x', moduleId: 'ad', date: '2026-11-03', hours: 5, status: 'justified', note: '' }];
    expect(checkAbsence(base, { ...data, absences }, today).warnings).toHaveLength(1);
    expect(checkAbsence({ ...base, id: 'x' }, { ...data, absences }, today).warnings).toHaveLength(0);
  });
  it('lee números con coma decimal', () => {
    expect(parsePositive('1,5')).toBe(1.5);
    expect(parsePositive('')).toBeNull();
    expect(parsePositive('-2')).toBeNull();
  });
});

describe('persistencia', () => {
  it('siembra datos iniciales la primera vez', () => {
    expect(loadData(memory()).data.absences).toHaveLength(7);
  });
  it('recupera lo guardado', () => {
    const saved = { ...data, settings: { ...data.settings, limitPercent: 15 } };
    const result = loadData(memory({ [DATA_KEY]: JSON.stringify(saved) }));
    expect(result).toMatchObject({ issue: null, data: { settings: { limitPercent: 15 } } });
  });
  it('conserva una copia si los datos están dañados', () => {
    const store = memory({ [DATA_KEY]: '{roto' });
    expect(loadData(store).issue).toBe('damaged');
    expect(store.items['asistencia-dam:datos-danados']).toBe('{roto');
  });
  it('rechaza copias con referencias o valores incorrectos', () => {
    expect(parseData({ ...data, absences: [{ ...data.absences[0], moduleId: 'nada' }] })).toBeNull();
    expect(parseData({ ...data, absences: [{ ...data.absences[0], hours: -1 }] })).toBeNull();
    expect(parseData({ ...data, settings: { ...data.settings, limitPercent: 0 } })).toBeNull();
    expect(parseData(data)).not.toBeNull();
  });
});

describe('gráfica semanal', () => {
  it('ignora faltas sin fecha', () => expect(weeklyBuckets(data.absences, '2026-11-04')).toEqual([]));
  it('incluye semanas vacías', () => {
    const a: Absence = { id: 'a', moduleId: 'di', date: '2026-10-20', hours: 2, status: 'justified', note: '' };
    const weeks = weeklyBuckets([a], '2026-11-04');
    expect(weeks.map((w) => w.week)).toEqual(['2026-10-19', '2026-10-26', '2026-11-02']);
    expect(weeks[0].justified).toBe(2);
  });
});
