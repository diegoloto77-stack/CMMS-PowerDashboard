import React, { useState } from 'react';
import { 
  Plus, 
  Calendar, 
  Activity, 
  Trash2, 
  Clock, 
  Search,
} from 'lucide-react';
import { ProductionLog, Asset, WorkOrder, Shift, CalendarException, SystemConfig } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { addDbProductionLog, deleteDbProductionLog } from '../services/storage';
import { getDailyPlantPerformance, getDowntimeByCategory } from '../services/kpi_service';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell 
} from 'recharts';

interface ProductionProps {
  logs: ProductionLog[];
  setLogs: React.Dispatch<React.SetStateAction<ProductionLog[]>>;
  assets: Asset[];
  workOrders: WorkOrder[];
  shifts: Shift[];
  exceptions: CalendarException[];
  config: SystemConfig;
}

const Production: React.FC<ProductionProps> = ({ 
  logs, setLogs, assets, workOrders, shifts, exceptions, config 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCharts, setShowCharts] = useState(true);

  const selectedMonth = config.mes_curso;
  const selectedYear = config.anio_curso;

  const dailyPerf = getDailyPlantPerformance(selectedMonth, selectedYear, shifts, exceptions, workOrders);
  const catDowntime = getDowntimeByCategory(workOrders.filter(ot => {
    const d = new Date(ot.fecha_creacion);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  }));

  const [formData, setFormData] = useState<Partial<ProductionLog>>({
    id_activo: assets[0]?.id || 0,
    cantidad: 0,
    fecha: new Date().toISOString().split('T')[0]
  });

  const getAssetCode = (id: number) => {
    return assets.find(a => a.id === id)?.codigo_iso || 'N/A';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await addDbProductionLog(formData);
    
    const newLog = { ...formData, id: result.id } as ProductionLog;
    setLogs([newLog, ...logs]);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar registro de producción?')) {
      await deleteDbProductionLog(id);
      setLogs(logs.filter(l => l.id !== id));
    }
  };

  const filteredLogs = logs.filter(l => 
     getAssetCode(l.id_activo).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const periodLoad = filteredLogs.reduce((acc, log) => acc + log.cantidad, 0);

  const assetUsage = filteredLogs.reduce((acc, log) => {
    const assetId = String(log.id_activo);
    acc[assetId] = (acc[assetId] || 0) + log.cantidad;
    return acc;
  }, {} as Record<string, number>);

  const topAssets = Object.entries(assetUsage)
    .map(([id, hours]) => ({
      asset: assets.find(a => a.id === Number(id)),
      hours: Number(hours),
      percentage: periodLoad > 0 ? (Number(hours) / periodLoad) * 100 : 0
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 3);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">ANÁLISIS HISTÓRICO DE OPERACIÓN</h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Utilización y Desempeño Global - {config.mes_curso + 1}/{config.anio_curso}</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowCharts(!showCharts)}
            className={cn(
              "px-6 py-3 rounded-2xl font-black text-sm transition-all border",
              showCharts ? "bg-white/10 text-white border-white/10" : "bg-transparent text-slate-500 border-slate-800"
            )}
          >
            {showCharts ? 'OCULTAR GRÁFICAS' : 'MOSTRAR GRÁFICAS'}
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 flex items-center space-x-2 transition-all transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            <span>REGISTRAR HORAS</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showCharts && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-700/50 shadow-2xl">
                <h3 className="text-sm font-black text-emerald-500 uppercase tracking-widest mb-6 flex items-center">
                  <div className="w-4 h-1 bg-emerald-500 mr-3" />
                  Jornada Laboral: Tiempo Operativo vs Perdido
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyPerf}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{backgroundColor: '#0f172a', borderRadius: '12px', border: 'none'}} />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{paddingBottom: '20px', fontSize: '10px'}} />
                      <Bar name="Cumplido" dataKey="operational" stackId="a" fill="#10b981" />
                      <Bar name="Perdido" dataKey="lost" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-700/50 shadow-2xl">
                <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest mb-6 flex items-center">
                  <div className="w-4 h-1 bg-amber-500 mr-3" />
                  Pérdida de Capacidad por Categoría
                </h3>
                <div className="h-[250px] w-full text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={catDowntime} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={10} hide />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={90} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{backgroundColor: '#0f172a', borderRadius: '12px', border: 'none'}} />
                      <Bar name="Horas" dataKey="hours" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                        {catDowntime.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#334155'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {catDowntime.length === 0 && (
                   <div className="text-center py-10">
                     <p className="text-[10px] text-slate-600 font-bold italic uppercase">Sin datos de paradas específicas</p>
                   </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#1e293b] rounded-3xl border border-white/5 shadow-2xl p-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Filtrar por código de equipo..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-600">
                  <th className="pb-6 pl-4 text-left">Fecha</th>
                  <th className="pb-6 text-left">Equipo</th>
                  <th className="pb-6 text-right">Horas</th>
                  <th className="pb-6 pr-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-5 pl-4">
                       <div className="flex items-center space-x-3 text-sm font-bold text-white">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span>{log.fecha}</span>
                       </div>
                    </td>
                    <td className="py-5">
                       <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-sm font-black text-blue-400 uppercase tracking-tighter">{getAssetCode(log.id_activo)}</span>
                       </div>
                    </td>
                    <td className="py-5 text-right font-black text-white text-lg">
                       {log.cantidad.toFixed(1)} <span className="text-[10px] text-slate-500 font-bold">Hrs</span>
                    </td>
                    <td className="py-5 pr-4 text-right">
                       <button 
                        onClick={() => handleDelete(log.id)}
                        className="p-3 text-slate-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                       >
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                       <p className="text-xs text-slate-600 font-black uppercase tracking-widest italic">No se encontraron registros de utilización</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl shadow-xl shadow-blue-600/20 relative overflow-hidden">
              <div className="relative z-10">
                <Activity className="w-10 h-10 text-blue-100 mb-4" />
                <h3 className="text-xl font-black text-white mb-2 leading-none uppercase tracking-tight">Utilización Real</h3>
                <p className="text-blue-100 text-xs font-medium opacity-80 leading-relaxed mb-6 italic">El registro de horas permite al sistema predecir fallas basadas en el uso acumulado de los componentes.</p>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-blue-100">Carga del Período</span>
                  <span className="text-2xl font-black text-white">{periodLoad.toFixed(1)} h</span>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
           </div>

           <div className="bg-[#1e293b] p-8 rounded-3xl border border-white/5 shadow-2xl">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Equipos más activos</h3>
              <div className="space-y-4">
                 {topAssets.length > 0 ? (
                   topAssets.map((item, i) => (
                     <div key={i} className="flex items-center justify-between">
                       <span className="text-xs font-bold text-slate-300">{item.asset?.codigo_iso || 'N/A'}</span>
                       <div className="flex-1 mx-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-1000" 
                            style={{ width: `${item.percentage}%` }}
                          />
                       </div>
                       <span className="text-[10px] font-black text-blue-400">{item.percentage.toFixed(0)}%</span>
                     </div>
                   ))
                 ) : (
                   <p className="text-[10px] text-slate-600 font-bold italic uppercase">No hay registros para mostrar</p>
                 )}
              </div>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e293b] w-full max-w-lg rounded-[40px] border border-white/5 shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSave} className="p-10">
                <div className="flex items-center space-x-4 mb-10">
                   <div className="p-4 bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-600/20">
                      <Clock className="w-8 h-8 text-white" />
                   </div>
                   <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">REGISTRO HORÓMETRO</h2>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-black mt-1">Ingreso de operación diaria</p>
                   </div>
                </div>

                <div className="space-y-8 mb-10">
                   <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Fecha de Registro</label>
                    <input 
                      required
                      type="date" 
                      value={formData.fecha}
                      onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Equipo / Activo</label>
                    <select 
                      required
                      value={formData.id_activo}
                      onChange={(e) => setFormData({...formData, id_activo: Number(e.target.value)})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-bold"
                    >
                      <option value="">Seleccione equipo...</option>
                      {assets.map(a => (
                        <option key={a.id} value={a.id}>[{a.codigo_iso}] {a.nombre_equipo}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Horas de Funcionamiento</label>
                    <input 
                      required
                      type="number" 
                      step="0.1"
                      min="0"
                      max="24"
                      value={formData.cantidad}
                      onChange={(e) => setFormData({...formData, cantidad: Number(e.target.value)})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-black text-xl"
                      placeholder="0.0"
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-5 bg-white/5 text-slate-400 rounded-3xl border border-white/5 font-black uppercase tracking-widest text-xs"
                  >
                    Cerrar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/20 transform hover:scale-105 transition-all"
                  >
                    Guardar Registro
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Production;
