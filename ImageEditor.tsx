
import React, { useRef, useEffect, useState } from 'react';
import { 
  PencilIcon, 
  ArrowUturnLeftIcon, 
  CheckIcon, 
  XMarkIcon,
  TrashIcon
} from '@heroicons/react/24/solid';

interface Props {
  imageUrl: string;
  onSave: (editedImageUrl: string) => void;
  onCancel: () => void;
}

const ImageEditor: React.FC<Props> = ({ imageUrl, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [brushColor, setBrushColor] = useState('#ef4444'); // Vermell per defecte

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      // Ajustem el canvas a la proporció de la imatge però limitat per la pantalla
      const maxWidth = window.innerWidth * 0.95;
      const maxHeight = window.innerHeight * 0.7;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      // Guardem l'estat inicial al historial
      setHistory([canvas.toDataURL()]);
    };
  }, [imageUrl]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: (e as MouseEvent).clientX - rect.left,
        y: (e as MouseEvent).clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault(); // Evita scroll mentre dibuixes
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        setHistory(prev => [...prev, canvas.toDataURL()]);
      }
    }
  };

  const undo = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop(); // Treiem l'últim
    const prevState = newHistory[newHistory.length - 1];
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && prevState) {
      const img = new Image();
      img.src = prevState;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setHistory(newHistory);
      };
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL('image/jpeg', 0.9));
    }
  };

  return (
    <div className="fixed inset-0 z-[6000] bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg flex items-center justify-between mb-6 text-white px-2">
        <button onClick={onCancel} className="p-3 bg-white/10 rounded-2xl">
          <XMarkIcon className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-black uppercase tracking-widest">Editor d'Imatge</h2>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Anotacions tècniques</p>
        </div>
        <button onClick={handleSave} className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20">
          <CheckIcon className="w-6 h-6" />
        </button>
      </div>

      <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="touch-none cursor-crosshair"
        />
      </div>

      <div className="mt-8 flex items-center gap-4 bg-white/10 backdrop-blur-xl p-4 rounded-[2rem] border border-white/5">
        <div className="flex gap-2 pr-4 border-r border-white/10">
          {['#ef4444', '#3b82f6', '#fbbf24', '#ffffff'].map(color => (
            <button
              key={color}
              onClick={() => setBrushColor(color)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${brushColor === color ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <button 
          onClick={undo} 
          disabled={history.length <= 1}
          className={`p-3 rounded-2xl transition-colors ${history.length <= 1 ? 'text-white/20' : 'text-white bg-white/10 active:bg-white/20'}`}
        >
          <ArrowUturnLeftIcon className="w-6 h-6" />
        </button>
        <button 
          onClick={() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
              const img = new Image();
              img.src = history[0]; // Reset to initial
              img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                setHistory([history[0]]);
              };
            }
          }}
          className="p-3 rounded-2xl text-rose-400 bg-rose-500/10 active:bg-rose-500/20"
        >
          <TrashIcon className="w-6 h-6" />
        </button>
      </div>
      
      <p className="mt-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Arrossega per dibuixar defectes</p>
    </div>
  );
};

export default ImageEditor;
