import React, { useState } from 'react';
import { 
  ClipboardList, 
  Search, 
  Plus, 
  Filter, 
  Clock, 
  CheckCircle2, 
  User, 
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { WorkOrder, Asset, OTStatus, OTPriority, OTType } from '../types';
import { addDbWorkOrder, updateDbWorkOrder } from '../services/storage';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface LogsProps {
  workOrders: WorkOrder[];
  setWorkOrders: React.Dispatch<React.SetStateAction<WorkOrder[]>>;
  assets: Asset[];
}

const Logs: React.FC<LogsProps> = ({ workOrders, setWorkOrders, assets }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOT, setEditingOT] = useState<WorkOrder | null>(null);

  const [formData, setFormData] = useState<Partial<WorkOrder>>({
    id_activo: 0,
    tipo: 'Correctivo',
    prioridad: 'Media',
    estado: 'Abierta',
    tecnico: '',
    descripcion: '',
    fecha_creacion: new Date().toISOString()
  });

  const filteredOTs = workOrders.filter(ot => 
    ot.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ot.tecnico.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAssetCode = (id: number) => {
    return assets.find(a => a.id === id)?.codigo_iso || 'N/A';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const otData = {
      ...formData,
      data: {
        ...(formData.data || {}),
        categoria_falla: (e.currentTarget as HTMLFormElement).categoria.value,
        mdt_total: Number((e.currentTarget as HTMLFormElement).mdt.value) || 0
      }
    };

    if (editingOT) {
      const updated = { ...editingOT, ...otData } as WorkOrder;
      await updateDbWorkOrder(updated);
      setWorkOrders(workOrders.map(o => o.id === updated.id ? updated : o));
    } else {
      const result = await addDbWorkOrder(otData);
      const newOT = { ...otData, id: result.id } as WorkOrder;
      setWorkOrders([newOT, ...workOrders]);
    }
    closeModal();
  };

  const openModal = (ot?: WorkOrder) => {
    if (ot) {
      setEditingOT(ot);
      setFormData(ot);
    } else {
      setEditingOT(null);
      setFormData({
        id_activo: assets[0]?.id || 0,
        tipo: 'Correctivo',
        prioridad: 'Media',
        estado: 'Abierta',
        tecnico: '',
        descripcion: '',
        fecha_creacion: new Date().toISOString()
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOT(null);
  };

  const statusColors = {
    'Abierta': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'En Progreso': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Esperando Repuesto': 'bg-red-500/10 text-red-500 border-red-500/20',
    'Cerrada': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  };

  const priorityColors = {
    'Baja': 'text-slate-400',
    'Media': 'text-blue-400',
    'Alta': 'text-orange-400',
    'Crítica': 'text-red-500'
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter">ANÁLISIS HISTÓRICO DE MANTENIMIENTO</h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Bitácora de fallas, reparaciones y preventivos</p>
        </div>
        
        <button 
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 flex items-center space-x-2 transition-all transform hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          <span>GENERAR OT</span>
        </button>
      </div>

      <div className="bg-[#1e293b] rounded-3xl border border-white/5 shadow-2xl p-8">
        <div className="flex items-center space-x-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por descripción o técnico..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="px-6 py-4 bg-[#0f172a] border border-slate-700 rounded-2xl text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filtros</span>
          </button>
        </div>

        <div className="space-y-4">
          {filteredOTs.map((ot) => (
            <motion.div 
              layout
              key={ot.id}
              onClick={() => openModal(ot)}
              className="bg-[#0f172a] border border-white/5 p-6 rounded-3xl hover:border-slate-600 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className={cn(
                    "p-4 rounded-2xl border flex flex-col items-center justify-center min-w-[80px]",
                    statusColors[ot.estado]
                  )}>
                    {ot.estado === 'Cerrada' ? <CheckCircle2 className="w-6 h-6 mb-1" /> : <Clock className="w-6 h-6 mb-1" />}
                    <span className="text-[9px] font-black uppercase tracking-tighter text-center">{ot.estado}</span>
                  </div>

                  <div>
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="text-xs font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{getAssetCode(ot.id_activo)}</span>
                      <span className={cn("text-xs font-black uppercase tracking-widest", priorityColors[ot.prioridad])}>• {ot.prioridad}</span>
                      <span className="text-xs text-slate-500 font-bold italic opacity-60">#{ot.id}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 leading-tight uppercase tracking-tight">{ot.descripcion}</h3>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1.5 text-slate-500 text-xs font-medium">
                        <User className="w-3.5 h-3.5" />
                        <span>{ot.tecnico || 'Sin asignar'}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-500 text-xs font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(ot.fecha_creacion).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right hidden md:block mr-8">
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">Tipo de Tarea</p>
                    <p className="text-xs font-bold text-slate-400">{ot.tipo}</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-700 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-[#1e293b] w-full max-w-2xl rounded-[40px] border border-white/5 shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSave} className="p-10">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex items-center space-x-4">
                    <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
                      <ClipboardList className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{editingOT ? 'MODIFICAR TAREA' : 'ORDEN DE TRABAJO'}</h2>
                      <p className="text-xs text-slate-500 uppercase tracking-widest font-black mt-1">Registro de actividad técnica</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Equipo / Activo</label>
                    <select 
                      required
                      value={formData.id_activo}
                      onChange={(e) => setFormData({...formData, id_activo: Number(e.target.value)})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-bold"
                    >
                      <option value="">Seleccione un equipo...</option>
                      {assets.map(a => (
                        <option key={a.id} value={a.id}>[{a.codigo_iso}] {a.nombre_equipo}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Técnico Responsable</label>
                    <input 
                      required
                      type="text" 
                      value={formData.tecnico}
                      onChange={(e) => setFormData({...formData, tecnico: e.target.value})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-bold"
                      placeholder="Nombre del operario"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Estado</label>
                    <select 
                      value={formData.estado}
                      onChange={(e) => setFormData({...formData, estado: e.target.value as OTStatus})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-bold"
                    >
                      <option value="Abierta">Abierta</option>
                      <option value="En Progreso">En Progreso</option>
                      <option value="Esperando Repuesto">Esperando</option>
                      <option value="Cerrada">Cerrada</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Tipo</label>
                    <select 
                      value={formData.tipo}
                      onChange={(e) => setFormData({...formData, tipo: e.target.value as OTType})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-bold"
                    >
                      <option value="Correctivo">Correctivo</option>
                      <option value="Preventivo">Preventivo</option>
                      <option value="Predictivo">Predictivo</option>
                      <option value="Mejora">Mejora</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Prioridad</label>
                    <select 
                      value={formData.prioridad}
                      onChange={(e) => setFormData({...formData, prioridad: e.target.value as OTPriority})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-bold"
                    >
                      <option value="Baja">Baja</option>
                      <option value="Media">Media</option>
                      <option value="Alta">Alta</option>
                      <option value="Crítica">Crítica</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Categoría de Parada</label>
                    <select 
                      name="categoria"
                      defaultValue={formData.data?.categoria_falla || 'Otros'}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-bold"
                    >
                      <option value="Avería Mecánica">Avería Mecánica</option>
                      <option value="Falla Eléctrica">Falla Eléctrica</option>
                      <option value="Falta de Personal">Falta de Personal</option>
                      <option value="Mantenimiento Preventivo">Mantenimiento Preventivo</option>
                      <option value="Limpieza / Cambio Color">Limpieza / Cambio Color</option>
                      <option value="Falta de Insumos">Falta de Insumos</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Tiempo de Parada (minutos)</label>
                    <input 
                      name="mdt"
                      type="number" 
                      defaultValue={formData.data?.mdt_total || 0}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-bold"
                      placeholder="Ej: 60"
                    />
                  </div>
                </div>

                <div className="mb-10">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Descripción de la Falla / Tarea</label>
                  <textarea 
                    required
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-3xl p-6 text-white font-medium min-h-[120px]"
                    placeholder="Detalles sobre el problema detectado y reparaciones efectuadas..."
                  />
                </div>

                <div className="flex space-x-4">
                  <button 
                    type="button" 
                    onClick={closeModal}
                    className="flex-1 py-5 bg-white/5 text-slate-400 rounded-3xl border border-white/5 font-black uppercase tracking-widest text-xs"
                  >
                    Cerrar sin guardar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 transform hover:scale-105"
                  >
                    Registrar Movimiento
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

export default Logs;
