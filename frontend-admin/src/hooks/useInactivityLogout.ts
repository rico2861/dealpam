import { useEffect, useRef } from 'react';

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const;

// Déconnecte automatiquement après N ms sans interaction utilisateur —
// indépendant de la durée de vie du token JWT. Protège les sessions
// laissées ouvertes sans surveillance sur un appareil partagé/public.
export function useInactivityLogout(timeoutMs: number, onTimeout: () => void, enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onTimeout, timeoutMs);
    };

    reset();
    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, reset, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, reset));
    };
  }, [timeoutMs, onTimeout, enabled]);
}
