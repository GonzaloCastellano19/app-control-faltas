import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Inclina un elemento hacia el puntero. No actúa en táctil ni con movimiento reducido. */
export function useTilt<T extends HTMLElement>(max = 5) {
  const ref = useRef<T>(null);

  const onPointerMove = (e: ReactPointerEvent<T>) => {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse' || reducedMotion() || el.contains(document.activeElement)) return;
    const box = el.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width;
    const y = (e.clientY - box.top) / box.height;
    el.style.transition = 'transform 90ms linear, box-shadow 300ms';
    el.style.transform = `perspective(1000px) rotateX(${((0.5 - y) * max).toFixed(2)}deg) rotateY(${((x - 0.5) * max).toFixed(2)}deg) translateZ(8px)`;
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    el.dataset.tilting = 'true';
  };

  const onPointerLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = '';
    el.style.transform = '';
    delete el.dataset.tilting;
  };

  return { ref, onPointerMove, onPointerLeave };
}

/** Anima un número hasta su valor. Siempre termina en el valor exacto. */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0));
  const current = useRef(shown);

  useEffect(() => {
    if (reducedMotion()) {
      current.current = value;
      setShown(value);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min((now - start) / 750, 1);
      const eased = 1 - (1 - t) ** 3;
      const next = t === 1 ? value : from + (value - from) * eased;
      current.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const rounded = shown === value ? value : Math.round(shown * 10) / 10;
  return <>{format(rounded)}</>;
}
