import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Droplets, Paintbrush, Database, LayoutDashboard, Settings, ShieldCheck } from 'lucide-react';
import { PlantType } from '../types';

interface PlantSelectorProps {
  onSelect: (plant: PlantType) => void;
}

const PlantSelector: React.FC<PlantSelectorProps> = ({ onSelect }) => {
  const plants = [
    {
      id: 'polvo' as PlantType,
      title: 'Pintura en Polvo',
      subtitle: 'Electrostática & Termoestable',
      db: 'cmms_polvo.db',
      icon: <Sparkles className="w-12 h-12 text-blue-400" />,
      gradient: 'from-blue-600/20 to-indigo-600/20',
      border: 'border-blue-500/30'
    },
    {
      id: 'solvente' as PlantType,
      title: 'Pintura Solvente',
      subtitle: 'Base Solvente & Esmaltes',
      db: 'cmms_solvente.db',
      icon: <Droplets className="w-12 h-12 text-cyan-400" />,
      gradient: 'from-cyan-600/20 to-blue-600/20',
      border: 'border-cyan-500/30'
    },
    {
      id: 'liquida' as PlantType,
      title: 'Pintura Líquida',
      subtitle: 'Base Agua & Látex',
      db: 'cmms_liquida.db',
      icon: <Paintbrush className="w-12 h-12 text-emerald-400" />,
      gradient: 'from-emerald-600/20 to-teal-600/20',
      border: 'border-emerald-500/30'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl mb-6 shadow-xl shadow-blue-500/20">
          <Database className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          CMMS <span className="text-blue-500">Industrial</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Sistema de Gestión de Mantenimiento Computarizado
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Industria de Pinturas — Seleccione la planta para ingresar
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
        {plants.map((plant, index) => (
          <motion.button
            key={plant.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelect(plant.id)}
            className={`group relative flex flex-col items-start p-8 rounded-3xl bg-slate-800/40 border ${plant.border} hover:bg-slate-800/60 transition-all duration-300 overflow-hidden text-left`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${plant.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            
            <div className="relative z-10 mb-8 p-4 bg-slate-900/50 rounded-2xl group-hover:scale-110 transition-transform duration-300">
              {plant.icon}
            </div>
            
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-2">{plant.title}</h2>
              <p className="text-slate-400 mb-6">{plant.subtitle}</p>
              
              <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono bg-slate-900/40 px-3 py-1.5 rounded-lg">
                <Database className="w-3 h-3" />
                <span>{plant.db}</span>
              </div>
            </div>

            <div className="relative z-10 mt-8 flex items-center text-blue-400 font-semibold group-hover:translate-x-2 transition-transform duration-300">
              <span>Ingresar al Sistema</span>
              <span className="ml-2">→</span>
            </div>
          </motion.button>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-20 flex flex-wrap justify-center gap-4"
      >
        {[
          { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard Analítico' },
          { icon: <Settings className="w-4 h-4" />, label: 'Órdenes de Trabajo' },
          { icon: <ShieldCheck className="w-4 h-4" />, label: 'Gestión de Activos' },
          { icon: <Database className="w-4 h-4" />, label: 'Bases de Datos Independientes' }
        ].map((feature, i) => (
          <div key={i} className="flex items-center space-x-2 px-4 py-2 bg-slate-800/30 rounded-full border border-slate-700/50 text-slate-400 text-sm">
            {feature.icon}
            <span>{feature.label}</span>
          </div>
        ))}
      </motion.div>

      <footer className="mt-16 text-slate-500 text-xs text-center">
        <p>© 2026 CMMS Industrial — Sistema de Mantenimiento v2.0</p>
      </footer>
    </div>
  );
};

export default PlantSelector;
