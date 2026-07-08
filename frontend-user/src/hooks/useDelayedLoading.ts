import { useEffect, useRef, useState } from 'react';

/**
 * Anti-clignotement : ne montre le squelette que si le chargement dépasse
 * `delayMs`. En dessous, on va directement de rien → contenu final, sans
 * flash intermédiaire désagréable.
 */
export function useDelayedLoading(isLoading: boolean, delayMs = 300): boolean {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      timer.current = setTimeout(() => setShow(true), delayMs);
    } else {
      if (timer.current) clearTimeout(timer.current);
      setShow(false);
    }
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [isLoading, delayMs]);

  return show;
}
