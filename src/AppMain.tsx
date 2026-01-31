import React, { useState, useEffect, useMemo } from 'react';
import { PedestrianCrossing, CrossingState, FilterOptions, AssetType, SavedReport, CITIES, NEIGHBORHOODS_BY_CITY } from './types';
import CrossingList from './components/CrossingList';
import CrossingForm from './components/CrossingForm';
import { Statistics } from './components/Statistics';
import CrossingMap from './components/CrossingMap';
import DataExplorer from './components/DataExplorer';
import ReportView from './components/ReportView';
import ReportHistory from './components/ReportHistory';
import NotificationCenter from './components/NotificationCenter';
import { dbService } from './services/dbService';
import { notificationService } from './services/notificationService';
import { aiService } from './services/aiService';
import { useAuth } from './hooks/useAuth';
import { ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';
import { 
  PlusIcon, 
  MapIcon, 
  ListBulletIcon, 
  ChartBarIcon, 
  TableCellsIcon, 
  ArchiveBoxIcon,
  BellIcon, 
  CloudIcon,
  ChevronDownIcon,
  SparklesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';

const App: React.FC = () => {
  const { user, logout } = useAuth();
  const backend = ((import.meta as any).env?.VITE_BACKEND as string) || 'supabase';
  const [crossings, setCrossings] = useState<PedestrianCrossing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [view, setView] = useState<'map' | 'list' | 'explorer' | 'stats' | 'archive'>('map');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCrossing, setEditingCrossing] = useState<PedestrianCrossing | null>(null); 
  const [hasImageInForm, setHasImageInForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('Tortosa');
  const [filters, setFilters] = useState<FilterOptions>({ city: 'Tortosa' });
  const [activeReport, setActiveReport] = useState<SavedReport | null>(null);
  
  const [isSyncing, setIsSyncing] = useState(false);

  const handleForceSync = async () => {
    setIsSyncing(true);
    const result = await dbService.forceSync();
    alert(result.message);
    if (result.success) {
      // Recarga les dades
      fetchData();
    }
    setIsSyncing(false);
  };

  const handleMigrateLocal = async () => {
    const result = await dbService.migrateLocalToFirebase();
    alert(result.message);
    if (result.success) {
      fetchData();
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await dbService.getAll();
      setCrossings(data);
      notificationService.checkMaintenanceDeadlines(data);
    } catch (error) {
      console.error("Error carregant dades inicials:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchData();
    notificationService.requestPermission();
  }, []);

  const handleSaveCrossing = async (crossing: PedestrianCrossing) => {
    setIsFormOpen(false);
    setEditingCrossing(null);
    setHasImageInForm(false);

    const dataWithCity = {
      ...crossing,
      location: { ...crossing.location, city: 'Tortosa' }
    };

    setCrossings(prev => {
      const index = prev.findIndex(c => c.id === crossing.id);
      if (index >= 0) {
        const newCrossings = [...prev];
        newCrossings[index] = dataWithCity;
        return newCrossings;
      } else {
        return [dataWithCity, ...prev];
      }
    });

    try {
      await dbService.save(dataWithCity);
    } catch (error) {
      console.error("Error al guardar a la base de dades:", error);
      alert("⚠️ Mode Offline: L'element s'ha guardat al dispositiu. Es sincronitzarà quan hi hagi connexió.");
    }
  };
  
  const handleDismissAlert = async (id: string) => {
    const crossing = crossings.find(c => c.id === id);
    if (!crossing) return;

    const updatedCrossing = {
      ...crossing,
      alertDismissed: true,
      updatedAt: Date.now()
    };

    setCrossings(prev => prev.map(c => c.id === id ? updatedCrossing : c));

    try {
      await dbService.save(updatedCrossing);
    } catch (error) {
      console.error("Error marcant alerta com a llegida:", error);
    }
  };

  const handleDismissAlerts = async (ids: string[]) => {
    for (const id of ids) {
      await handleDismissAlert(id);
    }
  };
  

  const handleEditCrossing = (crossing: PedestrianCrossing) => {
    setEditingCrossing(crossing);
    setHasImageInForm(true);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCrossing(null);
    setHasImageInForm(false);
  };

  const handleBatchDelete = async (ids: string[]) => {
    setCrossings(prev => prev.filter(c => !ids.includes(c.id)));
    try {
      await dbService.deleteMany(ids);
    } catch (error) {
      console.error("Error en esborrat massiu:", error);
    }
  };

  const handleCreateReport = async (selectedCrossings: PedestrianCrossing[], type: 'maintenance' | 'technical' | 'statistical') => {
    if (selectedCrossings.length === 0) return;

    setIsGeneratingReport(true);

    const now = new Date();
    const timestamp = now.getTime();
    const dateStr = now.toLocaleDateString('ca-ES');
    const timeStr = now.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
    
    let typeLabel = '';
    let aiAnalysisText = undefined;

    if (type === 'maintenance') typeLabel = 'Manteniment';
    else if (type === 'technical') typeLabel = 'Tècnic';
    else {
      typeLabel = 'Estadístic';
      aiAnalysisText = await aiService.generateStatisticalReport(selectedCrossings, 'Tortosa');
    }

    const reportTitle = `Informe ${typeLabel} - Tortosa - ${dateStr} ${timeStr}`;
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const reportId = `MOB${year}${month}${day}${hours}${minutes}${seconds}`;

    const newReport: SavedReport = {
      id: reportId,
      title: reportTitle,
      date: dateStr,
      type: type,
      crossingIds: selectedCrossings.map(c => c.id),
      createdAt: timestamp,
      aiAnalysis: aiAnalysisText
    };

    try {
      await dbService.saveReport(newReport);
      setActiveReport(newReport);
    } catch (error) {
      console.error("Error guardant informe:", error);
      // No mostrar error - l'informe ja està guardat localment
      setActiveReport(newReport);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const activeReportCrossings = useMemo(() => {
    if (!activeReport) return [];
    return crossings.filter(c => activeReport.crossingIds.includes(c.id));
  }, [activeReport, crossings]);

  const filteredCrossings = useMemo(() => {
    return crossings.filter(c => {
      const matchesCity = !c.location.city || c.location.city === 'Tortosa';
      const matchesSearch = !filters.searchQuery || 
        c.location.street?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(filters.searchQuery.toLowerCase());

      const matchesState = !filters.states?.length || filters.states.includes(c.state);
      const matchesAsset = !filters.assetTypes?.length || filters.assetTypes.includes(c.assetType);
      const matchesNeighborhood = !filters.neighborhoods?.length || 
        (c.location.neighborhood && filters.neighborhoods.includes(c.location.neighborhood));

      let matchesDate = true;
      if (filters.dateFrom) matchesDate = matchesDate && c.lastPaintedDate >= filters.dateFrom;
      if (filters.dateTo) matchesDate = matchesDate && c.lastPaintedDate <= filters.dateTo;

      return matchesCity && matchesSearch && matchesState && matchesAsset && matchesNeighborhood && matchesDate;
    });
  }, [crossings, filters]);

  const alerts = filteredCrossings.filter(c => {
    // Excloure elements marcats com a llegits
    if (c.alertDismissed) return false;
    
    const lastCheck = c.lastInspectedDate && c.lastInspectedDate > c.lastPaintedDate ? c.lastInspectedDate : c.lastPaintedDate;
    const months = notificationService.calculateMonthsSince(lastCheck);
    
    const isExcellentCheck = c.assetType === AssetType.CROSSING && c.state === CrossingState.EXCELLENT && months >= 6;
    const isCritical = c.state === CrossingState.POOR || c.state === CrossingState.DANGEROUS;
    const isStandardMaintenance = months >= 11;
    return isStandardMaintenance || isCritical || isExcellentCheck;
  });

  const NavItem = ({ id, label, icon: Icon }: { id: typeof view, label: string, icon: any }) => (
    <button 
      onClick={() => setView(id)}
      className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg md:rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
        view === id ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      <Icon className="w-3.5 md:w-4 h-3.5 md:h-4" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 overflow-hidden font-sans relative">
      {isGeneratingReport && (
        <div className="absolute inset-0 z-[6000] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-blue-200 flex flex-col items-center max-w-sm text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
              <div className="bg-blue-600 p-4 rounded-full text-white relative z-10 shadow-lg shadow-blue-500/30">
                <SparklesIcon className="w-8 h-8 animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Analitzant Dades...</h3>
            <p className="text-xs text-slate-600 font-medium">L'Inteligència Artificial està redactant l'informe executiu basat en les dades seleccionades.</p>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-300 px-[calc(1rem+env(safe-area-inset-left))] md:px-8 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] pr-[calc(1rem+env(safe-area-inset-right))] sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg flex-shrink-0">
              <CloudIcon className="w-5 md:w-6 h-5 md:h-6" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-lg md:text-xl font-black text-slate-900 leading-none tracking-tighter uppercase">TORTOSA</h1>
              <p className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 truncate">Inventari Via Pública</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 md:gap-4 flex-shrink-0">
            {/* Botons Migrar i Sincronitzar eliminats */}

            {/* Botó Notificacions */}
            <button 
              onClick={() => setShowNotifications(true)} 
              className="p-2 md:p-2.5 bg-slate-50 rounded-full text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors relative"
            >
              <BellIcon className="w-4 md:w-5 h-4 md:h-5" />
              {alerts.length > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 border-2 border-white rounded-full text-[7px] md:text-[8px] font-black text-white flex items-center justify-center">{alerts.length}</span>}
            </button>

            {/* Botó Nou */}
            <button 
              onClick={() => { setEditingCrossing(null); setHasImageInForm(false); setIsFormOpen(true); }}
              className="bg-blue-600 text-white px-3 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-colors flex-shrink-0"
            >
              <PlusIcon className="w-4 md:w-5 h-4 md:h-5 stroke-[3]" /> <span className="hidden sm:inline">Nou</span>
            </button>

            {/* Botó Logout */}
            <button 
              onClick={async () => {
                await logout();
                window.location.href = '/login';
              }}
              className="bg-red-600 text-white px-3 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-colors flex-shrink-0"
            >
              <ArrowLeftOnRectangleIcon className="w-4 md:w-5 h-4 md:h-5" /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 px-[calc(1rem+env(safe-area-inset-left))] md:px-8 pr-[calc(1rem+env(safe-area-inset-right))] py-2 overflow-x-auto scrollbar-hide z-40">
        <div className="max-w-[1600px] mx-auto flex items-center gap-0.5 md:gap-1">
          <NavItem id="map" label="Mapa" icon={MapIcon} />
          <NavItem id="list" label="Llista" icon={ListBulletIcon} />
          <NavItem id="explorer" label="Explorar" icon={TableCellsIcon} />
          <NavItem id="stats" label="Stats" icon={ChartBarIcon} />
          <NavItem id="archive" label="Arxiu" icon={ArchiveBoxIcon} />
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-[calc(1rem+env(safe-area-inset-left))] md:p-8 pr-[calc(1rem+env(safe-area-inset-right))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="max-w-[1600px] mx-auto h-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <>
              {view === 'list' && (
                <CrossingList 
                  crossings={filteredCrossings} 
                  currentFilters={filters} 
                  onFilterChange={setFilters} 
                  onEdit={handleEditCrossing} 
                  onBatchReport={(selected) => handleCreateReport(selected, 'maintenance')} 
                  onBatchDelete={handleBatchDelete}
                  city="Tortosa"
                />
              )}
              {view === 'map' && (
                <div className="-m-4 md:-m-8 h-[calc(100vh-220px)] md:h-[calc(100vh-240px)] min-h-[360px]">
                  <CrossingMap 
                    crossings={filteredCrossings} 
                    currentFilters={filters} 
                    onFilterChange={setFilters}
                    onEditRequested={handleEditCrossing} 
                    city="Tortosa"
                  />
                </div>
              )}
              {view === 'explorer' && (
                <DataExplorer 
                  crossings={filteredCrossings} 
                  currentFilters={filters}      
                  onFilterChange={setFilters}   
                  onEdit={handleEditCrossing}
                  onBatchReport={(s) => handleCreateReport(s, 'maintenance')} 
                  city="Tortosa"
                />
              )}
              {view === 'stats' && (
                <Statistics 
                  crossings={filteredCrossings} 
                  currentFilters={filters} 
                  onFilterChange={setFilters} 
                  onGenerateReport={() => handleCreateReport(filteredCrossings, 'statistical')} 
                  city="Tortosa"
                />
              )}
              {view === 'archive' && (
                <ReportHistory 
                  crossings={crossings} 
                  onOpenReport={(r) => setActiveReport(r)} 
                />
              )}
            </>
          )}
        </div>
      </main>

      <NotificationCenter 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
        alerts={alerts}
        onAlertClick={(alert) => {
          setEditingCrossing(alert);
          setHasImageInForm(true);
          setIsFormOpen(true);
          setShowNotifications(false);
        }}
        onMarkRead={handleDismissAlerts}
        onGenerateReport={(selectedAlerts) => {
          handleCreateReport(selectedAlerts, 'maintenance');
        }}
      />

      {activeReport && (
        <ReportView 
          crossings={activeReportCrossings} 
          reportType={activeReport.type} 
          reportTitle={activeReport.title}
          reportId={activeReport.id}
          aiAnalysis={activeReport.aiAnalysis}
          onBack={() => setActiveReport(null)} 
          city="Tortosa"
        />
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pt-[calc(2rem+env(safe-area-inset-top))]">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={handleCloseForm}></div>
          <div className={`relative w-full ${editingCrossing || hasImageInForm ? 'max-w-xl' : 'max-w-sm'} bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-all border border-slate-200 max-h-[90vh] flex flex-col`}>
            <CrossingForm 
              key={editingCrossing?.id || 'new-crossing-form'} 
              initialData={editingCrossing} 
              onClose={handleCloseForm} 
              onSubmit={handleSaveCrossing} 
              city="Tortosa"
              onImageCapture={() => setHasImageInForm(true)}
              fromAlert={!!editingCrossing && alerts.some(a => a.id === editingCrossing.id)}
              onDismissAlert={handleDismissAlert}
              userId={user?.id}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;