import { useEffect, useState } from 'react';

/**
 * A countdown in seconds, for buttons that must wait: `start(error.retryAfter)` after a 429
 * (the API says how long to wait), then disable the button while `secondsLeft > 0`.
 */
export function useCooldown() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);
  return { secondsLeft, start: (seconds) => setSecondsLeft(Math.max(0, Math.ceil(Number(seconds) || 0))) };
}

/** "45s" or "12 min", for a button label. */
export const waitLabel = (seconds) => (seconds < 60 ? `${seconds}s` : `${Math.ceil(seconds / 60)} min`);
