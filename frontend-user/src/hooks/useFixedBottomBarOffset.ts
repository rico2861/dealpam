import { useEffect, useRef } from 'react';

/**
 * Measures a fixed-position bottom bar and publishes its height as the
 * `--dp-fab-extra-bottom` CSS variable so other fixed elements (e.g. the
 * global support FAB) can stack above it instead of overlapping it.
 */
export function useFixedBottomBarOffset<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active || !ref.current) {
      document.documentElement.style.setProperty('--dp-fab-extra-bottom', '0px');
      return;
    }
    const el = ref.current;
    const update = () => document.documentElement.style.setProperty('--dp-fab-extra-bottom', `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.setProperty('--dp-fab-extra-bottom', '0px');
    };
  }, [active]);

  return ref;
}
