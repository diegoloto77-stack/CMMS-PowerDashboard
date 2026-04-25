import React from 'react';
import { Factory, ChevronRight, Database, ShieldCheck, HardDrive } from 'lucide-react';
import { PlantType } from '../types';

interface PlantSelectorProps {
  onSelect: (plant: PlantType) => void;
}

const PlantSelector: React.FC<PlantSelectorProps> = ({ onSelect }) => {
  const plants: { id: PlantType; name: string; desc: string; icon: any; color: string }[] = [
    { 
      id: 'polvo', 
      name: 'Planta Polvo', 
      desc: 'Gestión de líneas de extrusión y molienda de pintura en polvo.',
      icon: Factory,
      color: 'blue'
    },
    { 
      id: 'solvente', 
      name: 'Planta Solvente', 
      desc: 'Control de reactores y mezcladores de base solvente.',
      icon: Database,
      color: 'cyan'
    },
    { 
      id: 'liquida', 
      name: 'Planta Líquida', 
      desc: 'Envasado y procesos de pintura base agua.',
      icon: HardDrive,
      color: 'emerald'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 font-sans">
      <div className="mb-12 text-center animate-in fade-in slide-in-from-top duration-1000">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-600/10 rounded-full border border-blue-500/20 mb-6">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Enterprise Edition - Local Pro</span>
        </div>
        <h1 className="text-5xl font-black text-white tracking-tighter mb-4">CMMS LOCAL PRO</h1>
        <p className="text-slate-400 max-w-md mx-auto">Seleccione la base de datos de la planta con la que desea operar hoy. Los datos son 100% aislados y locales.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
        {plants.map((plant, index) => {
          const Icon = plant.icon;
          return (
            <button
              key={plant.id}
              onClick={() => onSelect(plant.id)}
              className="group relative bg-[#1e293b] border border-slate-700/50 p-10 rounded-[32px] text-left hover:border-blue-500 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-700"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-${plant.color}-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700`} />
              
              <div className={`w-16 h-16 bg-${plant.color}-500/10 rounded-2xl flex items-center justify-center mb-8 border border-${plant.color}-500/20 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-8 h-8 text-${plant.color}-400`} />
              </div>

              <h3 className="text-3xl font-black text-white mb-3 tracking-tight capitalize">{plant.name}</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-1">{plant.desc}</p>
              
              <div className="flex items-center text-blue-400 text-xs font-black tracking-widest uppercase">
                <span>Ingresar al Sistema</span>
                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform duration-300" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-20 text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
        Propulsado por CMMS Expert Architect — v3.2.0
      </div>
    </div>
  );
};

export default PlantSelector;
