export type AbsenceStatus = 'justified' | 'unjustified' | 'unclassified';

export interface Module {
  id: string;
  name: string;
  shortName: string;
  /** Horas totales del módulo. `null` significa que aún no se han introducido. */
  totalHours: number | null;
}

export interface Absence {
  id: string;
  moduleId: string;
  /** Fecha local AAAA-MM-DD. `null` en las faltas de las que no se conoce el día. */
  date: string | null;
  hours: number;
  status: AbsenceStatus;
  note: string;
}

export interface Settings {
  /** Porcentaje de horas del módulo que marca el límite. */
  limitPercent: number;
  /** Porcentaje del límite a partir del cual se avisa. */
  warnAtPercent: number;
  /** Si es `false`, las justificadas no consumen margen. */
  countJustified: boolean;
  hoursPerDay: number;
  daysPerWeek: number;
}

export interface AppData {
  version: 1;
  modules: Module[];
  absences: Absence[];
  settings: Settings;
}

export type LimitState = 'unset' | 'ok' | 'near' | 'reached' | 'exceeded';

export interface ModuleSummary {
  module: Module;
  totalAbsent: number;
  justified: number;
  unjustified: number;
  unclassified: number;
  /** Horas que cuentan para el límite según los ajustes. */
  counted: number;
  limit: number | null;
  warnFrom: number | null;
  /** Horas que quedan hasta el límite; negativo si se ha superado. */
  margin: number | null;
  /** Porcentaje del límite consumido. */
  usedOfLimit: number | null;
  /** Porcentaje de las horas del módulo. */
  shareOfModule: number | null;
  state: LimitState;
}
