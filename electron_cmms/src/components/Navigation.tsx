import React from 'react';
import { 
  LayoutDashboard, 
  Settings as SettingsIcon, 
  ShieldCheck, 
  ClipboardList, 
  Factory,
  Database
} from 'lucide-react';
import { cn } from '../lib/utils';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Analítico', icon: LayoutDashboard },
    { id: 'equipment', label: 'Equipos', icon: Factory },
    { id: 'workorders', label: 'Historial de Mtto', icon: ClipboardList },
    { id: 'production', label: 'Historial de Operación', icon: Database },
    { id: 'settings', label: 'Configuración', icon: SettingsIcon },
  ];

  return (
    <nav className="bg-[#1e293b] w-64 border-r border-slate-700/50 flex flex-col hidden lg:flex">
      <div className="p-6">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-500 group-hover:text-blue-400")} />
                <span className="font-bold text-sm tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="mt-auto p-6">
        <div className="bg-[#0f172a] rounded-2xl p-4 border border-slate-700/50">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sistema Local Activo</span>
          </div>
          <p className="text-[10px] text-slate-600 leading-relaxed font-medium">Bases de datos SQLite activas e independientes por planta.</p>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
