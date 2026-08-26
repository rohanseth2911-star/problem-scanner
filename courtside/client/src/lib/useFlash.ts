import { useEffect, useRef, useState } from 'react';

/**
 * Returns true briefly whenever `value` changes.
 *
 * A score that silently swaps from 104 to 106 is easy to miss on a glance at a
 * phone. A short flash is the difference between "the page has live data" and
 * "the page might be frozen".
 */
export function useFlash(value: number | string | undefined, ms = 1100): boolean {
  const [flashing, setFlashing] = useState(false);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) return;
    // Skip the first paint: mounting is not a score change.
    const isFirst = previous.current === undefined;
    previous.current = value;
    if (isFirst) return;

    setFlashing(true);
    const timer = setTimeout(() => setFlashing(false), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);

  return flashing;
}
