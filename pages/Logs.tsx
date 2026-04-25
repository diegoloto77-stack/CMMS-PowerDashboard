import React, { useState, useRef } from 'react';
import { WorkOrder, Asset, OTType, OTStatus, OTPriority, ProductionLog, SystemConfig } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Plus, 
  Search, 
  Filter, 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar,
  User,
  ChevronRight,
  X,
  Save,
  Image as ImageIcon,
  History,
  ArrowRight
} from 'lucide-react';
import { cn, formatDuration } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface LogsProps {
  workOrders: WorkOrder[];
  setWorkOrders: React.Dispatch<React.SetStateAction<WorkOrder[]>>;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  setProductionLogs: React.Dispatch<React.SetStateAction<ProductionLog[]>>;
  config: SystemConfig;
}

const Logs: React.FC<LogsProps> = ({ workOrders, setWorkOrders, assets, setAssets, setProductionLogs, config }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedOT, setSelectedOT] = useState<WorkOrder | null>(null);
  const [tempOT, setTempOT] = useState<Partial<WorkOrder>>({});
  const reportRef = useRef<HTMLDivElement>(null);

  const filteredOTs = workOrders.filter(ot => 
    ot.tecnico.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ot.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: OTStatus) => {
    switch (status) {
      case 'Abierta': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'En Progreso': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Esperando Repuesto': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Cerrada': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getPriorityColor = (priority: OTPriority) => {
    switch (priority) {
      case 'Baja': return 'text-emerald-400';
      case 'Media': return 'text-amber-400';
      case 'Alta': return 'text-orange-400';
      case 'Crítica': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const handleSaveOT = (e: React.FormEvent) => {
    e.preventDefault();
    
    const nextId = workOrders.length > 0 ? Math.max(...workOrders.map(o => o.id_ot)) + 1 : 1;
    
    const otData = {
      ...selectedOT,
      ...tempOT,
      id_ot: selectedOT?.id_ot || nextId,
      codigo_ot: selectedOT?.codigo_ot || `OT-${(selectedOT?.id_ot || nextId).toString().padStart(4, '0')}`,
    } as WorkOrder;

    // Calculate Times if possible
    if (otData.inicio_falla && otData.fin_reparacion) {
      const start = new Date(otData.inicio_falla).getTime();
      const end = new Date(otData.fin_reparacion).getTime();
      otData.mdt_total = Math.max(0, Math.floor((end - start) / (1000 * 60)));
      
      let waitTime = 0;
      if (otData.solicitud_repuesto && otData.llegada_repuesto) {
        const sRep = new Date(otData.solicitud_repuesto).getTime();
        const lRep = new Date(otData.llegada_repuesto).getTime();
        waitTime = Math.max(0, Math.floor((lRep - sRep) / (1000 * 60)));
      }
      
      otData.mwt_espera = waitTime;
      otData.mttr_tecnico = Math.max(0, otData.mdt_total - waitTime);
    }

    if (selectedOT) {
      setWorkOrders(workOrders.map(ot => ot.id_ot === selectedOT.id_ot ? otData : ot));
    } else {
      setWorkOrders([...workOrders, otData]);
    }

    // If status is "Cerrada", migrate to History
    if (otData.estado === 'Cerrada') {
      const newHistoryEntry: ProductionLog = {
        id: Date.now(),
        fecha: otData.fin_reparacion?.split('T')[0] || new Date().toISOString().split('T')[0],
        id_activo: otData.id_activo,
        horas_operacion: otData.mdt_total / 60, // Repair hours
        ciclos: 0,
        tipo: otData.tipo,
        observaciones: `OT-${otData.id_ot.toString().padStart(4, '0')} (${otData.tipo}): ${otData.descripcion}. Técnico: ${otData.tecnico}. Notas: ${otData.notas_adicionales}`,
        ot_detalle: otData
      };

      setProductionLogs(prev => [...prev, newHistoryEntry]);

      // Update asset accumulated hours (repair hours)
      setAssets(prevAssets => prevAssets.map(asset => {
        if (asset.id === otData.id_activo) {
          return {
            ...asset,
            horas_acumuladas: (asset.horas_acumuladas || 0) + (otData.mdt_total / 60)
          };
        }
        return asset;
      }));
    }

    setIsModalOpen(false);
    setTempOT({});
  };

  const exportToPDF = async () => {
    if (!reportRef.current || !selectedOT) return;
    setIsExporting(true);
    
    // Give React time to adjust UI
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const element = reportRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a',
        logging: false,
        windowWidth: 1024,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('technical-report-content');
          if (clonedElement instanceof HTMLElement) {
            clonedElement.style.overflow = 'visible';
            clonedElement.style.height = 'auto';
            clonedElement.style.maxHeight = 'none';
            // Increase width slightly for PDF layout stability
            clonedElement.style.width = '1024px';
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let heightLeft = pdfHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      // Add subsequent pages if content is longer than A4
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      const fileName = `Reporte_OT_${selectedOT.id_ot.toString().padStart(4, '0')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Por favor intente nuevamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Órdenes de Trabajo</h2>
          <p className="text-sm text-slate-400">Registro de intervenciones y bitácora técnica</p>
        </div>
        <button 
          onClick={() => { 
            setSelectedOT(null); 
            setTempOT({
              tipo: 'Correctivo',
              prioridad: 'Media',
              estado: 'Abierta',
              tecnico: '',
              descripcion: '',
              inicio_falla: new Date().toISOString().slice(0, 16),
              notas_adicionales: '',
              mdt_total: 0,
              mttr_tecnico: 0,
              mwt_espera: 0
            });
            setIsModalOpen(true); 
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-300 flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva O.T.</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar por técnico, descripción o equipo..." 
            className="w-full bg-[#1e293b] border border-slate-700/50 rounded-2xl pl-12 pr-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center space-x-2 px-6 py-3 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-slate-400 hover:text-white transition-colors">
          <Filter className="w-5 h-5" />
          <span>Filtrar Estados</span>
        </button>
      </div>

      {/* OT List */}
      <div className="bg-[#1e293b] rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-4">ID / Tipo</th>
                <th className="px-6 py-4">Equipo</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4">Técnico</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">MDT Total</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredOTs.map((ot) => (
                <tr key={ot.id_ot} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">OT-{ot.id_ot.toString().padStart(4, '0')}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{ot.tipo}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-blue-400 border border-slate-700">
                        {assets.find(a => a.id === ot.id_activo)?.codigo_iso || 'N/A'}
                      </div>
                      <span className="text-xs font-medium text-slate-300">{assets.find(a => a.id === ot.id_activo)?.nombre_equipo || 'Equipo Desconocido'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-300 line-clamp-1 max-w-xs">{ot.descripcion}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className={cn("w-1.5 h-1.5 rounded-full", getPriorityColor(ot.prioridad).replace('text', 'bg'))} />
                      <span className={cn("text-[10px] font-bold uppercase", getPriorityColor(ot.prioridad))}>{ot.prioridad}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                        <User className="w-3 h-3 text-slate-400" />
                      </div>
                      <span className="text-xs text-slate-300">{ot.tecnico}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border", getStatusColor(ot.estado))}>
                      {ot.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span className="text-sm font-bold text-slate-200">{formatDuration(ot.mdt_total)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => { 
                        setSelectedOT(ot); 
                        if (ot.estado === 'Cerrada') {
                          setIsViewModalOpen(true);
                        } else {
                          setTempOT(ot);
                          setIsModalOpen(true); 
                        }
                      }}
                      className="p-2 hover:bg-blue-600/10 hover:text-blue-400 text-slate-500 rounded-lg transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* OT Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-3xl bg-[#1e293b] rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/30">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
                    <ClipboardList className="w-7 h-7 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedOT ? `OT-${selectedOT.id_ot.toString().padStart(4, '0')}` : 'Nueva Orden de Trabajo'}</h3>
                    <p className="text-xs text-slate-500">Registro detallado de intervención técnica</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8">
                <form onSubmit={handleSaveOT} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Equipo *</label>
                      <select 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" 
                        required
                        value={tempOT.id_activo || ''}
                        onChange={(e) => setTempOT({ ...tempOT, id_activo: parseInt(e.target.value) })}
                      >
                        <option value="">— Seleccionar equipo —</option>
                        {assets.map(asset => (
                          <option key={asset.id} value={asset.id}>{asset.codigo_iso} - {asset.nombre_equipo}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipo</label>
                      <select 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                        value={tempOT.tipo || 'Correctivo'}
                        onChange={(e) => setTempOT({ ...tempOT, tipo: e.target.value as OTType })}
                      >
                        <option value="Correctivo">Correctivo</option>
                        <option value="Preventivo">Preventivo</option>
                        <option value="Predictivo">Predictivo</option>
                        <option value="Mejora">Mejora</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prioridad</label>
                      <select 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                        value={tempOT.prioridad || 'Media'}
                        onChange={(e) => setTempOT({ ...tempOT, prioridad: e.target.value as OTPriority })}
                      >
                        <option value="Baja">Baja</option>
                        <option value="Media">Media</option>
                        <option value="Alta">Alta</option>
                        <option value="Crítica">Crítica</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado</label>
                      <select 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                        value={tempOT.estado || 'Abierta'}
                        onChange={(e) => setTempOT({ ...tempOT, estado: e.target.value as OTStatus })}
                      >
                        <option value="Abierta">Abierta</option>
                        <option value="En Progreso">En Progreso</option>
                        <option value="Esperando Repuesto">Esperando Repuesto</option>
                        <option value="Cerrada">Cerrada</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Técnico Asignado</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" 
                        placeholder="Nombre del técnico" 
                        value={tempOT.tecnico || ''}
                        onChange={(e) => setTempOT({ ...tempOT, tecnico: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descripción</label>
                      <textarea 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[100px]" 
                        placeholder="Descripción de la intervención" 
                        value={tempOT.descripcion || ''}
                        onChange={(e) => setTempOT({ ...tempOT, descripcion: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Registro de Tiempos */}
                  <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-700/50 space-y-6">
                    <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span>Registro de Tiempos</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inicio de Falla</label>
                        <input 
                          type="datetime-local" 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" 
                          value={tempOT.inicio_falla || ''}
                          onChange={(e) => setTempOT({ ...tempOT, inicio_falla: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fin de Reparación</label>
                        <input 
                          type="datetime-local" 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" 
                          value={tempOT.fin_reparacion || ''}
                          onChange={(e) => setTempOT({ ...tempOT, fin_reparacion: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Solicitud de Repuesto</label>
                        <input 
                          type="datetime-local" 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" 
                          value={tempOT.solicitud_repuesto || ''}
                          onChange={(e) => setTempOT({ ...tempOT, solicitud_repuesto: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Llegada de Repuesto</label>
                        <input 
                          type="datetime-local" 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" 
                          value={tempOT.llegada_repuesto || ''}
                          onChange={(e) => setTempOT({ ...tempOT, llegada_repuesto: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Motivo de Espera</label>
                        <select 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                          value={tempOT.motivo_espera || ''}
                          onChange={(e) => setTempOT({ ...tempOT, motivo_espera: e.target.value })}
                        >
                          <option value="">Sin motivo</option>
                          <option value="Falta Stock">Falta Stock</option>
                          <option value="Demora Proveedor">Demora Proveedor</option>
                          <option value="Aprobación Adm">Aprobación Adm</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notas Adicionales</label>
                    <textarea 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[80px]" 
                      value={tempOT.notas_adicionales || ''}
                      onChange={(e) => setTempOT({ ...tempOT, notas_adicionales: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-6 border-t border-slate-700/50">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center space-x-2">
                      <Save className="w-4 h-4" />
                      <span>Guardar O.T.</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Technical Report View Modal */}
      <AnimatePresence>
        {isViewModalOpen && selectedOT && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsViewModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-[#0f172a] rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Report Header */}
              <div className="px-8 py-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/50">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xl font-bold text-white uppercase tracking-tight">Reporte Técnico de Intervención</h3>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded-lg border border-emerald-500/20 uppercase tracking-widest">Finalizado</span>
                    </div>
                    <p className="text-xs text-slate-500">Documento de cierre definitivo: OT-{selectedOT.id_ot.toString().padStart(4, '0')}</p>
                  </div>
                </div>
                <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {/* Report Content */}
              <div 
                id="technical-report-content"
                className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-900/20" 
                ref={reportRef}
              >
                {/* PDF Special Header (Visible during export) */}
                {isExporting && (
                  <div className="mb-8 border-b-2 border-blue-500 pb-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-6">
                        {config.logo_path && (
                          <img src={config.logo_path} alt="Logo" className="h-16 w-auto" referrerPolicy="no-referrer" />
                        )}
                        <div>
                          <h1 className="text-2xl font-black text-white uppercase tracking-tight">{config.titulo_sistema}</h1>
                          <p className="text-xs text-blue-400 font-bold uppercase tracking-[0.2em]">Reporte de Intervención Técnica</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400 font-bold uppercase">Fecha de Emisión</p>
                        <p className="text-sm text-white font-mono">{new Date().toLocaleDateString('es-CL')}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  
                  {/* Summary Column */}
                  <div className="md:col-span-2 space-y-8">
                    <section>
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center space-x-2">
                        <ArrowRight className="w-3 h-3 text-blue-400" />
                        <span>Información Base del Equipo</span>
                      </h4>
                      <div className="grid grid-cols-2 gap-6 bg-slate-800/30 p-6 rounded-2xl border border-slate-700/30">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Equipo / Activo</p>
                          <p className="text-sm font-bold text-white">{assets.find(a => a.id === selectedOT.id_activo)?.nombre_equipo || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Código ISO</p>
                          <p className="text-sm font-bold text-blue-400">{assets.find(a => a.id === selectedOT.id_activo)?.codigo_iso || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Tipo de Intervención</p>
                          <p className="text-sm font-bold text-white">{selectedOT.tipo}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Prioridad</p>
                          <p className={cn("text-sm font-bold", getPriorityColor(selectedOT.prioridad))}>{selectedOT.prioridad}</p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center space-x-2">
                        <ArrowRight className="w-3 h-3 text-blue-400" />
                        <span>Resumen de Falla y Solución</span>
                      </h4>
                      <div className="space-y-6">
                        <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/30">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Descripción Técnica de la Intervención</p>
                          <p className="text-sm text-slate-300 leading-relaxed text-justify">{selectedOT.descripcion}</p>
                        </div>
                        <div className="bg-slate-900/50 p-6 rounded-2xl border border-emerald-500/10">
                          <p className="text-[10px] text-emerald-500/70 uppercase font-bold mb-2 uppercase tracking-widest">Notas Adicionales / Resolución</p>
                          <p className="text-sm text-slate-300 italic">"{selectedOT.notas_adicionales || 'Sin notas adicionales registradas.'}"</p>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Timing & Stats Column */}
                  <div className="space-y-6">
                    <section className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50">
                      <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-6 border-b border-blue-500/10 pb-4">
                        Tiempos de Ejecución
                      </h4>
                      <div className="space-y-6">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">MDT Total (Indisp.)</span>
                          <span className="text-2xl font-black text-white">{formatDuration(selectedOT.mdt_total)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-emerald-500 uppercase font-bold">MTTR (Reparación)</span>
                          <span className="text-xl font-bold text-emerald-400">{formatDuration(selectedOT.mttr_tecnico)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-amber-500 uppercase font-bold">MWT (Espera Log.)</span>
                          <span className="text-xl font-bold text-amber-400">{formatDuration(selectedOT.mwt_espera)}</span>
                        </div>
                      </div>
                    </section>

                    <section className="bg-slate-900/50 p-6 rounded-3xl border border-slate-700/50">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">
                        Cronología Técnica
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <div className="flex-1">
                            <p className="text-[8px] text-slate-500 uppercase font-bold">Inicio Falla</p>
                            <p className="text-xs text-slate-300">{selectedOT.inicio_falla ? new Date(selectedOT.inicio_falla).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <div className="flex-1">
                            <p className="text-[8px] text-slate-500 uppercase font-bold">Fin Reparación</p>
                            <p className="text-xs text-slate-300">{selectedOT.fin_reparacion ? new Date(selectedOT.fin_reparacion).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 pt-4 border-t border-slate-800">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[8px] text-slate-500 uppercase font-bold">Responsable</p>
                            <p className="text-sm font-bold text-white">{selectedOT.tecnico}</p>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>

                </div>
              </div>

              {/* Report Footer */}
              <div className="px-8 py-6 border-t border-slate-700/50 bg-slate-900/50 flex justify-between items-center">
                <p className="text-[10px] text-slate-500 italic">Este reporte es un documento dinámico generado a partir de la Bitácora de Intervenciones.</p>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => setIsViewModalOpen(false)}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all"
                  >
                    Cerrar Detalle
                  </button>
                  <button 
                    onClick={exportToPDF}
                    disabled={isExporting}
                    className={cn(
                      "px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center space-x-2 transition-all",
                      isExporting && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isExporting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                    <span>{isExporting ? 'Generando...' : 'Bajar PDF A4'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Logs;
