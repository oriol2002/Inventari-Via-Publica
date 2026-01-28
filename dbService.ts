
import { createClient } from '@supabase/supabase-js';
import { PedestrianCrossing, AssetType, CrossingState, SavedReport } from '../types';

const SUPABASE_URL = 'https://xnbvbcubteklfpabhbpl.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuYnZiY3VidGVrbGZwYWJoYnBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTA1MDAsImV4cCI6MjA4NDk4NjUwMH0.d_lLFsDznEuJGSeKyFqpTlfCQzKjipg-qVnG_pO_Amw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const REPORTS_STORAGE_KEY = 'mobilitat_reports';

export const dbService = {
  // --- ELEMENTS (CROSSINGS) - ES MANTÉ AL NÚVOL ---
  
  async getAll(): Promise<PedestrianCrossing[]> {
    try {
      const { data, error } = await supabase
        .from('crossings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(row => ({
        id: row.id,
        assetType: (row.asset_type as AssetType) || AssetType.CROSSING,
        image: row.image,
        location: row.location || { lat: 40.8122, lng: 0.5215 },
        state: (row.state as CrossingState) || CrossingState.GOOD,
        lastPaintedDate: row.last_painted_date || new Date().toISOString().split('T')[0],
        lastInspectedDate: row.last_inspected_date || null,
        paintType: row.paint_type || 'Estàndard',
        notes: row.notes || '',
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
      }));
    } catch (error) {
      console.error("Supabase Fetch Error (crossings):", error);
      return [];
    }
  },

  async save(crossing: PedestrianCrossing): Promise<void> {
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
        notes: crossing.notes,
        created_at: new Date(crossing.createdAt).toISOString(),
        updated_at: new Date(crossing.updatedAt).toISOString()
      };

      const { error } = await supabase
        .from('crossings')
        .upsert(payload);

      if (error) throw error;
    } catch (error) {
      console.error("Supabase Save Error:", error);
      throw error;
    }
  },

  async deleteMany(ids: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('crossings')
        .delete()
        .in('id', ids);
      if (error) throw error;
    } catch (error) {
      console.error("Supabase Delete Many Error:", error);
    }
  },

  // --- REPORTS (ARXIU) - NOMÉS LOCAL (MODIFICAT) ---

  async getReports(): Promise<SavedReport[]> {
    try {
      const localData = localStorage.getItem(REPORTS_STORAGE_KEY);
      if (localData) {
        const reports = JSON.parse(localData);
        // Ordenar per data descendent
        return reports.sort((a: SavedReport, b: SavedReport) => b.createdAt - a.createdAt);
      }
    } catch (e) {
      console.error("Error reading local reports:", e);
    }
    return [];
  },

  async saveReport(report: SavedReport): Promise<void> {
    try {
      const localReports = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) || '[]');
      
      // Filtrem per si ja existeix (update) o l'afegim al principi
      const otherReports = localReports.filter((r: SavedReport) => r.id !== report.id);
      const updatedReports = [report, ...otherReports];
      
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(updatedReports));
      // NO es fa crida a Supabase
    } catch (e) {
      console.error("Error saving report locally:", e);
      throw e;
    }
  },

  async deleteReport(id: string): Promise<void> {
    try {
      const localReports = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) || '[]');
      const filtered = localReports.filter((r: SavedReport) => r.id !== id);
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(filtered));
      // NO es fa crida a Supabase
    } catch (error) {
      console.error("Error deleting local report:", error);
    }
  },

  async deleteReports(ids: string[]): Promise<void> {
    try {
      const localReports = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) || '[]');
      const filtered = localReports.filter((r: SavedReport) => !ids.includes(r.id));
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(filtered));
      // NO es fa crida a Supabase
    } catch (error) {
      console.error("Error deleting local reports:", error);
    }
  }
};
