import React, { useState, useRef } from 'react';
import { SystemConfig, Shift, CalendarException, Asset, WorkOrder, ProductionLog } from '../types';
import { 
  Settings as SettingsIcon, 
  Save, 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  Layout, 
  Target, 
  AlertCircle,
  X,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  Download,
  Database,
  FileSpreadsheet,
  Calculator,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';


interface SettingsProps {
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  shifts: Shift[];
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
  exceptions: CalendarException[];
  setExceptions: React.Dispatch<React.SetStateAction<CalendarException[]>>;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  workOrders: WorkOrder[];
  setWorkOrders: React.Dispatch<React.SetStateAction<WorkOrder[]>>;
  productionLogs: ProductionLog[];
  setProductionLogs: React.Dispatch<React.SetStateAction<ProductionLog[]>>;
}

const Settings: React.FC<SettingsProps> = ({ 
  config, setConfig, 
  shifts, setShifts, 
  exceptions, setExceptions,
  assets, setAssets,
  workOrders, setWorkOrders,
  productionLogs, setProductionLogs
}) => {
  const [activeSection, setActiveSection] = useState('branding');
  const [showKpiSummary, setShowKpiSummary] = useState(false);

  const [shiftMonth, setShiftMonth] = useState(config.mes_curso);
  const [shiftYear, setShiftYear] = useState(config.anio_curso);

  const currentShifts = (shifts || []).filter(s => s.mes === shiftMonth && s.anio === shiftYear);

  const exportShiftsToCSV = () => {
    const headers = ['Año', 'Mes', 'Turno', 'Nombre', 'Lunes-Jueves Ingreso', 'Lunes-Jueves Salida', 'Viernes Ingreso', 'Viernes Salida'];
    const rows = (shifts || []).map(s => [
      s.anio,
      s.mes + 1,
      s.id_turno,
      s.nombre || `Turno ${s.id_turno}`,
      s.lu_ju_in,
      s.lu_ju_out,
      s.vi_in,
      s.vi_out
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'jornadas_laborales.csv';
    link.click();
  };

  const exportFullDatabaseToCSV = () => {
    // 1. Assets
    const assetHeaders = ['ID', 'Codigo_ISO', 'Nombre_Equipo', 'Modelo', 'Fabricante', 'Sector', 'Clase', 'Estado', 'Horas_Acumuladas'];
    const assetRows = (assets || []).map(a => [
      a.id,
      a.codigo_iso,
      a.nombre_equipo,
      a.modelo,
      a.fabricante,
      a.sector_area,
      a.clase,
      a.estado,
      a.horas_acumuladas
    ]);

    // 2. Work Orders
    const otHeaders = ['ID_OT', 'ID_Activo', 'Tipo', 'Prioridad', 'Estado', 'Tecnico', 'Inicio_Falla', 'Fin_Reparacion', 'MDT_Minutos', 'MTTR_Minutos', 'MWT_Minutos', 'Descripcion'];
    const otRows = (workOrders || []).map(ot => [
      ot.id_ot,
      ot.id_activo,
      ot.tipo,
      ot.prioridad,
      ot.estado,
      ot.tecnico,
      ot.inicio_falla,
      ot.fin_reparacion || 'N/A',
      ot.mdt_total,
      ot.mttr_tecnico,
      ot.mwt_espera,
      (ot.descripcion || '').replace(/;/g, ',').replace(/\n/g, ' ')
    ]);

    // 3. Production Logs
    const logHeaders = ['ID', 'Fecha', 'ID_Activo', 'Horas_Operacion', 'Ciclos', 'Observaciones'];
    const logRows = (productionLogs || []).map(l => [
      l.id,
      l.fecha,
      l.id_activo,
      l.horas_operacion,
      l.ciclos,
      (l.observaciones || '').replace(/;/g, ',').replace(/\n/g, ' ')
    ]);

    let csvContent = '\ufeff'; // BOM for Excel encoding
    
    csvContent += '--- ACTIVOS ---\n';
    csvContent += assetHeaders.join(';') + '\n';
    assetRows.forEach(row => { csvContent += row.join(';') + '\n'; });
    
    csvContent += '\n--- ORDENES DE TRABAJO ---\n';
    csvContent += otHeaders.join(';') + '\n';
    otRows.forEach(row => { csvContent += row.join(';') + '\n'; });
    
    csvContent += '\n--- REGISTROS DE PRODUCCION ---\n';
    csvContent += logHeaders.join(';') + '\n';
    logRows.forEach(row => { csvContent += row.join(';') + '\n'; });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];
    const plantName = config.titulo_sistema.replace(/\s+/g, '_');
    link.download = `Respaldo_DB_${plantName}_${dateStr}.csv`;
    link.click();
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    // Save logic
  };

  const handleAddException = () => {
    const newException: CalendarException = {
      id: Date.now(),
      fecha: new Date().toISOString().split('T')[0],
      descripcion: 'Nueva Excepción',
      tipo: 'FERIADO'
    };
    setExceptions([...exceptions, newException]);
  };

  const handleRemoveException = (id: number) => {
    setExceptions(exceptions.filter(e => e.id !== id));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setConfig({ ...config, logo_path: compressedBase64 });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Configuración del Sistema</h2>
          <p className="text-sm text-slate-400">Personalización, jornadas laborales y metas de KPIs</p>
        </div>
        <button 
          onClick={handleSaveConfig}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-300 flex items-center space-x-2"
        >
          <Save className="w-5 h-5" />
          <span>Guardar Cambios</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-2">
          {[
            { id: 'branding', label: 'Branding & Títulos', icon: <Layout className="w-4 h-4" /> },
            { id: 'kpis', label: 'Metas & Semáforo', icon: <Target className="w-4 h-4" /> },
            { id: 'shifts', label: 'Jornada Laboral', icon: <Clock className="w-4 h-4" /> },
            { id: 'calendar', label: 'Calendario & Feriados', icon: <Calendar className="w-4 h-4" /> },
            { id: 'data', label: 'Gestión de Datos', icon: <Database className="w-4 h-4" /> },
          ].map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full flex items-center space-x-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all duration-300 border",
                activeSection === section.id 
                  ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20" 
                  : "bg-slate-800/40 text-slate-400 border-slate-700/50 hover:bg-slate-800/60 hover:text-slate-200"
              )}
            >
              {section.icon}
              <span>{section.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 bg-[#1e293b] p-8 rounded-3xl border border-slate-700/50 shadow-2xl">
          {activeSection === 'branding' && (
            <div className="space-y-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20">
                  <Layout className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Branding & Títulos</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Logo del Sistema</label>
                  <div className="flex flex-col md:flex-row items-start gap-8">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-40 h-40 bg-slate-800 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-all group overflow-hidden relative"
                    >
                      {config.logo_path ? (
                        <>
                          <img 
                            src={config.logo_path} 
                            alt="Logo preview" 
                            className="w-full h-full object-contain p-2"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Upload className="w-6 h-6 text-white" />
                          </div>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-8 h-8 text-slate-600 group-hover:text-blue-400 mb-2" />
                          <span className="text-[10px] text-slate-500 group-hover:text-blue-400 font-bold">SUBIR LOGO</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleLogoUpload} 
                        className="hidden" 
                        accept="image/*"
                      />
                    </div>

                    <div className="flex-1 space-y-6 w-full flex flex-col justify-center">
                      <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-700/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dimensiones del Logo</p>
                        <p className="text-xs text-slate-500">El logo se mostrará con un tamaño fijo de <span className="text-blue-400 font-mono">170px x 65px</span> para mantener la consistencia del diseño.</p>
                      </div>

                      {config.logo_path && (
                        <button 
                          onClick={() => setConfig({ ...config, logo_path: '' })}
                          className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-widest flex items-center space-x-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Eliminar Logo</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Título del Sistema</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                    value={config.titulo_sistema}
                    onChange={(e) => setConfig({ ...config, titulo_sistema: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subtítulo</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                    value={config.subtitulo_sistema}
                    onChange={(e) => setConfig({ ...config, subtitulo_sistema: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Título Sección "Plan de Acción"</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="Plan de Acción / Notas Gerencia"
                    value={config.titulo_plan_accion || ''}
                    onChange={(e) => setConfig({ ...config, titulo_plan_accion: e.target.value })}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Este título se utiliza en el Análisis Histórico y reportes PDF.</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pie de Página</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                    value={config.pie_pagina}
                    onChange={(e) => setConfig({ ...config, pie_pagina: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'kpis' && (
            <div className="space-y-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-emerald-600/10 rounded-2xl border border-emerald-500/20">
                  <Target className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Metas & Semáforo</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Meta Disponibilidad Anual (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                      value={config.obj_disp_anual}
                      onChange={(e) => {
                        const newObj = Number(e.target.value);
                        const hist = [...(config.historicalObjectives || [])];
                        const idx = hist.findIndex(h => h.mes === config.mes_curso && h.anio === config.anio_curso);
                        if (idx >= 0) {
                          hist[idx].obj_disp = newObj;
                        } else {
                          hist.push({ mes: config.mes_curso, anio: config.anio_curso, obj_disp: newObj });
                        }
                        setConfig({ ...config, obj_disp_anual: newObj, historicalObjectives: hist });
                      }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">%</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Metas de Indicadores</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400">MTBF (≥ Horas)</span>
                      <input 
                        type="number" 
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white" 
                        value={config.obj_mtbf}
                        onChange={(e) => setConfig({ ...config, obj_mtbf: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400">MTTR (≤ Horas)</span>
                      <input 
                        type="number" 
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white" 
                        value={config.obj_mttr}
                        onChange={(e) => setConfig({ ...config, obj_mttr: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400">MWT (≤ Horas)</span>
                      <input 
                        type="number" 
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white" 
                        value={config.obj_mwt}
                        onChange={(e) => setConfig({ ...config, obj_mwt: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400">MDT (≤ Horas)</span>
                      <input 
                        type="number" 
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white" 
                        value={config.obj_mdt}
                        onChange={(e) => setConfig({ ...config, obj_mdt: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-700/50 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Límites MWT (Semáforo)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-emerald-500">VERDE</span>
                      <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white" defaultValue={2} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-amber-500">AMARILLO</span>
                      <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white" defaultValue={8} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-red-500">ROJO</span>
                      <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white" defaultValue={24} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'shifts' && (
            <div className="space-y-8">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-purple-600/10 rounded-2xl border border-purple-500/20">
                    <Clock className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Jornada Laboral</h3>
                    <p className="text-xs text-slate-500">Configura los turnos por mes. Máximo 4 turnos.</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50">
                    <select 
                      value={shiftMonth} 
                      onChange={(e) => setShiftMonth(Number(e.target.value))}
                      className="bg-slate-800 border-none rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {Array.from({length: 12}).map((_, i) => (
                        <option key={i} value={i}>{new Date(2000, i).toLocaleString('es', { month: 'long' }).toUpperCase()}</option>
                      ))}
                    </select>
                    <input 
                      type="number" 
                      value={shiftYear} 
                      onChange={(e) => setShiftYear(Number(e.target.value))}
                      className="w-20 bg-slate-800 border-none rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <button 
                    onClick={exportShiftsToCSV}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm">Exportar CSV</span>
                  </button>

                  {currentShifts.length < 4 && (
                    <button 
                      onClick={() => {
                        const newId = Math.max(0, ...currentShifts.map(s => s.id_turno)) + 1;
                        setShifts([...shifts, {
                          id_turno: newId,
                          nombre: `Turno ${newId}`,
                          lu_ju_in: '08:00',
                          lu_ju_out: '17:00',
                          vi_in: '08:00',
                          vi_out: '16:00',
                          mes: shiftMonth,
                          anio: shiftYear
                        }]);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center space-x-2 shadow-lg shadow-blue-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm">Agregar Turno</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentShifts.length === 0 ? (
                  <div className="col-span-full bg-slate-900/40 p-8 rounded-2xl border border-slate-700/50 text-center flex flex-col items-center justify-center">
                    <Clock className="w-12 h-12 text-slate-600 mb-4" />
                    <p className="text-slate-400 mb-6">No hay turnos configurados para {new Date(2000, shiftMonth).toLocaleString('es', { month: 'long' })} {shiftYear}.</p>
                    <button 
                      onClick={() => {
                        const sorted = [...shifts].sort((a,b) => b.anio - a.anio || b.mes - a.mes);
                        if (sorted.length > 0) {
                          const latest = sorted.filter(s => s.anio === sorted[0].anio && s.mes === sorted[0].mes);
                          const newShifts = latest.map(s => ({...s, mes: shiftMonth, anio: shiftYear}));
                          setShifts([...shifts, ...newShifts]);
                        } else {
                          setShifts([...shifts, { id_turno: 1, nombre: 'Turno 1', lu_ju_in: '08:00', lu_ju_out: '17:00', vi_in: '08:00', vi_out: '16:00', mes: shiftMonth, anio: shiftYear }]);
                        }
                      }}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all"
                    >
                      Inicializar Turnos
                    </button>
                  </div>
                ) : (
                  currentShifts.map((shift) => (
                    <div key={shift.id_turno} className="bg-slate-900/40 p-6 rounded-2xl border border-slate-700/50 space-y-6 relative group">
                      {currentShifts.length > 1 && (
                        <button 
                          onClick={() => setShifts(shifts.filter(s => !(s.id_turno === shift.id_turno && s.mes === shiftMonth && s.anio === shiftYear)))}
                          className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      
                      <div className="space-y-2 pr-12">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nombre del Turno</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                          value={shift.nombre || `Turno ${shift.id_turno}`}
                          onChange={(e) => {
                            setShifts(shifts.map(s => 
                              (s.id_turno === shift.id_turno && s.mes === shiftMonth && s.anio === shiftYear) 
                                ? { ...s, nombre: e.target.value } 
                                : s
                            ));
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Lunes - Jueves</label>
                          <div className="flex items-center space-x-2">
                            <input 
                              type="time" 
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white" 
                              value={shift.lu_ju_in} 
                              onChange={(e) => {
                                setShifts(shifts.map(s => 
                                  (s.id_turno === shift.id_turno && s.mes === shiftMonth && s.anio === shiftYear) 
                                    ? { ...s, lu_ju_in: e.target.value } 
                                    : s
                                ));
                              }}
                            />
                            <span className="text-slate-600">/</span>
                            <input 
                              type="time" 
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white" 
                              value={shift.lu_ju_out} 
                              onChange={(e) => {
                                setShifts(shifts.map(s => 
                                  (s.id_turno === shift.id_turno && s.mes === shiftMonth && s.anio === shiftYear) 
                                    ? { ...s, lu_ju_out: e.target.value } 
                                    : s
                                ));
                              }}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Viernes</label>
                          <div className="flex items-center space-x-2">
                            <input 
                              type="time" 
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white" 
                              value={shift.vi_in} 
                              onChange={(e) => {
                                setShifts(shifts.map(s => 
                                  (s.id_turno === shift.id_turno && s.mes === shiftMonth && s.anio === shiftYear) 
                                    ? { ...s, vi_in: e.target.value } 
                                    : s
                                ));
                              }}
                            />
                            <span className="text-slate-600">/</span>
                            <input 
                              type="time" 
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white" 
                              value={shift.vi_out} 
                              onChange={(e) => {
                                setShifts(shifts.map(s => 
                                  (s.id_turno === shift.id_turno && s.mes === shiftMonth && s.anio === shiftYear) 
                                    ? { ...s, vi_out: e.target.value } 
                                    : s
                                ));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeSection === 'calendar' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-amber-600/10 rounded-2xl border border-amber-500/20">
                    <Calendar className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Calendario & Feriados</h3>
                </div>
                <button 
                  onClick={handleAddException}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Excepción</span>
                </button>
              </div>

              <div className="bg-slate-900/40 rounded-2xl border border-slate-700/50 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Descripción</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {exceptions.map((exc) => (
                      <tr key={exc.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <input type="date" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white" value={exc.fecha} />
                        </td>
                        <td className="px-6 py-4">
                          <input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white" value={exc.descripcion} />
                        </td>
                        <td className="px-6 py-4">
                          <select className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white">
                            <option value="FERIADO">FERIADO</option>
                            <option value="DIA_EXTRA">DÍA EXTRA</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleRemoveException(exc.id)}
                            className="p-2 hover:bg-red-600/10 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(exceptions || []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-sm">
                          No hay feriados o días extra registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeSection === 'data' && (
            <div className="space-y-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20">
                  <Database className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Gestión de Datos</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-700/50 flex flex-col items-start">
                  <h4 className="text-md font-bold text-emerald-400 mb-2 flex items-center space-x-2">
                    <FileSpreadsheet className="w-5 h-5" />
                    <span>Exportar Base de Datos</span>
                  </h4>
                  <p className="text-sm text-slate-400 mb-6 flex-1">
                    Descarga toda la información actual (Activos, OTs y producción) en formato CSV compatible con Excel.
                  </p>
                  <button 
                    onClick={exportFullDatabaseToCSV}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar CSV completa</span>
                  </button>
                </div>

                <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-700/50 flex flex-col items-start">
                  <h4 className="text-md font-bold text-blue-400 mb-2 flex items-center space-x-2">
                    <Calculator className="w-5 h-5" />
                    <span>Resumen de Cálculos KPI</span>
                  </h4>
                  <p className="text-sm text-slate-400 mb-6 flex-1">
                    Consulta las fórmulas y metodologías utilizadas para calcular los indicadores de mantenimiento en el Dashboard.
                  </p>
                  <button 
                    onClick={() => setShowKpiSummary(!showKpiSummary)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center space-x-2"
                  >
                    <Info className="w-4 h-4" />
                    <span>{showKpiSummary ? 'Ocultar Resumen' : 'Ver Resumen'}</span>
                  </button>
                </div>
              </div>

              {showKpiSummary && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/60 border border-blue-500/30 rounded-3xl p-8 mt-6"
                >
                  <h4 className="text-xl font-bold text-white mb-6 flex items-center space-x-3">
                    <Calculator className="w-6 h-6 text-blue-400" />
                    <span>Fórmulas y Metodología KPI</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                        <h5 className="font-bold text-emerald-400 mb-2">1. Disponibilidad (A)</h5>
                        <p className="text-sm text-slate-300 mb-2">Mide el porcentaje de tiempo que el equipo está operativo frente al tiempo programado (Tp). Considera todas las paradas (MDT).</p>
                        <code className="block bg-black/30 p-2 rounded text-blue-300 text-xs text-center">
                          A = ((Tp - MDT_Total) / Tp) × 100
                        </code>
                      </div>

                      <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                        <h5 className="font-bold text-blue-400 mb-2">2. MTBF (Mean Time Between Failures)</h5>
                        <p className="text-sm text-slate-300 mb-2">Tiempo promedio de operación (Uptime) entre fallas críticas o paradas no programadas.</p>
                        <code className="block bg-black/30 p-2 rounded text-blue-300 text-xs text-center">
                          MTBF = (Tp - MDT_Total) / N° de Fallas (Correctivos)
                        </code>
                      </div>

                      <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                        <h5 className="font-bold text-amber-400 mb-2">3. MTTR (Mean Time To Repair)</h5>
                        <p className="text-sm text-slate-300 mb-2">Tiempo promedio de reparación técnica efectiva realizada por el personal de mantenimiento en fallas.</p>
                        <code className="block bg-black/30 p-2 rounded text-blue-300 text-xs text-center">
                          MTTR = Σ(Tiempo Reparación Técnico) / N° de Fallas (Correctivos)
                        </code>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                        <h5 className="font-bold text-purple-400 mb-2">4. MWT (Mean Wait Time)</h5>
                        <p className="text-sm text-slate-300 mb-2">Tiempo promedio de espera por factores externos (repuestos, logística, herramientas) en cualquier intervención.</p>
                        <code className="block bg-black/30 p-2 rounded text-blue-300 text-xs text-center">
                          MWT = Σ(Tiempo de Espera) / N° de Intervenciones Totales
                        </code>
                      </div>

                      <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                        <h5 className="font-bold text-rose-400 mb-2">5. MDT (Mean Downtime)</h5>
                        <p className="text-sm text-slate-300 mb-2">Tiempo promedio total que el equipo permanece fuera de servicio por cualquier motivo (Parada Real).</p>
                        <code className="block bg-black/30 p-2 rounded text-blue-300 text-xs text-center">
                          MDT = Σ(Tiempo de Parada Total) / N° de Intervenciones Totales
                        </code>
                      </div>

                      <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                        <h5 className="font-bold text-slate-400 mb-2">Metodología de Tiempo Programado (Tp)</h5>
                        <p className="text-sm text-slate-400 italic">
                          Tp se calcula dinámicamente: (Días Calendario - Feriados - Fines de Semana) × Horas de Turnos Activos. Se ajusta automáticamente al mes y año en curso según la configuración de turnos y excepciones.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
