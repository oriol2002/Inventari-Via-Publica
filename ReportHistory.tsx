
import React, { useEffect, useState, useMemo } from 'react';
import { SavedReport, PedestrianCrossing } from '../types';
import { dbService } from '../services/dbService';
import { 
  ArchiveBoxIcon, 
  ChevronRightIcon, 
  CalendarDaysIcon, 
  DocumentTextIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CursorArrowRaysIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  BarsArrowDownIcon,
  BarsArrowUpIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface Props {
  crossings: PedestrianCrossing[];
  onOpenReport: (report: SavedReport) => void;
}

type SortOrder = 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc';

const ReportHistory: React.FC<Props> = ({ crossings, onOpenReport }) => {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('date_desc');

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, ids: string[] }>({
    isOpen: false,
    ids: []
  });

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await dbService.getReports();
      setReports(data || []);
    } catch (err) {
      console.error("Error carregant informes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const processedReports = useMemo(() => {
    if (!reports) return [];
    
    let result = [...reports].filter(r => {
      const rDate = new Date(r.createdAt);
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;
      
      if (to) to.setHours(23, 59, 59, 999);

      const matchesDate = (!from || rDate >= from) && (!to || rDate <= to);
      const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesDate && matchesSearch;
    });

    result.sort((a, b) => {
      switch (sortOrder) {
        case 'date_desc':
          return b.createdAt - a.createdAt;
        case 'date_asc':
          return a.createdAt - b.createdAt;
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return result;
  }, [reports, dateFrom, dateTo, searchQuery, sortOrder]);

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (confirmDelete.ids.length === 1) {
        await dbService.deleteReport(confirmDelete.ids[0]);
      } else {
        await dbService.deleteReports(confirmDelete.ids);
      }
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      // Recarregar des de local/servei per actualitzar la UI
      await loadReports();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setConfirmDelete({ isOpen: false, ids: [] });
    }
  };

  const handleItemClick = (report: SavedReport) => {
    if (isSelectionMode) {
      const e = { stopPropagation: () => {} } as unknown as React.MouseEvent;
      toggleSelection(report.id, e);
    } else {
      onOpenReport(report);
    }
  };

  const activeFiltersCount = (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (sortOrder !== 'date_desc' ? 1 : 0);

  if (isLoading && reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <ArrowPathIcon className="w-8 h-8 animate-spin mb-2" />
        <span className="text-[10px] font-black uppercase tracking-widest">Sincronitzant Arxiu...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20 px-1">
      {confirmDelete.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmDelete({ isOpen: false, ids: [] })}></div>
          <div className="bg-white w-full max-w-xs rounded-[2rem] shadow-2xl relative z-10 overflow-hidden p-8 text-center animate-in zoom-in-95 border border-slate-200">
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-rose-50 text-rose-600">
              <ExclamationTriangleIcon className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-slate-800 mb-1 uppercase tracking-tight">Eliminar Informe</h3>
            <p className="text-[10px] font-medium text-slate-500 mb-6">Estàs segur que vols borrar {confirmDelete.ids.length > 1 ? `${confirmDelete.ids.length} informes` : 'aquest informe'}? Aquesta acció és irreversible.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmDelete({ isOpen: false, ids: [] })} className="bg-slate-100 text-slate-700 p-3 rounded-xl text-[9px] font-black uppercase tracking-widest">Cancel·lar</button>
              <button onClick={handleDelete} className="bg-rose-600 text-white p-3 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                {isDeleting && <ArrowPathIcon className="w-3 h-3 animate-spin" />}
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 p-2.5 rounded-xl text-white shadow-lg">
            <ArchiveBoxIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">Arxiu d'Informes</h2>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">{reports.length} Documents Guardats</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border transition-all relative ${showFilters || activeFiltersCount > 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300'}`}
          >
            <FunnelIcon className="w-5 h-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-white text-blue-600 w-4 h-4 rounded-full border border-blue-600 flex items-center justify-center text-[8px] font-black">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              setSelectedIds(new Set());
            }}
            className={`p-2.5 rounded-xl border transition-all ${isSelectionMode ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}
          >
            {isSelectionMode ? <XMarkIcon className="w-5 h-5" /> : <CursorArrowRaysIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-5 rounded-3xl border border-slate-300 shadow-xl space-y-5 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Cerca i Filtres</h3>
            <button onClick={() => { setDateFrom(''); setDateTo(''); setSearchQuery(''); setSortOrder('date_desc'); }} className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Netejar</button>
          </div>
          
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Cerca per títol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
               <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1">Data Inici</label>
               <input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
               />
             </div>
             <div className="space-y-1">
               <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1">Data Final</label>
               <input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
               />
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1">Ordenació</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'date_desc', label: 'Més recents', icon: BarsArrowDownIcon },
                { id: 'date_asc', label: 'Més antics', icon: BarsArrowUpIcon },
                { id: 'title_asc', label: 'Títol A-Z', icon: ChevronRightIcon },
                { id: 'title_desc', label: 'Títol Z-A', icon: ChevronRightIcon },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSortOrder(opt.id as SortOrder)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-[9px] font-black uppercase tracking-tight transition-all ${sortOrder === opt.id ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'}`}
                >
                  <opt.icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isSelectionMode && selectedIds.size > 0 && (
        <div className="sticky top-2 z-50 bg-blue-600 text-white p-3 rounded-2xl flex items-center justify-between shadow-xl animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3 pl-2">
            <span className="w-6 h-6 bg-white text-blue-600 rounded-lg flex items-center justify-center text-[10px] font-black">{selectedIds.size}</span>
            <span className="text-[9px] font-black uppercase tracking-widest">Seleccionats</span>
          </div>
          <button 
            onClick={() => setConfirmDelete({ isOpen: true, ids: Array.from(selectedIds) })}
            className="bg-rose-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md flex items-center gap-2"
          >
            <TrashIcon className="w-4 h-4" /> Eliminar Lot
          </button>
        </div>
      )}

      <div className="grid gap-3">
        {processedReports.length > 0 ? processedReports.map(report => {
          const isSelected = selectedIds.has(report.id);
          const reportDate = new Date(report.createdAt);
          return (
            <div 
              key={report.id}
              onClick={() => handleItemClick(report)}
              className={`flex items-center justify-between p-4 bg-white border rounded-[2rem] transition-all group text-left relative overflow-hidden cursor-pointer ${isSelected ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200 hover:border-slate-400 shadow-sm hover:shadow-md'}`}
            >
              <div className="flex items-center gap-4 relative z-10 min-w-0">
                <div 
                  className={`p-3 rounded-2xl transition-colors flex-shrink-0 ${report.type === 'technical' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}
                >
                  <DocumentTextIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight truncate">{report.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      <CalendarDaysIcon className="w-3 h-3" />
                      {reportDate.toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      <ClockIcon className="w-3 h-3" />
                      {reportDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 relative z-10 flex-shrink-0 ml-2">
                 {/* Badge d'Actius sempre visible */}
                 <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    {report.crossingIds.length} Actius
                 </div>

                {isSelectionMode ? (
                  <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-slate-50'}`}>
                    {isSelected && <CheckCircleIcon className="w-5 h-5" />}
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                         e.stopPropagation();
                         onOpenReport(report);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      title="Veure"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete({ isOpen: true, ids: [report.id] });
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Esborrar"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="py-20 text-center bg-white border-2 border-dashed border-slate-300 rounded-[2.5rem]">
            <ArchiveBoxIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No s'ha trobat cap informe</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportHistory;
