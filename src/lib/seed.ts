import type { Absence, AppData, Module, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  limitPercent: 20,
  warnAtPercent: 75,
  countJustified: true,
  hoursPerDay: 6,
  daysPerWeek: 5,
};

/** Solo Interfaces y Python tienen horas conocidas. El resto queda en `null`. */
const MODULES: Module[] = [
  { id: 'di', name: 'Desarrollo de Interfaces', shortName: 'Interfaces', totalHours: 210 },
  { id: 'python', name: 'Python (optativa)', shortName: 'Python', totalHours: 105 },
  { id: 'ipe2', name: 'IPE II', shortName: 'IPE II', totalHours: null },
  { id: 'pmdm', name: 'Programación Multimedia y Dispositivos Móviles', shortName: 'Multimedia', totalHours: null },
  { id: 'pi', name: 'Proyecto Intermodular', shortName: 'Proyecto', totalHours: null },
  { id: 'sge', name: 'Sistemas de Gestión Empresarial', shortName: 'Gestión Emp.', totalHours: null },
  { id: 'ad', name: 'Acceso a Datos', shortName: 'Acceso a Datos', totalHours: null },
  { id: 'psp', name: 'Programación de Servicios y Procesos', shortName: 'Servicios', totalHours: null },
  { id: 'ingles', name: 'Inglés Profesional', shortName: 'Inglés', totalHours: null },
];

const INITIAL_HOURS: Record<string, number> = { di: 5, python: 4, ipe2: 2, pmdm: 2, pi: 2, sge: 2, ad: 1 };

/**
 * Las faltas iniciales se conocen solo como acumulado: sin día ni justificación.
 * Por eso se guardan sin fecha y sin clasificar, en lugar de inventar esos datos.
 */
const INITIAL_ABSENCES: Absence[] = Object.entries(INITIAL_HOURS).map(([moduleId, hours]) => ({
  id: `inicial-${moduleId}`,
  moduleId,
  date: null,
  hours,
  status: 'unclassified',
  note: 'Acumulado inicial',
}));

export function createInitialData(): AppData {
  return {
    version: 1,
    modules: MODULES.map((m) => ({ ...m })),
    absences: INITIAL_ABSENCES.map((a) => ({ ...a })),
    settings: { ...DEFAULT_SETTINGS },
  };
}
