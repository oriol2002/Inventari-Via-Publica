
import React, { useMemo, useState } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid,
  TooltipProps
} from 'recharts';
import { PedestrianCrossing, CrossingState, AssetType, FilterOptions, NEIGHBORHOODS_BY_CITY } from '../types';
import { 
  MagnifyingGlassIcon, 
  AdjustmentsHorizontalIcon, 
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  HashtagIcon,
  CalendarDaysIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Props {
  crossings: PedestrianCrossing[];
  currentFilters: FilterOptions;
  onFilterChange: (filters: Partial<FilterOptions>) => void;
  onGenerateReport: () => void;
  city: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444', '#64748b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', '#a855f7'];

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label || payload[0].name}</p>
        <p className="text-sm font-black text-slate-900">{payload[0].value} <span className="text-[10px] text-slate-500">Unitats</span></p>
      </div>
    );
  }
  return null;
};

export const Statistics: React.FC<Props> = ({ crossings, currentFilters, onFilterChange, onGenerateReport, city }) => {
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const neighborhoods = NEIGHBORHOODS_BY_CITY[city] || [];

  // 1. KPI Calculation
  const kpis = useMemo(() => {
    const total = crossings.length;
    const critical = crossings.filter(c => c.state === CrossingState.POOR || c.state === CrossingState.DANGEROUS).length;
    const excellent = crossings.filter(c => c.state === CrossingState.EXCELLENT || c.state === CrossingState.GOOD).length;
    const healthIndex = total > 0 ? Math.round((excellent / total) * 100) : 0;
    
    // Mitjana de mesos des de l'última actuació
    const monthsArray = crossings.map(c => {
      const start = new Date(c.lastPaintedDate);
      const end = new Date();
      return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    });
    const avgMonths = monthsArray.length > 0 ? Math.round(monthsArray.reduce((a: number, b: number) => a + b, 0) / monthsArray.length) : 0;

    return { total, critical, healthIndex, avgMonths };
  }, [crossings]);

  // 2. Chart Data Construction
  const stateData = useMemo(() => {
    const counts = crossings.reduce((acc, c) => {
      acc[c.state] = (acc[c.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.values(CrossingState).map(s => ({ name: s, value: counts[s] || 0 })).filter(d => d.value > 0);
  }, [crossings]);

  const assetTypeData = useMemo(() => {
    const counts = crossings.reduce((acc, c) => {
      acc[c.assetType] = (acc[c.assetType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.values(AssetType).map(t => ({ name: t, value: counts[t] || 0 }))
      .filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [crossings]);

  const neighborhoodData = useMemo(() => {
    const counts = crossings.reduce((acc, c) => {
      const n = c.location.neighborhood || 'Altres';
      acc[n] = (acc[n] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value]) => ({ name, value } as { name: string, value: number }))
      .sort((a, b) => b.value - a.value).slice(0, 8);
  }, [crossings]);

  // Nova lògica: Carrers amb més intervenció necessària (Crític / Deficient)
  const streetData = useMemo(() => {
    const counts = crossings
      .filter(c => c.state === CrossingState.POOR || c.state === CrossingState.DANGEROUS)
      .reduce((acc: Record<string, number>, c) => {
        // Normalització bàsica del nom del carrer
        const street = c.location.street ? c.location.street.trim().toUpperCase() : 'SENSE ADREÇA';
        acc[street] = (acc[street] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value } as { name: string, value: number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 carrers
  }, [crossings]);

  const toggleFilter = (key: keyof FilterOptions, value: any) => {
    const current = (currentFilters[key] as any[]) || [];
    const updated = current.includes(value) 
      ? current.filter(x => x !== value) 
      : [...current, value];
    onFilterChange({ [key]: updated });
  };

  const activeFiltersCount = (currentFilters.states?.length || 0) + 
                             (currentFilters.assetTypes?.length || 0) + 
                             (currentFilters.neighborhoods?.length || 0) + 
                             (currentFilters.dateFrom || currentFilters.dateTo ? 1 : 0);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-20">
      {/* Search and Global Actions */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative bg-white border border-slate-300 rounded-2xl shadow-sm flex items-center px-4">
          <MagnifyingGlassIcon className="w-5 h-5 text-slate-500" />
          <input 
            type="text" 
            placeholder={`Cerca per carrer a ${city}...`} 
            className="w-full bg-transparent border-none outline-none py-4 px-3 text-[12px] font-black text-slate-800 uppercase placeholder-slate-400" 
            value={currentFilters.searchQuery || ''} 
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })} 
          />
          <button 
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${isFiltersExpanded || activeFiltersCount > 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <AdjustmentsHorizontalIcon className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Filtres {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
          </button>
        </div>
        <button 
          onClick={onGenerateReport} 
          disabled={crossings.length === 0}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all disabled:opacity-30"
        >
          <DocumentChartBarIcon className="w-6 h-6" />
          <span className="text-[11px] font-black uppercase tracking-widest">Generar Informe Estadístic</span>
        </button>
      </div>

      {/* Expanded Filters Panel */}
      {isFiltersExpanded && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl animate-in slide-in-from-top-4 duration-300 relative">
          <button onClick={() => setIsFiltersExpanded(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600"><XMarkIcon className="w-6 h-6" /></button>
          
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Auditoria Detallada - Tortosa</h3>
            <button onClick={() => onFilterChange({ states: [], assetTypes: [], neighborhoods: [], dateFrom: '', dateTo: '' })} className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-xl">Restablir filtres</button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
            {/* Column 1: Asset Types */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipus d'Actiu</label>
              <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
                {Object.values(AssetType).sort((a,b) => a.localeCompare(b)).map(t => (
                  <button key={t} onClick={() => toggleFilter('assetTypes', t)} className={`text-left px-3 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all border ${currentFilters.assetTypes?.includes(t) ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-transparent hover:border-slate-300 hover:bg-slate-100'}`}>{t}</button>
                ))}
              </div>
            </div>

            {/* Column 2: States */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estat de Conservació</label>
              <div className="flex flex-col gap-1.5">
                {Object.values(CrossingState).map(s => (
                  <button key={s} onClick={() => toggleFilter('states', s)} className={`text-left px-3 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all border ${currentFilters.states?.includes(s) ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' : 'bg-slate-50 text-slate-600 border-transparent hover:border-slate-300 hover:bg-slate-100'}`}>{s}</button>
                ))}
              </div>
            </div>

            {/* Column 3: Dates */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rangs Temporals</label>
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-500 uppercase pl-1">Data d'Actuació Mínima</span>
                  <input type="date" value={currentFilters.dateFrom || ''} onChange={(e) => onFilterChange({ dateFrom: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-[11px] font-bold outline-none text-slate-700" />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-500 uppercase pl-1">Data d'Actuació Màxima</span>
                  <input type="date" value={currentFilters.dateTo || ''} onChange={(e) => onFilterChange({ dateTo: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-[11px] font-bold outline-none text-slate-700" />
                </div>
              </div>
            </div>

            {/* Column 4: Neighborhoods */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Barris de Tortosa</label>
              <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
                {neighborhoods.map(n => (
                  <button key={n} onClick={() => toggleFilter('neighborhoods', n)} className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${currentFilters.neighborhoods?.includes(n) ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-transparent hover:border-slate-300 hover:bg-slate-100'}`}>{n}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-300 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><HashtagIcon className="w-6 h-6" /></div>
              <span className="text-[9px] font-black text-slate-400 uppercase">Tortosa Total</span>
           </div>
           <div>
              <div className="text-4xl font-black text-slate-900">{kpis.total}</div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Actius Inventariats</div>
           </div>
        </div>
        
        <div className="bg-white p-6 rounded-[2rem] border border-slate-300 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><ExclamationTriangleIcon className="w-6 h-6" /></div>
              <span className="text-[9px] font-black text-slate-400 uppercase">Alerta Crítica</span>
           </div>
           <div>
              <div className="text-4xl font-black text-rose-600">{kpis.critical}</div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Pendent Manteniment</div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-300 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckBadgeIcon className="w-6 h-6" /></div>
              <span className="text-[9px] font-black text-slate-400 uppercase">Seguretat Vial</span>
           </div>
           <div>
              <div className="text-4xl font-black text-emerald-600">{kpis.healthIndex}%</div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Elements en bon estat</div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-300 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><CalendarDaysIcon className="w-6 h-6" /></div>
              <span className="text-[9px] font-black text-slate-400 uppercase">Obsolescència</span>
           </div>
           <div>
              <div className="text-4xl font-black text-amber-600">{kpis.avgMonths}</div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Mesos mitjans s. actuació</div>
           </div>
        </div>
      </div>

      {/* Main Content Area: Charts */}
      {crossings.length === 0 ? (
        <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-300 flex flex-col items-center">
          <AdjustmentsHorizontalIcon className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cap dada coincideix amb els filtres</h3>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-2 max-w-sm">Prova a netejar els filtres o a cercar un altre barri de Tortosa per obtenir estadístiques.</p>
          <button onClick={() => onFilterChange({ states: [], assetTypes: [], neighborhoods: [], dateFrom: '', dateTo: '', searchQuery: '' })} className="mt-8 bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest">Netejar-ho tot</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chart 1: State Distribution */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h3 className="font-black text-slate-900 text-xl uppercase tracking-tighter">Salut de la Via</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Distribució per estats de conservació</p>
                </div>
              </div>
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={stateData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={80} 
                      outerRadius={120} 
                      paddingAngle={8} 
                      dataKey="value"
                      stroke="none"
                    >
                      {stateData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Asset Types */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
               <div className="flex justify-between items-end mb-8">
                <div>
                  <h3 className="font-black text-slate-900 text-xl uppercase tracking-tighter">Tipologia d'Actius</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Elements predominants a l'inventari</p>
                </div>
              </div>
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={assetTypeData} layout="vertical" margin={{ left: 40, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', fill: '#64748b' }} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={20}>
                      {assetTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Carrers amb més intervenció */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm mt-8">
             <div className="flex justify-between items-end mb-10 text-center md:text-left">
              <div className="w-full">
                <h3 className="font-black text-slate-900 text-xl uppercase tracking-tighter flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-6 h-6 text-rose-500" />
                  Intervenció per Carrers
                </h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Carrers amb més elements en estat deficient o perillós (Top 10)</p>
              </div>
            </div>
            <div className="h-[400px] w-full">
              {streetData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={streetData} layout="vertical" margin={{ left: 60, right: 40, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={160} 
                      style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', fill: '#64748b' }} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#f43f5e" radius={[0, 10, 10, 0]} barSize={24}>
                       {streetData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#f43f5e" fillOpacity={1 - (index * 0.05)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                  <CheckBadgeIcon className="w-12 h-12 mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No hi ha carrers amb incidències crítiques</p>
                </div>
              )}
            </div>
          </div>

          {/* Chart 3: Neighborhood Distribution (Full Width) */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm mt-8">
            <div className="flex justify-between items-end mb-10 text-center md:text-left">
              <div className="w-full">
                <h3 className="font-black text-slate-900 text-xl uppercase tracking-tighter">Barris de Tortosa</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Concentració d'elements per zones (Top 8)</p>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={neighborhoodData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', fill: '#64748b' }} 
                  />
                  <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px', fill: '#94a3b8' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[12, 12, 0, 0]} barSize={45}>
                     {neighborhoodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#3b82f6" fillOpacity={1 - (index * 0.1)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
