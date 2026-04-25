import React, { useState, useMemo } from 'react';
import { Asset, ProductionLog, ProductionCycle } from '../types';
import { 
  Factory, 
  Plus, 
  History, 
  Activity, 
  TrendingUp, 
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Clock,
  Edit2,
  GripVertical,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence, useDragControls } from 'motion/react';

interface ProductionProps {
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  productionLogs: ProductionLog[];
  setProductionLogs: React.Dispatch<React.SetStateAction<ProductionLog[]>>;
}

const Production: React.FC<ProductionProps> = ({ assets, setAssets, productionLogs, setProductionLogs }) => {
  const dragControls = useDragControls();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssetEditModalOpen, setIsAssetEditModalOpen] = useState(false);
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [isAssetSelectionModalOpen, setIsAssetSelectionModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
  const [monthlyAssetId, setMonthlyAssetId] = useState<number | null>(null);
  const [monthlyData, setMonthlyData] = useState<Record<string, ProductionCycle[]>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [newAssetHours, setNewAssetHours] = useState<string>('');
  const [filterAssetId, setFilterAssetId] = useState<number | ''>('');

  // Modal State
  const [selectedAssetId, setSelectedAssetId] = useState<number | ''>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cycles, setCycles] = useState<ProductionCycle[]>([{ start: '', end: '' }]);
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');

  const totalHoras = useMemo(() => (productionLogs || []).reduce((acc, log) => acc + log.horas_operacion, 0), [productionLogs]);
  const totalCiclos = useMemo(() => (productionLogs || []).reduce((acc, log) => acc + log.ciclos, 0), [productionLogs]);
  const totalRegistros = (productionLogs || []).length;

  const filteredLogs = useMemo(() => {
    if (filterAssetId === '') return productionLogs;
    return productionLogs.filter(log => log.id_activo === filterAssetId);
  }, [productionLogs, filterAssetId]);

  const calculateCycleHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let diff = (endH * 60 + endM) - (startH * 60 + startM);
    if (diff < 0) diff += 24 * 60; // Handle overnight
    return diff / 60;
  };

  const currentDayHours = useMemo(() => {
    return cycles.reduce((acc, cycle) => acc + calculateCycleHours(cycle.start, cycle.end), 0);
  }, [cycles]);

  const formatHoursMinutes = (decimalHours: number) => {
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const validateCycles = () => {
    const validCycles = cycles.filter(c => c.start && c.end);
    if (validCycles.length === 0) {
      setError('Debe ingresar al menos un ciclo completo.');
      return false;
    }

    const intervals = validCycles.map(c => {
      const [startH, startM] = c.start.split(':').map(Number);
      const [endH, endM] = c.end.split(':').map(Number);
      let startMin = startH * 60 + startM;
      let endMin = endH * 60 + endM;
      if (endMin <= startMin) endMin += 24 * 60;
      return { start: startMin, end: endMin };
    });

    for (let i = 0; i < intervals.length; i++) {
      for (let j = i + 1; j < intervals.length; j++) {
        if (Math.max(intervals[i].start, intervals[j].start) < Math.min(intervals[i].end, intervals[j].end)) {
          setError('Los ciclos horarios no pueden solaparse.');
          return false;
        }
      }
    }
    setError('');
    return true;
  };

  const handleAddCycle = () => {
    if (cycles.length < 4) {
      setCycles([...cycles, { start: '', end: '' }]);
    }
  };

  const handleRemoveCycle = (index: number) => {
    setCycles(cycles.filter((_, i) => i !== index));
  };

  const handleCycleChange = (index: number, field: 'start' | 'end', value: string) => {
    const newCycles = [...cycles];
    newCycles[index][field] = value;
    setCycles(newCycles);
  };

  const handleSave = () => {
    if (selectedAssetId === '') {
      setError('Debe seleccionar un equipo.');
      return;
    }
    if (!validateCycles()) return;

    const validCycles = cycles.filter(c => c.start && c.end);
    const totalHours = currentDayHours;

    if (editingLogId) {
      // Handle Edit
      const oldLog = productionLogs.find(l => l.id === editingLogId);
      if (oldLog) {
        // Update Asset Hours (subtract old, add new)
        setAssets(prev => prev.map(asset => {
          if (asset.id === oldLog.id_activo) {
            // If asset changed, we need to handle both
            if (oldLog.id_activo === selectedAssetId) {
              return { ...asset, horas_acumuladas: asset.horas_acumuladas - oldLog.horas_operacion + totalHours };
            } else {
              return { ...asset, horas_acumuladas: asset.horas_acumuladas - oldLog.horas_operacion };
            }
          }
          if (asset.id === selectedAssetId && oldLog.id_activo !== selectedAssetId) {
            return { ...asset, horas_acumuladas: asset.horas_acumuladas + totalHours };
          }
          return asset;
        }));

        // Update Log
        setProductionLogs(prev => prev.map(log => {
          if (log.id === editingLogId) {
            return {
              ...log,
              fecha: selectedDate,
              id_activo: selectedAssetId as number,
              horas_operacion: totalHours,
              ciclos: validCycles.length,
              tipo: 'Producción',
              observaciones: observaciones,
              ciclos_detalle: validCycles
            };
          }
          return log;
        }));
      }
    } else {
      // Handle New
      // Update Asset Hours
      setAssets(prev => prev.map(asset => {
        if (asset.id === selectedAssetId) {
          return { ...asset, horas_acumuladas: asset.horas_acumuladas + totalHours };
        }
        return asset;
      }));

      // Add Log
      const newLog: ProductionLog = {
        id: Date.now(),
        fecha: selectedDate,
        id_activo: selectedAssetId as number,
        horas_operacion: totalHours,
        ciclos: validCycles.length,
        tipo: 'Producción',
        observaciones: observaciones,
        ciclos_detalle: validCycles
      };
      setProductionLogs([newLog, ...productionLogs]);
    }

    // Close Modal
    setIsModalOpen(false);
    resetModal();
  };

  const resetModal = () => {
    setSelectedAssetId('');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setCycles([{ start: '', end: '' }]);
    setObservaciones('');
    setError('');
    setEditingLogId(null);
  };

  const handleEditLog = (log: ProductionLog) => {
    setEditingLogId(log.id);
    setSelectedAssetId(log.id_activo);
    setSelectedDate(log.fecha);
    setCycles(log.ciclos_detalle || [{ start: '', end: '' }]);
    setObservaciones(log.observaciones || '');
    setError('');
    setIsModalOpen(true);
  };

  const handleEditAssetHours = (asset: Asset) => {
    setMonthlyAssetId(asset.id);
    
    // Initialize monthly data from existing logs
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const initialData: Record<string, ProductionCycle[]> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const existingLog = productionLogs.find(l => l.id_activo === asset.id && l.fecha === dateStr);
      initialData[dateStr] = existingLog?.ciclos_detalle || [{ start: '', end: '' }];
    }
    
    setMonthlyData(initialData);
    setHasUnsavedChanges(false);
    setIsMonthlyModalOpen(true);
  };

  const handleMonthlyCycleChange = (date: string, index: number, field: 'start' | 'end', value: string) => {
    setMonthlyData(prev => {
      const newCycles = [...(prev[date] || [{ start: '', end: '' }])];
      newCycles[index] = { ...newCycles[index], [field]: value };
      return { ...prev, [date]: newCycles };
    });
    setHasUnsavedChanges(true);
  };

  const handleAddMonthlyCycle = (date: string) => {
    setMonthlyData(prev => {
      const currentCycles = prev[date] || [];
      if (currentCycles.length < 4) {
        return { ...prev, [date]: [...currentCycles, { start: '', end: '' }] };
      }
      return prev;
    });
    setHasUnsavedChanges(true);
  };

  const handleRemoveMonthlyCycle = (date: string, index: number) => {
    setMonthlyData(prev => {
      const currentCycles = prev[date] || [];
      if (currentCycles.length > 1) {
        return { ...prev, [date]: currentCycles.filter((_, i) => i !== index) };
      }
      return prev;
    });
    setHasUnsavedChanges(true);
  };

  const calculateMonthlyTotal = () => {
    return (Object.values(monthlyData) as ProductionCycle[][]).reduce((acc, dayCycles) => {
      return acc + dayCycles.reduce((dayAcc, cycle) => dayAcc + calculateCycleHours(cycle.start, cycle.end), 0);
    }, 0);
  };

  const handleSaveMonthly = () => {
    if (monthlyAssetId === null) return;

    // Filter out empty cycles and prepare logs
    const logsToUpdate: ProductionLog[] = [];
    let totalNewHours = 0;

    Object.entries(monthlyData).forEach(([date, cycles]) => {
      const validCycles = (cycles as ProductionCycle[]).filter(c => c.start && c.end);
      if (validCycles.length > 0) {
        const dayHours = validCycles.reduce((acc, c) => acc + calculateCycleHours(c.start, c.end), 0);
        totalNewHours += dayHours;
        logsToUpdate.push({
          id: Date.now() + Math.random(), // Temporary unique ID if new
          fecha: date,
          id_activo: monthlyAssetId as number,
          horas_operacion: dayHours,
          ciclos: validCycles.length,
          tipo: 'Producción',
          observaciones: '',
          ciclos_detalle: validCycles
        });
      }
    });

    // Update Production Logs: Remove old logs for this asset/month and add new ones
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const monthPrefix = `${year}-${month}`;

    setProductionLogs(prev => {
      const otherLogs = prev.filter(l => !(l.id_activo === monthlyAssetId && l.fecha.startsWith(monthPrefix)));
      return [...logsToUpdate, ...otherLogs].sort((a, b) => b.fecha.localeCompare(a.fecha));
    });

    // Update Asset Accumulated Hours
    setAssets(prev => prev.map(asset => {
      if (asset.id === monthlyAssetId) {
        // Recalculate total hours for this asset from all logs (including the new ones)
        const assetLogs = logsToUpdate.concat(
          productionLogs.filter(l => l.id_activo === asset.id && !l.fecha.startsWith(monthPrefix))
        );
        const newTotal = assetLogs.reduce((acc, l) => acc + l.horas_operacion, 0);
        return { ...asset, horas_acumuladas: newTotal };
      }
      return asset;
    }));

    setIsMonthlyModalOpen(false);
    setHasUnsavedChanges(false);
  };

  const handleCloseMonthly = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('Tiene cambios sin guardar. ¿Está seguro de que desea cerrar?')) {
        setIsMonthlyModalOpen(false);
      }
    } else {
      setIsMonthlyModalOpen(false);
    }
  };

  const handleDeleteLog = (id: number, id_activo: number, horas: number) => {
    if (window.confirm('¿Está seguro de eliminar este registro? Se restarán las horas del equipo.')) {
      setAssets(prev => prev.map(asset => {
        if (asset.id === id_activo) {
          return { ...asset, horas_acumuladas: Math.max(0, asset.horas_acumuladas - horas) };
        }
        return asset;
      }));
      setProductionLogs(productionLogs.filter(log => log.id !== id));
    }
  };

  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            <span>Producción — Horómetro</span>
          </h2>
          <p className="text-sm text-slate-400">Registro de horas de operación y ciclos de producción</p>
        </div>
        <button 
          onClick={() => setIsAssetSelectionModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-300 flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Registro</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
          <div className="flex items-center space-x-2 text-slate-400 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Total Horas</span>
          </div>
          <span className="text-3xl font-bold text-white">{totalHoras.toFixed(1)}</span>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
          <div className="flex items-center space-x-2 text-slate-400 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Total Ciclos</span>
          </div>
          <span className="text-3xl font-bold text-white">{totalCiclos}</span>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
          <div className="flex items-center space-x-2 text-slate-400 mb-2">
            <History className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Registros</span>
          </div>
          <span className="text-3xl font-bold text-white">{totalRegistros}</span>
        </div>
      </div>

      {/* Equipment Horometers Grid */}
      <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700/50">
        <h3 className="text-sm font-bold text-white mb-4">Horómetro de Equipos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {assets.map(asset => (
            <div key={asset.id} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex flex-col group relative">
              <button 
                onClick={() => handleEditAssetHours(asset)}
                className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-blue-600/20 text-slate-500 hover:text-blue-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                title="Editar horómetro acumulado"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center space-x-2 mb-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  asset.estado === 'Operativo' ? 'bg-emerald-500' : 
                  asset.estado === 'En Reparación' ? 'bg-red-500' : 'bg-amber-500'
                )} />
                <span className="text-xs font-bold text-blue-400">{asset.codigo_iso}</span>
              </div>
              <span className="text-xs text-slate-400 mb-2 truncate">{asset.nombre_equipo}</span>
              <div className="mt-auto flex items-baseline space-x-1">
                <span className="text-lg font-bold text-white">{asset.horas_acumuladas.toFixed(1)}</span>
                <span className="text-[10px] text-slate-500">horas</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Table */}
      <div className="space-y-4">
        <div className="w-64">
          <select 
            className="w-full bg-[#1e293b] border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            value={filterAssetId}
            onChange={(e) => setFilterAssetId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Todos los equipos</option>
            {assets.map(asset => (
              <option key={asset.id} value={asset.id}>{asset.codigo_iso} - {asset.nombre_equipo}</option>
            ))}
          </select>
        </div>

        <div className="bg-[#1e293b] rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Equipo</th>
                  <th className="px-6 py-4">Horas Operación</th>
                  <th className="px-6 py-4">Ciclos</th>
                  <th className="px-6 py-4">Observaciones</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredLogs.map((log) => {
                  const asset = assets.find(a => a.id === log.id_activo);
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-300">{log.fecha}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-blue-400">{asset?.codigo_iso}</span>
                          <span className="text-xs text-slate-400">{asset?.nombre_equipo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-white">{log.horas_operacion.toFixed(1)}h</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">{log.ciclos}</td>
                      <td className="px-6 py-4 text-sm text-slate-400 truncate max-w-[200px]">{log.observaciones || '—'}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button 
                            onClick={() => handleEditLog(log)}
                            className="p-2 hover:bg-blue-600/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all"
                            title="Editar registro"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteLog(log.id, log.id_activo, log.horas_operacion)}
                            className="p-2 hover:bg-red-600/10 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                      No hay registros de producción.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Nuevo Registro */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1e293b] rounded-3xl border border-slate-700 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  {editingLogId ? (
                    <Edit2 className="w-5 h-5 text-blue-400" />
                  ) : (
                    <Plus className="w-5 h-5 text-emerald-400" />
                  )}
                  <span>{editingLogId ? 'Editar Registro de Producción' : 'Nuevo Registro de Producción'}</span>
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-700 rounded-xl text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Equipo *</label>
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                      value={selectedAssetId}
                      onChange={(e) => setSelectedAssetId(Number(e.target.value))}
                    >
                      <option value="">— Seleccionar equipo —</option>
                      {assets.map(asset => (
                        <option key={asset.id} value={asset.id}>{asset.codigo_iso} - {asset.nombre_equipo}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fecha *</label>
                    <input 
                      type="date" 
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ciclos de Operación (Máx 4)</label>
                    {cycles.length < 4 && (
                      <button 
                        onClick={handleAddCycle}
                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Agregar Ciclo</span>
                      </button>
                    )}
                  </div>
                  
                  {cycles.map((cycle, index) => (
                    <div key={index} className="flex items-center space-x-4 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                      <span className="text-xs font-bold text-slate-500 w-6">{index + 1}.</span>
                      <div className="flex-1 flex items-center space-x-2">
                        <input 
                          type="time" 
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                          value={cycle.start}
                          onChange={(e) => handleCycleChange(index, 'start', e.target.value)}
                        />
                        <span className="text-slate-500">a</span>
                        <input 
                          type="time" 
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                          value={cycle.end}
                          onChange={(e) => handleCycleChange(index, 'end', e.target.value)}
                        />
                      </div>
                      <div className="w-16 text-right text-xs font-bold text-emerald-400">
                        {formatHoursMinutes(calculateCycleHours(cycle.start, cycle.end))} hs
                      </div>
                      {cycles.length > 1 && (
                        <button 
                          onClick={() => handleRemoveCycle(index)}
                          className="p-2 hover:bg-red-600/10 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Observaciones</label>
                  <textarea 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 min-h-[80px]"
                    placeholder="Notas adicionales sobre la producción..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-700 bg-slate-800/30 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Horas a Cargar (Día)</span>
                    <span className="text-xl font-bold text-emerald-400">{formatHoursMinutes(currentDayHours)} hs</span>
                  </div>
                  {selectedAsset && (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Horas Acumuladas (Total)</span>
                      <span className="text-xl font-bold text-white">{(selectedAsset.horas_acumuladas + currentDayHours).toFixed(1)} hs</span>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-3 w-full md:w-auto">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSave}
                    className={cn(
                      "flex-1 md:flex-none text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2",
                      editingLogId 
                        ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20" 
                        : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                    )}
                  >
                    <Save className="w-5 h-5" />
                    <span>{editingLogId ? 'Actualizar Registro' : 'Guardar Registro'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal Selección de Equipo para Ajuste Mensual */}
      <AnimatePresence>
        {isAssetSelectionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1e293b] rounded-3xl border border-slate-700 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Factory className="w-5 h-5 text-emerald-400" />
                  <span>Seleccionar Equipo</span>
                </h3>
                <button 
                  onClick={() => setIsAssetSelectionModalOpen(false)}
                  className="p-2 hover:bg-slate-700 rounded-xl text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-400">Seleccione el equipo para el cual desea realizar el ajuste de horómetro mensual.</p>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Equipo</label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                    onChange={(e) => {
                      const assetId = Number(e.target.value);
                      if (assetId) {
                        const asset = assets.find(a => a.id === assetId);
                        if (asset) {
                          handleEditAssetHours(asset);
                          setIsAssetSelectionModalOpen(false);
                        }
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>— Seleccionar equipo —</option>
                    {assets.map(asset => (
                      <option key={asset.id} value={asset.id}>{asset.codigo_iso} - {asset.nombre_equipo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6 border-t border-slate-700 bg-slate-800/30 flex justify-end">
                <button 
                  onClick={() => setIsAssetSelectionModalOpen(false)}
                  className="px-6 py-2 rounded-xl font-bold text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Ajuste Horómetro Mensual */}
      <AnimatePresence>
        {isMonthlyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              drag
              dragControls={dragControls}
              dragListener={false}
              dragMomentum={false}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#1e293b] rounded-3xl border border-slate-700 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Draggable Header */}
              <div 
                onPointerDown={(e) => dragControls.start(e)}
                className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/80 cursor-move select-none touch-none"
              >
                <div className="flex items-center space-x-3">
                  <GripVertical className="w-5 h-5 text-slate-500" />
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-blue-400" />
                      <span>Ajuste Horómetro — {assets.find(a => a.id === monthlyAssetId)?.codigo_iso}</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                      {new Date().toLocaleString('es', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleCloseMonthly}
                  className="p-2 hover:bg-slate-700 rounded-xl text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body - Scrollable Grid */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-900/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.entries(monthlyData) as [string, ProductionCycle[]][]).sort(([a], [b]) => a.localeCompare(b)).map(([date, cycles]) => {
                    const day = new Date(date + 'T00:00:00').getDate();
                    const dayTotal = (cycles as ProductionCycle[]).reduce((acc, c) => acc + calculateCycleHours(c.start, c.end), 0);
                    
                    return (
                      <div key={date} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 space-y-3 hover:border-blue-500/30 transition-colors">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm font-bold text-white">
                              {day}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              {new Date(date + 'T00:00:00').toLocaleDateString('es', { weekday: 'long' })}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={cn(
                              "text-xs font-bold",
                              dayTotal > 0 ? "text-emerald-400" : "text-slate-600"
                            )}>
                              {formatHoursMinutes(dayTotal)} hs
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {(cycles as ProductionCycle[]).map((cycle, idx) => (
                            <div key={idx} className="flex items-center space-x-2">
                              <div className="flex-1 grid grid-cols-2 gap-2">
                                <div className="relative">
                                  <input 
                                    type="time" 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                                    value={cycle.start}
                                    onChange={(e) => handleMonthlyCycleChange(date, idx, 'start', e.target.value)}
                                  />
                                  <span className="absolute -top-2 left-2 bg-slate-800 px-1 text-[8px] text-slate-500 font-bold uppercase">Encendido</span>
                                </div>
                                <div className="relative">
                                  <input 
                                    type="time" 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                                    value={cycle.end}
                                    onChange={(e) => handleMonthlyCycleChange(date, idx, 'end', e.target.value)}
                                  />
                                  <span className="absolute -top-2 left-2 bg-slate-800 px-1 text-[8px] text-slate-500 font-bold uppercase">Apagado</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                {(cycles as ProductionCycle[]).length > 1 && (
                                  <button 
                                    onClick={() => handleRemoveMonthlyCycle(date, idx)}
                                    className="p-1.5 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {idx === (cycles as ProductionCycle[]).length - 1 && (cycles as ProductionCycle[]).length < 4 && (
                                  <button 
                                    onClick={() => handleAddMonthlyCycle(date)}
                                    className="p-1.5 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 rounded-lg transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer - Totalizer */}
              <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Horas Mes</span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-3xl font-black text-emerald-400">{formatHoursMinutes(calculateMonthlyTotal())}</span>
                      <span className="text-xs text-slate-500 font-bold uppercase">horas</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Días con Uso</span>
                    <span className="text-xl font-bold text-white">
                      {(Object.values(monthlyData) as ProductionCycle[][]).filter(cycles => cycles.some(c => c.start && c.end)).length} / {Object.keys(monthlyData).length}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-3 w-full md:w-auto">
                  <button 
                    onClick={handleCloseMonthly}
                    className="flex-1 md:flex-none px-8 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
                  >
                    Cerrar
                  </button>
                  <button 
                    onClick={handleSaveMonthly}
                    className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center space-x-2"
                  >
                    <Save className="w-5 h-5" />
                    <span>Guardar Cambios</span>
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

export default Production;
