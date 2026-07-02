import { useEffect, useState } from 'react';

// Haiti departments with approximate centroid coordinates
const DEPARTMENTS: { name: string; lat: number; lon: number }[] = [
  { name: 'Ouest',       lat: 18.54, lon: -72.34 },
  { name: 'Nord',        lat: 19.76, lon: -72.20 },
  { name: 'Nord-Est',    lat: 19.80, lon: -71.85 },
  { name: 'Nord-Ouest',  lat: 19.84, lon: -72.83 },
  { name: 'Artibonite',  lat: 19.11, lon: -72.68 },
  { name: 'Centre',      lat: 19.15, lon: -71.96 },
  { name: 'Sud',         lat: 18.21, lon: -73.75 },
  { name: 'Sud-Est',     lat: 18.23, lon: -72.33 },
  { name: "Grand'Anse",  lat: 18.45, lon: -74.12 },
  { name: 'Nippes',      lat: 18.40, lon: -73.03 },
];

function nearestDept(lat: number, lon: number): string {
  let best = DEPARTMENTS[0].name;
  let minDist = Infinity;
  for (const d of DEPARTMENTS) {
    const dist = Math.sqrt((d.lat - lat) ** 2 + (d.lon - lon) ** 2);
    if (dist < minDist) { minDist = dist; best = d.name; }
  }
  return best;
}

export function useGeolocation() {
  const [dept, setDept] = useState<string>(() => localStorage.getItem('dealpam_city') || '');
  const [loading, setLoading] = useState(false);

  const detect = () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const detected = nearestDept(pos.coords.latitude, pos.coords.longitude);
        setDept(detected);
        localStorage.setItem('dealpam_city', detected);
        setLoading(false);
      },
      () => setLoading(false),
      { timeout: 6000, maximumAge: 3600000 }
    );
  };

  // Auto-detect only if no city set yet
  useEffect(() => {
    if (!localStorage.getItem('dealpam_city')) detect();
  }, []);

  const setDeptManual = (d: string) => {
    setDept(d);
    localStorage.setItem('dealpam_city', d);
  };

  return { dept, loading, detect, setDept: setDeptManual };
}
