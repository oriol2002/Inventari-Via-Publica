
export enum CrossingState {
  EXCELLENT = 'Excel·lent',
  GOOD = 'Bo',
  FAIR = 'Regular',
  POOR = 'Deficient',
  DANGEROUS = 'Perillós',
  MISSING = 'Inexistent'
}

export enum AssetType {
  CROSSING = 'Pas de Vianants',
  TRAFFIC_LIGHT = 'Semàfor',
  SIGN = 'Senyal Vertical',
  BARRIER = 'Barana/Protecció',
  BOLLARD = 'Pilona',
  SPEED_BUMP = 'Ressalt',
  MIRROR = 'Mirall',
  HORIZONTAL_GENERIC = 'Senyal horitzontal genèrica',
  PMR_PAINT = 'PMR pintura',
  LOADING_UNLOADING = 'Càrrega i Descarrega Pintura',
  ACCESSIBILITY_RAMP = 'Rampa accesibilitat',
  CONTAINER = 'Contenidor',
  OTHER = 'Altres'
}

export interface Location {
  lat: number;
  lng: number;
  street?: string;
  neighborhood?: string;
  number?: string;
  address?: string;
  city?: string;
}

export interface PedestrianCrossing {
  id: string;
  image: string;
  location: Location;
  state: CrossingState;
  lastPaintedDate: string;
  lastInspectedDate?: string; // Data de l'últim punt de control visual
  assetType: AssetType;
  paintType?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FilterOptions {
  states?: CrossingState[];
  searchQuery?: string;
  assetTypes?: AssetType[];
  neighborhoods?: string[];
  dateFrom?: string;
  dateTo?: string;
  city?: string;
}

export interface SavedReport {
  id: string;
  title: string;
  date: string;
  type: 'maintenance' | 'technical' | 'statistical';
  crossingIds: string[];
  createdAt: number;
  aiAnalysis?: string;
}

// Grups definits per Tortosa actualitzats
export const TORTOSA_BARRIS = [
  'Centre', 
  'Eixample', 
  'Ferreries', 
  'Rastre', 
  'Remolins', 
  'Santa Clara', 
  'Sant Josep de la Muntanya', 
  'Sant Llàtzer', 
  'Simpàtica', 
  'Temple'
].sort((a, b) => a.localeCompare(b));

export const TORTOSA_PEDANIES = ['Bítem', 'Campredó', 'Els Reguers', 'Jesús', 'Vinallop'].sort((a, b) => a.localeCompare(b));
export const TORTOSA_POLIGONS = ['Polígon Ind. Catalunya Sud', 'Polígon Ind. Baix Ebre', 'Polígon Ind. Pla de l\'Estació'].sort((a, b) => a.localeCompare(b));

export const NEIGHBORHOODS_BY_CITY: Record<string, string[]> = {
  'Tortosa': [
    ...TORTOSA_BARRIS,
    ...TORTOSA_PEDANIES,
    ...TORTOSA_POLIGONS
  ]
};

export const CITIES = ['Tortosa'];
