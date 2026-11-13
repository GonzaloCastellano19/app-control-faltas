import { AlertTriangle, CheckCircle2, CircleDashed, OctagonAlert, OctagonX } from 'lucide-react';
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { STATE_LABEL, STATUS_LABEL } from '../lib/format';
import { useTilt } from './motion';
import type { AbsenceStatus, LimitState } from '../lib/types';

export function Card({ className = '', tilt = false, children, ...rest }: HTMLAttributes<HTMLElement> & { tilt?: boolean }) {
  const { ref, onPointerMove, onPointerLeave } = useTilt<HTMLElement>();
  return tilt ? (
    <section {...rest} ref={ref} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} className={`panel tilt ${className}`}>{children}</section>
  ) : (
    <section {...rest} className={`panel ${className}`}>{children}</section>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary text-ink',
  ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
  danger: 'btn-danger text-bad-text',
};

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`btn inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3.5 text-sm font-medium disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export const inputClass =
  'well min-h-10 w-full min-w-0 rounded-xl px-3 text-base text-ink placeholder:text-muted sm:text-sm';

const STATE_STYLE: Record<LimitState, { cls: string; Icon: typeof CheckCircle2 }> = {
  unset: { cls: 'bg-brand-soft text-brand-text', Icon: CircleDashed },
  ok: { cls: 'bg-ok-soft text-ok-text', Icon: CheckCircle2 },
  near: { cls: 'bg-bad-soft text-bad-text', Icon: AlertTriangle },
  reached: { cls: 'bg-bad-soft text-bad-text ring-1 ring-current', Icon: OctagonAlert },
  exceeded: { cls: 'bg-[var(--mark-limit)] text-white', Icon: OctagonX },
};

export function StatePill({ state }: { state: LimitState }) {
  const { cls, Icon } = STATE_STYLE[state];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${cls}`}>
      <Icon size={13} aria-hidden />
      {STATE_LABEL[state]}
    </span>
  );
}

const STATUS_STYLE: Record<AbsenceStatus, string> = {
  justified: 'bg-ok-soft text-ok-text',
  unjustified: 'bg-bad-soft text-bad-text',
  unclassified: 'bg-brand-soft text-brand-text',
};

export function StatusBadge({ status }: { status: AbsenceStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export const STATUS_MARK: Record<AbsenceStatus, string> = {
  justified: 'var(--mark-justified)',
  unjustified: 'var(--mark-unjustified)',
  unclassified: 'var(--mark-unclassified)',
};
