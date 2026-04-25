import React from 'react';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  ClipboardList, 
  Factory, 
  Settings as SettingsIcon,
  Activity,
  History
} from 'lucide-react';
import { cn } from '../lib/utils';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard Analítico', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'equipment', label: 'Gestión de Activos', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'logs', label: 'Órdenes de Trabajo', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'production', label: 'Módulo Producción', icon: <Factory className="w-4 h-4" /> },
    { id: 'settings', label: 'Configuración', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <nav className="flex space-x-2 bg-slate-900/40 p-1.5 rounded-xl border border-slate-700/30 w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "flex items-center space-x-2.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300",
            activeTab === tab.id
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          )}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default Navigation;
