
import React, { useState } from 'react';
import { PedestrianCrossing, CrossingState, FilterOptions, AssetType, AccessGroup, NEIGHBORHOODS_BY_CITY } from '../types';
import { 
  CalendarIcon, 
  DocumentTextIcon,
  MapPinIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckIcon,
  CursorArrowRaysIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import LazyImage from './LazyImage';

interface Props {
  crossings: PedestrianCrossing[];
  onFilterChange: (filters: Partial<FilterOptions>) => void;
  currentFilters: FilterOptions;
  onEdit: (crossing: PedestrianCrossing) => void;
  onBatchReport?: (crossings: PedestrianCrossing[]) => void;
  onBatchDelete?: (ids: string[]) => void;
  onBatchAssignGroup?: (ids: string[], group: AccessGroup) => void;
  canAssignGroups?: boolean;
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

const CrossingList: React.FC<Props> = ({ crossings, onFilterChange, currentFilters, onEdit, onBatchReport, onBatchDelete, onBatchAssignGroup, canAssignGroups, city }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const neighborhoods = [...(NEIGHBORHOODS_BY_CITY[city] || [])].sort((a, b) => a.localeCompare(b));

  const toggleSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleCardClick = (crossing: PedestrianCrossing, e: React.MouseEvent) => {
    if (isSelectionMode) {
      toggleSelection(crossing.id, e);
    } else {
      onEdit(crossing);
    }
  };

  const handleConfirmDelete = () => {
    if (onBatchDelete) {
      onBatchDelete(Array.from(selectedIds));
    }
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    setShowDeleteConfirm(false);
  };

  const activeFiltersCount = (currentFilters.states?.length || 0) + 
                            (currentFilters.assetTypes?.length || 0) + 
                            (currentFilters.neighborhoods?.length || 0) + 
                            (currentFilters.dateFrom || currentFilters.dateTo ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Modal Confirmació Esborrat */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}></div>
          <div className="bg-white w-full max-w-xs rounded-[2rem] shadow-2xl relative z-10 overflow-hidden p-8 text-center animate-in zoom-in-95 border border-slate-200">
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-rose-50 text-rose-600">
              <ExclamationTriangleIcon className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-slate-800 mb-1 uppercase tracking-tight">Eliminar Registres</h3>
            <p className="text-[10px] font-medium text-slate-500 mb-6">
              Estàs segur que vols eliminar els <strong>{selectedIds.size}</strong> elements seleccionats? Aquesta acció és irreversible.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                className="bg-slate-100 text-slate-700 p-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                Cancel·lar
              </button>
              <button 
                onClick={handleConfirmDelete} 
                className="bg-rose-600 text-white p-3 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl hover:bg-rose-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative bg-white border border-slate-300 rounded-xl shadow-sm flex items-center px-3">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder={`Cerca a ${city}...`}
              className="w-full bg-transparent border-none outline-none py-3 px-3 text-[11px] font-bold text-slate-700 placeholder-slate-400"
              value={currentFilters.searchQuery || ''}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            />
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg transition-all ${showFilters || activeFiltersCount > 0 ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedIds(new Set());
              }}
              className={`p-3 rounded-xl border transition-all ${isSelectionMode ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 hover:border-slate-400'}`}
              title="Mode Selecció"
            >
              <CursorArrowRaysIcon className="w-5 h-5" />
            </button>

            {selectedIds.size > 0 && (
              <div className="flex gap-2 animate-in fade-in slide-in-from-right">
                <button 
                  onClick={() => onBatchReport?.(crossings.filter(c => selectedIds.has(c.id)))} 
                  className="bg-slate-800 text-white px-4 py-2 rounded-xl shadow-lg hover:bg-slate-700 flex items-center gap-2"
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{selectedIds.size}</span>
                </button>
                {canAssignGroups && (
                  <button
                    onClick={() => onBatchAssignGroup?.(Array.from(selectedIds), 'agents-civics')}
                    className="bg-blue-600 text-white px-3 py-2 rounded-xl shadow-lg hover:bg-blue-700 text-[9px] font-black uppercase tracking-widest"
                    title="Assignar a Agents Cívics"
                  >
                    Agents Cívics
                  </button>
                )}
                <button 
                  onClick={() => setShowDeleteConfirm(true)} 
                  className="bg-rose-600 text-white p-3 rounded-xl shadow-lg hover:bg-rose-700 transition-colors"
                  title="Esborrar Seleccionats"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => {
                    setSelectedIds(new Set());
                    setIsSelectionMode(false);
                  }} 
                  className="bg-slate-200 text-slate-600 p-3 rounded-xl hover:bg-slate-300"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Filtres - {city}</h3>
              <button onClick={() => onFilterChange({ states: [], assetTypes: [], neighborhoods: [], dateFrom: '', dateTo: '' })} className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Netejar</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-700 uppercase">Període</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={currentFilters.dateFrom || ''} onChange={(e) => onFilterChange({ dateFrom: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-[9px] font-bold text-slate-700" />
                  <input type="date" value={currentFilters.dateTo || ''} onChange={(e) => onFilterChange({ dateTo: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-[9px] font-bold text-slate-700" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-700 uppercase">Tipus d'Element</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(AssetType).sort((a,b) => a.localeCompare(b)).map(t => (
                    <button key={t} onClick={() => {
                        const current = currentFilters.assetTypes || [];
                        onFilterChange({ assetTypes: current.includes(t) ? current.filter(x => x !== t) : [...current, t] });
                    }} className={`px-2 py-1 rounded-md text-[8px] font-black border transition-all ${currentFilters.assetTypes?.includes(t) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{t}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-700 uppercase">Estat</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(CrossingState).map(s => (
                    <button key={s} onClick={() => {
                        const current = currentFilters.states || [];
                        onFilterChange({ states: current.includes(s) ? current.filter(x => x !== s) : [...current, s] });
                    }} className={`px-2 py-1 rounded-md text-[8px] font-black border transition-all ${currentFilters.states?.includes(s) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{s}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 md:col-span-3 pt-2 border-t border-slate-100">
                <label className="text-[8px] font-black text-slate-700 uppercase">Barris de {city}</label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-hide">
                  {neighborhoods.map(n => (
                    <button key={n} onClick={() => {
                        const current = currentFilters.neighborhoods || [];
                        onFilterChange({ neighborhoods: current.includes(n) ? current.filter(x => x !== n) : [...current, n] });
                    }} className={`px-2 py-1 rounded-md text-[8px] font-black border transition-all ${currentFilters.neighborhoods?.includes(n) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {crossings.map(crossing => {
          const isSelected = selectedIds.has(crossing.id);
          return (
            <div 
              key={crossing.id}
              onClick={(e) => handleCardClick(crossing, e)}
              className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all group relative cursor-pointer flex flex-col ${
                isSelected ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-blue-100' : 
                (isSelectionMode ? 'border-blue-200' : 'border-slate-200 hover:border-slate-400')
              }`}
            >
              <div className="h-24 relative bg-slate-200 overflow-hidden">
                <LazyImage src={crossing.imageThumb || crossing.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Vista" />
                <div 
                  onClick={(e) => {
                    if (isSelectionMode) {
                      e.stopPropagation();
                      toggleSelection(crossing.id, e);
                    }
                  }}
                  className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shadow-sm z-10 ${
                    isSelected ? 'bg-blue-600 border-white text-white' : 
                    (isSelectionMode ? 'bg-white/90 border-blue-300 text-transparent cursor-pointer hover:border-blue-500' : 'bg-white/40 border-white text-transparent')
                  }`}
                >
                  <CheckIcon className="w-3 h-3 stroke-[4]" />
                </div>
              </div>
              
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-tight leading-snug line-clamp-2 mb-1">
                    {crossing.location.street || "Sense Adreça"} {crossing.location.number}
                  </h3>
                  <div className="flex items-center gap-1 text-[8px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                    <MapPinIcon className="w-3 h-3" />
                    <span className="truncate">{crossing.location.neighborhood || city}</span>
                  </div>
                </div>

                <div className="flex items-end justify-between mt-1">
                   <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase border tracking-tight ${getStateBadgeStyles(crossing.state)}`}>
                    {crossing.state}
                  </span>
                  
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-[7px] font-bold text-slate-500 flex items-center gap-0.5">
                      <CalendarIcon className="w-3 h-3" />
                      {new Date(crossing.lastPaintedDate).toLocaleDateString('ca-ES', { month: 'short', year: '2-digit' }).replace('.', '').toUpperCase()}
                    </div>
                    <div className="text-[7px] font-bold text-slate-400" title="Última actualització">
                      {new Date(crossing.updatedAt).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })} · {new Date(crossing.updatedAt).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-[7px] font-bold text-slate-400" title="Usuari">
                      {crossing.updatedBy || crossing.createdBy || 'Usuari'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CrossingList;
