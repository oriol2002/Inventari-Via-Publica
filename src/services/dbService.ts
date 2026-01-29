
import { createClient } from '@supabase/supabase-js';
import { PedestrianCrossing, AssetType, CrossingState, SavedReport } from '../types';

// Utilitzem les claus hardcoded com a fallback
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string || 'https://xnbvbcubteklfpabhbpl.supabase.co'; 
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuYnZiY3VidGVrbGZwYWJoYnBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTA1MDAsImV4cCI6MjA4NDk4NjUwMH0.d_lLFsDznEuJGSeKyFqpTlfCQzKjipg-qVnG_pO_Amw';

// EXPORTEM la instància perquè useAuth.tsx la pugui utilitzar
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const REPORTS_STORAGE_KEY = 'mobilitat_reports';
const CROSSINGS_STORAGE_KEY = 'mobilitat_elements';

export const dbService = {
  // --- ELEMENTS (CROSSINGS) - OFFLINE FIRST ---
  
  async getAll(): Promise<PedestrianCrossing[]> {
    let localData: PedestrianCrossing[] = [];
    
    console.log('🔍 Carregant dades...');
    
    // 1. Carregar Localment (Sempre funciona)
    try {
      const stored = localStorage.getItem(CROSSINGS_STORAGE_KEY);
      if (stored) {
        localData = JSON.parse(stored);
        console.log('📦 Dades locals:', localData.length, 'elements');
      } else {
        console.log('📦 No hi ha dades locals');
      }
    } catch (e) {
      console.error("Error carregar local:", e);
    }

    // 2. Intentar carregar del servidor i fusionar
    try {
      console.log('🌐 Consultant Supabase...');
      const { data, error } = await supabase
        .from('crossings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error Supabase:', error);
        throw error;
      }
      
      console.log('✅ Dades del servidor:', data?.length || 0, 'elements');
      
      const serverData = (data || []).map(row => {
        // Gestió robusta de location si ve com a string o objecte
        let loc = row.location;
        if (typeof loc === 'string') {
            try { loc = JSON.parse(loc); } catch (e) { loc = { lat: 40.8122, lng: 0.5215 }; }
        }

        return {
            id: row.id,
            assetType: (row.asset_type as AssetType) || AssetType.CROSSING,
            image: row.image,
            location: loc || { lat: 40.8122, lng: 0.5215 },
            state: (row.state as CrossingState) || CrossingState.GOOD,
            lastPaintedDate: row.last_painted_date || new Date().toISOString().split('T')[0],
            lastInspectedDate: row.last_inspected_date || null,
            paintType: row.paint_type || 'Estàndard',
            notes: row.notes || '',
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
        };
      });

      // Fusió: El servidor mana, però mantenim locals si no hi són al servidor encara
      const mergedMap = new Map<string, PedestrianCrossing>();
      
      localData.forEach(item => mergedMap.set(item.id, item));
      serverData.forEach(item => mergedMap.set(item.id, item));
      
      const combined = Array.from(mergedMap.values());
      
      // Actualitzem localStorage només amb metadata (sense imatges per estalviar espai)
      try {
        const lightData = combined.map(item => ({
          ...item,
          image: '' // No guardem imatges a localStorage per evitar quota
        }));
        localStorage.setItem(CROSSINGS_STORAGE_KEY, JSON.stringify(lightData));
        console.log('💾 Dades guardades a localStorage (sense imatges)');
      } catch (storageError) {
        console.warn('⚠️ No es pot guardar a localStorage (quota), continuant només amb servidor:', storageError);
      }
      
      return combined.sort((a,b) => b.createdAt - a.createdAt);

    } catch (error) {
      console.warn("Mode Offline actiu (error servidor o sense connexió):", error);
      // En cas d'error, retornem el que tenim localment sense queixar-nos
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
      const lightCrossing = { ...crossing, image: '' };
      list.unshift(lightCrossing);
      localStorage.setItem(CROSSINGS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) { 
      console.error("Local save error:", e); 
    }

    // 2. Enviar al Núvol
    try {
      const payload = {
        id: crossing.id,
        asset_type: crossing.assetType,
        image: crossing.image,
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
    let finalReports: SavedReport[] = [];
    let localReports: any[] = [];

    try {
      const localData = localStorage.getItem(REPORTS_STORAGE_KEY);
      if (localData) localReports = JSON.parse(localData);
    } catch (e) { console.error(e); }

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const serverReports = data.map(r => ({
          id: r.id,
          title: r.title,
          date: r.date,
          type: r.type,
          crossingIds: r.crossing_ids,
          aiAnalysis: r.ai_analysis,
          createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now()
        }));
        
        // Merge simple
        const serverIds = new Set(serverReports.map(r => r.id));
        const unsyncedLocals = localReports.filter(r => !serverIds.has(r.id));
        finalReports = [...unsyncedLocals, ...serverReports];
        
        localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(finalReports));
      } else {
         finalReports = localReports;
      }
    } catch (error) {
      finalReports = localReports;
    }

    return finalReports.sort((a, b) => b.createdAt - a.createdAt);
  },

  async saveReport(report: SavedReport): Promise<void> {
    // Local
    try {
      const localReports = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) || '[]');
      const updatedReports = [report, ...localReports.filter((r: SavedReport) => r.id !== report.id)];
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(updatedReports));
    } catch (e) { console.error(e); }

    // Server
    try {
      const { error } = await supabase.from('reports').upsert({
          id: report.id,
          title: report.title,
          date: report.date,
          type: report.type,
          crossing_ids: report.crossingIds,
          ai_analysis: report.aiAnalysis,
          created_at: new Date(report.createdAt).toISOString()
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error saving report to cloud", error);
      throw error;
    }
  },

  async deleteReport(id: string): Promise<void> {
    try {
      const localReports = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) || '[]');
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(localReports.filter((r: SavedReport) => r.id !== id)));
      await supabase.from('reports').delete().eq('id', id);
    } catch (e) { console.error(e); }
  },

  async deleteReports(ids: string[]): Promise<void> {
    try {
      const localReports = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) || '[]');
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(localReports.filter((r: SavedReport) => !ids.includes(r.id))));
      await supabase.from('reports').delete().in('id', ids);
    } catch (e) { console.error(e); }
  }
};
