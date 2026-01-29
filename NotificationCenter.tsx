
import React from 'react';
import { PedestrianCrossing, CrossingState, AssetType } from '../types';
import { 
  XMarkIcon, 
  ExclamationCircleIcon, 
  CalendarIcon,
  MapPinIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  alerts: PedestrianCrossing[];
}

const NotificationCenter: React.FC<Props> = ({ isOpen, onClose, alerts }) => {
  if (!isOpen) return null;

  const calculateMonths = (dateStr: string) => {
    const start = new Date(dateStr);
    const end = new Date();
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9000]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-screen w-full max-w-md bg-white shadow-2xl z-[9001] flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-500/20">
              <ExclamationCircleIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Alertes</h2>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{alerts.length} Elements a revisar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><XMarkIcon className="w-6 h-6 text-slate-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {alerts.length > 0 ? (
            alerts.map(alert => {
              const months = calculateMonths(alert.lastPaintedDate);
              const isExcellentCheck = alert.assetType === AssetType.CROSSING && alert.state === CrossingState.EXCELLENT && months >= 6;
              const isCritical = alert.state === CrossingState.POOR || alert.state === CrossingState.DANGEROUS;

              return (
                <div key={alert.id} className="bg-white border border-slate-200 rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-all group border-l-4 border-l-transparent hover:border-l-blue-500">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-200">
                      <img src={alert.image} alt="Vista" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                          isCritical ? 'bg-rose-50 text-rose-600 border-rose-100' : (isExcellentCheck ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100')
                        }`}>
                          {isCritical ? 'CRÍTIC' : (isExcellentCheck ? 'PREVENTIU' : 'MANTENIMENT')}
                        </span>
                        <span className="text-[9px] font-black text-slate-400">#{alert.id.slice(-4)}</span>
                      </div>
                      <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-tight mb-1 truncate">
                        {alert.location.street || "Sense adreça"}
                      </h3>
                      <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">
                        <MapPinIcon className="w-3 h-3" />
                        {alert.location.neighborhood || "Tortosa"}
                      </div>
                      <div className={`flex items-center gap-2 p-2 rounded-xl ${isExcellentCheck ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'}`}>
                        {isExcellentCheck ? <InformationCircleIcon className="w-4 h-4" /> : <CalendarIcon className="w-4 h-4" />}
                        <span className="text-[9px] font-black uppercase tracking-tight">
                          {isExcellentCheck ? `Control obligatori 6 mesos` : `Darrera actuació: Fa ${months} mesos`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                <CheckCircleIcon className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Tot en ordre</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">No hi ha avisos pendents</p>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-slate-200 bg-slate-50">
          <button onClick={onClose} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl">Tancar Panell</button>
        </div>
      </div>
    </>
  );
};

export default NotificationCenter;
