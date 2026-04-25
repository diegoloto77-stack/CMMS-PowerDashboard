import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  MoreHorizontal,
  Box,
  Cpu,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Asset, AssetClass, AssetStatus } from '../types';
import { addDbAsset, updateDbAsset, deleteDbAsset } from '../services/storage';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface EquipmentProps {
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
}

const Equipment: React.FC<EquipmentProps> = ({ assets, setAssets }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  
  // New Asset Form State
  const [formData, setFormData] = useState<Partial<Asset>>({
    codigo_iso: '',
    nombre_equipo: '',
    sector_area: '',
    clase: 'B',
    estado: 'Operativo',
    nota_observaciones: ''
  });

  const filteredAssets = assets.filter(a => 
    a.nombre_equipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.codigo_iso.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAsset) {
      const updated = { ...editingAsset, ...formData } as Asset;
      await updateDbAsset(updated);
      setAssets(assets.map(a => a.id === updated.id ? updated : a));
    } else {
      const result = await addDbAsset(formData);
      const newAsset = { ...formData, id: result.id, horas_acumuladas: 0 } as Asset;
      setAssets([newAsset, ...assets]);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Está seguro de eliminar este equipo? Se eliminarán también sus órdenes de trabajo y registros de producción.')) {
      await deleteDbAsset(id);
      setAssets(assets.filter(a => a.id !== id));
    }
  };

  const openModal = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData(asset);
    } else {
      setEditingAsset(null);
      setFormData({
        codigo_iso: '',
        nombre_equipo: '',
        sector_area: '',
        clase: 'B',
        estado: 'Operativo',
        nota_observaciones: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAsset(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter">GESTIÓN DE ACTIVOS</h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Inventario técnico y estado de flota</p>
        </div>
        
        <button 
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 flex items-center space-x-2 transition-all transform hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>NUEVO EQUIPO</span>
        </button>
      </div>

      <div className="bg-[#1e293b] rounded-3xl border border-white/5 shadow-2xl p-6">
        <div className="flex items-center space-x-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o código ISO..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-blue-500 transition-all placeholder-slate-600"
            />
          </div>
          <button className="p-4 bg-[#0f172a] border border-slate-700 rounded-2xl text-slate-400 hover:text-white transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.length > 0 ? (
            filteredAssets.map((asset) => (
              <motion.div 
                layout
                key={asset.id}
                className="bg-[#0f172a] border border-white/5 rounded-3xl overflow-hidden hover:border-blue-500/50 transition-all group"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                        <Box className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight leading-none">{asset.codigo_iso}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{asset.sector_area}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                      asset.clase === 'A' ? "bg-red-500/10 text-red-400 border-red-500/20" : 
                      asset.clase === 'B' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : 
                      "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    )}>
                      Clase {asset.clase}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">Nombre Técnico</p>
                      <p className="text-sm text-slate-300 font-medium">{asset.nombre_equipo}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                      <div>
                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">Estado</p>
                        <div className="flex items-center space-x-2">
                          <div className={cn("w-2 h-2 rounded-full", asset.estado === 'Operativo' ? 'bg-emerald-500' : 'bg-red-500')} />
                          <span className="text-xs font-bold text-white leading-none">{asset.estado}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">Horas Acum.</p>
                        <p className="text-xs font-black text-blue-400">{asset.horas_acumuladas.toFixed(1)} h</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleDelete(asset.id)}
                      className="p-3 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => openModal(asset)}
                      className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:bg-blue-600/10 hover:text-blue-400 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
               <div className="w-20 h-20 bg-slate-800 rounded-[30px] flex items-center justify-center m-6 border border-white/5">
                  <Box className="w-10 h-10 text-slate-600" />
               </div>
               <h3 className="text-xl font-black text-white uppercase tracking-tight">Sin Equipos Registrados</h3>
               <p className="text-xs text-slate-500 max-w-xs mx-auto mt-2 italic">No se han encontrado activos que coincidan con la búsqueda o la base de datos está vacía.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal - Unified for Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e293b] w-full max-w-2xl rounded-[40px] border border-white/5 shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSave} className="p-10">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{editingAsset ? 'EDITAR ACTIVO' : 'REGISTRAR ACTIVO'}</h2>
                    <p className="text-xs text-slate-500 uppercase tracking-[0.2em] font-black mt-2">Dossier técnico del equipo</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={closeModal}
                    className="p-4 bg-white/5 border border-white/5 rounded-2xl text-slate-400 hover:text-white"
                  >
                    <RefreshCw className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-10">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Código ISO</label>
                      <input 
                        required
                        type="text" 
                        value={formData.codigo_iso}
                        onChange={(e) => setFormData({...formData, codigo_iso: e.target.value})}
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-bold"
                        placeholder="Ej: EXT-01"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Área Sector</label>
                      <input 
                        required
                        type="text" 
                        value={formData.sector_area}
                        onChange={(e) => setFormData({...formData, sector_area: e.target.value})}
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-bold"
                        placeholder="Ej: Producción"
                      />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Nombre del Equipo</label>
                      <input 
                        required
                        type="text" 
                        value={formData.nombre_equipo}
                        onChange={(e) => setFormData({...formData, nombre_equipo: e.target.value})}
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-bold"
                        placeholder="Ej: Mezcladora de Alta"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Criticidad</label>
                        <select 
                          value={formData.clase}
                          onChange={(e) => setFormData({...formData, clase: e.target.value as AssetClass})}
                          className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-bold"
                        >
                          <option value="A">Clase A</option>
                          <option value="B">Clase B</option>
                          <option value="C">Clase C</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Estado</label>
                        <select 
                          value={formData.estado}
                          onChange={(e) => setFormData({...formData, estado: e.target.value as AssetStatus})}
                          className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-bold"
                        >
                          <option value="Operativo">Operativo</option>
                          <option value="En Reparación">Mantenimiento</option>
                          <option value="Standby">Standby</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-10">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Notas y Observaciones</label>
                  <textarea 
                    value={formData.nota_observaciones}
                    onChange={(e) => setFormData({...formData, nota_observaciones: e.target.value})}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-3xl p-6 text-white font-medium min-h-[120px]"
                    placeholder="Detalles sobre historial o mantenimientos clave..."
                  />
                </div>

                <div className="flex space-x-4">
                  <button 
                    type="button" 
                    onClick={closeModal}
                    className="flex-1 py-5 bg-white/5 text-slate-400 rounded-3xl border border-white/5 font-black uppercase tracking-widest text-xs"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 transform hover:scale-105 transition-all"
                  >
                    Guardar Activo
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

export default Equipment;
