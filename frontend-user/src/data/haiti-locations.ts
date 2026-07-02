export interface HaitiCity {
  name: string;
  lat: number;
  lng: number;
}

export interface HaitiDepartment {
  name: string;
  cities: HaitiCity[];
}

export const HAITI_DEPARTMENTS: HaitiDepartment[] = [
  {
    name: 'Ouest',
    cities: [
      { name: 'Port-au-Prince',      lat: 18.5432, lng: -72.3395 },
      { name: 'Petionville',         lat: 18.5133, lng: -72.2861 },
      { name: 'Delmas',              lat: 18.5480, lng: -72.3074 },
      { name: 'Tabarre',             lat: 18.5895, lng: -72.2845 },
      { name: 'Carrefour',           lat: 18.5353, lng: -72.3999 },
      { name: 'Croix-des-Bouquets', lat: 18.5818, lng: -72.2268 },
      { name: 'Kenscoff',            lat: 18.4411, lng: -72.3052 },
      { name: 'Gressier',            lat: 18.5420, lng: -72.5108 },
      { name: 'Leogane',             lat: 18.5120, lng: -72.6322 },
      { name: 'Grand-Goave',         lat: 18.4322, lng: -72.7773 },
      { name: 'Petit-Goave',         lat: 18.4337, lng: -72.8652 },
      { name: 'Arcahaie',            lat: 18.7694, lng: -72.5266 },
      { name: 'Cabaret',             lat: 18.6786, lng: -72.3638 },
      { name: 'Thomazeau',           lat: 18.6155, lng: -72.1038 },
    ],
  },
  {
    name: 'Nord',
    cities: [
      { name: 'Cap-Haitien',           lat: 19.7577, lng: -72.2040 },
      { name: 'Limonade',              lat: 19.6714, lng: -72.1149 },
      { name: 'Quartier-Morin',        lat: 19.7002, lng: -72.1568 },
      { name: 'Plaine-du-Nord',        lat: 19.5968, lng: -72.2705 },
      { name: 'Milot',                 lat: 19.6026, lng: -72.2237 },
      { name: 'Acul-du-Nord',          lat: 19.7245, lng: -72.3263 },
      { name: 'Dondon',                lat: 19.5346, lng: -72.3095 },
      { name: 'Saint-Raphael',         lat: 19.4656, lng: -72.2750 },
      { name: 'Grande-Riviere-du-Nord',lat: 19.5942, lng: -72.1758 },
      { name: 'Pignon',                lat: 19.3596, lng: -72.2969 },
      { name: 'Bahon',                 lat: 19.5189, lng: -72.1973 },
      { name: 'La Victoire',           lat: 19.4800, lng: -72.3200 },
    ],
  },
  {
    name: 'Nord-Est',
    cities: [
      { name: 'Fort-Liberte',    lat: 19.6601, lng: -71.8396 },
      { name: 'Ouanaminthe',     lat: 19.5546, lng: -71.7348 },
      { name: 'Trou-du-Nord',    lat: 19.6216, lng: -72.0101 },
      { name: 'Caracol',         lat: 19.6800, lng: -71.9500 },
      { name: 'Capotille',       lat: 19.5000, lng: -71.8000 },
      { name: 'Mombin-Crochu',   lat: 19.5500, lng: -72.0800 },
      { name: 'Sainte-Suzanne',  lat: 19.6700, lng: -72.1000 },
      { name: 'Vallieres',       lat: 19.5700, lng: -71.9500 },
      { name: 'Carice',          lat: 19.4800, lng: -71.8800 },
      { name: 'Mont-Organise',   lat: 19.5200, lng: -71.9200 },
      { name: 'Ferrier',         lat: 19.6900, lng: -71.7900 },
    ],
  },
  {
    name: 'Nord-Ouest',
    cities: [
      { name: 'Port-de-Paix',       lat: 19.9430, lng: -72.8349 },
      { name: 'Saint-Louis-du-Nord',lat: 19.9300, lng: -72.7200 },
      { name: 'Mole-Saint-Nicolas', lat: 19.8035, lng: -73.3697 },
      { name: 'Bombardopolis',      lat: 19.7100, lng: -73.1400 },
      { name: 'Baie-de-Henne',      lat: 19.7500, lng: -73.2500 },
      { name: 'Jean-Rabel',         lat: 19.8572, lng: -73.1896 },
      { name: 'Chansolme',          lat: 19.8000, lng: -72.9500 },
      { name: 'Anse-a-Foleur',      lat: 19.9800, lng: -72.8800 },
    ],
  },
  {
    name: 'Artibonite',
    cities: [
      { name: 'Gonaives',                       lat: 19.4530, lng: -72.6887 },
      { name: 'Saint-Marc',                     lat: 19.1060, lng: -72.7016 },
      { name: 'Dessalines',                     lat: 19.2885, lng: -72.5088 },
      { name: 'Verrettes',                      lat: 19.0538, lng: -72.4641 },
      { name: 'Grande-Saline',                  lat: 19.1900, lng: -72.8100 },
      { name: 'Petite-Riviere-de-Artibonite',   lat: 19.1344, lng: -72.5083 },
      { name: 'Estere',                         lat: 19.2000, lng: -72.6700 },
      { name: 'Gros-Morne',                     lat: 19.6706, lng: -72.6842 },
      { name: 'Ennery',                         lat: 19.5050, lng: -72.6100 },
      { name: 'Marmelade',                      lat: 19.4761, lng: -72.3611 },
      { name: 'Terre-Neuve',                    lat: 19.3000, lng: -72.7200 },
      { name: 'Desdunes',                       lat: 19.3200, lng: -72.7000 },
      { name: 'Liancourt',                      lat: 19.2100, lng: -72.6600 },
    ],
  },
  {
    name: 'Centre',
    cities: [
      { name: 'Hinche',           lat: 19.1465, lng: -72.0086 },
      { name: 'Mirebalais',       lat: 18.8330, lng: -72.0985 },
      { name: 'Lascahobas',       lat: 18.8322, lng: -71.9295 },
      { name: 'Belladere',        lat: 18.8597, lng: -71.7829 },
      { name: 'Thomonde',         lat: 19.0300, lng: -72.0900 },
      { name: 'Cerca-Carvajal',   lat: 19.0100, lng: -72.0200 },
      { name: 'Cerca-la-Source',  lat: 19.1700, lng: -72.1600 },
      { name: 'Savanette',        lat: 18.9200, lng: -71.9500 },
      { name: 'Baptiste',         lat: 18.9800, lng: -72.0100 },
      { name: 'Boucan-Carre',     lat: 18.9600, lng: -72.1300 },
    ],
  },
  {
    name: 'Sud',
    cities: [
      { name: 'Les Cayes',           lat: 18.1937, lng: -73.7498 },
      { name: 'Aquin',               lat: 18.2749, lng: -73.3993 },
      { name: 'Saint-Louis-du-Sud',  lat: 18.2600, lng: -73.5700 },
      { name: 'Cavaillon',           lat: 18.2970, lng: -73.5580 },
      { name: 'Chantal',             lat: 18.1600, lng: -73.6400 },
      { name: 'Torbeck',             lat: 18.1800, lng: -73.7600 },
      { name: 'Camp-Perrin',         lat: 18.3000, lng: -73.8500 },
      { name: 'Maniche',             lat: 18.2200, lng: -73.9300 },
      { name: 'Arniquet',            lat: 18.1400, lng: -73.9700 },
      { name: 'Port-Salut',          lat: 18.1100, lng: -74.0000 },
      { name: 'Saint-Jean-du-Sud',   lat: 18.1300, lng: -73.9000 },
      { name: 'Ile-a-Vache',         lat: 18.0700, lng: -73.6700 },
    ],
  },
  {
    name: 'Sud-Est',
    cities: [
      { name: 'Jacmel',                  lat: 18.2341, lng: -72.5354 },
      { name: 'Bainet',                  lat: 18.2255, lng: -72.8028 },
      { name: 'Belle-Anse',              lat: 18.2351, lng: -72.0596 },
      { name: 'Cayes-Jacmel',            lat: 18.2144, lng: -72.6285 },
      { name: 'Cotes-de-Fer',            lat: 18.2700, lng: -72.7200 },
      { name: 'Grand-Gosier',            lat: 18.2100, lng: -72.0100 },
      { name: 'Marigot',                 lat: 18.2400, lng: -72.3100 },
      { name: 'Thiotte',                 lat: 18.2300, lng: -71.8500 },
      { name: 'La Vallee-de-Jacmel',     lat: 18.2000, lng: -72.4700 },
      { name: 'Anse-a-Pitres',           lat: 18.0400, lng: -71.7700 },
    ],
  },
  {
    name: "Grand'Anse",
    cities: [
      { name: 'Jeremie',          lat: 18.6457, lng: -74.1197 },
      { name: 'Anse-Hainault',    lat: 18.5700, lng: -74.4500 },
      { name: 'Dame-Marie',       lat: 18.5573, lng: -74.4227 },
      { name: 'Moron',            lat: 18.6200, lng: -74.2700 },
      { name: 'Abricots',         lat: 18.6300, lng: -74.3600 },
      { name: 'Roseaux',          lat: 18.6500, lng: -74.1900 },
      { name: 'Corail',           lat: 18.5700, lng: -73.8900 },
      { name: 'Beaumont',         lat: 18.4900, lng: -74.1000 },
      { name: 'Chambellan',       lat: 18.5400, lng: -74.0500 },
      { name: 'Bonbon',           lat: 18.5100, lng: -73.9700 },
      { name: 'Les Irois',        lat: 18.4700, lng: -74.4700 },
    ],
  },
  {
    name: 'Nippes',
    cities: [
      { name: 'Miragoane',                   lat: 18.4431, lng: -73.0889 },
      { name: 'Arnaud',                      lat: 18.4700, lng: -73.1200 },
      { name: 'Baraderes',                   lat: 18.5000, lng: -73.6300 },
      { name: 'Petite-Riviere-de-Nippes',    lat: 18.4800, lng: -73.3200 },
      { name: 'Plaisance-du-Sud',            lat: 18.4200, lng: -73.2700 },
      { name: 'L-Asile',                     lat: 18.3700, lng: -73.1700 },
      { name: 'Grand-Boucan',                lat: 18.5200, lng: -73.4500 },
      { name: 'Paillant',                    lat: 18.4000, lng: -73.3000 },
    ],
  },
];

// Flat lookup for quick access
export const HAITI_DEPT_NAMES = HAITI_DEPARTMENTS.map(d => d.name);

export function getCitiesForDept(dept: string): HaitiCity[] {
  return HAITI_DEPARTMENTS.find(d => d.name === dept)?.cities ?? [];
}

export function findNearestCity(lat: number, lng: number): { department: string; city: string } | null {
  let best: { department: string; city: string; dist: number } | null = null;
  for (const dept of HAITI_DEPARTMENTS) {
    for (const city of dept.cities) {
      const dist = Math.hypot(city.lat - lat, city.lng - lng);
      if (!best || dist < best.dist) {
        best = { department: dept.name, city: city.name, dist };
      }
    }
  }
  return best ? { department: best.department, city: best.city } : null;
}

export interface LocationData {
  department: string;
  city: string;
  lat?: number;
  lng?: number;
  source?: 'manual' | 'gps';
}

const LS_KEY = 'dp_location';

export function getStoredLocation(): LocationData | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeLocation(loc: LocationData): void {
  localStorage.setItem(LS_KEY, JSON.stringify(loc));
}

export function clearLocation(): void {
  localStorage.removeItem(LS_KEY);
}
