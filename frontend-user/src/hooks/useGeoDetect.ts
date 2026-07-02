import { useEffect } from 'react';
import { useLocationStore } from '../store/location.store';
import { findNearestCity } from '../data/haiti-locations';

/**
 * Au premier chargement, si aucune localisation n'est enregistrée,
 * demande la permission GPS et détecte automatiquement département/ville.
 * Si la permission est refusée ou en timeout → ne fait rien.
 */
export function useGeoDetect() {
  const { location, setLocation } = useLocationStore();

  useEffect(() => {
    // Migrer l'ancienne clé localStorage vers le Zustand store si le store est vide
    if (!location) {
      const oldCity = localStorage.getItem('dealpam_city');
      if (oldCity) {
        // L'ancienne valeur était le département (trouvé par nearestDept)
        // On le traite comme département pour la compatibilité
        setLocation({ department: oldCity, source: 'manual' });
        return;
      }
    }

    // Ne pas demander GPS si l'utilisateur a déja une localisation
    if (location) return;
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const found = findNearestCity(latitude, longitude);
        if (found) {
          setLocation({
            department: found.department,
            city: found.city,
            source: 'gps',
            lat: latitude,
            lng: longitude,
          });
        }
      },
      () => {},
      { timeout: 8000, maximumAge: 600_000 }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
