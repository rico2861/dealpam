import { useState, useEffect } from 'react';

export interface GeoState {
  lat: number | null;
  lng: number | null;
  city: string;
  granted: boolean;
  loading: boolean;
}

const DEV_GPS_KEY = 'dp_dev_gps';

function getDevGps(): { lat: number; lng: number; city: string } | null {
  if (!import.meta.env.DEV) return null;
  try {
    const s = localStorage.getItem(DEV_GPS_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export function setDevGps(lat: number, lng: number, city: string) {
  localStorage.setItem(DEV_GPS_KEY, JSON.stringify({ lat, lng, city }));
  window.dispatchEvent(new CustomEvent('devgps-change'));
}

export function clearDevGps() {
  localStorage.removeItem(DEV_GPS_KEY);
  window.dispatchEvent(new CustomEvent('devgps-change'));
}

export function useGeo(): GeoState & { request: () => void } {
  const [state, setState] = useState<GeoState>({
    lat: null, lng: null, city: '', granted: false, loading: false,
  });

  const applyDevGps = () => {
    const dev = getDevGps();
    if (dev) {
      setState({ lat: dev.lat, lng: dev.lng, city: dev.city, granted: true, loading: false });
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (applyDevGps()) return;
    const cached = sessionStorage.getItem('dp_geo');
    if (cached) {
      try { setState(JSON.parse(cached)); } catch {}
    }
    const handler = () => applyDevGps();
    window.addEventListener('devgps-change', handler);
    return () => window.removeEventListener('devgps-change', handler);
  }, []);

  const request = () => {
    if (applyDevGps()) return;
    if (!navigator.geolocation) return;
    setState(p => ({ ...p, loading: true }));
    navigator.geolocation.getCurrentPosition(
      pos => {
        const next = {
          lat:     pos.coords.latitude,
          lng:     pos.coords.longitude,
          city:    '',
          granted: true,
          loading: false,
        };
        setState(next);
        sessionStorage.setItem('dp_geo', JSON.stringify(next));
      },
      () => setState(p => ({ ...p, loading: false })),
      { timeout: 8000 },
    );
  };

  return { ...state, request };
}
