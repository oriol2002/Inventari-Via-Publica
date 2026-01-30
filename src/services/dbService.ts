
import { createClient } from '@supabase/supabase-js';
import { PedestrianCrossing, AssetType, CrossingState, SavedReport } from '../types';

// Utilitzem les claus hardcoded com a fallback
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string || 'https://xnbvbcubteklfpabhbpl.supabase.co'; 
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuYnZiY3VidGVrbGZwYWJoYnBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTA1MDAsImV4cCI6MjA4NDk4NjUwMH0.d_lLFsDznEuJGSeKyFqpTlfCQzKjipg-qVnG_pO_Amw';
const OFFLINE_MODE = (import.meta as any).env?.VITE_OFFLINE_MODE === 'true';

// EXPORTEM la instància perquè useAuth.tsx la pugui utilitzar
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const REPORTS_STORAGE_KEY = 'mobilitat_reports';
const CROSSINGS_STORAGE_KEY = 'mobilitat_elements';

export const dbService = {
  // --- ELEMENTS (CROSSINGS) - OFFLINE FIRST ---
  
  async getAll(): Promise<PedestrianCrossing[]> {
    let localData: PedestrianCrossing[] = [];
    
    console.log('🔍 Carregant dades...');
    
    // 1. Carregar Localment (Fallback)
    try {
      const stored = localStorage.getItem(CROSSINGS_STORAGE_KEY);
      if (stored) {
        localData = JSON.parse(stored);
        console.log('📦 Dades locals:', localData.length, 'elements');
      }
    } catch (e) {
      console.error("Error carregar local:", e);
    }

    // 2. Si estem en mode offline, retornar locals directament
    if (OFFLINE_MODE) {
      console.warn('⚠️ Mode OFFLINE actiu: retornant dades locals');
      return localData.sort((a, b) => b.createdAt - a.createdAt);
    }

    // 3. SEMPRE intentar carregar del servidor FIRST
    try {
      console.log('🌐 Sincronitzant amb Supabase...');
      const { data, error } = await supabase
        .from('crossings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error Supabase:', error);
        // Si falla Supabase, usar locals
        return localData.sort((a,b) => b.createdAt - a.createdAt);
      }
      
      if (!data || data.length === 0) {
        console.log('📭 Servidor buit, retornant dades locals');
        return localData.sort((a,b) => b.createdAt - a.createdAt);
      }

      console.log('✅ Dades del servidor:', data.length, 'elements');
      
      const serverData = (data || []).map(row => {
        let loc = row.location;
        if (typeof loc === 'string') {
            try { loc = JSON.parse(loc); } catch (e) { loc = { lat: 40.8122, lng: 0.5215, city: 'Tortosa', neighborhood: '' }; }
        }

        return {
            id: row.id,
            assetType: (row.asset_type as AssetType) || AssetType.CROSSING,
            image: row.image || '',
            imageThumb: row.image_thumb || '',
            location: loc || { lat: 40.8122, lng: 0.5215, city: 'Tortosa', neighborhood: '' },
            state: (row.state as CrossingState) || CrossingState.GOOD,
            lastPaintedDate: row.last_painted_date || new Date().toISOString().split('T')[0],
            lastInspectedDate: row.last_inspected_date || null,
            paintType: row.paint_type || 'Estàndard',
            notes: row.notes || '',
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
        };
      });

      // GUARDAR METADATA (sense imatges) per estalviar espai
      try {
        const lightData = serverData.map(item => ({
          ...item,
          image: '', // NO guardem imatges grans a localStorage (massa pesades)
          imageThumb: item.imageThumb || ''
        }));
        localStorage.setItem(CROSSINGS_STORAGE_KEY, JSON.stringify(lightData));
        console.log('💾 Metadata sincronitzada (sense imatges)');
      } catch (storageError) {
        console.warn('⚠️ localStorage quote exceeded, continuant amb dades servidor:', storageError);
      }
      
      // RETORNA els dades del servidor (sempre és la font de veritat)
      return serverData.sort((a,b) => b.createdAt - a.createdAt);

    } catch (error) {
      console.warn("⚠️ Error sincronització Supabase (offline mode):", error);
      return localData.sort((a,b) => b.createdAt - a.createdAt);
    }
  },

  async save(crossing: PedestrianCrossing): Promise<void> {
    // 1. Guardar Localment primer (UX ràpida)
    try {
      // Guardem sense imatge per evitar quota exceeded
      const stored = localStorage.getItem(CROSSINGS_STORAGE_KEY);
      let list: PedestrianCrossing[] = stored ? JSON.parse(stored) : [];
      list = list.filter(c => c.id !== crossing.id);
      const lightCrossing = { ...crossing, image: '', imageThumb: crossing.imageThumb || '' };
      list.unshift(lightCrossing);
      localStorage.setItem(CROSSINGS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) { 
      console.error("Local save error:", e); 
    }

    // 2. Enviar al Núvol (si no estem en offline)
    if (OFFLINE_MODE) return;

    try {
      const payload = {
        id: crossing.id,
        asset_type: crossing.assetType,
        image: crossing.image,
        image_thumb: crossing.imageThumb || null,
        location: crossing.location,
        state: crossing.state,
        last_painted_date: crossing.lastPaintedDate,
        last_inspected_date: crossing.lastInspectedDate,
        paint_type: crossing.paintType,
        notes: crossing.notes
      };

      const { error } = await supabase
        .from('crossings')
        .upsert(payload);

      if (error) throw error;
    } catch (error) {
      console.error("Error pujant al servidor (però guardat localment):", error);
      throw error; 
    }
  },

  async deleteMany(ids: string[]): Promise<void> {
    try {
      const stored = localStorage.getItem(CROSSINGS_STORAGE_KEY);
      if (stored) {
        const list: PedestrianCrossing[] = JSON.parse(stored);
        const filtered = list.filter(c => !ids.includes(c.id));
        localStorage.setItem(CROSSINGS_STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (e) { console.error(e); }

    if (OFFLINE_MODE) return;

    try {
      const { error } = await supabase
        .from('crossings')
        .delete()
        .in('id', ids);
      if (error) throw error;
    } catch (error) {
      console.error("Error esborrant del servidor:", error);
    }
  },

  // --- REPORTS ---

  async getReports(): Promise<SavedReport[]> {
    let localReports: SavedReport[] = [];

    // 1. Carregar locals com a fallback
    try {
      const localData = localStorage.getItem(REPORTS_STORAGE_KEY);
      if (localData) localReports = JSON.parse(localData);
    } catch (e) { 
      console.error('Error carregant informes locals:', e); 
    }

    // 2. Si estem en mode offline, retornar locals directament
    if (OFFLINE_MODE) {
      console.warn('⚠️ Mode OFFLINE actiu: retornant informes locals');
      return localReports.sort((a, b) => b.createdAt - a.createdAt);
    }

    // 3. SEMPRE traer del servidor
    try {
      console.log('🌐 Sincronitzant informes amb Supabase...');
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error Supabase informes:', error);
        return localReports.sort((a, b) => b.createdAt - a.createdAt);
      }

      if (!data || data.length === 0) {
        console.log('📭 Servidor informes buit');
        return localReports.sort((a, b) => b.createdAt - a.createdAt);
      }

      const serverReports = data.map(r => ({
        id: r.id,
        title: r.title,
        date: r.date,
        type: r.type,
        crossingIds: r.crossing_ids || [],
        aiAnalysis: r.ai_analysis,
        createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now()
      }));
      
      console.log('✅ Sincronitzats', serverReports.length, 'informes');
      
      // GUARDAR: Actualizar localStorage
      try {
        localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(serverReports));
        console.log('💾 Informes guardats a localStorage');
      } catch (storageError) {
        console.warn('⚠️ localStorage quote exceeded (informes):', storageError);
      }

      // RETORNA els dades del servidor (sempre és la font de veritat)
      return serverReports.sort((a, b) => b.createdAt - a.createdAt);

    } catch (error) {
      console.warn('⚠️ Error sincronització informes:', error);
      return localReports.sort((a, b) => b.createdAt - a.createdAt);
    }
  },

  async saveReport(report: SavedReport): Promise<void> {
    // Local - guardar PRIMER (síncrono)
    try {
      const localReports = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) || '[]');
      const updatedReports = [report, ...localReports.filter((r: SavedReport) => r.id !== report.id)];
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(updatedReports));
    } catch (e) { 
      console.error("Error saving report locally:", e); 
    }

    // Server - intenta sincronitzar en background sense bloquear
    if (OFFLINE_MODE) return;

    try {
      await supabase.from('reports').upsert({
          id: report.id,
          title: report.title,
          date: report.date,
          type: report.type,
          crossing_ids: report.crossingIds,
          ai_analysis: report.aiAnalysis,
          created_at: new Date(report.createdAt).toISOString()
      });
    } catch (error) {
      // No llançar error - l'informe ja està guardat localment
      console.warn("Report not synced to cloud (will sync when connection is available):", error);
    }
  },

  async deleteReport(id: string): Promise<void> {
    try {
      const localReports = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) || '[]');
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(localReports.filter((r: SavedReport) => r.id !== id)));
      if (!OFFLINE_MODE) {
        await supabase.from('reports').delete().eq('id', id);
      }
    } catch (e) { console.error(e); }
  },

  async deleteReports(ids: string[]): Promise<void> {
    try {
      const localReports = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) || '[]');
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(localReports.filter((r: SavedReport) => !ids.includes(r.id))));
      if (!OFFLINE_MODE) {
        await supabase.from('reports').delete().in('id', ids);
      }
    } catch (e) { console.error(e); }
  },

  // --- FORCE SYNC (Sincronització Manual) ---
  async forceSync(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('⚡ Forçant sincronització...');
      
      // 1. PRIMER: Esborrar localStorage per evitar QuotaExceededError
      try {
        localStorage.removeItem(CROSSINGS_STORAGE_KEY);
        localStorage.removeItem(REPORTS_STORAGE_KEY);
        console.log('🗑️ localStorage esborrat');
      } catch (e) {
        console.warn('Error esborrant localStorage:', e);
      }
      
      // 2. Carrega totes les dades del servidor
      const [crossingsRes, reportsRes] = await Promise.all([
        supabase.from('crossings').select('*').order('created_at', { ascending: false }),
        supabase.from('reports').select('*').order('created_at', { ascending: false })
      ]);

      let syncedCrossings = 0;
      let syncedReports = 0;

      // Sincronitzar elements
      if (!crossingsRes.error && crossingsRes.data) {
        const serverData = crossingsRes.data.map(row => {
          let loc = row.location;
          if (typeof loc === 'string') {
            try { loc = JSON.parse(loc); } catch (e) { loc = { lat: 40.8122, lng: 0.5215, city: 'Tortosa', neighborhood: '' }; }
          }
          return {
            id: row.id,
            assetType: (row.asset_type as AssetType) || AssetType.CROSSING,
            image: row.image || '',
            location: loc || { lat: 40.8122, lng: 0.5215, city: 'Tortosa', neighborhood: '' },
            state: (row.state as CrossingState) || CrossingState.GOOD,
            lastPaintedDate: row.last_painted_date || new Date().toISOString().split('T')[0],
            lastInspectedDate: row.last_inspected_date || null,
            paintType: row.paint_type || 'Estàndard',
            notes: row.notes || '',
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
          };
        });
        
        // Guardar sense imatges per evitar QuotaExceededError
        const lightData = serverData.map(item => ({
          ...item,
          image: '' // NO guardem imatges
        }));
        localStorage.setItem(CROSSINGS_STORAGE_KEY, JSON.stringify(lightData));
        syncedCrossings = serverData.length;
      }

      // Sincronitzar informes
      if (!reportsRes.error && reportsRes.data) {
        const serverReports = reportsRes.data.map(r => ({
          id: r.id,
          title: r.title,
          date: r.date,
          type: r.type,
          crossingIds: r.crossing_ids || [],
          aiAnalysis: r.ai_analysis,
          createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now()
        }));
        localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(serverReports));
        syncedReports = serverReports.length;
      }

      const message = `✅ Sincronitzat: ${syncedCrossings} elements, ${syncedReports} informes`;
      console.log(message);
      return { success: true, message };

    } catch (error) {
      const message = `❌ Error en sincronització: ${error}`;
      console.error(message);
      return { success: false, message };
    }
  }
};


