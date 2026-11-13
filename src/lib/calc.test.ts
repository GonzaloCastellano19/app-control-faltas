import { describe, expect, it } from 'vitest';
import { getAlerts, getLimitState, smallestMargin, summarizeAll, summarizeModule, totals } from './calc';
import { DEFAULT_SETTINGS, createInitialData } from './seed';
import type { Absence, Module } from './types';

const mod: Module = { id: 'm', name: 'Módulo', shortName: 'M', totalHours: 100 };
const abs = (hours: number, status: Absence['status'] = 'unjustified'): Absence => ({
  id: String(Math.random()), moduleId: 'm', date: null, hours, status, note: '',
});
const summary = (hours: number, settings = DEFAULT_SETTINGS) => summarizeModule(mod, [abs(hours)], settings);

describe('datos iniciales', () => {
  const data = createInitialData();
  const all = summarizeAll(data);
  const get = (id: string) => all.find((s) => s.module.id === id)!;

  it('suma 18 horas', () => expect(totals(data.absences).total).toBe(18));

  it('mantiene las horas indicadas por módulo', () => {
    expect(all.map((s) => s.totalAbsent)).toEqual([5, 4, 2, 2, 2, 2, 1, 0, 0]);
  });

  it('calcula Interfaces y Python', () => {
    expect(get('di')).toMatchObject({ limit: 42, margin: 37, state: 'ok' });
    expect(get('python')).toMatchObject({ limit: 21, margin: 17, state: 'ok' });
  });

  it('no inventa horas totales, fechas ni justificación', () => {
    expect(all.filter((s) => s.module.totalHours === null)).toHaveLength(7);
    expect(all.filter((s) => s.state === 'unset').every((s) => s.limit === null && s.margin === null)).toBe(true);
    expect(data.absences.every((a) => a.date === null && a.status === 'unclassified')).toBe(true);
  });

  it('el menor margen es el de Python', () => expect(smallestMargin(all)?.module.id).toBe('python'));
});

describe('estado frente al límite', () => {
  it('distingue dentro del margen, cerca, alcanzado y superado', () => {
    expect(summary(14.9).state).toBe('ok');
    expect(summary(15).state).toBe('near');
    expect(summary(19.5).state).toBe('near');
    expect(summary(20)).toMatchObject({ state: 'reached', margin: 0 });
    expect(summary(20.5)).toMatchObject({ state: 'exceeded', margin: -0.5 });
  });

  it('no confunde alcanzado con superado por coma flotante', () => {
    const s = summarizeModule({ ...mod, totalHours: 3 }, [abs(0.1), abs(0.2), abs(0.3)], { ...DEFAULT_SETTINGS, limitPercent: 20 });
    expect(s.limit).toBe(0.6);
    expect(s.state).toBe('reached');
  });

  it('respeta un porcentaje configurado y límites no enteros', () => {
    const s = summarizeModule({ ...mod, totalHours: 63 }, [abs(13)], DEFAULT_SETTINGS);
    expect(s.limit).toBe(12.6);
    expect(s.state).toBe('exceeded');
    expect(summary(20, { ...DEFAULT_SETTINGS, limitPercent: 25 }).limit).toBe(25);
  });

  it('sin horas totales no hay estado', () => expect(getLimitState(99, null, null)).toBe('unset'));
});

describe('justificadas', () => {
  const list = [abs(10, 'justified'), abs(8, 'unjustified'), abs(4, 'unclassified')];
  it('cuentan por defecto', () => expect(summarizeModule(mod, list, DEFAULT_SETTINGS).counted).toBe(22));
  it('se pueden excluir, sin ocultarlas del total', () => {
    const s = summarizeModule(mod, list, { ...DEFAULT_SETTINGS, countJustified: false });
    expect(s).toMatchObject({ counted: 12, totalAbsent: 22, state: 'ok' });
  });
});

describe('alertas', () => {
  it('ordena de más a menos grave e ignora módulos sin configurar', () => {
    const a = summarizeModule({ ...mod, id: 'a' }, [{ ...abs(16), moduleId: 'a' }], DEFAULT_SETTINGS);
    const b = summarizeModule({ ...mod, id: 'b' }, [{ ...abs(25), moduleId: 'b' }], DEFAULT_SETTINGS);
    const c = summarizeModule({ ...mod, id: 'c' }, [{ ...abs(20), moduleId: 'c' }], DEFAULT_SETTINGS);
    const d = summarizeModule({ ...mod, id: 'd', totalHours: null }, [{ ...abs(90), moduleId: 'd' }], DEFAULT_SETTINGS);
    expect(getAlerts([a, b, c, d]).map((s) => s.module.id)).toEqual(['b', 'c', 'a']);
  });
});
