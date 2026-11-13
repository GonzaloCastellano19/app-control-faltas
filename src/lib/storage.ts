import { isValidISODate } from './dates';
import { DEFAULT_SETTINGS, createInitialData } from './seed';
import type { Absence, AbsenceStatus, AppData, Module, Settings } from './types';

export const DATA_KEY = 'asistencia-dam:datos';
export const THEME_KEY = 'asistencia-dam:tema';
const DAMAGED_KEY = 'asistencia-dam:datos-danados';

const STATUSES: AbsenceStatus[] = ['justified', 'unjustified', 'unclassified'];
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isPositive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

function parseModule(v: unknown): Module | null {
  if (!isObject(v) || typeof v.id !== 'string' || typeof v.name !== 'string' || typeof v.shortName !== 'string') return null;
  if (v.totalHours !== null && !isPositive(v.totalHours)) return null;
  return { id: v.id, name: v.name, shortName: v.shortName, totalHours: v.totalHours };
}

function parseAbsence(v: unknown, moduleIds: Set<string>): Absence | null {
  if (!isObject(v) || typeof v.id !== 'string' || typeof v.moduleId !== 'string') return null;
  if (!moduleIds.has(v.moduleId) || !isPositive(v.hours)) return null;
  if (v.date !== null && !isValidISODate(v.date)) return null;
  if (!STATUSES.includes(v.status as AbsenceStatus)) return null;
  return {
    id: v.id,
    moduleId: v.moduleId,
    date: v.date,
    hours: v.hours,
    status: v.status as AbsenceStatus,
    note: typeof v.note === 'string' ? v.note : '',
  };
}

function parseSettings(v: unknown): Settings | null {
  if (!isObject(v)) return null;
  const s = { ...DEFAULT_SETTINGS, ...v } as Settings;
  const inRange = (n: unknown, max: number) => isPositive(n) && n <= max;
  if (!inRange(s.limitPercent, 100) || !inRange(s.warnAtPercent, 100)) return null;
  if (!inRange(s.hoursPerDay, 24) || !inRange(s.daysPerWeek, 7) || typeof s.countJustified !== 'boolean') return null;
  return s;
}

/** Valida datos de origen externo. Devuelve `null` si cualquier parte es incorrecta. */
export function parseData(value: unknown): AppData | null {
  if (!isObject(value) || value.version !== 1) return null;
  if (!Array.isArray(value.modules) || !Array.isArray(value.absences)) return null;

  const modules = value.modules.map(parseModule);
  if (modules.length === 0 || modules.some((m) => m === null)) return null;
  const moduleIds = new Set((modules as Module[]).map((m) => m.id));

  const absences = value.absences.map((a) => parseAbsence(a, moduleIds));
  if (absences.some((a) => a === null)) return null;

  const settings = parseSettings(value.settings);
  if (!settings) return null;
  return { version: 1, modules: modules as Module[], absences: absences as Absence[], settings };
}

export type StorageIssue = 'unavailable' | 'damaged' | null;

export function loadData(store: Pick<Storage, 'getItem' | 'setItem'> | null = safeStorage()): {
  data: AppData;
  issue: StorageIssue;
} {
  if (!store) return { data: createInitialData(), issue: 'unavailable' };
  let raw: string | null;
  try {
    raw = store.getItem(DATA_KEY);
  } catch {
    return { data: createInitialData(), issue: 'unavailable' };
  }
  if (raw === null) return { data: createInitialData(), issue: null };

  try {
    const parsed = parseData(JSON.parse(raw));
    if (parsed) return { data: parsed, issue: null };
  } catch {
    // Se trata igual que unos datos con formato incorrecto.
  }
  // Se conserva una copia para que un fallo de lectura no borre nada definitivamente.
  try {
    store.setItem(DAMAGED_KEY, raw);
  } catch {
    // Sin espacio: el aviso se muestra igualmente.
  }
  return { data: createInitialData(), issue: 'damaged' };
}

export function saveData(data: AppData): boolean {
  try {
    const store = safeStorage();
    if (!store) return false;
    store.setItem(DATA_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
