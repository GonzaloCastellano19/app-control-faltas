import { parseISODate } from './dates';
import type { AbsenceStatus, LimitState } from './types';

const number = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

export const fmtNumber = (n: number) => number.format(n);
export const fmtHours = (n: number) => `${number.format(n)} h`;
export const fmtPercent = (n: number) => `${percent.format(n)} %`;

export const fmtDate = (iso: string) =>
  parseISODate(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const fmtShortDate = (iso: string) =>
  parseISODate(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
export const fmtMonth = (iso: string) =>
  parseISODate(iso).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
export const fmtLongToday = () =>
  new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const STATUS_LABEL: Record<AbsenceStatus, string> = {
  justified: 'Justificada',
  unjustified: 'No justificada',
  unclassified: 'Sin clasificar',
};

export const STATE_LABEL: Record<LimitState, string> = {
  unset: 'Faltan horas totales',
  ok: 'Dentro del margen',
  near: 'Cerca del límite',
  reached: 'Límite alcanzado',
  exceeded: 'Límite superado',
};
