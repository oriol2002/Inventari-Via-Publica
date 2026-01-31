
import React, { useState, useRef, useEffect } from 'react';
import * as L from 'leaflet';
import { CameraIcon, PhotoIcon, MapPinIcon, XMarkIcon, PencilIcon, GlobeEuropeAfricaIcon, Square2StackIcon, MagnifyingGlassIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { CrossingState, PedestrianCrossing, Location, AssetType, AccessGroup, TORTOSA_BARRIS, TORTOSA_PEDANIES, TORTOSA_POLIGONS } from '../types';
import { processFile } from '../services/photoUploadService';
import ImageEditor from './ImageEditor';

interface Props {
  initialData?: PedestrianCrossing | null; 
  onClose: () => void;
  onSubmit: (c: PedestrianCrossing) => void;
  city: string;
  onImageCapture?: () => void;
  fromAlert?: boolean;
  onDismissAlert?: (id: string) => void;
  userId?: string;
  canAssignGroups?: boolean;
  defaultGroup?: AccessGroup;
}

const CrossingForm: React.FC<Props> = ({ initialData, onClose, onSubmit, city, onImageCapture, fromAlert = false, onDismissAlert, userId, canAssignGroups = false, defaultGroup }) => {
  const [image, setImage] = useState<string | null>(initialData?.image || null);
  const [imageThumb, setImageThumb] = useState<string | null>(initialData?.imageThumb || null);
  const [location, setLocation] = useState<Location | null>(initialData?.location || null);
  const [state, setState] = useState<CrossingState>(initialData?.state || CrossingState.GOOD);
  const [lastPainted, setLastPainted] = useState<string>(initialData?.lastPaintedDate || new Date().toISOString().split('T')[0]);
  const [assetType, setAssetType] = useState<AssetType>(initialData?.assetType || AssetType.CROSSING);
  const [assetSubType, setAssetSubType] = useState<string>(initialData?.assetSubType || '');
  const [retentionLineLength, setRetentionLineLength] = useState<string>(
    initialData?.retentionLineLength ? String(initialData.retentionLineLength) : '0.40'
  );
  const [crossingWidth, setCrossingWidth] = useState<string>(
    initialData?.crossingWidth ? String(initialData.crossingWidth) : '4'
  );
  const [notes, setNotes] = useState<string>(initialData?.notes || '');
  const [accessGroups, setAccessGroups] = useState<AccessGroup[]>(
    initialData?.accessGroups || (defaultGroup ? [defaultGroup] : ['mobilitat'])
  );
  
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('satellite');
  const [streetSuggestions, setStreetSuggestions] = useState<any[]>([]);
  const [isSearchingStreet, setIsSearchingStreet] = useState(false);
  const [showStreetSuggestions, setShowStreetSuggestions] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const searchTimeout = useRef<any>(null);
  const geocodeTimeout = useRef<any>(null);
  
  const shouldRecenter = useRef(true);
  const isAgentsCivicsContext = defaultGroup === 'agents-civics';
  const isMobilitatContext = !isAgentsCivicsContext;
  const CITY_NAME = 'Tortosa';
  const NOMINATIM_VIEWBOX = '0.43,40.86,0.63,40.74';

  const agentsCivicsAssetTypes: AssetType[] = [
    AssetType.AWARENESS,
    AssetType.SIGNS,
    AssetType.PAINT,
    AssetType.PAVEMENT,
    AssetType.URBAN_FURNITURE,
    AssetType.TRAFFIC_LIGHT,
    AssetType.CONTAINER,
    AssetType.OTHER
  ];

  const mobilitatAssetTypes: AssetType[] = [
    AssetType.CROSSING,
    AssetType.TRAFFIC_LIGHT,
    AssetType.SIGN,
    AssetType.BARRIER,
    AssetType.BOLLARD,
    AssetType.SPEED_BUMP,
    AssetType.MIRROR,
    AssetType.HORIZONTAL_GENERIC,
    AssetType.PMR_PAINT,
    AssetType.LOADING_UNLOADING,
    AssetType.ACCESSIBILITY_RAMP,
    AssetType.OTHER
  ];

  const agentsCivicsSubTypes: Partial<Record<AssetType, string[]>> = {
    [AssetType.AWARENESS]: ['Gossos', 'Patinets elèctrics', 'Escombraries', 'Altres'],
    [AssetType.SIGNS]: ['Prohibició', 'Obligació', 'Informació', 'Advertència', 'Altres'],
    [AssetType.PAINT]: ['Pas de vianants', 'PMR', 'Carril bici', 'Zona càrrega/descàrrega', 'Altres'],
    [AssetType.PAVEMENT]: ['Vorera', 'Calçada', 'Rigola', 'Altres'],
    [AssetType.URBAN_FURNITURE]: ['Paperera', 'Banc', 'Font', 'Jardinera'],
    [AssetType.TRAFFIC_LIGHT]: ['Vehicles', 'Vianants', 'Bicicletes', 'Altres'],
    [AssetType.CONTAINER]: ['Orgànica', 'Paper', 'Vidre', 'Envasos', 'Rebuig', 'Altres'],
    [AssetType.OTHER]: ['Altres']
  };

  const mobilitatSubTypes: Partial<Record<AssetType, string[]>> = {
    [AssetType.CROSSING]: ['Línia de retenció', 'Pas de vianants'],
    [AssetType.TRAFFIC_LIGHT]: ['Vehicles', 'Vianants', 'Bicicletes', 'Altres'],
    [AssetType.SIGN]: ['Stop', 'Cediu el pas', 'Limit velocitat', 'Direccional', 'Altres'],
    [AssetType.BARRIER]: ['Protecció vianants', 'Accés restringit', 'Obra', 'Altres'],
    [AssetType.BOLLARD]: ['Fixa', 'Abatible', 'Retràctil', 'Altres'],
    [AssetType.SPEED_BUMP]: ['Llom', 'Coixí berlinès', 'Banda sonora', 'Altres'],
    [AssetType.MIRROR]: ['Convex', 'Panoràmic', 'Altres'],
    [AssetType.HORIZONTAL_GENERIC]: ['Fletxes', 'Stop', 'Cediu el pas', 'Pas vianants', 'Altres'],
    [AssetType.PMR_PAINT]: ['Reserva', 'Gual', 'Itinerari', 'Altres'],
    [AssetType.LOADING_UNLOADING]: ['Zona càrrega', 'Zona descàrrega', 'Altres'],
    [AssetType.ACCESSIBILITY_RAMP]: ['Vorera', 'Pas vianants', 'Altres'],
    [AssetType.CONTAINER]: ['Orgànica', 'Paper', 'Vidre', 'Envasos', 'Rebuig', 'Altres'],
    [AssetType.OTHER]: ['Altres']
  };

  const getContextAssetTypes = () => (isAgentsCivicsContext ? agentsCivicsAssetTypes : mobilitatAssetTypes);
  const getSubTypeOptions = (type: AssetType) => {
    if (isAgentsCivicsContext) return agentsCivicsSubTypes[type] || [];
    return mobilitatSubTypes[type] || [];
  };

  useEffect(() => {
    const contextTypes = getContextAssetTypes();
    if (!contextTypes.includes(assetType)) {
      setAssetType(contextTypes[0]);
      return;
    }
    const options = getSubTypeOptions(assetType);
    if (!options.length) {
      if (assetSubType) setAssetSubType('');
      return;
    }
    if (!options.includes(assetSubType)) {
      setAssetSubType(options[0]);
    }
  }, [isAgentsCivicsContext, isMobilitatContext, assetType, assetSubType]);

  const STREET_NEIGHBORHOOD_KEY = 'mobilitat_street_neighborhood_map';

  const handleDismissAlert = () => {
    if (initialData?.id && onDismissAlert) {
      if (confirm('Marcar aquesta alerta com a llegida? No apareixerà a les alertes.')) {
        onDismissAlert(initialData.id);
        onClose();
      }
    }
  };

  const normalizeStreet = (street?: string) => (street || '').trim().toLowerCase();

  const loadStreetNeighborhoodMap = (): Record<string, string> => {
    try {
      const raw = localStorage.getItem(STREET_NEIGHBORHOOD_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('Error carregant mapa carrer-barri:', e);
      return {};
    }
  };

  const saveStreetNeighborhoodMap = (map: Record<string, string>) => {
    try {
      localStorage.setItem(STREET_NEIGHBORHOOD_KEY, JSON.stringify(map));
    } catch (e) {
      console.warn('Error guardant mapa carrer-barri:', e);
    }
  };

  const getMappedNeighborhood = (street?: string) => {
    const key = normalizeStreet(street);
    if (!key) return '';
    const map = loadStreetNeighborhoodMap();
    return map[key] || '';
  };

  const setMappedNeighborhood = (street?: string, neighborhood?: string) => {
    const key = normalizeStreet(street);
    if (!key || !neighborhood) return;
    const map = loadStreetNeighborhoodMap();
    map[key] = neighborhood;
    saveStreetNeighborhoodMap(map);
  };

  // Inicialització de la ubicació (Geolocalització o Default)
  useEffect(() => {
    if (!initialData && !location) {
      // Establir ubicació per defecte immediata per evitar mapa en blanc
      const defaultLoc = { lat: 40.8125, lng: 0.5216 };
      setLocation(defaultLoc);
      shouldRecenter.current = true;

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            shouldRecenter.current = true;
            const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setLocation(newLoc);
            fetchAddressFromCoords(pos.coords.latitude, pos.coords.longitude);
          },
          (err) => {
            console.warn("Error de geolocalització o permís denegat:", err);
          }
        );
      }
    }
  }, [initialData, location]);

  const updateMapLayers = (style: 'standard' | 'satellite', mapInstance: L.Map) => {
    if (tileLayerRef.current) tileLayerRef.current.remove();
    if (labelsLayerRef.current) labelsLayerRef.current.remove();

    if (style === 'satellite') {
      tileLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 22,
        maxNativeZoom: 19,
        attribution: 'Esri'
      }).addTo(mapInstance);
      labelsLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        maxZoom: 22,
        maxNativeZoom: 19,
        zIndex: 100
      }).addTo(mapInstance);
    } else {
      tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 22,
        maxNativeZoom: 19
      }).addTo(mapInstance);
    }
  };

  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=19&addressdetails=1`, {
        headers: { 'Accept-Language': 'ca' }
      });
      const data = await response.json();
      
      if (data && data.address) {
        const road = data.address.road || data.address.pedestrian || data.address.footway || data.address.path || data.address.square || data.address.plaza || data.name || '';
        const houseNumber = data.address.house_number || '';
        const mappedNeighborhood = getMappedNeighborhood(road);
        const neighborhood = mappedNeighborhood || data.address.neighbourhood || data.address.suburb || '';
        const fullAddress = data.display_name;
        
        setLocation(prev => {
          const base = prev || { lat, lng };
          const nextNumber = houseNumber || (base.street === road ? base.number : '');
          
          return {
            ...base,
            street: road || base.street || '', 
            number: nextNumber || '',
            neighborhood: neighborhood || base.neighborhood || '',
            address: fullAddress || base.address || ''
          };
        });
      }
    } catch (error) {
      console.error("Error en reverse geocoding:", error);
    }
  };

  const updateMarkerPosition = (lat: number, lng: number) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
    if (mapRef.current && shouldRecenter.current) {
      mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 19));
    }
  };

  const geocodeManualAddress = async (street?: string, number?: string) => {
    if (!street || street.trim().length < 3) return;
    try {
      const hasNumber = !!(number && number.trim());
      const streetParam = hasNumber ? `${number} ${street}` : street;
      const baseUrl = 'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&countrycodes=es';
      const viewbox = `&viewbox=${encodeURIComponent(NOMINATIM_VIEWBOX)}&bounded=1`;
      const url = `${baseUrl}&street=${encodeURIComponent(streetParam)}&city=${encodeURIComponent(CITY_NAME)}${viewbox}`;

      let res = await fetch(url, { headers: { 'Accept-Language': 'ca' } });
      let data = await res.json();

      if ((!data || data.length === 0) && hasNumber) {
        const fallbackUrl = `${baseUrl}&street=${encodeURIComponent(street)}&city=${encodeURIComponent(CITY_NAME)}${viewbox}`;
        res = await fetch(fallbackUrl, { headers: { 'Accept-Language': 'ca' } });
        data = await res.json();
      }

      if (!data || data.length === 0) return;

      const best = data[0];
      const addr = best.address || {};
      const mappedNeighborhood = getMappedNeighborhood(street);
      const neighborhood = mappedNeighborhood || addr.suburb || addr.neighbourhood || addr.city_district || '';
      const lat = parseFloat(best.lat);
      const lng = parseFloat(best.lon);
      const resolvedStreet = addr.road || addr.pedestrian || addr.footway || addr.path || addr.square || addr.plaza || street;
      const resolvedNumber = addr.house_number || number || '';

      setLocation(prev => {
        const base = prev || { lat, lng };
        return {
          ...base,
          street: resolvedStreet,
          number: resolvedNumber,
          lat,
          lng,
          neighborhood: neighborhood || base.neighborhood || '',
          address: best.display_name || base.address || ''
        };
      });
      updateMarkerPosition(lat, lng);
    } catch (error) {
      console.error('Error geocodificant adreça:', error);
    }
  };

  const scheduleManualGeocode = (street?: string, number?: string) => {
    if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current);
    geocodeTimeout.current = setTimeout(() => {
      geocodeManualAddress(street, number);
    }, 600);
  };

  // Inicialització del mapa
  useEffect(() => {
    // Afegim 'location' a les dependències perquè si la geolocalització tarda, 
    // el mapa s'inicialitzi quan arribi la ubicació.
    if (showImageEditor) {
      console.log('Mapa: Editor actiu, no s\'inicialitza');
      return;
    }
    if (!location) {
      console.log('Mapa: No hi ha ubicació encara');
      return;
    }
    if (!mapContainerRef.current) {
      console.log('Mapa: Contenidor no disponible, reintentant...');
      // Reintenta després de que el DOM estigui muntat
      const timer = setTimeout(() => {
        if (mapContainerRef.current && location && !mapRef.current) {
          console.log('Mapa: Reinici després de timeout');
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    // Si ja existeix, netegem primer
    if (mapRef.current) {
      console.log('Mapa: Netejant instància anterior');
      mapRef.current.remove();
      mapRef.current = null;
    }
    
    console.log('Mapa: Inicialitzant amb ubicació', location);

    const map = L.map(mapContainerRef.current, {
      center: [location.lat, location.lng],
      zoom: 20,
      maxZoom: 22,
      zoomControl: false,
      attributionControl: false
    });

    updateMapLayers(mapStyle, map);

    const customIcon = L.divIcon({
      className: 'custom-pin-marker',
      html: `
        <div style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4)); transition: transform 0.2s;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="none">
            <path d="M12 2C7.58172 2 4 5.58172 4 10C4 14.4183 12 22 12 22C12 22 20 14.4183 20 10C20 5.58172 16.4183 2 12 2Z" fill="#dc2626" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="10" r="3.5" fill="white"/>
          </svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });

    const marker = L.marker([location.lat, location.lng], { icon: customIcon, draggable: true }).addTo(map);

    marker.on('dragstart', () => {
      shouldRecenter.current = false;
    });

    marker.on('dragend', (e) => {
      shouldRecenter.current = false; 
      const newPos = e.target.getLatLng();
      setLocation(prev => prev ? ({ ...prev, lat: newPos.lat, lng: newPos.lng }) : { lat: newPos.lat, lng: newPos.lng });
      fetchAddressFromCoords(newPos.lat, newPos.lng);
    });

    map.on('click', (e) => {
      shouldRecenter.current = true;
      marker.setLatLng(e.latlng);
      setLocation(prev => prev ? ({ ...prev, lat: e.latlng.lat, lng: e.latlng.lng }) : { lat: e.latlng.lat, lng: e.latlng.lng });
      fetchAddressFromCoords(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;
    
    console.log('Mapa: Creat correctament', {
      containerHeight: mapContainerRef.current?.offsetHeight,
      containerWidth: mapContainerRef.current?.offsetWidth,
      mapLayers: map.getContainer().childNodes.length
    });

    // Forçar múltiples invalidateSize per assegurar que es mostra
    setTimeout(() => map.invalidateSize(), 0);
    setTimeout(() => map.invalidateSize(), 100);
    setTimeout(() => map.invalidateSize(), 300);
    setTimeout(() => map.invalidateSize(), 500);
    const resizeInterval = setInterval(() => {
      map.invalidateSize();
      console.log('Mapa: Invalidant mida', map.getSize());
    }, 500);
    setTimeout(() => clearInterval(resizeInterval), 3000);

  }, [showImageEditor, location?.lat, location?.lng]); // Només quan canvia ubicació o showImageEditor

  // Cleanup per quan es tanca el popup
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      tileLayerRef.current = null;
      labelsLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      updateMapLayers(mapStyle, mapRef.current);
    }
  }, [mapStyle]);

  useEffect(() => {
    if (mapRef.current && markerRef.current && location) {
      const currentLatLng = markerRef.current.getLatLng();
      const targetLatLng = L.latLng(location.lat, location.lng);
      const distance = currentLatLng.distanceTo(targetLatLng);

      if (distance > 1) {
        markerRef.current.setLatLng(targetLatLng);
      }

      if (shouldRecenter.current) {
        mapRef.current.panTo(targetLatLng, { animate: true });
        shouldRecenter.current = false;
      }
      
      mapRef.current.invalidateSize();
    }
  }, [location?.lat, location?.lng]);


  const handleCenterOnUser = () => {
    setIsLocatingUser(true);
    if ('geolocation' in navigator) {
       navigator.geolocation.getCurrentPosition((pos) => {
          shouldRecenter.current = true;
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          setLocation(prev => prev ? { ...prev, lat: newLat, lng: newLng } : { lat: newLat, lng: newLng });
          fetchAddressFromCoords(newLat, newLng);
          setIsLocatingUser(false);
       }, (err) => {
          console.error("Error GPS:", err);
          setIsLocatingUser(false);
          alert("No s'ha pogut obtenir la ubicació. Comprova els permisos.");
       });
    } else {
      setIsLocatingUser(false);
      alert("Geolocalització no suportada pel navegador.");
    }
  };

  const handleUpdateGPS = handleCenterOnUser;

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        if (!userId) {
          console.warn('No hi ha userId. Es guardarà la imatge localment.');
        } else {
          // Pujar imatge comprimida + guardar EXIF a incidencies_fotos
          const result = await processFile(file, userId);
          if (result.success && result.publicUrl) {
            setImage(result.publicUrl);
            if (result.publicThumbUrl) {
              setImageThumb(result.publicThumbUrl);
            }
            if (onImageCapture) onImageCapture();
            return;
          }
        }
      } catch (error) {
        console.error('Error en pujada d\'imatge:', error);
      }

      // Fallback: preview local si falla la pujada
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        setImage(preview);
        setImageThumb(preview);
        if (onImageCapture) onImageCapture();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStreetChange = (val: string) => {
    const mappedNeighborhood = getMappedNeighborhood(val);
    setLocation(prev => prev ? ({ ...prev, street: val, ...(mappedNeighborhood ? { neighborhood: mappedNeighborhood } : {}) }) : { lat: 0, lng: 0, street: val, neighborhood: mappedNeighborhood || '' });
    scheduleManualGeocode(val, location?.number || '');
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (val.length < 3) {
      setStreetSuggestions([]);
      setShowStreetSuggestions(false);
      return;
    }
    
    searchTimeout.current = setTimeout(async () => {
      setIsSearchingStreet(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val + ' Tortosa')}&countrycodes=es&addressdetails=1&limit=8`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'ca' } });
        const data = await res.json();
        
        const filtered = data.filter((item: any) => {
           const addr = item.address;
           const relevantCity = (addr.city || addr.town || addr.village || '').toLowerCase().includes('tortosa');
           const relevantPostcode = (addr.postcode || '').startsWith('435');
           return relevantCity || relevantPostcode;
        });

        setStreetSuggestions(filtered);
        setShowStreetSuggestions(true);
      } catch (err) {
        console.error("Error cercant carrer:", err);
      } finally {
        setIsSearchingStreet(false);
      }
    }, 500);
  };

  const selectStreet = (suggestion: any) => {
    shouldRecenter.current = true;
    const addr = suggestion.address;
    const streetName = addr.road || addr.pedestrian || addr.footway || addr.path || addr.square || suggestion.display_name.split(',')[0];
    const detectedNumber = addr.house_number || '';
    
    const numberToUse = detectedNumber ? detectedNumber : (location?.street === streetName ? (location?.number || '') : '');
    
    const mappedNeighborhood = getMappedNeighborhood(streetName);
    const newLoc = { 
      ...(location || { lat: 0, lng: 0 }), 
      street: streetName,
      number: numberToUse,
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
      neighborhood: mappedNeighborhood || addr.suburb || addr.neighbourhood || location?.neighborhood || '',
      address: suggestion.display_name
    } as Location;
    
    setLocation(newLoc);
    setStreetSuggestions([]);
    setShowStreetSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!image && !imageThumb) || !location) {
      alert("Cal una imatge i una ubicació per guardar el registre.");
      return;
    }
    
    const now = Date.now();
    const id = initialData?.id || (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : now.toString());

    // Preparem un objecte de localització net i segur
    const finalLocation: Location = {
      lat: location.lat,
      lng: location.lng,
      street: location.street || '',
      number: location.number || '',
      neighborhood: location.neighborhood || '',
      address: location.address || '',
      city: 'Tortosa'
    };

    onSubmit({
      id,
      image: image || imageThumb || '',
      imageThumb: imageThumb || undefined,
      location: finalLocation,
      state,
      lastPaintedDate: lastPainted,
      assetType,
      assetSubType: assetSubType || undefined,
      retentionLineLength: assetType === AssetType.CROSSING && assetSubType === 'Línia de retenció'
        ? Number(retentionLineLength) || 0.4
        : undefined,
      crossingWidth: assetType === AssetType.CROSSING && assetSubType === 'Pas de vianants'
        ? Number(crossingWidth) || 4
        : undefined,
      accessGroups: canAssignGroups
        ? (accessGroups.length ? accessGroups : ['mobilitat'])
        : (defaultGroup ? [defaultGroup] : (accessGroups.length ? accessGroups : ['mobilitat'])),
      notes: notes || '',
      createdAt: initialData?.createdAt || now,
      updatedAt: now,
    });
  };

  const editorImage = imageThumb || image || null;

  if (showImageEditor && editorImage) {
    return (
      <ImageEditor 
        imageUrl={editorImage}
        onSave={(editedImage) => { setImage(editedImage); setImageThumb(editedImage); setShowImageEditor(false); }}
        onCancel={() => setShowImageEditor(false)}
      />
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">
            {initialData ? 'EDITAR REGISTRE' : 'NOU REGISTRE'}
          </h2>
          {initialData && (
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              Actualitzat: {new Date(initialData.updatedAt).toLocaleDateString('ca-ES')} · {new Date(initialData.updatedAt).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {initialData && (initialData.updatedBy || initialData.createdBy) && (
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              Usuari: {initialData.updatedBy || initialData.createdBy}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {fromAlert && initialData && !initialData.alertDismissed && (
            <button 
              type="button"
              onClick={handleDismissAlert} 
              className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all border border-emerald-200 flex items-center gap-2"
              title="Marcar com a llegit"
            >
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase tracking-widest">Llegit</span>
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-xl transition-all"><XMarkIcon className="w-5 h-5" /></button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-4">
      {!(imageThumb || image) ? (
          <div className="space-y-6">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] text-center mb-2">Captura d'imatge obligatòria</p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button"
                onClick={() => cameraInputRef.current?.click()} 
                className="aspect-square border-2 border-dashed border-slate-300 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-all active:scale-95 bg-slate-50 hover:bg-white group"
              >
                <div className="p-4 bg-white rounded-3xl shadow-sm border border-slate-100 group-hover:shadow-md transition-all mb-3">
                  <CameraIcon className="w-8 h-8" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Càmera</span>
              </button>
              <button 
                type="button"
                onClick={() => galleryInputRef.current?.click()} 
                className="aspect-square border-2 border-dashed border-slate-300 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-all active:scale-95 bg-slate-50 hover:bg-white group"
              >
                <div className="p-4 bg-white rounded-3xl shadow-sm border border-slate-100 group-hover:shadow-md transition-all mb-3">
                  <PhotoIcon className="w-8 h-8" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Galeria</span>
              </button>
            </div>
            <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
            <input type="file" ref={galleryInputRef} accept="image/*" className="hidden" onChange={handleCapture} />
          </div>
        ) : (
          <div className="aspect-video rounded-3xl overflow-hidden relative group bg-slate-100 border border-slate-300 shrink-0">
            <img src={imageThumb || image || ''} className="w-full h-full object-cover" alt="Preview" />
            <div className="absolute bottom-3 right-3 flex gap-2">
              <button type="button" onClick={() => setShowImageEditor(true)} className="p-2.5 bg-black/60 text-white rounded-xl hover:bg-blue-600 transition-colors backdrop-blur-sm shadow-xl"><PencilIcon className="w-4 h-4" /></button>
              <button type="button" onClick={() => setImage(null)} className="p-2.5 bg-black/60 text-white rounded-xl hover:bg-rose-600 transition-colors backdrop-blur-sm shadow-xl"><XMarkIcon className="w-4 h-4" /></button>
            </div>
          </div>
        )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Tipus d'Element</label>
              <select
                value={assetType}
                onChange={(e) => {
                  const nextType = e.target.value as AssetType;
                  setAssetType(nextType);
                  if (isAgentsCivicsContext) {
                    const options = getSubTypeOptions(nextType);
                    setAssetSubType(options[0] || '');
                  }
                }}
                className="w-full bg-slate-100 border border-slate-300 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none text-slate-700"
              >
                {(isAgentsCivicsContext ? agentsCivicsAssetTypes : mobilitatAssetTypes)
                  .map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {(isAgentsCivicsContext || isMobilitatContext) && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Tipus Relacionat</label>
                <select
                  value={assetSubType}
                  onChange={(e) => setAssetSubType(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-300 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none text-slate-700"
                >
                  {getSubTypeOptions(assetType).map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Estat Conservació</label>
              <select value={state} onChange={(e) => setState(e.target.value as CrossingState)} className="w-full bg-slate-100 border border-slate-300 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none text-slate-700">
                {Object.values(CrossingState).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {assetType === AssetType.CROSSING && assetSubType === 'Línia de retenció' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Llargada línia (m)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={retentionLineLength}
                  onChange={(e) => setRetentionLineLength(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-300 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700"
                />
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Ample estàndard: 0.40 m</p>
              </div>
            </div>
          )}

          {assetType === AssetType.CROSSING && assetSubType === 'Pas de vianants' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Ample pas vianants (m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={crossingWidth}
                  onChange={(e) => setCrossingWidth(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-300 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700"
                />
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Llargada estàndard: 4 m</p>
              </div>
            </div>
          )}

          <div className="bg-slate-50 p-5 rounded-[2.5rem] border border-slate-300 space-y-5">
             <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1 tracking-widest"><MapPinIcon className="w-3.5 h-3.5" /> Localització</label>
                <button type="button" onClick={handleUpdateGPS} className="text-[8px] font-black text-blue-600 uppercase flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors border border-blue-200"><GlobeEuropeAfricaIcon className="w-3.5 h-3.5" /> GPS</button>
             </div>
             
             <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-0.5 relative">
                   <label className="text-[8px] font-black text-slate-500 uppercase pl-1 tracking-widest">Carrer</label>
                   <div className="relative">
                    <input 
                      type="text" 
                      placeholder={isSearchingStreet ? "Cercant..." : "Cerca carrer..."}
                      value={location?.street || ''} 
                      onChange={(e) => handleStreetChange(e.target.value)} 
                      onBlur={() => scheduleManualGeocode(location?.street || '', location?.number || '')}
                      onBlur={() => setTimeout(() => setShowStreetSuggestions(false), 200)}
                      onFocus={() => streetSuggestions.length > 0 && setShowStreetSuggestions(true)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-3.5 text-[12px] font-black outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 placeholder-slate-400" 
                    />
                    {isSearchingStreet && <div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
                   </div>
                   
                   {showStreetSuggestions && streetSuggestions.length > 0 && (
                     <div className="absolute top-full left-0 right-0 z-[1000] mt-1 bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                       {streetSuggestions.map((s, i) => (
                         <button
                           key={i}
                           type="button"
                           onClick={() => selectStreet(s)}
                           className="w-full text-left p-4 hover:bg-blue-50 flex items-center gap-3 border-b border-slate-100 last:border-0 transition-colors"
                         >
                           <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
                           <div className="flex flex-col">
                             <span className="text-[11px] font-black uppercase text-slate-700 truncate">{s.address.road || s.address.pedestrian || s.display_name.split(',')[0]}</span>
                             <span className="text-[8px] font-bold text-slate-500 uppercase">{s.address.suburb || s.address.neighbourhood || 'Tortosa'}</span>
                           </div>
                         </button>
                       ))}
                       <div className="p-2 bg-slate-50 text-[7px] font-bold text-slate-400 text-center uppercase tracking-widest">
                         Font: OpenStreetMap
                       </div>
                     </div>
                   )}
                </div>
                <div className="space-y-0.5">
                   <label className="text-[8px] font-black text-slate-500 uppercase pl-1 tracking-widest">Número</label>
                   <input 
                    type="text" 
                    placeholder="S/N" 
                    value={location?.number || ''} 
                    onChange={(e) => {
                      const value = e.target.value;
                      setLocation(prev => prev ? ({ ...prev, number: value }) : { lat: 0, lng: 0, number: value });
                      scheduleManualGeocode(location?.street || '', value);
                    }} 
                    onBlur={() => scheduleManualGeocode(location?.street || '', location?.number || '')}
                    className="w-full bg-white border border-slate-300 rounded-xl p-3.5 text-[12px] font-black outline-none focus:ring-2 focus:ring-blue-500/20 text-center text-slate-700" 
                   />
                </div>
             </div>

             <div className="space-y-0.5">
                <label className="text-[8px] font-black text-slate-500 uppercase pl-1 tracking-widest">Barri / Pedania / Polígon</label>
               <select value={location?.neighborhood || ''} onChange={(e) => {
                const value = e.target.value;
                setLocation(prev => prev ? ({ ...prev, neighborhood: value }) : { lat: 0, lng: 0, neighborhood: value });
                setMappedNeighborhood(location?.street, value);
               }} className="w-full bg-white border border-slate-300 rounded-xl p-3.5 text-[12px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none text-slate-700">
                  <option value="">-- Selecciona Ubicació --</option>
                  <optgroup label="BARRIS">
                    {TORTOSA_BARRIS.map(n => <option key={n} value={n}>{n}</option>)}
                  </optgroup>
                  <optgroup label="PEDANIES">
                    {TORTOSA_PEDANIES.map(n => <option key={n} value={n}>{n}</option>)}
                  </optgroup>
                  <optgroup label="POLÍGONS INDUSTRIALS">
                    {TORTOSA_POLIGONS.map(n => <option key={n} value={n}>{n}</option>)}
                  </optgroup>
                </select>
             </div>

             <div className="relative group -mx-5 overflow-hidden border-y border-slate-300 shadow-xl bg-slate-200">
               <div ref={mapContainerRef} className="h-[28rem] md:h-[36rem] w-full z-0" style={{ minHeight: '448px', background: '#f1f5f9' }}></div>
               <div className="absolute top-3 left-5 z-[10] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 shadow-sm pointer-events-none">
                 <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Ajusta el punt sobre el carrer</p>
               </div>
               
               <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-[10]">
                 <button 
                  type="button" 
                  onClick={() => setMapStyle(mapStyle === 'standard' ? 'satellite' : 'standard')} 
                  className="p-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-300 hover:bg-white transition-all active:scale-90"
                 >
                   <Square2StackIcon className={`w-6 h-6 ${mapStyle === 'satellite' ? 'text-blue-600' : 'text-slate-700'}`} />
                 </button>

                 <button 
                  type="button" 
                  onClick={handleCenterOnUser}
                  className={`p-3 rounded-2xl shadow-xl border border-slate-300 transition-all active:scale-90 ${isLocatingUser ? 'bg-blue-600 text-white animate-pulse' : 'bg-white/95 backdrop-blur-md text-blue-600 hover:bg-white'}`}
                 >
                   <PaperAirplaneIcon className={`w-6 h-6 ${isLocatingUser ? 'animate-bounce' : '-rotate-45'}`} />
                 </button>
               </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Data Pintura</label>
              <input type="date" value={lastPainted} onChange={(e) => setLastPainted(e.target.value)} className="w-full bg-slate-100 border border-slate-300 rounded-2xl p-4 text-[12px] font-black outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700" />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Notes / Observacions</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Afegeix detalls tècnics o observacions..."
              className="w-full bg-slate-100 border border-slate-300 rounded-2xl p-4 text-[12px] font-medium outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 min-h-[80px]"
            />
          </div>

          <div className="flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 bg-red-600 text-white py-5 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-red-500/20 hover:bg-red-700 transition-all active:scale-[0.98]"
            >
              Cancel·lar
            </button>
            <button 
              type="submit" 
              disabled={!location || !location.street} 
              className="flex-1 bg-blue-600 text-white py-5 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/20 disabled:opacity-30 hover:bg-blue-700 transition-all active:scale-[0.98]"
            >
              {initialData ? 'GUARDAR CANVIS' : 'ENVIAR A L\'INVENTARI'}
            </button>
          </div>
      </form>
    </div>
  );
};

export default CrossingForm;
