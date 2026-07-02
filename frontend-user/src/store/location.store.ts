import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LocationData {
  department: string;
  city?: string; // optionnel : si absent, on affiche tout le département
  source?: 'manual' | 'gps';
  lat?: number;
  lng?: number;
}

interface LocationState {
  location: LocationData | null;
  setLocation: (loc: LocationData | null) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      location: null,
      setLocation: (location) => set({ location }),
    }),
    { name: 'dp_location_v2' }
  )
);
