
import { createClient } from '@supabase/supabase-js';
import { PedestrianCrossing, AssetType, CrossingState, SavedReport } from '../types';
import { firebaseDb } from './firebaseService';
import { collection, doc, getDocs, orderBy, query, setDoc, writeBatch, deleteDoc } from 'firebase/firestore';

// Utilitzem les claus hardcoded com a fallback
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string || 'https://xnbvbcubteklfpabhbpl.supabase.co'; 
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuYnZiY3VidGVrbGZwYWJoYnBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTA1MDAsImV4cCI6MjA4NDk4NjUwMH0.d_lLFsDznEuJGSeKyFqpTlfCQzKjipg-qVnG_pO_Amw';
const OFFLINE_MODE = (import.meta as any).env?.VITE_OFFLINE_MODE === 'true';
const BACKEND = ((import.meta as any).env?.VITE_BACKEND as string) || 'supabase';

// EXPORTEM la instància perquè useAuth.tsx la pugui utilitzar
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const REPORTS_STORAGE_KEY = 'mobilitat_reports';
const CROSSINGS_STORAGE_KEY = 'mobilitat_elements';

export const dbService = {
  async migrateLocalToFirebase(): Promise<{ success: boolean; message: string }> {
    if (OFFLINE_MODE) {
      return { success: false, message: 'Mode offline actiu: no es pot migrar.' };
    }
    if (BACKEND !== 'firebase') {
      return { success: false, message: 'Backend no és Firebase.' };
    }

    try {
      const localCrossingsRaw = localStorage.getItem(CROSSINGS_STORAGE_KEY);
      const localReportsRaw = localStorage.getItem(REPORTS_STORAGE_KEY);
      const localCrossings: PedestrianCrossing[] = localCrossingsRaw ? JSON.parse(localCrossingsRaw) : [];
      const localReports: SavedReport[] = localReportsRaw ? JSON.parse(localReportsRaw) : [];

      const chunks = (arr: any[], size: number) => {
        const res: any[][] = [];
        for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
        return res;
      };

      // Migrar crossings (per lots de 400)
      const crossingChunks = chunks(localCrossings, 400);
      for (const chunk of crossingChunks) {
        const batch = writeBatch(firebaseDb);
        chunk.forEach((c) => {
          const payload = {
            id: c.id,
            assetType: c.assetType,
            assetSubType: c.assetSubType || null,
            image: c.image || '',
            imageThumb: c.imageThumb || '',
            location: c.location,
            state: c.state,
            lastPaintedDate: c.lastPaintedDate,
            paintType: c.paintType || null,
            notes: c.notes || '',
            createdAt: c.createdAt || Date.now(),
            updatedAt: c.updatedAt || Date.now(),
            alertDismissed: c.alertDismissed || false,
            accessGroups: c.accessGroups || null
          };
          batch.set(doc(firebaseDb, 'crossings', c.id), payload, { merge: true });
        });
        await batch.commit();
      }

      // Migrar reports (per lots de 400)
      const reportChunks = chunks(localReports, 400);
      for (const chunk of reportChunks) {
        const batch = writeBatch(firebaseDb);
        chunk.forEach((r) => {
          const payload = {
            id: r.id,
            title: r.title,
            date: r.date,
            type: r.type,
            crossingIds: r.crossingIds || [],
            aiAnalysis: r.aiAnalysis || null,
            createdAt: r.createdAt || Date.now()
          };
          batch.set(doc(firebaseDb, 'reports', r.id), payload, { merge: true });
        });
        await batch.commit();
      }

      return { success: true, message: 'Migració local → Firebase completada.' };
    } catch (error) {
      console.error('Error migració a Firebase:', error);
      return { success: false, message: 'Error durant la migració.' };
    }
  },
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

    // 2b. Firebase backend
    if (BACKEND === 'firebase') {
      try {
        const q = query(collection(firebaseDb, 'crossings'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const serverData: PedestrianCrossing[] = snapshot.docs.map(docSnap => {
          const row: any = docSnap.data();
          return {
            id: row.id || docSnap.id,
            assetType: (row.assetType as AssetType) || AssetType.CROSSING,
            assetSubType: row.assetSubType || row.asset_subtype || '',
            image: row.image || '',
            imageThumb: row.imageThumb || '',
            location: row.location || { lat: 40.8122, lng: 0.5215, city: 'Tortosa', neighborhood: '' },
            state: (row.state as CrossingState) || CrossingState.GOOD,
            lastPaintedDate: row.lastPaintedDate || new Date().toISOString().split('T')[0],
            paintType: row.paintType || 'Estàndard',
            notes: row.notes || '',
            createdAt: row.createdAt || Date.now(),
            updatedAt: row.updatedAt || Date.now(),
            alertDismissed: row.alertDismissed || false,
            accessGroups: row.accessGroups || row.access_groups || undefined,
            createdBy: row.createdBy || row.created_by || undefined,
            updatedBy: row.updatedBy || row.updated_by || undefined,
          };
        });

        try {
          const lightData = serverData.map(item => ({
            ...item,
            image: '',
            imageThumb: item.imageThumb || ''
          }));
          localStorage.setItem(CROSSINGS_STORAGE_KEY, JSON.stringify(lightData));
        } catch (storageError) {
          console.warn('⚠️ localStorage quote exceeded, continuant amb dades servidor:', storageError);
        }

        return serverData.sort((a, b) => b.createdAt - a.createdAt);
      } catch (error) {
        console.warn('⚠️ Error Firebase, retornant locals:', error);
        return localData.sort((a, b) => b.createdAt - a.createdAt);
      }
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
          assetSubType: row.asset_subtype || row.assetSubType || '',
            image: row.image || '',
            imageThumb: row.image_thumb || '',
            location: loc || { lat: 40.8122, lng: 0.5215, city: 'Tortosa', neighborhood: '' },
            state: (row.state as CrossingState) || CrossingState.GOOD,
            lastPaintedDate: row.last_painted_date || new Date().toISOString().split('T')[0],
            paintType: row.paint_type || 'Estàndard',
            notes: row.notes || '',
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
            accessGroups: row.access_groups || undefined,
            createdBy: row.created_by || undefined,
            updatedBy: row.updated_by || undefined
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

    if (BACKEND === 'firebase') {
      const payload = {
        id: crossing.id,
        assetType: crossing.assetType,
        assetSubType: crossing.assetSubType || null,
        image: crossing.image,
        imageThumb: crossing.imageThumb || null,
        location: crossing.location,
        state: crossing.state,
        lastPaintedDate: crossing.lastPaintedDate,
        notes: crossing.notes || '',
        createdAt: crossing.createdAt,
        updatedAt: crossing.updatedAt,
        alertDismissed: crossing.alertDismissed || false,
        accessGroups: crossing.accessGroups || null,
        createdBy: crossing.createdBy || null,
        updatedBy: crossing.updatedBy || null
      };
      await setDoc(doc(firebaseDb, 'crossings', crossing.id), payload, { merge: true });
      return;
    }

    try {
      const payload = {
        id: crossing.id,
        asset_type: crossing.assetType,
        image: crossing.image,
        image_thumb: crossing.imageThumb || null,
        location: crossing.location,
        state: crossing.state,
        last_painted_date: crossing.lastPaintedDate,
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

    if (BACKEND === 'firebase') {
      const batch = writeBatch(firebaseDb);
      ids.forEach(id => {
        batch.delete(doc(firebaseDb, 'crossings', id));
      });
      await batch.commit();
      return;
    }

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

    if (BACKEND === 'firebase') {
      try {
        const q = query(collection(firebaseDb, 'reports'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const serverReports: SavedReport[] = snapshot.docs.map(docSnap => {
          const r: any = docSnap.data();
          return {
            id: r.id || docSnap.id,
            title: r.title,
            date: r.date,
            type: r.type,
            crossingIds: r.crossingIds || [],
            createdAt: r.createdAt || Date.now(),
            aiAnalysis: r.aiAnalysis,
            createdBy: r.createdBy || r.created_by || undefined,
            pdfUrl: r.pdfUrl || r.pdf_url || undefined
          };
        });

        try {
          localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(serverReports));
        } catch (storageError) {
          console.warn('⚠️ localStorage quote exceeded (informes):', storageError);
        }

        return serverReports.sort((a, b) => b.createdAt - a.createdAt);
      } catch (error) {
        console.warn('⚠️ Error Firebase informes:', error);
        return localReports.sort((a, b) => b.createdAt - a.createdAt);
      }
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

    if (BACKEND === 'firebase') {
      await setDoc(doc(firebaseDb, 'reports', report.id), {
        id: report.id,
        title: report.title,
        date: report.date,
        type: report.type,
        crossingIds: report.crossingIds,
        aiAnalysis: report.aiAnalysis || null,
        createdAt: report.createdAt,
        createdBy: report.createdBy || null,
        pdfUrl: report.pdfUrl || null,
      }, { merge: true });
      return;
    }

    try {
      await supabase.from('reports').upsert({
          id: report.id,
          title: report.title,
          date: report.date,
          type: report.type,
          crossing_ids: report.crossingIds,
          ai_analysis: report.aiAnalysis,
          created_at: new Date(report.createdAt).toISOString(),
          pdf_url: report.pdfUrl || null
      });
    } catch (error) {
      // No llançar error - l'informe ja està guardat localment
      console.warn("Report not synced to cloud (will sync when connection is available):", error);
    }
  },

  async updateReportPdfUrl(reportId: string, pdfUrl: string): Promise<void> {
    try {
      const localReports = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) || '[]');
      const updatedReports = localReports.map((r: SavedReport) => r.id === reportId ? { ...r, pdfUrl } : r);
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(updatedReports));
    } catch (e) {
      console.warn('Error updating report pdfUrl locally:', e);
    }

    if (OFFLINE_MODE) return;

    if (BACKEND === 'firebase') {
      await setDoc(doc(firebaseDb, 'reports', reportId), { pdfUrl }, { merge: true });
      return;
    }

    try {
      await supabase.from('reports').update({ pdf_url: pdfUrl }).eq('id', reportId);
    } catch (error) {
      console.warn('Error updating report pdfUrl in cloud:', error);
    }
  },

  async deleteReport(id: string): Promise<void> {
    try {
      const localReports = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) || '[]');
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(localReports.filter((r: SavedReport) => r.id !== id)));
      if (!OFFLINE_MODE) {
        if (BACKEND === 'firebase') {
          await deleteDoc(doc(firebaseDb, 'reports', id));
        } else {
          await supabase.from('reports').delete().eq('id', id);
        }
      }
    } catch (e) { console.error(e); }
  },

  async deleteReports(ids: string[]): Promise<void> {
    try {
      const localReports = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) || '[]');
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(localReports.filter((r: SavedReport) => !ids.includes(r.id))));
      if (!OFFLINE_MODE) {
        if (BACKEND === 'firebase') {
          const batch = writeBatch(firebaseDb);
          ids.forEach(id => batch.delete(doc(firebaseDb, 'reports', id)));
          await batch.commit();
        } else {
          await supabase.from('reports').delete().in('id', ids);
        }
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
            paintType: row.paint_type || 'Estàndard',
            notes: row.notes || '',
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
            accessGroups: row.access_groups || undefined
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


