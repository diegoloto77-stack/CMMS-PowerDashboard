import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  Asset, 
  WorkOrder, 
  Shift, 
  CalendarException, 
  SystemConfig, 
  KPIStats 
} from '../types';
import { calculatePlannedTime, calculateAssetKPIs } from '../services/kpi_service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  ReferenceLine,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  History,
  X,
  Minimize2,
  Maximize2,
  ChevronDown,
  Search,
  Download,
  FileText,
  Save,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { cn, formatDuration } from '../lib/utils';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { saveToStorage, getFromStorage } from '../services/storage';
import { PlantType } from '../types';

interface DashboardProps {
  assets: Asset[];
  workOrders: WorkOrder[];
  shifts: Shift[];
  exceptions: CalendarException[];
  config: SystemConfig;
  selectedPlant: PlantType;
}

const getIndicatorStatus = (value: number, type: string, config: SystemConfig, currentObjective: number) => {
  let isGood = true;
  let objective = 0;
  switch (type) {
    case 'disponibilidad': 
      objective = currentObjective;
      isGood = value >= objective; 
      break;
    case 'mtbf': 
      objective = config.obj_mtbf || 50;
      isGood = value >= objective; 
      break;
    case 'mttr': 
      objective = config.obj_mttr || 4;
      isGood = value <= objective; 
      break;
    case 'mwt': 
      objective = config.obj_mwt || 2;
      isGood = value <= objective; 
      break;
    case 'mdt': 
      objective = config.obj_mdt || 12;
      isGood = value <= objective; 
      break;
  }
  return isGood 
    ? { label: 'Bien', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/30', icon: ThumbsUp, objective } 
    : { label: 'Mejorar', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-500/30', icon: ThumbsDown, objective };
};

const StatusBadge = ({ value, type, config, currentObjective }: { value: number, type: string, config: SystemConfig, currentObjective: number }) => {
  const status = getIndicatorStatus(value, type, config, currentObjective);
  const Icon = status.icon;
  const objLabel = type === 'disponibilidad' ? `${status.objective}%` : `${status.objective}h`;
  const comparison = (type === 'disponibilidad' || type === 'mtbf') ? '≥' : '≤';
  
  return (
    <div className="flex items-center space-x-2">
      <div className={cn("flex items-center space-x-1.5 px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider", status.bg, status.border, status.color)}>
        <Icon className="w-3 h-3" />
        <span>{status.label}</span>
      </div>
      <span className="text-[10px] font-bold text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-xl border border-slate-700/50">
        Obj: {comparison} {objLabel}
      </span>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ assets, workOrders, shifts, exceptions, config, selectedPlant }) => {
  const dragControls = useDragControls();
  const constraintsRef = useRef(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isHistoryMaximized, setIsHistoryMaximized] = useState(false);
  const [isHistoryMinimized, setIsHistoryMinimized] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(config.mes_curso);
  const [selectedYear, setSelectedYear] = useState(config.anio_curso);

  // History Modal States
  const [historyRange, setHistoryRange] = useState({
    startMonth: 0,
    startYear: 2026,
    endMonth: 2,
    endYear: 2026
  });
  const [historySelectedAssetIds, setHistorySelectedAssetIds] = useState<number[]>([]);
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const assetDropdownRef = useRef<HTMLDivElement>(null);
  const historyContentRef = useRef<HTMLDivElement>(null);
  const [historyZoom, setHistoryZoom] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [visibleIndicators, setVisibleIndicators] = useState({
    disponibilidad: true,
    mtbf: true,
    mttr: true,
    mwt: true,
    mdt: true
  });

  const [historyActionNote, setHistoryActionNote] = useState('');

  const monthCount = useMemo(() => {
    const start = historyRange.startYear * 12 + historyRange.startMonth;
    const end = historyRange.endYear * 12 + historyRange.endMonth;
    return Math.max(0, end - start + 1);
  }, [historyRange]);

  useEffect(() => {
    if (monthCount === 1) {
      const key = `note_${historyRange.startYear}_${historyRange.startMonth}`;
      const savedNote = getFromStorage(selectedPlant, `history_action_plan_${key}`, '');
      setHistoryActionNote(prev => prev !== savedNote ? savedNote : prev);
    } else {
      setHistoryActionNote(prev => prev !== '' ? '' : prev);
    }
  }, [historyRange.startMonth, historyRange.startYear, monthCount, selectedPlant]);

  const handleSaveActionNote = () => {
    const key = `note_${historyRange.startYear}_${historyRange.startMonth}`;
    saveToStorage(selectedPlant, `history_action_plan_${key}`, historyActionNote);
    alert('Plan de acción guardado correctamente para este mes.');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(event.target as Node)) {
        setIsAssetDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if ((assets || []).length > 0) {
      if ((selectedAssetIds || []).length === 0) {
        setSelectedAssetIds((assets || []).map(a => a.id));
      }
      if ((historySelectedAssetIds || []).length === 0) {
        setHistorySelectedAssetIds((assets || []).map(a => a.id));
      }
    }
  }, [assets, selectedAssetIds.length, historySelectedAssetIds.length]);

  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(ot => {
      if (!ot.inicio_falla) return false;
      const date = new Date(ot.inicio_falla);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });
  }, [workOrders, selectedMonth, selectedYear]);

  const currentObjective = useMemo(() => {
    const hist = config.historicalObjectives?.find(h => h.mes === selectedMonth && h.anio === selectedYear);
    return hist ? hist.obj_disp : config.obj_disp_anual;
  }, [config, selectedMonth, selectedYear]);

  // Calculate Global KPIs
  const tp = useMemo(() => 
    calculatePlannedTime(selectedMonth, selectedYear, shifts, exceptions),
  [selectedMonth, selectedYear, shifts, exceptions]);

  const assetStats = useMemo(() => 
    assets.map(asset => ({
      asset,
      stats: calculateAssetKPIs(asset, filteredWorkOrders, tp)
    })),
  [assets, filteredWorkOrders, tp]);

  const globalStats = useMemo(() => {
    const selectedStats = assetStats.filter(s => selectedAssetIds.includes(s.asset.id));
    
    const totalMdt = selectedStats.reduce((acc, s) => acc + s.stats.mdt_total, 0);
    const totalFallas = selectedStats.reduce((acc, s) => acc + s.stats.fallas, 0);
    
    // Calculate total technical repair time (MTTR * Fallas for each asset)
    const totalRepairTime = selectedStats.reduce((acc, s) => acc + (s.stats.mttr * s.stats.fallas), 0);
    // Calculate total wait time (MWT * Interventions for each asset - we need interventions count)
    // Actually, calculateAssetKPIs doesn't return total interventions, but we can derive it or sum totalMwt
    const totalWaitTime = selectedStats.reduce((acc, s) => acc + s.stats.mwt * (workOrders.filter(ot => ot.id_activo === s.asset.id && ot.estado === 'Cerrada').length), 0);
    const totalInterventions = selectedStats.reduce((acc, s) => acc + (workOrders.filter(ot => ot.id_activo === s.asset.id && ot.estado === 'Cerrada').length), 0);

    const avgDisponibilidad = (selectedStats || []).length > 0 
      ? (selectedStats || []).reduce((acc, s) => acc + s.stats.disponibilidad, 0) / (selectedStats || []).length 
      : 100;

    return {
      disponibilidad: avgDisponibilidad,
      mtbf: totalFallas > 0 ? (tp - totalMdt) / totalFallas : tp,
      mttr: totalFallas > 0 ? totalRepairTime / totalFallas : 0,
      mwt: totalInterventions > 0 ? totalWaitTime / totalInterventions : 0,
      mdt_total: totalMdt,
      fallas: totalFallas
    };
  }, [assetStats, tp, selectedAssetIds]);

  // Chart Data
  const chartData = useMemo(() => 
    assetStats
      .filter(s => selectedAssetIds.includes(s.asset.id))
      .map(s => ({
        name: s.asset.codigo_iso,
        disponibilidad: parseFloat(s.stats.disponibilidad.toFixed(1)),
        meta: currentObjective
      })),
  [assetStats, currentObjective, selectedAssetIds]);

  const sortedAssetStats = useMemo(() => {
    return [...assetStats].sort((a, b) => {
      const aSelected = selectedAssetIds.includes(a.asset.id);
      const bSelected = selectedAssetIds.includes(b.asset.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });
  }, [assetStats, selectedAssetIds]);

  const otStatusCounts = useMemo(() => {
    const counts = {
      Abierta: 0,
      'En Progreso': 0,
      'Esperando Repuesto': 0,
      Cerrada: 0
    };
    filteredWorkOrders.forEach(ot => {
      if (counts[ot.estado] !== undefined) counts[ot.estado]++;
    });
    return counts;
  }, [filteredWorkOrders]);

  const criticalAssets = useMemo(() => 
    assetStats
      .filter(s => selectedAssetIds.includes(s.asset.id) && s.stats.disponibilidad < currentObjective)
      .sort((a, b) => a.stats.disponibilidad - b.stats.disponibilidad)
      .slice(0, 5),
  [assetStats, currentObjective, selectedAssetIds]);

  // History Data Calculation
  const historyData = useMemo(() => {
    const data = [];
    let currentYear = historyRange.startYear;
    let currentMonth = historyRange.startMonth;

    while (
      currentYear < historyRange.endYear || 
      (currentYear === historyRange.endYear && currentMonth <= historyRange.endMonth)
    ) {
      const monthName = new Date(currentYear, currentMonth).toLocaleString('es', { month: 'short' });
      const label = `${monthName} ${currentYear}`;
      
      const tp = calculatePlannedTime(currentMonth, currentYear, shifts, exceptions);
      const monthWorkOrders = workOrders.filter(ot => {
        if (!ot.inicio_falla) return false;
        const d = new Date(ot.inicio_falla);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const selectedAssets = assets.filter(a => historySelectedAssetIds.includes(a.id));
      const monthStats = selectedAssets.map(asset => calculateAssetKPIs(asset, monthWorkOrders, tp));
      
      const totalMdt = monthStats.reduce((acc, s) => acc + s.mdt_total, 0);
      const totalMttr = monthStats.reduce((acc, s) => acc + s.mttr, 0);
      const totalMwt = monthStats.reduce((acc, s) => acc + s.mwt, 0);
      const totalFallas = monthStats.reduce((acc, s) => acc + s.fallas, 0);
      
      const avgDisp = monthStats.length > 0 
        ? monthStats.reduce((acc, s) => acc + s.disponibilidad, 0) / monthStats.length 
        : 100;

      data.push({
        name: label,
        disponibilidad: parseFloat(avgDisp.toFixed(1)),
        mtbf: parseFloat((totalFallas > 0 ? (tp - totalMdt) / totalFallas : tp).toFixed(1)),
        mttr: parseFloat((totalFallas > 0 ? totalMttr / monthStats.length : 0).toFixed(1)),
        mwt: parseFloat((totalFallas > 0 ? totalMwt / monthStats.length : 0).toFixed(1)),
        mdt: parseFloat(totalMdt.toFixed(1)),
        fallas: totalFallas
      });

      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
    return data;
  }, [historyRange, assets, historySelectedAssetIds, workOrders, shifts, exceptions]);

  const historyAccumulatedStats = useMemo(() => {
    if (historyData.length === 0) return null;
    
    const totalDisp = historyData.reduce((acc, d) => acc + d.disponibilidad, 0);
    const totalMtbf = historyData.reduce((acc, d) => acc + d.mtbf, 0);
    const totalMttr = historyData.reduce((acc, d) => acc + d.mttr, 0);
    const totalMwt = historyData.reduce((acc, d) => acc + d.mwt, 0);
    const totalMdt = historyData.reduce((acc, d) => acc + d.mdt, 0);
    const totalFallas = historyData.reduce((acc, d) => acc + d.fallas, 0);
    
    return {
      avgDisponibilidad: totalDisp / historyData.length,
      avgMtbf: totalMtbf / historyData.length,
      avgMttr: totalMttr / historyData.length,
      avgMwt: totalMwt / historyData.length,
      totalMdt: totalMdt,
      totalFallas: totalFallas
    };
  }, [historyData]);

  const exportToPDF = async () => {
    if (!historyContentRef.current) return;
    setIsExporting(true);
    
    // Give React time to render the PDF-only elements
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      // Temporarily remove zoom scale for better PDF capture
      const element = historyContentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a',
        logging: false,
        windowWidth: 1400 // Ensure a consistent width for capture
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // If height is more than one page, we might need to handle multiple pages
      // But for now, let's stick to one long page or standard fit
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, 297));
      
      pdf.save(`Analisis_Historico_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Dashboard */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20">
            <Activity className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Dashboard Analítico</h2>
            <div className="flex items-center space-x-2 mt-1">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-2 py-1 text-xs text-white focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {Array.from({length: 12}).map((_, i) => (
                  <option key={i} value={i}>{new Date(2000, i).toLocaleString('es', { month: 'long' }).toUpperCase()}</option>
                ))}
              </select>
              <input 
                type="number" 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-16 bg-slate-800/50 border border-slate-700/50 rounded-lg px-2 py-1 text-xs text-white focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsHistoryModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-indigo-500/20"
        >
          <History className="w-4 h-4" />
          <span>Análisis Histórico</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
        {[
          { label: 'Disponibilidad', value: `${globalStats.disponibilidad.toFixed(1)}%`, sub: 'Global', icon: <Activity className="w-5 h-5" />, color: 'text-blue-400', bg: 'bg-blue-400/10', trend: globalStats.disponibilidad >= currentObjective ? 'up' : 'down' },
          { label: 'MTBF (h)', value: globalStats.mtbf.toFixed(1), sub: 'Tiempo entre fallas', icon: <TrendingUp className="w-5 h-5" />, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
          { label: 'MTTR (h)', value: globalStats.mttr.toFixed(1), sub: 'Tiempo de reparación', icon: <Clock className="w-5 h-5" />, color: 'text-amber-400', bg: 'bg-amber-400/10' },
          { label: 'MWT (h)', value: globalStats.mwt.toFixed(1), sub: 'Tiempo de espera', icon: <Clock className="w-5 h-5" />, color: 'text-purple-400', bg: 'bg-purple-400/10' },
          { label: 'MDT Total (h)', value: globalStats.mdt_total.toFixed(1), sub: 'Indisponibilidad', icon: <AlertTriangle className="w-5 h-5" />, color: 'text-red-400', bg: 'bg-red-400/10' },
          { label: 'Total Fallas', value: globalStats.fallas, sub: 'En el período', icon: <AlertTriangle className="w-5 h-5" />, color: 'text-slate-400', bg: 'bg-slate-400/10' },
        ].map((kpi, i) => (
          <div key={i} className="bg-[#1e293b] p-5 rounded-2xl border border-slate-700/50 shadow-xl hover:border-slate-600 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-2 rounded-xl", kpi.bg)}>
                {React.cloneElement(kpi.icon as React.ReactElement, { className: cn("w-5 h-5", kpi.color) })}
              </div>
              {kpi.trend && (
                <div className={cn("flex items-center text-xs font-bold", kpi.trend === 'up' ? "text-emerald-400" : "text-red-400")}>
                  {kpi.trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {kpi.trend === 'up' ? 'OK' : 'Bajo'}
                </div>
              )}
            </div>
            <h3 className="text-2xl font-bold text-white mb-1 group-hover:scale-105 transition-transform origin-left">{kpi.value}</h3>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
            <p className="text-[10px] text-slate-500 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart: Availability by Asset */}
        <div className="lg:col-span-2 bg-[#1e293b] p-6 rounded-3xl border border-slate-700/50 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>Disponibilidad por Equipo vs Meta ({currentObjective}%)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">Comparativa de rendimiento individual en el período actual</p>
            </div>
            <button 
              onClick={() => setIsFilterModalOpen(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors relative"
            >
              <Filter className="w-4 h-4 text-slate-400" />
              {selectedAssetIds.length > 0 && selectedAssetIds.length < assets.length && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-[#1e293b]"></span>
              )}
            </button>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  domain={[0, 105]}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  cursor={{ fill: '#334155', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#f8fafc' }}
                />
                <ReferenceLine y={currentObjective} stroke="#ef4444" strokeDasharray="5 5" label={{ position: 'right', value: 'Meta', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                <Bar dataKey="disponibilidad" radius={[6, 6, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.disponibilidad >= currentObjective ? '#10b981' : '#3b82f6'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Global Gauge & OT Status */}
        <div className="space-y-8">
          {/* Global Availability Gauge (Simplified) */}
          <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700/50 shadow-2xl flex flex-col items-center justify-center text-center">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Disponibilidad Global</h3>
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800" />
                <circle 
                  cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" 
                  strokeDasharray={502.6}
                  strokeDashoffset={502.6 - (502.6 * globalStats.disponibilidad) / 100}
                  className={cn("transition-all duration-1000", globalStats.disponibilidad >= currentObjective ? "text-emerald-500" : "text-blue-500")}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white">{globalStats.disponibilidad.toFixed(1)}%</span>
                <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Meta: {currentObjective}%</span>
              </div>
            </div>
          </div>

          {/* OT Status Summary */}
          <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700/50 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Estado de Órdenes</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Abierta', count: otStatusCounts.Abierta, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                { label: 'En Progreso', count: otStatusCounts['En Progreso'], color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                { label: 'Esperando', count: otStatusCounts['Esperando Repuesto'], color: 'bg-red-500/20 text-red-400 border-red-500/30' },
                { label: 'Cerrada', count: otStatusCounts.Cerrada, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
              ].map((status, i) => (
                <div key={i} className={cn("p-4 rounded-2xl border flex flex-col items-center justify-center", status.color)}>
                  <span className="text-2xl font-black mb-1">{status.count}</span>
                  <span className="text-[10px] font-bold uppercase text-center">{status.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Table & Top 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Indicators Table */}
        <div className="lg:col-span-2 bg-[#1e293b] rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
              <span>Indicadores por Equipo</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <th className="px-6 py-4">Equipo</th>
                  <th className="px-6 py-4">Disp. %</th>
                  <th className="px-6 py-4">MTBF (h)</th>
                  <th className="px-6 py-4">MTTR (h)</th>
                  <th className="px-6 py-4">MWT (h)</th>
                  <th className="px-6 py-4 text-center">Fallas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {sortedAssetStats.map((s, i) => (
                  <tr key={i} className={cn("hover:bg-slate-800/30 transition-colors group", !selectedAssetIds.includes(s.asset.id) && "opacity-40")}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-blue-400 border border-slate-700">
                          {s.asset.codigo_iso}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{s.asset.nombre_equipo}</p>
                          <p className="text-[10px] text-slate-500">{s.asset.sector_area}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("text-sm font-bold", s.stats.disponibilidad >= currentObjective ? "text-emerald-400" : "text-blue-400")}>
                        {s.stats.disponibilidad.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">{s.stats.mtbf.toFixed(1)}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{s.stats.mttr.toFixed(1)}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{s.stats.mwt.toFixed(1)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("px-2 py-0.5 rounded-lg text-xs font-bold", s.stats.fallas > 0 ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400")}>
                        {s.stats.fallas}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 5 Critical Assets */}
        <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700/50 shadow-2xl">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>TOP 5 - Equipos Críticos</span>
          </h3>
          
          <div className="space-y-4">
            {criticalAssets.length > 0 ? (
              criticalAssets.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-900/40 rounded-2xl border border-slate-700/50 hover:border-red-500/30 transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-xs font-bold text-red-400 border border-red-500/20">
                      {s.asset.codigo_iso}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{s.asset.nombre_equipo}</p>
                      <p className="text-[10px] text-slate-500">Disp: {s.stats.disponibilidad.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-red-400">-{ (currentObjective - s.stats.disponibilidad).toFixed(1) }%</p>
                    <p className="text-[10px] text-slate-500">vs Meta</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-sm font-bold text-white">¡Excelente!</p>
                <p className="text-xs text-slate-500">No hay equipos críticos en este período.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Modal */}
      <AnimatePresence>
        {isFilterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-blue-400" />
                  <span>Filtrar Equipos en Gráfico</span>
                </h3>
                <button onClick={() => setIsFilterModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/20">
                <button 
                  onClick={() => setSelectedAssetIds(assets.map(a => a.id))}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300"
                >
                  Seleccionar Todos
                </button>
                <button 
                  onClick={() => setSelectedAssetIds([])}
                  className="text-xs font-bold text-slate-400 hover:text-slate-300"
                >
                  Deseleccionar Todos
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-2">
                {assets.map(asset => (
                  <label key={asset.id} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-slate-800/50 cursor-pointer border border-transparent hover:border-slate-700 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={selectedAssetIds.includes(asset.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAssetIds([...selectedAssetIds, asset.id]);
                        } else {
                          setSelectedAssetIds(selectedAssetIds.filter(id => id !== asset.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-200">{asset.codigo_iso}</p>
                      <p className="text-xs text-slate-500">{asset.nombre_equipo}</p>
                    </div>
                  </label>
                ))}
              </div>
              
              <div className="p-4 border-t border-slate-700 bg-slate-800/50">
                <button 
                  onClick={() => setIsFilterModalOpen(false)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all"
                >
                  Aplicar Filtros
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <div 
            ref={constraintsRef}
            className={cn(
              "fixed z-50 flex items-center justify-center transition-all duration-300",
              isHistoryMinimized 
                ? "bottom-4 right-4 w-72 h-16 inset-auto" 
                : "inset-0 bg-black/60 backdrop-blur-sm p-4"
            )}
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              drag={!isHistoryMaximized && !isHistoryMinimized}
              dragControls={dragControls}
              dragListener={false}
              dragMomentum={false}
              dragConstraints={constraintsRef}
              className={cn(
                "bg-[#0f172a] border border-slate-700 shadow-2xl overflow-hidden flex flex-col transition-all duration-300",
                isHistoryMinimized 
                  ? "w-full h-full rounded-xl" 
                  : isHistoryMaximized 
                    ? "w-full h-full rounded-none" 
                    : "w-full max-w-7xl h-[90vh] rounded-3xl"
              )}
            >
              {/* Modal Header */}
              <div 
                onPointerDown={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('button')) return;
                  !isHistoryMaximized && !isHistoryMinimized && dragControls.start(e);
                }}
                className={cn(
                  "p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50",
                  !isHistoryMaximized && !isHistoryMinimized && "cursor-grab active:cursor-grabbing touch-none",
                  isHistoryMinimized && "h-full py-0"
                )}
              >
                <div className="flex items-center space-x-4">
                  <div className={cn(
                    "p-2 bg-indigo-600/20 rounded-xl border border-indigo-500/30",
                    isHistoryMinimized && "p-1.5"
                  )}>
                    <History className={cn("text-indigo-400", isHistoryMinimized ? "w-4 h-4" : "w-6 h-6")} />
                  </div>
                  <div>
                    <h3 className={cn("font-bold text-white", isHistoryMinimized ? "text-sm" : "text-xl")}>
                      Análisis Histórico
                    </h3>
                    {!isHistoryMinimized && (
                      <p className="text-xs text-slate-400">Comparación de KPIs por períodos y equipos</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!isHistoryMinimized && (
                    <button 
                      onClick={exportToPDF}
                      disabled={isExporting}
                      className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-lg shadow-emerald-500/20 mr-2"
                    >
                      {isExporting ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      <span>{isExporting ? 'Generando...' : 'PDF'}</span>
                    </button>
                  )}
                  {!isHistoryMinimized && (
                    <div className="flex items-center bg-slate-800 rounded-lg p-1 mr-4 border border-slate-700">
                      <button 
                        onClick={() => setHistoryZoom(Math.max(0.3, historyZoom - 0.1))}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                        title="Zoom Out"
                      >
                        <Minimize2 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => setHistoryZoom(1)}
                        className="px-2 text-[10px] font-mono text-slate-300 w-12 text-center hover:text-indigo-400 transition-colors"
                        title="Reset Zoom (100%)"
                      >
                        {Math.round(historyZoom * 100)}%
                      </button>
                      <button 
                        onClick={() => setHistoryZoom(Math.min(3, historyZoom + 0.1))}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                        title="Zoom In"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={() => setIsHistoryMinimized(!isHistoryMinimized)}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title={isHistoryMinimized ? "Restaurar" : "Minimizar"}
                  >
                    {isHistoryMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                  </button>
                  
                  {!isHistoryMinimized && (
                    <button 
                      onClick={() => setIsHistoryMaximized(!isHistoryMaximized)}
                      className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                      title={isHistoryMaximized ? "Restaurar" : "Maximizar"}
                    >
                      {isHistoryMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                  )}
                  
                  <button 
                    onClick={() => {
                      setIsHistoryModalOpen(false);
                      setIsHistoryMaximized(false);
                      setIsHistoryMinimized(false);
                    }} 
                    className="p-2 hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                    title="Cerrar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              {!isHistoryMinimized && (
                <div className="flex-1 overflow-y-auto bg-[#0f172a] relative">
                  <div 
                    ref={historyContentRef}
                    className={cn(
                      "p-6 space-y-8 origin-top-left transition-transform duration-200",
                      isExporting && "pdf-mode bg-[#0f172a]"
                    )}
                    style={{ 
                      transform: isExporting ? 'none' : `scale(${historyZoom})`,
                      width: isExporting ? '1200px' : `${100 / historyZoom}%`,
                      minHeight: '100%'
                    }}
                  >
                    {/* PDF Header */}
                    {isExporting && (
                      <div className="flex justify-between items-center mb-10 border-b-2 border-indigo-500 pb-8">
                        <div className="flex items-center space-x-6">
                          {config.logo_path ? (
                            <img 
                              src={config.logo_path} 
                              alt="Logo" 
                              className="h-20 w-auto object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                              <Activity className="w-10 h-10 text-white" />
                            </div>
                          )}
                          <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">{config.titulo_sistema || 'POWER DASHBOARD'}</h1>
                            <p className="text-indigo-400 font-bold text-xs tracking-[0.2em]">{config.subtitulo_sistema || 'ANÁLISIS TÉCNICO DE MANTENIMIENTO'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <h2 className="text-xl font-bold text-white uppercase border-b border-indigo-500/30 pb-1 mb-2 inline-block">Reporte Histórico</h2>
                          <p className="text-slate-400 text-sm font-medium">{new Date().toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                          <p className="text-indigo-300 text-xs mt-2 font-bold px-3 py-1 bg-indigo-500/10 rounded-full inline-block">Período: {historyData[0]?.name} - {historyData[historyData.length-1]?.name}</p>
                        </div>
                      </div>
                    )}

                    {/* Accumulated KPIs Summary */}
                    {monthCount > 1 && historyAccumulatedStats && (
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center pdf-center-content">
                          <p className="text-[10px] font-bold text-blue-400 uppercase mb-1 tracking-wider">Disp. Media</p>
                          <p className="text-2xl font-black text-white">{historyAccumulatedStats.avgDisponibilidad.toFixed(1)}%</p>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1 tracking-wider">MTBF Medio</p>
                          <p className="text-2xl font-black text-white">{historyAccumulatedStats.avgMtbf.toFixed(1)}h</p>
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center">
                          <p className="text-[10px] font-bold text-amber-400 uppercase mb-1 tracking-wider">MTTR Medio</p>
                          <p className="text-2xl font-black text-white">{historyAccumulatedStats.avgMttr.toFixed(1)}h</p>
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center">
                          <p className="text-[10px] font-bold text-purple-400 uppercase mb-1 tracking-wider">MWT Medio</p>
                          <p className="text-2xl font-black text-white">{historyAccumulatedStats.avgMwt.toFixed(1)}h</p>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center">
                          <p className="text-[10px] font-bold text-red-400 uppercase mb-1 tracking-wider">MDT Acumulado</p>
                          <p className="text-2xl font-black text-white">{historyAccumulatedStats.totalMdt.toFixed(1)}h</p>
                        </div>
                        <div className="bg-slate-500/10 border border-slate-500/20 p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Total Fallas</p>
                          <p className="text-2xl font-black text-white">{historyAccumulatedStats.totalFallas}</p>
                        </div>
                      </div>
                    )}
                    {/* Filters Section */}
                  <div className="space-y-6">
                    {/* Period Filter */}
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-indigo-400" />
                        <span className="text-sm font-bold text-slate-200 uppercase tracking-widest">Período:</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-300 uppercase">Desde:</span>
                          {isExporting ? (
                            <div className="flex items-center space-x-2 min-w-[140px]">
                              <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-base font-bold text-white capitalize text-center">
                                {new Date(2000, historyRange.startMonth).toLocaleString('es', { month: 'long' })}
                              </div>
                              <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-base font-bold text-white text-center min-w-[60px]">
                                {historyRange.startYear}
                              </div>
                            </div>
                          ) : (
                            <>
                              <select 
                                value={historyRange.startMonth}
                                onChange={(e) => setHistoryRange({ ...historyRange, startMonth: Number(e.target.value) })}
                                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all hover:border-slate-500"
                              >
                                {Array.from({length: 12}).map((_, i) => (
                                  <option key={i} value={i}>{new Date(2000, i).toLocaleString('es', { month: 'long' })}</option>
                                ))}
                              </select>
                              <input 
                                type="number" 
                                value={historyRange.startYear}
                                onChange={(e) => setHistoryRange({ ...historyRange, startYear: Number(e.target.value) })}
                                className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all hover:border-slate-500"
                              />
                            </>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-300 uppercase">Hasta:</span>
                          {isExporting ? (
                            <div className="flex items-center space-x-2 min-w-[140px]">
                              <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-base font-bold text-white capitalize text-center">
                                {new Date(2000, historyRange.endMonth).toLocaleString('es', { month: 'long' })}
                              </div>
                              <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-base font-bold text-white text-center min-w-[60px]">
                                {historyRange.endYear}
                              </div>
                            </div>
                          ) : (
                            <>
                              <select 
                                value={historyRange.endMonth}
                                onChange={(e) => setHistoryRange({ ...historyRange, endMonth: Number(e.target.value) })}
                                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all hover:border-slate-500"
                              >
                                {Array.from({length: 12}).map((_, i) => (
                                  <option key={i} value={i}>{new Date(2000, i).toLocaleString('es', { month: 'long' })}</option>
                                ))}
                              </select>
                              <input 
                                type="number" 
                                value={historyRange.endYear}
                                onChange={(e) => setHistoryRange({ ...historyRange, endYear: Number(e.target.value) })}
                                className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all hover:border-slate-500"
                              />
                            </>
                          )}
                        </div>
                      </div>
                      <div className="px-4 py-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/30 text-xs font-bold text-indigo-300 uppercase">
                        {monthCount} {monthCount === 1 ? 'mes' : 'meses'}
                      </div>
                    </div>

                    {/* Equipment Filter */}
                    <div className="flex flex-wrap items-center gap-3 relative z-20">
                      <Filter className="w-5 h-5 text-indigo-400" />
                      <span className="text-sm font-bold text-slate-200 uppercase tracking-widest">Equipos:</span>
                      
                      <div className="relative" ref={assetDropdownRef}>
                        <button
                          onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
                          className="flex items-center space-x-3 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white hover:border-slate-500 transition-colors min-w-[240px] justify-between shadow-lg"
                        >
                          <span className="truncate font-medium">
                            {historySelectedAssetIds.length === 0 
                              ? "Seleccionar equipos..." 
                              : historySelectedAssetIds.length === assets.length 
                                ? "Todos los equipos" 
                                : `${historySelectedAssetIds.length} equipos seleccionados`}
                          </span>
                          <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", isAssetDropdownOpen && "rotate-180")} />
                        </button>

                        {isAssetDropdownOpen && (
                          <div className="absolute top-full left-0 mt-2 w-72 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/50">
                            <div className="p-3 border-b border-slate-700 bg-slate-900/80 flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-300 uppercase px-1">Lista de Equipos</span>
                              <div className="flex space-x-3">
                                <button 
                                  onClick={() => setHistorySelectedAssetIds(assets.map(a => a.id))}
                                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold uppercase"
                                >
                                  Todos
                                </button>
                                <button 
                                  onClick={() => setHistorySelectedAssetIds([])}
                                  className="text-xs text-red-400 hover:text-red-300 font-bold uppercase"
                                >
                                  Ninguno
                                </button>
                              </div>
                            </div>
                            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                              {assets.map(asset => (
                                <label 
                                  key={asset.id}
                                  className="flex items-center space-x-3 p-2.5 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors group"
                                >
                                  <input 
                                    type="checkbox"
                                    checked={historySelectedAssetIds.includes(asset.id)}
                                    onChange={() => {
                                      if (historySelectedAssetIds.includes(asset.id)) {
                                        setHistorySelectedAssetIds(historySelectedAssetIds.filter(id => id !== asset.id));
                                      } else {
                                        setHistorySelectedAssetIds([...historySelectedAssetIds, asset.id]);
                                      }
                                    }}
                                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-800"
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{asset.codigo_iso}</span>
                                    <span className="text-xs text-slate-400 truncate">{asset.nombre}</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {historySelectedAssetIds.slice(0, 4).map(id => {
                          const asset = assets.find(a => a.id === id);
                          return asset ? (
                            <span key={id} className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/40 rounded-lg text-xs font-bold text-indigo-300 shadow-sm">
                              {asset.codigo_iso}
                            </span>
                          ) : null;
                        })}
                        {historySelectedAssetIds.length > 4 && (
                          <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-slate-300">
                            +{historySelectedAssetIds.length - 4} más
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Indicators Filter */}
                    <div className="flex flex-wrap items-center gap-3">
                      <Activity className="w-5 h-5 text-indigo-400" />
                      <span className="text-sm font-bold text-slate-200 uppercase tracking-widest">Indicadores:</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'disponibilidad', label: 'Disponibilidad', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-500/30' },
                          { id: 'mtbf', label: 'MTBF', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/30' },
                          { id: 'mttr', label: 'MTTR', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-500/30' },
                          { id: 'mwt', label: 'MWT', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-500/30' },
                          { id: 'mdt', label: 'MDT', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-500/30' },
                        ].map(ind => (
                          <button
                            key={ind.id}
                            onClick={() => setVisibleIndicators({ ...visibleIndicators, [ind.id]: !visibleIndicators[ind.id as keyof typeof visibleIndicators] })}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center space-x-2 shadow-sm",
                              visibleIndicators[ind.id as keyof typeof visibleIndicators]
                                ? cn(ind.bg, ind.border, ind.color)
                                : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                            )}
                          >
                            <Activity className="w-4 h-4" />
                            <span>{ind.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Charts Grid */}
                  <div className="space-y-8">
                    {/* Main Trend Chart */}
                    <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 shadow-2xl">
                      <h4 className="text-lg font-bold text-slate-200 uppercase tracking-widest mb-8 border-l-4 border-indigo-500 pl-4">Tendencia de Indicadores</h4>
                      <div className="h-[255px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={historyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="name" stroke="#cbd5e1" fontSize={16} fontWeight="bold" tickLine={false} axisLine={false} dy={15} />
                            <YAxis yAxisId="left" stroke="#cbd5e1" fontSize={16} fontWeight="bold" tickLine={false} axisLine={false} />
                            <YAxis yAxisId="right" orientation="right" stroke="#cbd5e1" fontSize={16} fontWeight="bold" tickLine={false} axisLine={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                              itemStyle={{ fontSize: '16px', fontWeight: 'bold', padding: '4px 0' }}
                              labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}
                            />
                            {visibleIndicators.disponibilidad && (
                              <Line yAxisId="left" type="monotone" dataKey="disponibilidad" name="Disponibilidad (%)" stroke="#3b82f6" strokeWidth={4} dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                            )}
                            {visibleIndicators.mtbf && (
                              <Line yAxisId="right" type="monotone" dataKey="mtbf" name="MTBF (h)" stroke="#10b981" strokeWidth={4} dot={{ r: 5, fill: '#10b981', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                            )}
                            {visibleIndicators.mttr && (
                              <Line yAxisId="right" type="monotone" dataKey="mttr" name="MTTR (h)" stroke="#f59e0b" strokeWidth={3} strokeDasharray="6 6" dot={{ r: 4 }} />
                            )}
                            {visibleIndicators.mwt && (
                              <Line yAxisId="right" type="monotone" dataKey="mwt" name="MWT (h)" stroke="#a855f7" strokeWidth={3} strokeDasharray="6 6" dot={{ r: 4 }} />
                            )}
                            {visibleIndicators.mdt && (
                              <Line yAxisId="right" type="monotone" dataKey="mdt" name="MDT (h)" stroke="#ef4444" strokeWidth={3} strokeDasharray="6 6" dot={{ r: 4 }} />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Individual KPI Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Disponibilidad Chart */}
                      <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 shadow-xl">
                        <h5 className="text-base font-bold text-blue-400 uppercase mb-8 flex items-center justify-between">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-3">
                              <span>Disponibilidad (%)</span>
                              {historyAccumulatedStats && <StatusBadge value={historyAccumulatedStats.avgDisponibilidad} type="disponibilidad" config={config} currentObjective={currentObjective} />}
                            </div>
                            {historyAccumulatedStats && (
                              <span className="text-xs text-slate-400 normal-case font-medium mt-1">Promedio Período: {historyAccumulatedStats.avgDisponibilidad.toFixed(1)}%</span>
                            )}
                          </div>
                          <span className="text-xs bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">KPI</span>
                        </h5>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={historyData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} domain={[0, 105]} />
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                              <ReferenceLine y={currentObjective} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} label={{ position: 'right', value: 'Obj', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                              <Bar dataKey="disponibilidad" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={35} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* MTBF Chart */}
                      <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 shadow-xl">
                        <h5 className="text-base font-bold text-emerald-400 uppercase mb-8 flex items-center justify-between">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-3">
                              <span>MTBF (horas)</span>
                              {historyAccumulatedStats && <StatusBadge value={historyAccumulatedStats.avgMtbf} type="mtbf" config={config} currentObjective={currentObjective} />}
                            </div>
                            {historyAccumulatedStats && (
                              <span className="text-xs text-slate-400 normal-case font-medium mt-1">Promedio Período: {historyAccumulatedStats.avgMtbf.toFixed(1)}h</span>
                            )}
                          </div>
                          <span className="text-xs bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">KPI</span>
                        </h5>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={historyData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                              <Line type="monotone" dataKey="mtbf" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* MTTR Chart */}
                      <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 shadow-xl">
                        <h5 className="text-base font-bold text-amber-400 uppercase mb-8 flex items-center justify-between">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-3">
                              <span>MTTR (horas)</span>
                              {historyAccumulatedStats && <StatusBadge value={historyAccumulatedStats.avgMttr} type="mttr" config={config} currentObjective={currentObjective} />}
                            </div>
                            {historyAccumulatedStats && (
                              <span className="text-xs text-slate-400 normal-case font-medium mt-1">Promedio Período: {historyAccumulatedStats.avgMttr.toFixed(1)}h</span>
                            )}
                          </div>
                          <span className="text-xs bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">KPI</span>
                        </h5>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={historyData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                              <Line type="monotone" dataKey="mttr" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* MWT Chart */}
                      <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 shadow-xl">
                        <h5 className="text-base font-bold text-purple-400 uppercase mb-8 flex items-center justify-between">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-3">
                              <span>MWT (horas)</span>
                              {historyAccumulatedStats && <StatusBadge value={historyAccumulatedStats.avgMwt} type="mwt" config={config} currentObjective={currentObjective} />}
                            </div>
                            {historyAccumulatedStats && (
                              <span className="text-xs text-slate-400 normal-case font-medium mt-1">Promedio Período: {historyAccumulatedStats.avgMwt.toFixed(1)}h</span>
                            )}
                          </div>
                          <span className="text-xs bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">KPI</span>
                        </h5>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={historyData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                              <Line type="monotone" dataKey="mwt" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, fill: '#a855f7' }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                        {/* MDT Chart */}
                        <div className={cn("bg-slate-900/40 p-8 rounded-3xl border border-slate-800 shadow-xl", monthCount === 1 ? "lg:col-span-2 flex flex-col lg:flex-row gap-8" : "lg:col-span-2")}>
                          <div className="flex-1">
                            <h5 className="text-base font-bold text-red-400 uppercase mb-8 flex items-center justify-between">
                              <div className="flex flex-col">
                                <div className="flex items-center space-x-3">
                                  <span>MDT Total (horas)</span>
                                  {historyAccumulatedStats && <StatusBadge value={historyAccumulatedStats.totalMdt} type="mdt" config={config} currentObjective={currentObjective} />}
                                </div>
                                {historyAccumulatedStats && (
                                  <span className="text-xs text-slate-400 normal-case font-medium mt-1">Acumulado Período: {historyAccumulatedStats.totalMdt.toFixed(1)}h</span>
                                )}
                              </div>
                              <span className="text-xs bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">KPI</span>
                            </h5>
                            <div className="h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={historyData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                                  <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                                  <Line type="monotone" dataKey="mdt" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {monthCount === 1 && (
                            <div className="w-full lg:w-96 space-y-4 pt-8 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-700/50 pl-0 lg:pl-8 flex flex-col">
                              <h5 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-blue-400" />
                                <span>{config.titulo_plan_accion || 'Plan de Acción / Notas Gerencia'}</span>
                              </h5>
                              
                              {isExporting ? (
                                <div className="w-full min-h-[12rem] bg-slate-950/50 border border-slate-700/50 rounded-2xl p-4 text-sm text-slate-300 text-justify whitespace-pre-wrap leading-relaxed pdf-justify-text">
                                  {historyActionNote || "No se registró plan de acción para este período."}
                                </div>
                              ) : (
                                <textarea 
                                  value={historyActionNote}
                                  onChange={(e) => setHistoryActionNote(e.target.value)}
                                  className="w-full h-48 bg-slate-950/50 border border-slate-700/50 rounded-2xl p-4 text-sm text-slate-300 focus:border-blue-500/50 focus:outline-none resize-none transition-all placeholder:text-slate-700"
                                  placeholder="Describa el plan de acción correctivo para mejorar los indicadores bajos de este mes..."
                                />
                              )}
                              
                              {!isExporting && (
                                <button 
                                  onClick={handleSaveActionNote}
                                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-2 active:scale-[0.98]"
                                >
                                  <Save className="w-4 h-4" />
                                  <span>Guardar Plan</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
