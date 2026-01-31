
export enum CrossingState {
  EXCELLENT = 'Excel·lent',
  GOOD = 'Bo',
  FAIR = 'Regular',
  POOR = 'Deficient',
  DANGEROUS = 'Perillós',
  MISSING = 'Inexistent'
}

export enum AssetType {
  AWARENESS = 'Sensibilització',
  SIGNS = 'Senyals',
  PAINT = 'Pintura',
  PAVEMENT = 'Paviment',
  URBAN_FURNITURE = 'Mobiliari urbà',
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
  imageThumb?: string;
  location: Location;
  state: CrossingState;
  lastPaintedDate: string;
  assetType: AssetType;
  assetSubType?: string;
  paintType?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  updatedBy?: string;
  alertDismissed?: boolean; // Marca si l'alerta ha estat llegida i descartada
  accessGroups?: AccessGroup[];
}

export type AccessGroup = 'mobilitat' | 'agents-civics';
export type AppSection = AccessGroup | 'administrador';
export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  allowedSections: AppSection[];
  defaultSection: AppSection;
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
  createdBy?: string;
}

// Grups definits per Tortosa actualitzats
export const TORTOSA_BARRIS = [
  'Centre', 
  'Eixample', 
  'Ferreries', 
  'Grup el Temple',
  'Portals de Tortosa',
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
