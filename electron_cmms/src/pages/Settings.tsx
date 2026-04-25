import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  Info, 
  Database, 
  ShieldAlert, 
  Calendar,
  Clock,
  HelpCircle,
  ChevronRight,
  BookOpen,
  CalendarDays,
  Play
} from 'lucide-react';
import { SystemConfig, Shift } from '../types';
import { savePlantConfig, saveDbShifts } from '../services/storage';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsProps {
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  shifts: Shift[];
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
}

const Settings: React.FC<SettingsProps> = ({ config, setConfig, shifts, setShifts }) => {
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'kpis' | 'jornada'>('general');
  const [localConfig, setLocalConfig] = useState<SystemConfig>(config);
  const [localShifts, setLocalShifts] = useState<Shift[]>(shifts);
  const [showResumen, setShowResumen] = useState(false);

  // Usar localConfig para que la pestaña de Jornada responda al cambio de mes/año sin necesidad de guardar primero
  const currentMonthShifts = localShifts.find(s => s.mes === localConfig.mes_curso && s.anio === localConfig.anio_curso);

  const isShiftStarted = !!(currentMonthShifts && 
                         currentMonthShifts.lu_ju_in !== '--:--' && 
                         currentMonthShifts.lu_ju_in !== '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await savePlantConfig(localConfig);
    await saveDbShifts(localShifts);
    setConfig(localConfig);
    setShifts(localShifts);
    alert('Configuración guardada correctamente.');
  };

  const handleStartShift = () => {
    const defaultData = {
      lu_ju_in: '08:00',
      lu_ju_out: '17:00',
      vi_in: '08:00',
      vi_out: '16:00'
    };

    if (currentMonthShifts) {
      const updated = localShifts.map(s => 
        (s.mes === localConfig.mes_curso && s.anio === localConfig.anio_curso) 
          ? { ...s, ...defaultData } 
          : s
      );
      setLocalShifts(updated);
    } else {
      const newShift: Shift = {
        id: Date.now(),
        nombre: `Jornada ${localConfig.mes_curso + 1}/${localConfig.anio_curso}`,
        mes: localConfig.mes_curso,
        anio: localConfig.anio_curso,
        ...defaultData
      };
      setLocalShifts([...localShifts, newShift]);
    }
  };

  const handleDeleteShift = () => {
    if (confirm('¿Está seguro de borrar la jornada de este mes? Esto desactivará el cálculo de disponibilidad para este período.')) {
      const emptyData = {
        lu_ju_in: '--:--',
        lu_ju_out: '--:--',
        vi_in: '--:--',
        vi_out: '--:--'
      };

      if (currentMonthShifts) {
        const updated = localShifts.map(s => 
          (s.mes === localConfig.mes_curso && s.anio === localConfig.anio_curso) 
            ? { ...s, ...emptyData } 
            : s
        );
        setLocalShifts(updated);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">CONFIGURACIÓN DEL SISTEMA</h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Parámetros globales y lógica de cálculo</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-64 flex flex-col space-y-2">
          <button 
            onClick={() => setActiveSubTab('general')}
            className={cn(
              "flex items-center space-x-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all",
              activeSubTab === 'general' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:bg-slate-800"
            )}
          >
            <SettingsIcon className="w-5 h-5" />
            <span>General</span>
          </button>
          <button 
            onClick={() => setActiveSubTab('jornada')}
            className={cn(
              "flex items-center space-x-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all",
              activeSubTab === 'jornada' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:bg-slate-800"
            )}
          >
            <CalendarDays className="w-5 h-5" />
            <span>Jornada Laboral</span>
          </button>
          <button 
            onClick={() => setActiveSubTab('kpis')}
            className={cn(
              "flex items-center space-x-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all",
              activeSubTab === 'kpis' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:bg-slate-800"
            )}
          >
            <BookOpen className="w-5 h-5" />
            <span>Lógica KPIs</span>
          </button>
          
          <div className="mt-8 pt-8 border-t border-white/5">
             <button 
              onClick={() => setShowResumen(true)}
              className="w-full bg-[#004796] hover:bg-[#003d80] text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-between group transition-all"
             >
                <span>Resumen de Fórmulas</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
             </button>
          </div>
        </div>

        <div className="flex-1 bg-[#1e293b] rounded-[40px] border border-white/5 shadow-2xl p-10">
          {activeSubTab === 'general' ? (
            <form onSubmit={handleSave} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Título del Sistema</label>
                    <input 
                      type="text" 
                      value={localConfig.titulo_sistema}
                      onChange={(e) => setLocalConfig({...localConfig, titulo_sistema: e.target.value})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-bold"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Nombre de la Empresa</label>
                    <input 
                      type="text" 
                      value={localConfig.empresa}
                      onChange={(e) => setLocalConfig({...localConfig, empresa: e.target.value})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-bold"
                    />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Mes de Gestión</label>
                    <select 
                      value={localConfig.mes_curso}
                      onChange={(e) => setLocalConfig({...localConfig, mes_curso: Number(e.target.value)})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-bold"
                    >
                      {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Año de Gestión</label>
                    <input 
                      type="number" 
                      value={localConfig.anio_curso}
                      onChange={(e) => setLocalConfig({...localConfig, anio_curso: Number(e.target.value)})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-bold"
                    />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Planta Operada</label>
                    <div className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-slate-400 font-bold uppercase cursor-not-allowed italic">
                       {localConfig.planta || 'No configurada'}
                    </div>
                    <p className="text-[9px] text-slate-600 mt-2">La planta se define al iniciar la aplicación mediante el selector de base de datos.</p>
                 </div>
              </div>

              <div className="pt-10 border-t border-white/5 flex justify-end">
                 <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 flex items-center space-x-3"
                 >
                    <Save className="w-5 h-5" />
                    <span>GUARDAR CAMBIOS</span>
                 </button>
              </div>
            </form>
          ) : activeSubTab === 'jornada' ? (
            <div className="space-y-8 animate-in fade-in zoom-in duration-500">
               <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Gestión de Jornada Laboral</h3>
                    <p className="text-sm text-slate-400 mt-1">Configuración horaria para el período activo: <span className="text-blue-400 font-bold">{config.mes_curso + 1}/{config.anio_curso}</span></p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {currentMonthShifts && (
                      <button 
                        type="button"
                        onClick={handleDeleteShift}
                        className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-red-500/20 shadow-xl shadow-red-600/10"
                      >
                        Borrar Turnos
                      </button>
                    )}
                    {!isShiftStarted && (
                      <button 
                        type="button"
                        onClick={handleStartShift}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center space-x-2 shadow-xl shadow-emerald-600/20 transition-all transform hover:scale-105"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Iniciar Turnos</span>
                      </button>
                    )}
                  </div>
               </div>

               {isShiftStarted ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                    <div className="bg-[#0f172a] p-8 rounded-3xl border border-white/5 space-y-6">
                       <h4 className="text-[10px] text-blue-500 font-black uppercase tracking-widest flex items-center">
                          <div className="w-4 h-1 bg-blue-500 mr-3" />
                          Lunes a Jueves
                       </h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Entrada</label>
                            <input 
                              type="time" 
                              value={currentMonthShifts?.lu_ju_in}
                              onChange={(e) => {
                                const updated = localShifts.map(s => (s.id === currentMonthShifts?.id) ? {...s, lu_ju_in: e.target.value} : s);
                                setLocalShifts(updated);
                              }}
                              className="w-full bg-[#1e293b] border border-slate-700 rounded-xl p-3 text-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Salida</label>
                            <input 
                              type="time" 
                              value={currentMonthShifts?.lu_ju_out}
                              onChange={(e) => {
                                const updated = localShifts.map(s => (s.id === currentMonthShifts?.id) ? {...s, lu_ju_out: e.target.value} : s);
                                setLocalShifts(updated);
                              }}
                              className="w-full bg-[#1e293b] border border-slate-700 rounded-xl p-3 text-white font-bold"
                            />
                          </div>
                       </div>
                    </div>

                    <div className="bg-[#0f172a] p-8 rounded-3xl border border-white/5 space-y-6">
                       <h4 className="text-[10px] text-emerald-500 font-black uppercase tracking-widest flex items-center">
                          <div className="w-4 h-1 bg-emerald-500 mr-3" />
                          Viernes
                       </h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Entrada</label>
                            <input 
                              type="time" 
                              value={currentMonthShifts?.vi_in}
                              onChange={(e) => {
                                const updated = localShifts.map(s => (s.id === currentMonthShifts?.id) ? {...s, vi_in: e.target.value} : s);
                                setLocalShifts(updated);
                              }}
                              className="w-full bg-[#1e293b] border border-slate-700 rounded-xl p-3 text-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Salida</label>
                            <input 
                              type="time" 
                              value={currentMonthShifts?.vi_out}
                              onChange={(e) => {
                                const updated = localShifts.map(s => (s.id === currentMonthShifts?.id) ? {...s, vi_out: e.target.value} : s);
                                setLocalShifts(updated);
                              }}
                              className="w-full bg-[#1e293b] border border-slate-700 rounded-xl p-3 text-white font-bold"
                            />
                          </div>
                       </div>
                    </div>

                    <div className="col-span-full pt-6 border-t border-white/5 flex justify-end">
                       <button 
                        onClick={handleSave}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 flex items-center space-x-3"
                       >
                          <Save className="w-5 h-5" />
                          <span>GUARDAR JORNADA</span>
                       </button>
                    </div>
                 </div>
               ) : (
                 <div className="py-20 flex flex-col items-center justify-center text-center bg-[#0f172a] rounded-[40px] border border-dashed border-white/10">
                    <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mb-6 border border-blue-500/20">
                       <Clock className="w-10 h-10 text-blue-400" />
                    </div>
                    <h4 className="text-xl font-black text-white uppercase tracking-tight">Turnos no iniciados</h4>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2 italic">Haga clic en el botón superior para activar la jornada laboral del período actual y comenzar el cálculo de KPIs.</p>
                 </div>
               )}
            </div>
          ) : (
            <div className="space-y-8">
               <div>
                  <h3 className="text-xl font-black text-white mb-4 uppercase tracking-tight">Estructura de Turnos</h3>
                  <p className="text-sm text-slate-400 mb-6">El sistema utiliza los turnos configurados para calcular el <strong>Tiempo Planificado</strong> diario, esencial para la Disponibilidad.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     {localConfig.turnos?.map((t, i) => (
                       <div key={i} className="bg-[#0f172a] p-6 rounded-3xl border border-white/5 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                             <Clock className="w-12 h-12 text-white" />
                          </div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{t.nombre}</p>
                          <p className="text-lg font-bold text-white">{t.inicio} - {t.fin}</p>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="bg-amber-600/10 border border-amber-600/20 p-6 rounded-3xl flex items-start space-x-4">
                  <ShieldAlert className="w-6 h-6 text-amber-500 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-500 mb-1">Cálculo de Disponibilidad</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">Las paradas se consideran "indisponibilidad" solo si ocurren dentro de los horarios de turno y no existen excepciones de calendario cargadas.</p>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Resumen Modal */}
      <AnimatePresence>
        {showResumen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-[#0f172a] w-full max-w-4xl rounded-[40px] border border-blue-500/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-[#004796] p-10 shrink-0">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-4">
                    <Info className="w-10 h-10 text-white" />
                    <div>
                      <h2 className="text-3xl font-black text-white tracking-tighter uppercase">RESUMEN TÉCNICO V3.2</h2>
                      <p className="text-xs text-blue-200 uppercase tracking-[0.2em] font-black mt-1">Glosario y Lógica de Negocio</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowResumen(false)}
                    className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all shadow-lg"
                  >
                    <ChevronRight className="w-6 h-6 rotate-90" />
                  </button>
                </div>
              </div>

              <div className="p-12 overflow-y-auto custom-scrollbar space-y-12">
                <section>
                   <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-6 flex items-center">
                     <div className="w-4 h-1 bg-blue-500 mr-3" />
                     Garantía de Independencia de Datos
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-slate-900/50 p-8 rounded-3xl border border-white/5">
                        <div className="flex items-center space-x-3 mb-4">
                           <Database className="w-5 h-5 text-emerald-500" />
                           <h4 className="font-black text-white uppercase text-sm tracking-tight">Motor SQLite Nativo</h4>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">Cada base de datos (`.db`) contiene sus propias tablas de activos, turnos y logs. No existe contaminación de datos entre plantas (Polvo, Solvente, Líquida).</p>
                      </div>
                      <div className="bg-slate-900/50 p-8 rounded-3xl border border-white/5">
                        <div className="flex items-center space-x-3 mb-4">
                           <Save className="w-5 h-5 text-blue-500" />
                           <h4 className="font-black text-white uppercase text-sm tracking-tight">Persistencia Local</h4>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">Los registros se guardan en el `UserData` del perfil de Windows. Desinstalar la aplicación no borra los datos a menos que se limpie manualmente la carpeta de datos.</p>
                      </div>
                   </div>
                </section>

                <section>
                   <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-6 flex items-center">
                    <div className="w-4 h-1 bg-blue-500 mr-3" />
                    Ingeniería de Cálculo (KPIs)
                   </h3>
                   <div className="space-y-6">
                      <div className="flex items-start space-x-6 p-6 hover:bg-white/[0.02] rounded-3xl transition-all border border-transparent hover:border-white/5">
                         <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center shrink-0 font-black text-blue-500 border border-white/5 italic">% DISP</div>
                         <div>
                            <h4 className="font-bold text-white mb-2">Disponibilidad Técnica</h4>
                            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                               Calculada como la razón entre el <strong>Tiempo de Funcionamiento Real</strong> y el <strong>Tiempo Planificado</strong>. 
                               El tiempo planificado se ajusta automáticamente según la configuración de turnos y las excepciones de calendario.
                            </p>
                            <code className="block mt-3 text-[10px] text-blue-400 font-mono bg-blue-400/5 p-2 rounded-lg border border-blue-400/10">
                               (TotalMins - DowntimeMins) / TotalMins * 100
                            </code>
                         </div>
                      </div>

                      <div className="flex items-start space-x-6 p-6 hover:bg-white/[0.02] rounded-3xl transition-all border border-transparent hover:border-white/5">
                         <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center shrink-0 font-black text-amber-500 border border-white/5 italic">MTBF</div>
                         <div>
                            <h4 className="font-bold text-white mb-2">Mean Time Between Failures</h4>
                            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                               Representa el tiempo promedio que el equipo opera sin fallas. Se utiliza para medir la confiabilidad del activo.
                            </p>
                            <code className="block mt-3 text-[10px] text-amber-500 font-mono bg-amber-400/5 p-2 rounded-lg border border-amber-400/10">
                               UptimeTotal / Count(OT_Correctivas)
                            </code>
                         </div>
                      </div>

                      <div className="flex items-start space-x-6 p-6 hover:bg-white/[0.02] rounded-3xl transition-all border border-transparent hover:border-white/5">
                         <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center shrink-0 font-black text-red-500 border border-white/5 italic">MTTR</div>
                         <div>
                            <h4 className="font-bold text-white mb-2">Mean Time To Repair</h4>
                            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                               Tiempo promedio requerido para reparar un activo. Mide la mantenibilidad y la eficiencia del equipo técnico.
                            </p>
                         </div>
                      </div>
                   </div>
                </section>

                <div className="pt-6 border-t border-white/5 text-center">
                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">CMMS Local Pro v3.2.0 — Gestión Industrial Moderna</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
