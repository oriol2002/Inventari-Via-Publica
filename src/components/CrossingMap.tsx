
import React, { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import { PedestrianCrossing, CrossingState, FilterOptions, AssetType, NEIGHBORHOODS_BY_CITY } from '../types';
import { 
  PaperAirplaneIcon, 
  MagnifyingGlassIcon,
  Square2StackIcon,
  FunnelIcon,
} from '@heroicons/react/24/solid';

interface Props {
  crossings: PedestrianCrossing[];
  currentFilters: FilterOptions;
  onFilterChange: (f: Partial<FilterOptions>) => void;
  onEditRequested?: (crossing: PedestrianCrossing) => void;
  onQuickUpdate?: (id: string, updates: Partial<PedestrianCrossing>) => void;
  city: string;
}

const getStateColor = (state: CrossingState) => {
  switch (state) {
    case CrossingState.EXCELLENT: return '#10b981'; 
    case CrossingState.GOOD: return '#3b82f6';      
    case CrossingState.FAIR: return '#f59e0b';      
    case CrossingState.POOR: return '#ea580c';      
    case CrossingState.DANGEROUS: return '#dc2626'; 
    case CrossingState.MISSING: return '#1e293b'; 
    default: return '#64748b'; 
  }
};

const CrossingMap: React.FC<Props> = ({ crossings, currentFilters, onFilterChange, onEditRequested, onQuickUpdate, city }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('satellite');
  const [showFilters, setShowFilters] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const searchTimeout = useRef<any>(null);

  const neighborhoods = NEIGHBORHOODS_BY_CITY[city] || [];

  const isValidCoords = (lat: any, lng: any) => {
    return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
  };

  const updateMapLayers = (style: 'standard' | 'satellite') => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) tileLayerRef.current.remove();
    if (labelsLayerRef.current) labelsLayerRef.current.remove();

    if (style === 'satellite') {
      tileLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 21,
        maxNativeZoom: 19
      }).addTo(mapRef.current);
      labelsLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        maxZoom: 21,
        zIndex: 100
      }).addTo(mapRef.current);
    } else {
      tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 21 }).addTo(mapRef.current);
    }
  };

  useEffect(() => {
    if (!mapRef.current && mapContainerRef.current) {
      mapRef.current = L.map(mapContainerRef.current, { 
        center: [40.8122, 0.5215],
        zoom: 15,
        zoomControl: false, 
        attributionControl: false, 
        maxZoom: 21 
      });

      updateMapLayers(mapStyle);

      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `<div class="relative flex items-center justify-center"><div class="absolute w-4 h-4 bg-blue-500 border-[3px] border-white rounded-full shadow-lg z-10"></div><div class="absolute w-6 h-6 bg-blue-400 rounded-full animate-ping opacity-30 z-0"></div></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });
      userMarkerRef.current = L.marker([40.8122, 0.5215], { icon: userIcon, zIndexOffset: 2000 }).addTo(mapRef.current);
      
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    }

    if (mapRef.current) {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      
      const validCrossings = crossings.filter(c => isValidCoords(c.location.lat, c.location.lng));
      if (validCrossings.length > 0) {
        const bounds = L.latLngBounds(validCrossings.map(c => [c.location.lat, c.location.lng]));
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
      }

      crossings.forEach(crossing => {
        if (!isValidCoords(crossing.location.lat, crossing.location.lng)) return;
        const color = getStateColor(crossing.state);
        const isCritical = crossing.state === CrossingState.POOR || crossing.state === CrossingState.DANGEROUS;
        const markerHtml = `<div style="background-color: ${color}; width: ${isCritical ? '24px' : '18px'}; height: ${isCritical ? '24px' : '18px'}; border-radius: ${isCritical ? '6px' : '50%'}; border: 2px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; cursor: pointer; ${isCritical ? 'transform: rotate(45deg);' : ''}">${isCritical ? '<div style="transform: rotate(-45deg); color: white; font-size: 11px; font-weight: 900;">!</div>' : ''}</div>`;
        const customIcon = L.divIcon({ className: 'custom-div-icon', html: markerHtml, iconSize: isCritical ? [24, 24] : [18, 18], iconAnchor: isCritical ? [12, 12] : [9, 9] });
        const marker = L.marker([crossing.location.lat, crossing.location.lng], { icon: customIcon }).addTo(mapRef.current!).bindPopup('Carregant...', { closeButton: false, offset: [0, -8], minWidth: 240 });
        
        marker.on('popupopen', () => {
          const popup = marker.getPopup();
          if (popup) {
            popup.setContent(`
              <div style="padding: 12px; font-family: 'Inter', sans-serif; min-width: 220px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px; gap: 8px;">
                  <h4 style="margin:0; font-weight:900; text-transform:uppercase; font-size:12px; line-height:1.2; color: #0f172a; flex: 1;">
                    ${crossing.location.street} ${crossing.location.number || ''}
                  </h4>
                  <span style="background-color: ${color}; color: white; padding: 2px 8px; border-radius: 6px; font-size: 8px; font-weight: 900; text-transform: uppercase; white-space: nowrap; box-shadow: 0 2px 4px ${color}40;">
                    ${crossing.state}
                  </span>
                </div>
                <p style="margin:0 0 10px 0; color:#2563eb; font-weight:800; font-size:9px; text-transform: uppercase; letter-spacing: 0.05em;">
                  ${crossing.location.neighborhood || city} • ${crossing.assetType}
                </p>
                ${crossing.lastInspectedDate ? `
                <p style="margin:-5px 0 10px 0; color:#059669; font-weight:800; font-size:8px; text-transform: uppercase; display:flex; align-items:center; gap:2px;">
                  ✅ REVISAT: ${new Date(crossing.lastInspectedDate).toLocaleDateString('ca-ES')}
                </p>` : ''}
                <div style="width: 100%; height: 110px; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; background: #f8fafc;">
                  <img src="${crossing.imageThumb || crossing.image}" loading="lazy" decoding="async" style="width:100%; height:100%; object-fit:cover;" />
                </div>
                <div style="display:flex; gap:8px; margin-top:12px;">
                   <button id="btn-check-${crossing.id}" style="flex:1; background:#10b981; color:white; border:none; padding:10px; border-radius:10px; font-weight:900; font-size:9px; cursor:pointer; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); transition: all 0.2s;">
                     ✅ Punt Control
                   </button>
                   <button id="btn-edit-${crossing.id}" style="flex:1; background:#0f172a; color:white; border:none; padding:10px; border-radius:10px; font-weight:900; font-size:9px; cursor:pointer; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); transition: all 0.2s;">
                     Editar
                   </button>
                </div>
              </div>
            `);
          }
          setTimeout(() => {
            const btnEdit = document.getElementById(`btn-edit-${crossing.id}`);
            if (btnEdit && onEditRequested) btnEdit.onclick = () => onEditRequested(crossing);

            const btnCheck = document.getElementById(`btn-check-${crossing.id}`);
            if (btnCheck && onQuickUpdate) {
                btnCheck.onclick = () => {
                    const today = new Date().toISOString().split('T')[0];
                    if (confirm('Vols registrar un Punt de Control (Inspecció Visual) avui?')) {
                        onQuickUpdate(crossing.id, { lastInspectedDate: today });
                        // Feedback visual simple
                        btnCheck.style.backgroundColor = '#059669';
                        btnCheck.innerText = 'VAL VIST! 👍';
                    }
                };
            }
          }, 0);
        });
        markersRef.current.push(marker);
      });
    }
  }, [crossings, city]);

  useEffect(() => {
    updateMapLayers(mapStyle);
  }, [mapStyle]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!isFollowing) {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!('geolocation' in navigator)) {
      alert('Geolocalització no disponible en aquest dispositiu.');
      setIsFollowing(false);
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const latLng: [number, number] = [latitude, longitude];
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(latLng);
        } else if (mapRef.current) {
          userMarkerRef.current = L.marker(latLng).addTo(mapRef.current);
        }
        if (mapRef.current) {
          mapRef.current.setView(latLng, Math.max(mapRef.current.getZoom(), 16), { animate: true });
        }
      },
      () => {
        alert('No s\'ha pogut obtenir la ubicació.');
        setIsFollowing(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isFollowing]);

  const handleLocateUser = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocalització no disponible en aquest dispositiu.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latLng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(latLng);
        } else if (mapRef.current) {
          userMarkerRef.current = L.marker(latLng).addTo(mapRef.current);
        }
        mapRef.current?.setView(latLng, Math.max(mapRef.current.getZoom(), 16), { animate: true });
      },
      () => alert('No s\'ha pogut obtenir la ubicació.'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
  };

  const onSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      if (val.length < 3) return;
      setIsSearching(true);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val + ' ' + city)}&limit=5`;
      const res = await fetch(url);
      const data = await res.json();
      setIsSearching(false);
    }, 400);
  };

  return (
    <div className="w-full h-full flex flex-col relative bg-slate-300 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-[1000] px-4 py-2 flex justify-center">
        <div className="w-full max-w-[340px] flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={`p-2.5 rounded-xl shadow-xl border border-white transition-all ${showFilters ? 'bg-blue-600 text-white' : 'bg-white/95 text-slate-700'}`}><FunnelIcon className="w-5 h-5" /></button>
          <div className="flex-1 relative">
            <div className="flex items-center bg-white/95 border border-slate-200 shadow-xl rounded-xl h-full px-3">
              <MagnifyingGlassIcon className={`w-4 h-4 ${isSearching ? 'text-blue-500 animate-pulse' : 'text-slate-700'}`} />
              <input type="text" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder={`Cerca a ${city}...`} className="w-full bg-transparent border-none outline-none py-2 px-2.5 text-[11px] font-bold text-slate-800 placeholder-slate-500" />
            </div>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="absolute top-14 left-4 right-4 z-[1001] bg-white rounded-[2rem] p-6 shadow-2xl border border-slate-200 animate-in slide-in-from-top duration-300 max-h-[80vh] overflow-y-auto">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Configuració - {city}</h3>
              <button onClick={() => onFilterChange({ states: [], assetTypes: [], neighborhoods: [], dateFrom: '', dateTo: '' })} className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Netejar</button>
           </div>
           
           <div className="space-y-6">
             <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Rang de Dates</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={currentFilters.dateFrom || ''} onChange={(e) => onFilterChange({ dateFrom: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-[10px] font-bold text-slate-700" />
                  <input type="date" value={currentFilters.dateTo || ''} onChange={(e) => onFilterChange({ dateTo: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-[10px] font-bold text-slate-700" />
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Tipus d'Element</label>
                <div className="flex flex-wrap gap-2">
                   {Object.values(AssetType).map(t => (
                      <button key={t} onClick={() => {
                        const current = currentFilters.assetTypes || [];
                        onFilterChange({ assetTypes: current.includes(t) ? current.filter(x => x !== t) : [...current, t] });
                      }} className={`px-3 py-1.5 rounded-xl text-[9px] font-black border transition-all ${currentFilters.assetTypes?.includes(t) ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{t}</button>
                   ))}
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Estat de Conservació</label>
                <div className="flex flex-wrap gap-2">
                   {Object.values(CrossingState).map(s => (
                      <button key={s} onClick={() => {
                        const current = currentFilters.states || [];
                        onFilterChange({ states: current.includes(s) ? current.filter(x => x !== s) : [...current, s] });
                      }} className={`px-3 py-1.5 rounded-xl text-[9px] font-black border transition-all ${currentFilters.states?.includes(s) ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{s}</button>
                   ))}
                </div>
             </div>

             <div className="space-y-2">
               <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Barris</label>
               <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                 {neighborhoods.map(n => (
                    <button key={n} onClick={() => {
                      const current = currentFilters.neighborhoods || [];
                      onFilterChange({ neighborhoods: current.includes(n) ? current.filter(x => x !== n) : [...current, n] });
                    }} className={`px-3 py-1.5 rounded-xl text-[9px] font-black border transition-all ${currentFilters.neighborhoods?.includes(n) ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{n}</button>
                 ))}
               </div>
             </div>
           </div>
           <button onClick={() => setShowFilters(false)} className="w-full mt-6 bg-blue-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em]">Aplicar Filtres</button>
        </div>
      )}

      <div ref={mapContainerRef} className="flex-1 z-0 h-full w-full leaflet-container" />
      <div className="absolute bottom-6 right-6 z-[500] flex flex-col gap-3">
        <button onClick={() => setMapStyle(mapStyle === 'satellite' ? 'standard' : 'satellite')} className="p-3.5 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-100" title="Canviar capes"><Square2StackIcon className="w-5 h-5" /></button>
        <button onClick={handleLocateUser} className="p-3.5 bg-white text-slate-700 rounded-2xl shadow-xl border border-slate-100" title="Localitzar-me">
          <PaperAirplaneIcon className="w-5 h-5 transform rotate-45" />
        </button>
        <button onClick={() => setIsFollowing(!isFollowing)} className={`p-3.5 rounded-2xl shadow-xl border border-slate-100 ${isFollowing ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`} title="Seguiment">
          <PaperAirplaneIcon className={`w-5 h-5 transform ${isFollowing ? '-rotate-45' : 'rotate-45'}`} />
        </button>
      </div>
    </div>
  );
};

export default CrossingMap;
