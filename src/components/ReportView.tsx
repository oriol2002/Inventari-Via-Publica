
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { PedestrianCrossing, CrossingState, AssetType } from '../types';
import { 
  ArrowLeftIcon, 
  PrinterIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { jsPDF } from 'jspdf';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseStorage } from '../services/firebaseService';
import { dbService } from '../services/dbService';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface Props {
  crossings: PedestrianCrossing[];
  reportType: 'maintenance' | 'technical' | 'statistical';
  reportTitle?: string;
  reportId?: string;
  reportCreatedBy?: string;
  accentColor?: string;
  onBack: () => void;
  city: string;
  aiAnalysis?: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444', '#64748b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', '#a855f7'];

const ReportView: React.FC<Props> = ({ crossings, reportType, reportTitle, reportId: externalId, reportCreatedBy, accentColor: accentColorProp, onBack, city, aiAnalysis }) => {
  const [internalId, setInternalId] = useState<string>('');
  const reportRef = useRef<HTMLDivElement>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isPdfBuilding, setIsPdfBuilding] = useState(false);
  const accentColor = accentColorProp || '#2563eb';
  const accentBg = accentColor === '#dc2626' ? 'rgba(220,38,38,0.1)' : 'rgba(37,99,235,0.1)';

  const generatePDF = () => {
    if (!reportRef.current) {
      alert('Error: No s\'ha pogut trobar l\'informe per descarregar.');
      return;
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Si us plau, permet les finestres emergents per descarregar el PDF');
      return;
    }

    // Clone the report content
    const clonedContent = reportRef.current.cloneNode(true) as HTMLElement;

    // Get all stylesheets
    const stylesheets = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          if (sheet.cssRules) {
            let css = '';
            for (let i = 0; i < sheet.cssRules.length; i++) {
              css += sheet.cssRules[i].cssText;
            }
            return css;
          }
        } catch (e) {
          // Ignore CORS errors
        }
        return '';
      })
      .join('\n');

    // Write HTML to print window
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color-adjust: exact;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: white;
            }
            ${stylesheets}
          </style>
        </head>
        <body>
          ${clonedContent.innerHTML}
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  };

  useEffect(() => {
    if (externalId) {
      setInternalId(externalId);
    } else {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      // Format: MOB{year}{month}{day}{hours}{minutes}{seconds}
      const newId = `MOB${year}${month}${day}${hours}${minutes}${seconds}`;
      setInternalId(newId);
    }
  }, [externalId]);

  const itemsToDisplay = useMemo(() => {
    return reportType === 'technical' ? crossings.filter(c => c.state === CrossingState.POOR || c.state === CrossingState.DANGEROUS) : crossings;
  }, [crossings, reportType]);

  const shareItems = useMemo(() => (reportType === 'statistical' ? crossings : itemsToDisplay), [reportType, crossings, itemsToDisplay]);
  const shareMaxItems = 20;

  const sharePayload = useMemo(() => {
    const subject = reportTitle || `Informe ${city}`;
    const visibleItems = shareItems.slice(0, shareMaxItems);
    const itemsText = visibleItems.map((c, index) => {
      const address = [c.location.street, c.location.number].filter(Boolean).join(' ').trim() || 'Sense adreça';
      const subtype = (c as any).assetSubType ? ` · ${(c as any).assetSubType}` : '';
      const mapsLink = (c.location.lat && c.location.lng)
        ? `https://www.google.com/maps?q=${c.location.lat},${c.location.lng}`
        : '';
      return `${index + 1}. ${address} · ${c.assetType}${subtype}${mapsLink ? `\n   ${mapsLink}` : ''}`;
    }).join('\n');

    const extraCount = shareItems.length > shareMaxItems ? `\n\n(+${shareItems.length - shareMaxItems} més)` : '';
    const body = `${subject}\n${shareItems.length} elements\n\n${itemsText}${extraCount}`.trim();

    return {
      subject,
      body,
      mailto: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(body)}`
    };
  }, [shareItems, reportTitle, city]);

  const pdfSharePayload = useMemo(() => {
    if (!pdfUrl) return null;
    const subject = reportTitle || `Informe ${city}`;
    const body = `${subject}\nPDF: ${pdfUrl}`;
    return {
      mailto: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(body)}`
    };
  }, [pdfUrl, reportTitle, city]);

  const generateCompactPdfAndUpload = async () => {
    if (isPdfBuilding) return;
    setIsPdfBuilding(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      let y = margin;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(reportTitle || `Informe ${city}`, margin, y);
      y += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Data: ${displayDate} ${displayTime}`, margin, y);
      y += 14;
      if (internalId) {
        doc.text(`Codi: ${internalId.replace('REP-', '')}`, margin, y);
        y += 14;
      }
      doc.text(`Elements: ${shareItems.length}`, margin, y);
      y += 18;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Llistat d’elements', margin, y);
      y += 16;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      const maxItems = Math.min(shareItems.length, 60);
      for (let i = 0; i < maxItems; i += 1) {
        const item = shareItems[i];
        const address = [item.location.street, item.location.number].filter(Boolean).join(' ').trim() || 'Sense adreça';
        const subtype = (item as any).assetSubType ? ` · ${(item as any).assetSubType}` : '';
        const line = `${i + 1}. ${address} · ${item.assetType}${subtype} · ${item.state}`;
        if (y > pageHeight - margin - 36) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 12;

        const mapsLink = (item.location.lat && item.location.lng)
          ? `https://www.google.com/maps?q=${item.location.lat},${item.location.lng}`
          : '';
        if (mapsLink) {
          if (y > pageHeight - margin - 20) {
            doc.addPage();
            y = margin;
          }
          doc.setTextColor(0, 102, 204);
          doc.textWithLink(mapsLink, margin + 14, y, { url: mapsLink });
          doc.setTextColor(0, 0, 0);
          y += 12;
        }
        y += 2;
      }

      if (shareItems.length > maxItems) {
        if (y > pageHeight - margin - 20) {
          doc.addPage();
          y = margin;
        }
        doc.setFontSize(9);
        doc.text(`(+${shareItems.length - maxItems} elements més)`, margin, y);
      }

      const blob = doc.output('blob');
      const reportId = externalId || internalId || `REP-${Date.now()}`;
      const storageRef = ref(firebaseStorage, `reports/${reportId}/latest.pdf`);
      await uploadBytes(storageRef, blob, { contentType: 'application/pdf', cacheControl: 'public,max-age=31536000' });
      const url = await getDownloadURL(storageRef);
      setPdfUrl(url);
      await dbService.updateReportPdfUrl(reportId, url);
    } catch (error) {
      console.error('Error generant PDF lleuger:', error);
      alert('No s\'ha pogut generar el PDF lleuger.');
    } finally {
      setIsPdfBuilding(false);
    }
  };

  const itemChunks = useMemo(() => {
    const chunks: PedestrianCrossing[][] = [];
    // Utilitzem 3 items per pàgina per defecte
    for (let i = 0; i < itemsToDisplay.length; i += 3) {
      chunks.push(itemsToDisplay.slice(i, i + 3));
    }
    return chunks;
  }, [itemsToDisplay]);

  // Càlculs estadístics per l'informe 'statistical'
  const stats = useMemo(() => {
    if (reportType !== 'statistical') return null;
    
    const total = crossings.length;
    const critical = crossings.filter(c => c.state === CrossingState.POOR || c.state === CrossingState.DANGEROUS).length;
    const excellent = crossings.filter(c => c.state === CrossingState.EXCELLENT || c.state === CrossingState.GOOD).length;
    const healthIndex = total > 0 ? Math.round((excellent / total) * 100) : 0;

    // State Distribution
    const stateCounts = crossings.reduce((acc, c) => {
      acc[c.state] = (acc[c.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const stateData = Object.values(CrossingState).map(s => ({ name: s, value: stateCounts[s] || 0 })).filter(d => d.value > 0);

    // Asset Types
    const assetCounts = crossings.reduce((acc, c) => {
      acc[c.assetType] = (acc[c.assetType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const assetData = Object.values(AssetType).map(t => ({ name: t, value: assetCounts[t] || 0 } as { name: string, value: number })).filter(d => d.value > 0).sort((a,b) => b.value - a.value).slice(0, 10);

    // Streets with issues
    const streetCounts = crossings
      .filter(c => c.state === CrossingState.POOR || c.state === CrossingState.DANGEROUS)
      .reduce((acc, c) => {
        const street = c.location.street ? c.location.street.trim().toUpperCase() : 'SENSE ADREÇA';
        acc[street] = (acc[street] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    const streetData = Object.entries(streetCounts).map(([name, value]) => ({ name, value } as { name: string, value: number })).sort((a,b) => b.value - a.value).slice(0, 8);

    // Neighborhoods
    const neighCounts = crossings.reduce((acc, c) => {
      const n = c.location.neighborhood || 'Altres';
      acc[n] = (acc[n] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const neighborhoodData = Object.entries(neighCounts).map(([name, value]) => ({ name, value } as { name: string, value: number })).sort((a,b) => b.value - a.value).slice(0, 8);

    return { total, critical, healthIndex, stateData, assetData, streetData, neighborhoodData };
  }, [crossings, reportType]);

  const displayDate = new Date().toLocaleDateString('ca-ES');
  const displayTime = new Date().toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });

  // RENDERITZAT ESTADÍSTIC (Dashboard per a impressió)
  if (reportType === 'statistical' && stats) {
    return (
      <div className="report-overlay fixed inset-0 z-[5000] bg-slate-100 md:bg-slate-900/40 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in duration-300 print:block print:bg-white print:static print:overflow-visible">
        <header className="px-4 md:px-6 py-4 bg-white border-b border-slate-300 flex items-center justify-between shadow-sm sticky top-0 z-50 print:hidden flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h2 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tight line-clamp-1">Estadístic {city}</h2>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{stats.total} Actius</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={generateCompactPdfAndUpload}
              disabled={isPdfBuilding}
              className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl shadow-sm border transition-all ${isPdfBuilding ? 'bg-slate-200 text-slate-400 border-slate-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
              title="Generar PDF lleuger"
            >
              <SparklesIcon className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">PDF lleuger</span>
            </button>
            {pdfSharePayload && (
              <>
                <button
                  onClick={() => window.open(pdfSharePayload.mailto, '_blank')}
                  className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-white text-slate-700 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all"
                  title="Compartir PDF per correu"
                >
                  <EnvelopeIcon className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">PDF Email</span>
                </button>
                <button
                  onClick={() => window.open(pdfSharePayload.whatsapp, '_blank')}
                  className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition-all"
                  title="Compartir PDF per WhatsApp"
                >
                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">PDF WhatsApp</span>
                </button>
              </>
            )}
            <button
              onClick={() => window.open(sharePayload.mailto, '_blank')}
              className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-white text-slate-700 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all"
              title="Compartir per correu"
            >
              <EnvelopeIcon className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Email</span>
            </button>
            <button
              onClick={() => window.open(sharePayload.whatsapp, '_blank')}
              className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition-all"
              title="Compartir per WhatsApp"
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">WhatsApp</span>
            </button>
            <button onClick={generatePDF} className="flex items-center gap-2 px-4 md:px-6 py-2.5 text-white rounded-xl shadow-lg transition-all active:scale-95" style={{ backgroundColor: accentColor }}>
              <PrinterIcon className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Descarregar PDF</span>
              <span className="text-[10px] font-black uppercase tracking-widest md:hidden">PDF</span>
            </button>
          </div>
        </header>

        <div ref={reportRef} id="report-container-div" className="flex-1 overflow-y-auto p-0 md:p-12 bg-slate-100 md:bg-slate-300/50 print:bg-white print:p-0 print:overflow-visible print:block">
          <div className="flex flex-col items-center gap-4 md:gap-12 print:gap-0 print:block">
            {/* Pàgina 1 Estadístiques */}
            <div className="a4-page bg-white shadow-none md:shadow-2xl flex flex-col w-full md:w-[210mm] h-auto md:min-h-[297mm] p-6 md:p-[20mm] box-border print:shadow-none print:block print:w-[210mm] print:h-[297mm] print:p-[15mm] print:m-0">
               <div className="border-b-[4px] pb-6 mb-8 flex justify-between items-end" style={{ borderColor: accentColor }}>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter">Informe Executiu</h1>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">Àrea Espai Public • {city}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Expedient</div>
                    <div className="text-lg md:text-xl font-black text-slate-900">#{internalId.replace('REP-', '')}</div>
                  </div>
               </div>

               {/* KPIS */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
                  <div className="bg-slate-50 p-6 rounded-2xl text-center border border-slate-200 print:bg-slate-50">
                     <div className="text-4xl font-black text-slate-900">{stats.total}</div>
                     <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Total Actius</div>
                  </div>
                  <div className="bg-rose-50 p-6 rounded-2xl text-center border border-rose-100 print:bg-rose-50">
                     <div className="text-4xl font-black text-rose-600">{stats.critical}</div>
                     <div className="text-[8px] font-black text-rose-800/60 uppercase tracking-widest mt-1">Intervenció Urgent</div>
                  </div>
                  <div className="bg-emerald-50 p-6 rounded-2xl text-center border border-emerald-100 print:bg-emerald-50">
                     <div className="text-4xl font-black text-emerald-600">{stats.healthIndex}%</div>
                     <div className="text-[8px] font-black text-emerald-800/60 uppercase tracking-widest mt-1">Índex de Salut</div>
                  </div>
               </div>

               {/* GRÀFIQUES */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
                  <div className="border border-slate-200 rounded-2xl p-4">
                     <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-widest mb-4 text-center">Estat de Conservació</h3>
                     <div style={{ width: '100%', height: '200px' }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={stats.stateData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                              {stats.stateData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '8px', fontWeight: 700 }} />
                          </PieChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
                  <div className="border border-slate-200 rounded-2xl p-4">
                     <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-widest mb-4 text-center">Top 10 Tipologies</h3>
                     <div style={{ width: '100%', height: '200px' }}>
                        <ResponsiveContainer>
                          <BarChart data={stats.assetData} layout="vertical" margin={{ left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '7px', fontWeight: 700 }} />
                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>

               <div className="border border-slate-200 rounded-2xl p-6 flex-1 mb-8 min-h-[250px] md:min-h-0">
                  <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-widest mb-6 text-center">Distribució per Barris</h3>
                  <div style={{ width: '100%', height: '100%', minHeight: '200px' }}>
                      <ResponsiveContainer>
                        <BarChart data={stats.neighborhoodData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '8px', fontWeight: 700 }} interval={0} />
                          <YAxis axisLine={false} tickLine={false} style={{ fontSize: '8px' }} />
                          <Bar dataKey="value" fill={accentColor} radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
               </div>

               <div className="mt-auto pt-4 border-t border-slate-200 flex justify-between text-[8px] font-black text-slate-500 uppercase">
                  <span>Generat automàticament</span>
                  <span>{displayDate}</span>
               </div>
            </div>

            {/* Pàgina 2 Detall Carrers */}
            <div className="a4-page bg-white shadow-none md:shadow-2xl flex flex-col w-full md:w-[210mm] h-auto md:min-h-[297mm] p-6 md:p-[20mm] box-border print:shadow-none print:block print:w-[210mm] print:h-[297mm] print:p-[15mm] print:m-0">
               <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-6 pb-2 border-b border-rose-100">Zones amb necessitat d'intervenció (Top Carrers)</h3>
               
               <div className="mb-10">
                  <div style={{ width: '100%', height: '300px' }}>
                      <ResponsiveContainer>
                        <BarChart data={stats.streetData} layout="vertical" margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={130} style={{ fontSize: '9px', fontWeight: 700 }} />
                          <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fontSize: 9, fill: '#64748b' }} />
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
               </div>

               <div className="flex-1 bg-slate-50 rounded-2xl p-8 border border-slate-200 relative overflow-hidden min-h-[300px] md:min-h-0">
                  <div className="flex justify-between items-start mb-4">
                     <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                       {aiAnalysis && <SparklesIcon className="w-4 h-4" style={{ color: accentColor }} />}
                       Resum i Conclusions
                     </h4>
                     {aiAnalysis && <span className="text-[7px] font-bold uppercase px-2 py-1 rounded" style={{ color: accentColor, backgroundColor: accentBg }}>Generat per IA</span>}
                  </div>
                  
                  {aiAnalysis ? (
                    <div className="text-[10px] text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                      {aiAnalysis}
                    </div>
                  ) : (
                    <ul className="list-disc list-inside space-y-3 text-[10px] text-slate-700 font-medium">
                       <li>S'han analitzat un total de <strong>{stats.total}</strong> elements a la via pública de {city}.</li>
                       <li>Es detecta una concentració d'incidències crítiques principalment al carrer <strong>{stats.streetData[0]?.name || 'N/A'}</strong>.</li>
                       <li>L'índex de salut global de la infraestructura és del <strong>{stats.healthIndex}%</strong>.</li>
                       <li>Es recomana prioritzar les actuacions als elements marcats com a 'Perillós' (Vermell) en l'informe tècnic adjunt.</li>
                    </ul>
                  )}

                  <div className="mt-10 pt-10 border-t border-slate-300">
                     <p className="text-[8px] font-bold text-slate-500 uppercase mb-8">Signatura Tècnic Responsable</p>
                     <div className="h-16 border-b border-slate-400 w-64"></div>
                  </div>
               </div>

               <div className="mt-auto pt-4 border-t border-slate-200 flex justify-between text-[8px] font-black text-slate-500 uppercase">
                  <span>Àrea Espai Public • {city}</span>
                  <span>Pàgina 2 de 2</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RENDERITZAT NORMAL (Manteniment / Tècnic) - LLISTA
  return (
    <div className="report-overlay fixed inset-0 z-[5000] bg-slate-100 md:bg-slate-900/40 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in duration-300 print:block print:bg-white print:static print:overflow-visible">
      <header className="px-4 md:px-6 py-4 bg-white border-b border-slate-300 flex items-center justify-between shadow-sm sticky top-0 z-50 print:hidden flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tight line-clamp-1">Informe de {city}</h2>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{itemsToDisplay.length} Actius reportats</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateCompactPdfAndUpload}
            disabled={isPdfBuilding}
            className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl shadow-sm border transition-all ${isPdfBuilding ? 'bg-slate-200 text-slate-400 border-slate-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
            title="Generar PDF lleuger"
          >
            <SparklesIcon className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">PDF lleuger</span>
          </button>
          {pdfSharePayload && (
            <>
              <button
                onClick={() => window.open(pdfSharePayload.mailto, '_blank')}
                className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-white text-slate-700 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all"
                title="Compartir PDF per correu"
              >
                <EnvelopeIcon className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">PDF Email</span>
              </button>
              <button
                onClick={() => window.open(pdfSharePayload.whatsapp, '_blank')}
                className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition-all"
                title="Compartir PDF per WhatsApp"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">PDF WhatsApp</span>
              </button>
            </>
          )}
          <button
            onClick={() => window.open(sharePayload.mailto, '_blank')}
            className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-white text-slate-700 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all"
            title="Compartir per correu"
          >
            <EnvelopeIcon className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Email</span>
          </button>
          <button
            onClick={() => window.open(sharePayload.whatsapp, '_blank')}
            className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition-all"
            title="Compartir per WhatsApp"
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">WhatsApp</span>
          </button>
            <button
              onClick={generatePDF}
              className="flex items-center gap-2 px-4 md:px-6 py-2.5 text-white rounded-xl shadow-lg transition-all active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
            <PrinterIcon className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Descarregar PDF</span>
            <span className="text-[10px] font-black uppercase tracking-widest md:hidden">PDF</span>
          </button>
        </div>
      </header>

      <div ref={reportRef} id="report-container-div" className="flex-1 overflow-y-auto p-0 md:p-12 bg-slate-100 md:bg-slate-300/50 print:bg-white print:p-0 print:overflow-visible print:block">
        <div className="flex flex-col items-center gap-4 md:gap-12 print:gap-0 print:block">
          
          {/* PÀGINES DE CONTINGUT */}
          {itemChunks.map((chunk, pageIndex) => (
            <div key={pageIndex} className="a4-page bg-white shadow-none md:shadow-2xl flex flex-col w-full md:w-[210mm] h-auto md:min-h-[297mm] p-6 md:p-[20mm] box-border print:shadow-none print:block print:w-[210mm] print:h-[297mm] print:p-[15mm] print:m-0">
              <div className="h-full flex flex-col">
                <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                  <h3 className="text-[10px] font-black uppercase tracking-widest" style={{ color: accentColor }}>Detall Elements {city} (Part {pageIndex + 1})</h3>
                  <div className="text-[9px] font-black text-slate-400">Exp. #{internalId.replace('REP-', '')}</div>
                </header>

                <div className="flex-1 flex flex-col justify-between print:block">
                  {chunk.map((item) => (
                    <div key={item.id} className="report-item-card flex flex-col md:flex-row h-auto md:h-[75mm] gap-4 md:gap-6 py-4 border-b border-slate-200 last:border-0 print:h-auto print:mb-8 print:flex-row print:flex print:gap-6 print:break-inside-avoid">
                      <div className="w-full h-48 md:w-[85mm] md:h-full rounded-2xl overflow-hidden border border-slate-300 flex-shrink-0 shadow-sm print:h-[60mm] print:w-[85mm]">
                        <img src={item.imageThumb || item.image} className="w-full h-full object-cover print:object-contain bg-slate-100" alt="" />
                      </div>

                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                             <h4 className="text-sm font-black text-slate-900 uppercase truncate max-w-[220px]">
                               {item.location.street} {item.location.number || 'S/N'}
                             </h4>
                             <span className="text-[8px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">ID: {item.id.slice(-8).toUpperCase()}</span>
                          </div>
                          
                          <div className="text-[8px] font-black uppercase mb-3 tracking-widest" style={{ color: accentColor }}>
                            {item.assetType} • {item.location.neighborhood || city} • {city}
                          </div>

                          <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4">
                            <div className="col-span-2">
                              <label className="text-[7px] font-black text-slate-400 uppercase block mb-0.5">Adreça Completa</label>
                              <span className="text-[10px] font-black text-slate-800 uppercase">{item.location.street} {item.location.number || ''}</span>
                            </div>
                            <div>
                              <label className="text-[7px] font-black text-slate-400 uppercase block mb-0.5">Estat actual</label>
                              <span className="text-[10px] font-black uppercase" style={{ color: item.state === CrossingState.POOR || item.state === CrossingState.DANGEROUS ? '#e11d48' : accentColor }}>{item.state}</span>
                            </div>
                            <div>
                              <label className="text-[7px] font-black text-slate-400 uppercase block mb-0.5">Darrera actuació</label>
                              <span className="text-[10px] font-black text-slate-800">{item.lastPaintedDate}</span>
                            </div>
                            <div>
                              <label className="text-[7px] font-black text-slate-400 uppercase block mb-0.5">Tipus de Pintura</label>
                              <span className="text-[10px] font-black text-slate-800 uppercase">{item.paintType || 'ESTÀNDARD'}</span>
                            </div>
                            <div>
                              <label className="text-[7px] font-black text-slate-400 uppercase block mb-0.5">Coordenades</label>
                              <span className="text-[9px] font-bold text-slate-600">{item.location.lat.toFixed(5)}, {item.location.lng.toFixed(5)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 md:mt-2">
                           <label className="text-[7px] font-black text-slate-400 uppercase block mb-1">Observacions tècniques</label>
                           <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-[9px] font-medium text-slate-700 leading-tight min-h-[50px] md:h-[18mm] overflow-hidden italic print:h-auto">
                             {item.notes || 'Sense observacions reportades en aquest actiu.'}
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {chunk.length < 3 && Array.from({ length: 3 - chunk.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-[75mm] border-b border-transparent print:hidden hidden md:block"></div>
                  ))}
                </div>

                <div className="mt-auto pt-6 border-t border-slate-200 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Auditoria Vial • {city}</span>
                  <span>Pàgina {pageIndex + 2} de {itemChunks.length + 1}</span>
                </div>
              </div>
            </div>
          ))}

          <div className="a4-page bg-white shadow-none md:shadow-2xl flex flex-col w-full md:w-[210mm] h-auto md:min-h-[160mm] p-6 md:p-[20mm] box-border print:shadow-none print:block print:w-[210mm] print:h-[160mm] print:p-[15mm] print:m-0">
            <div className="mt-auto text-[10px] md:text-[11px] font-bold text-slate-500 uppercase space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span>Data i Hora de generació</span>
                <span className="text-slate-900">{displayDate} - {displayTime}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span>Municipi</span>
                <span className="text-slate-900 uppercase">{city}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportView;
