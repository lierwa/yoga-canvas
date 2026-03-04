import { useEffect, useRef, useState } from 'react';

type SpringConfig = {
  stiffness?: number;
  damping?: number;
  mass?: number;
  precision?: number;
};

export function useSpringValue(target: number, config: SpringConfig = {}): number {
  const stiffness = config.stiffness ?? 520;
  const damping = config.damping ?? 38;
  const mass = config.mass ?? 1;
  const precision = config.precision ?? 0.001;

  const [value, setValue] = useState(target);
  const valueRef = useRef(value);
  const velocityRef = useRef(0);
  const targetRef = useRef(target);
  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef<number | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    targetRef.current = target;

    const step = (t: number) => {
      const lastT = lastTRef.current ?? t;
      const dtMs = Math.min(32, t - lastT);
      lastTRef.current = t;
      const dt = dtMs / 1000;

      const x = valueRef.current;
      const v = velocityRef.current;
      const to = targetRef.current;

      const force = -stiffness * (x - to);
      const damper = -damping * v;
      const a = (force + damper) / mass;

      const nextV = v + a * dt;
      const nextX = x + nextV * dt;

      velocityRef.current = nextV;
      valueRef.current = nextX;
      setValue(nextX);

      const done =
        Math.abs(nextV) < precision && Math.abs(nextX - to) < precision;
      if (done) {
        velocityRef.current = 0;
        valueRef.current = to;
        setValue(to);
        rafRef.current = null;
        lastTRef.current = null;
        return;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTRef.current = null;
    };
  }, [target, stiffness, damping, mass, precision]);

  return value;
}

