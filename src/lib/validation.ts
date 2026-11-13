import { isValidISODate, isWeekend, todayISO } from './dates';
import { fmtHours } from './format';
import type { Absence, AppData } from './types';

export interface AbsenceInput {
  id?: string;
  moduleId: string;
  date: string | null;
  hours: number;
  allowEmptyDate: boolean;
}

export interface AbsenceCheck {
  errors: Partial<Record<'moduleId' | 'date' | 'hours', string>>;
  warnings: string[];
}

export function checkAbsence(input: AbsenceInput, data: AppData, today = todayISO()): AbsenceCheck {
  const errors: AbsenceCheck['errors'] = {};
  const warnings: string[] = [];
  const { hoursPerDay } = data.settings;

  if (!data.modules.some((m) => m.id === input.moduleId)) errors.moduleId = 'Elige un módulo.';

  if (!input.date) {
    if (!input.allowEmptyDate) errors.date = 'Indica la fecha de la falta.';
  } else if (!isValidISODate(input.date)) {
    errors.date = 'La fecha no es válida.';
  } else if (input.date > today) {
    errors.date = 'La fecha no puede ser posterior a hoy.';
  }

  if (!Number.isFinite(input.hours) || input.hours <= 0) {
    errors.hours = 'Indica un número de horas mayor que 0.';
  } else if (input.date && input.hours > hoursPerDay) {
    errors.hours = `Un día tiene ${fmtHours(hoursPerDay)} de clase como máximo.`;
  }

  if (input.date && !errors.date) {
    if (isWeekend(input.date)) warnings.push('Esa fecha cae en fin de semana y tu horario es de lunes a viernes.');
    const sameDay = data.absences
      .filter((a: Absence) => a.date === input.date && a.id !== input.id)
      .reduce((t, a) => t + a.hours, 0);
    const dayTotal = sameDay + (Number.isFinite(input.hours) ? input.hours : 0);
    if (dayTotal > hoursPerDay) {
      warnings.push(`Ese día sumaría ${fmtHours(dayTotal)} de falta y tu jornada es de ${fmtHours(hoursPerDay)}.`);
    }
  }
  return { errors, warnings };
}

/** Devuelve el valor numérico de un campo, o `null` si está vacío o no es válido. Acepta coma decimal. */
export function parsePositive(raw: string): number | null {
  const n = Number(raw.trim().replace(',', '.'));
  return raw.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null;
}
