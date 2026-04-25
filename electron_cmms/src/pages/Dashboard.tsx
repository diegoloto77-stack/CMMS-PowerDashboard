import React, { useMemo } from 'react';
import { 
  Asset, 
  WorkOrder, 
  Shift, 
  CalendarException, 
  SystemConfig 
} from '../types';
import { 
  calculatePlannedTime, 
  calculateAssetKPIs, 
  getDailyPlantPerformance, 
  getDowntimeByCategory 
} from '../services/kpi_service';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Cell
} from 'recharts';
import { 
  Activity, Clock, AlertTriangle, TrendingUp, HelpCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardProps {
  assets: Asset[];
  workOrders: WorkOrder[];
  shifts: Shift[];
  exceptions: CalendarException[];
  config: SystemConfig;
}

const Dashboard: React.FC<DashboardProps> = ({ assets, workOrders, shifts, exceptions, config }) => {
  const selectedMonth = config.mes_curso;
  const selectedYear = config.anio_curso;

  const currentObjective = config.obj_disp_anual;

  const tp = useMemo(() => 
    calculatePlannedTime(selectedMonth, selectedYear, shifts, exceptions),
  [selectedMonth, selectedYear, shifts, exceptions]);

  const dailyPerf = useMemo(() => 
    getDailyPlantPerformance(selectedMonth, selectedYear, shifts, exceptions, workOrders),
  [selectedMonth, selectedYear, shifts, exceptions, workOrders]);

  const catDowntime = useMemo(() => 
    getDowntimeByCategory(workOrders.filter(ot => {
      const d = new Date(ot.fecha_creacion);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    })),
  [workOrders, selectedMonth, selectedYear]);

  const assetStats = useMemo(() => 
    assets.map(asset => ({
      asset,
      stats: calculateAssetKPIs(asset, workOrders, tp)
    })),
  [assets, workOrders, tp]);

  const globalStats = useMemo(() => {
    if (assets.length > 0) {
      const totalMdt = assetStats.reduce((acc, s) => acc + s.stats.mdt_total, 0);
      const totalFallas = assetStats.reduce((acc, s) => acc + s.stats.fallas, 0);
      const avgDisp = assetStats.reduce((acc, s) => acc + s.stats.disponibilidad, 0) / assetStats.length;

      return {
        disponibilidad: avgDisp,
        mtbf: totalFallas > 0 ? (tp - totalMdt) / totalFallas : 0,
        mdt_total: totalMdt,
        fallas: totalFallas
      };
    } else {
      // Logic for Plant-Only (no assets)
      const totalLost = dailyPerf.reduce((acc, d) => acc + d.lost, 0);
      const plantDisp = tp > 0 ? ((tp - totalLost) / tp) * 100 : 0;
      return {
        disponibilidad: plantDisp,
        mtbf: 0,
        mdt_total: totalLost,
        fallas: workOrders.filter(ot => ot.estado === 'Cerrada' && ot.tipo === 'Correctivo').length
      };
    }
  }, [assetStats, tp, assets.length, dailyPerf, workOrders]);

  const chartData = useMemo(() => 
    assetStats.map(s => ({
      name: s.asset.codigo_iso,
      disponibilidad: parseFloat(s.stats.disponibilidad.toFixed(1)),
    })),
  [assetStats]);

  if (assets.length === 0 && tp === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-[#1e293b] rounded-[40px] border border-white/5 shadow-2xl">
        <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mb-6 border border-blue-500/20">
          <Activity className="w-10 h-10 text-blue-400" />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-4">Dashboard Analítico Vacío</h2>
        <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
          No se detectaron equipos cargados ni jornada laboral iniciada. Para visualizar indicadores, primero configure su jornada en "Configuración" o registre sus activos en "Equipos".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20">
            <Activity className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Dashboard Analítico</h2>
            <p className="text-xs text-slate-500">
              {assets.length > 0 ? 'Estado global de la planta' : 'Análisis de Capacidad de Planta'} - Período {selectedMonth + 1}/{selectedYear}
            </p>
          </div>
        </div>
        {assets.length === 0 && (
           <div className="bg-amber-600/10 border border-amber-600/20 px-4 py-2 rounded-xl flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Modo: Análisis de Capacidad (Sin Equipos)</span>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Disponibilidad', value: `${globalStats.disponibilidad.toFixed(1)}%`, icon: <Activity />, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: assets.length > 0 ? 'MTBF (h)' : 'Tiempo Planificado (h)', value: assets.length > 0 ? globalStats.mtbf.toFixed(1) : tp.toFixed(1), icon: <TrendingUp />, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
          { label: 'Pérdida Jornada (h)', value: globalStats.mdt_total.toFixed(1), icon: <Clock />, color: 'text-amber-400', bg: 'bg-amber-400/10' },
          { label: 'Eventos de Parada', value: globalStats.fallas, icon: <AlertTriangle />, color: 'text-red-400', bg: 'bg-red-400/10' },
        ].map((kpi, i) => (
          <div key={i} className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700/50 shadow-xl">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", kpi.bg, kpi.color)}>
              {kpi.icon}
            </div>
            <h3 className="text-3xl font-black text-white">{kpi.value}</h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {assets.length > 0 ? (
        <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-700/50 shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-8 italic uppercase tracking-tighter flex items-center">
             <div className="w-2 h-6 bg-blue-600 mr-3" />
             Disponibilidad por Equipo vs Meta ({currentObjective}%)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#334155', opacity: 0.4}} contentStyle={{backgroundColor: '#0f172a', borderRadius: '12px', border: 'none'}} itemStyle={{fontWeight: 'bold'}} />
                <ReferenceLine y={currentObjective} stroke="#ef4444" strokeDasharray="5 5" label={{ position: 'right', value: 'META', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                <Bar dataKey="disponibilidad" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-700/50 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-8 italic uppercase tracking-tighter flex items-center">
                 <div className="w-2 h-6 bg-emerald-600 mr-3" />
                 Disponibilidad Diaria (Tiempo Operativo vs Perdido)
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyPerf}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} label={{ value: 'Horas', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip contentStyle={{backgroundColor: '#0f172a', borderRadius: '12px', border: 'none'}} />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{paddingBottom: '20px'}} />
                    <Bar name="Operativo" dataKey="operational" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                    <Bar name="Parado" dataKey="lost" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>

           <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-700/50 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-8 italic uppercase tracking-tighter flex items-center">
                 <div className="w-2 h-6 bg-amber-600 mr-3" />
                 Pérdida de Capacidad por Categoría (Pareto)
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catDowntime} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={100} />
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
                   <p className="text-xs text-slate-500 uppercase tracking-widest font-black italic">Sin registros de parada categorizados</p>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
