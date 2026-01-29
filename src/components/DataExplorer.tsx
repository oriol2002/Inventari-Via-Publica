
import React, { useState } from 'react';
import { PedestrianCrossing, CrossingState, AssetType, NEIGHBORHOODS_BY_CITY, FilterOptions } from '../types';
import { 
  GlobeAltIcon,
  DocumentTextIcon,
  CheckIcon,
  SquaresPlusIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSquareIcon,
  ArrowDownTrayIcon,
  TableCellsIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';

interface Props {
  crossings: PedestrianCrossing[];
  currentFilters: FilterOptions;
  onFilterChange: (filters: Partial<FilterOptions>) => void;
  onEdit: (crossing: PedestrianCrossing) => void;
  onBatchReport: (selected: PedestrianCrossing[]) => void;
  city: string;
}

const getStateBadgeStyles = (state: CrossingState) => {
  switch (state) {
    case CrossingState.EXCELLENT: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case CrossingState.GOOD: return 'bg-blue-50 text-blue-700 border-blue-100';
    case CrossingState.FAIR: return 'bg-amber-50 text-amber-700 border-amber-100';
    case CrossingState.POOR: return 'bg-orange-50 text-orange-700 border-orange-100';
    case CrossingState.DANGEROUS: return 'bg-rose-50 text-rose-700 border-rose-100';
    case CrossingState.MISSING: return 'bg-slate-700 text-white border-slate-800';
    default: return 'bg-slate-50 text-slate-600 border-slate-100';
  }
};

const DataExplorer: React.FC<Props> = ({ crossings, currentFilters, onFilterChange, onEdit, onBatchReport, city }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const neighborhoods = NEIGHBORHOODS_BY_CITY[city] || [];
  const filteredData = crossings;

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredData.length && filteredData.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map(c => c.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleGenerateMaintenanceReport = () => {
    const selectedItems = crossings.filter(c => selectedIds.has(c.id));
    if (selectedItems.length > 0) {
      onBatchReport(selectedItems);
    }
  };

  const getExportData = () => {
    if (selectedIds.size > 0) {
      return crossings.filter(c => selectedIds.has(c.id));
    }
    return crossings;
  };

  const handleExportCSV = () => {
    const data = getExportData();
    const headers = ['ID', 'Tipus', 'Estat', 'Carrer', 'Número', 'Barri', 'Ciutat', 'Lat', 'Lng', 'Data Pintura', 'Data Inspecció', 'Notes'];
    
    const rows = data.map(c => [
      c.id,
      c.assetType,
      c.state,
      `"${(c.location.street || '').replace(/"/g, '""')}"`, // Escape quotes
      c.location.number || '',
      c.location.neighborhood || '',
      c.location.city || city,
      c.location.lat,
      c.location.lng,
      c.lastPaintedDate,
      c.lastInspectedDate || '',
      `"${(c.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventari_${city}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    setShowExportMenu(false);
  };

  const handleExportJSON = () => {
    const data = getExportData();
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventari_${city}_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    setShowExportMenu(false);
  };

  const activeFiltersCount = (currentFilters.states?.length || 0) + 
                            (currentFilters.assetTypes?.length || 0) + 
                            (currentFilters.neighborhoods?.length || 0) + 
                            (currentFilters.dateFrom || currentFilters.dateTo ? 1 : 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <GlobeAltIcon className="w-6 h-6 text-blue-600" />
            Explorador d'Actius
          </h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Auditoria i gestió per a manteniment de via pública</p>
        </div>
        
        <div className="flex gap-2 relative">
          {/* Botó Exportar */}
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="bg-white text-slate-700 border border-slate-300 px-5 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Exportar
            </button>
            
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)}></div>
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 z-20 overflow-hidden animate-in fade-in zoom-in-95">
                   <div className="p-3 border-b border-slate-100">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                       {selectedIds.size > 0 ? `Exportar Selecció (${selectedIds.size})` : `Exportar Tot (${crossings.length})`}
                     </p>
                   </div>
                   <button onClick={handleExportCSV} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-[10px] font-bold text-slate-700 uppercase transition-colors">
                     <TableCellsIcon className="w-4 h-4 text-emerald-600" />
                     Format CSV (Excel)
                   </button>
                   <button onClick={handleExportJSON} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-[10px] font-bold text-slate-700 uppercase transition-colors">
                     <CodeBracketIcon className="w-4 h-4 text-amber-600" />
                     Format JSON (Raw)
                   </button>
                </div>
              </>
            )}
          </div>

          <button 
            onClick={handleGenerateMaintenanceReport}
            disabled={selectedIds.size === 0}
            className="flex-1 md:flex-none bg-slate-900 text-white px-5 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
          >
            <DocumentTextIcon className="w-5 h-5" />
            Derivar a Manteniment {selectedIds.size > 0 && `(${selectedIds.size})`}
          </button>
        </div>
      </div>

      <div className="space-y-4">
         <div className="flex items-center gap-3">
            <div className="flex-1 relative bg-white border border-slate-300 rounded-xl shadow-sm flex items-center px-3">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Cerca carrer o ID..."
                className="w-full bg-transparent border-none outline-none py-3 px-3 text-[11px] font-bold text-slate-700 placeholder-slate-400"
                value={currentFilters.searchQuery || ''}
                onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
              />
              <button 
                onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                className={`p-1.5 rounded-lg transition-all ${isFiltersExpanded || activeFiltersCount > 0 ? 'bg-blue-600 text-blue-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
              >
                <AdjustmentsHorizontalIcon className="w-4 h-4" />
                {activeFiltersCount > 0 && !isFiltersExpanded && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                )}
              </button>
            </div>
         </div>

         {isFiltersExpanded && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Filtres Avançats</h3>
              <button onClick={() => onFilterChange({ states: [], assetTypes: [], neighborhoods: [], dateFrom: '', dateTo: '' })} className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Netejar</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. ESTAT */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-800 uppercase">Estat</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(CrossingState).map(s => (
                    <button key={s} onClick={() => {
                        const current = currentFilters.states || [];
                        onFilterChange({ states: current.includes(s) ? current.filter(x => x !== s) : [...current, s] });
                    }} className={`px-2 py-1 rounded-md text-[8px] font-black border transition-all ${currentFilters.states?.includes(s) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s}</button>
                  ))}
                </div>
              </div>

              {/* 2. TIPUS */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-800 uppercase">Tipus d'Element</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(AssetType).map(t => (
                    <button key={t} onClick={() => {
                        const current = currentFilters.assetTypes || [];
                        onFilterChange({ assetTypes: current.includes(t) ? current.filter(x => x !== t) : [...current, t] });
                    }} className={`px-2 py-1 rounded-md text-[8px] font-black border transition-all ${currentFilters.assetTypes?.includes(t) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{t}</button>
                  ))}
                </div>
              </div>

              {/* 3. PERÍODE */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-800 uppercase">Període</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={currentFilters.dateFrom || ''} onChange={(e) => onFilterChange({ dateFrom: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-[9px] font-bold text-slate-700" />
                  <input type="date" value={currentFilters.dateTo || ''} onChange={(e) => onFilterChange({ dateTo: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-[9px] font-bold text-slate-700" />
                </div>
              </div>

              {/* 4. BARRIS */}
              <div className="space-y-1 md:col-span-3 pt-2 border-t border-slate-100">
                <label className="text-[8px] font-black text-slate-800 uppercase">Barris</label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-hide">
                  {neighborhoods.map(n => (
                    <button key={n} onClick={() => {
                        const current = currentFilters.neighborhoods || [];
                        onFilterChange({ neighborhoods: current.includes(n) ? current.filter(x => x !== n) : [...current, n] });
                    }} className={`px-2 py-1 rounded-md text-[8px] font-black border transition-all ${currentFilters.neighborhoods?.includes(n) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
         )}
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300">
                <th className="px-2 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest w-[160px]">Actiu / Estat</th>
                <th className="px-2 py-3 w-10 text-center">
                  <div className="flex items-center justify-center">
                    <button 
                      onClick={toggleSelectAll}
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                        selectedIds.size === filteredData.length && filteredData.length > 0
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-white border-slate-300 text-transparent'
                      }`}
                    >
                      <CheckIcon className="w-3 h-3 stroke-[4]" />
                    </button>
                  </div>
                </th>
                <th className="px-2 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Ubicació</th>
                <th className="px-2 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right w-[100px]">Darrera Act.</th>
                <th className="px-2 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center w-[40px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.map(c => {
                const isSelected = selectedIds.has(c.id);
                return (
                  <tr 
                    key={c.id} 
                    onClick={() => onEdit(c)}
                    className={`group transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <img src={c.image} className="w-8 h-8 rounded-lg object-cover border border-slate-200 flex-shrink-0" alt="" />
                        <div className="flex flex-col items-start min-w-0">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border tracking-tight whitespace-nowrap ${getStateBadgeStyles(c.state)}`}>
                            {c.assetType}
                          </span>
                          <span className="text-[7px] font-bold text-slate-500 ml-0.5">#{c.id.slice(-6)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={() => toggleSelectOne(c.id)}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                            isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent group-hover:border-slate-400'
                          }`}
                        >
                          <CheckIcon className="w-3 h-3 stroke-[4]" />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-slate-900 uppercase truncate">
                          {c.location.street} {c.location.number}
                        </span>
                        <div className="flex items-center gap-1 text-[8px] font-bold text-blue-600 uppercase truncate">
                          <MapPinIcon className="w-3 h-3" />
                          {c.location.neighborhood}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right whitespace-nowrap">
                      <span className="text-[9px] font-bold text-slate-600">
                        {new Date(c.lastPaintedDate).toLocaleDateString('ca-ES', { month: 'short', year: 'numeric' }).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <PencilSquareIcon className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center text-slate-300">
                      <SquaresPlusIcon className="w-12 h-12 mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Cap element trobat</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataExplorer;
