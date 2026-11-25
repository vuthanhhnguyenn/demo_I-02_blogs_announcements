import { useEffect, useState } from 'react';

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Shared 60-second countdown for "resend" actions (`research.md` R9-style promotion — extracted
 * once a second consumer needed the identical countdown password-reset-form.tsx already had).
 */
export function useResendCooldown() {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  function start() {
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
  }

  return { secondsLeft, start, isCoolingDown: secondsLeft > 0 };
}
