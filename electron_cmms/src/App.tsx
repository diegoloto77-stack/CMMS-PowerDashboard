import React, { useState, useEffect } from 'react';
import { 
  LogOut, 
  Factory,
  Database
} from 'lucide-react';
import { PlantType, SystemConfig, Asset, WorkOrder, Shift, CalendarException, ProductionLog } from './types';
import { 
  switchPlant, 
  getFullPlantData, 
  INITIAL_CONFIG, 
  INITIAL_SHIFTS,
  savePlantConfig
} from './services/storage';

// Placeholder components to ensure build succeeds until specialized files are created
import Navigation from './components/Navigation';
import PlantSelector from './components/PlantSelector';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/Equipment';
import Logs from './pages/Logs';
import Production from './pages/Production';
import Settings from './pages/Settings';

const App: React.FC = () => {
  const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [config, setConfig] = useState<SystemConfig>(INITIAL_CONFIG);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [exceptions, setExceptions] = useState<CalendarException[]>([]);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load data when plant is selected
  useEffect(() => {
    if (selectedPlant) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          await switchPlant(selectedPlant);
          const data = await getFullPlantData();
          
          if (data.config && Object.keys(data.config).length > 0) {
            setConfig(data.config);
          } else {
            // If new DB, save initial config
            await savePlantConfig({ ...INITIAL_CONFIG, planta: selectedPlant });
            setConfig({ ...INITIAL_CONFIG, planta: selectedPlant });
          }
          
          setAssets(data.assets || []);
          setWorkOrders(data.workOrders || []);
          setShifts(data.shifts || []);
          setExceptions(data.exceptions || []);
          setProductionLogs(data.logs || []);
        } catch (err) {
          console.error("Error loading data:", err);
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }
  }, [selectedPlant]);

  if (!selectedPlant) {
    return <PlantSelector onSelect={setSelectedPlant} />;
  }

  const plantInfo = {
    polvo: { name: 'Pintura en Polvo', color: 'text-blue-400', bg: 'bg-blue-600' },
    solvente: { name: 'Pintura Solvente', color: 'text-cyan-400', bg: 'bg-cyan-600' },
    liquida: { name: 'Pintura Líquida', color: 'text-emerald-400', bg: 'bg-emerald-600' }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard assets={assets} workOrders={workOrders} shifts={shifts} exceptions={exceptions} config={config} />;
      case 'equipment':
        return <Equipment assets={assets} setAssets={setAssets} />;
      case 'workorders':
        return <Logs workOrders={workOrders} setWorkOrders={setWorkOrders} assets={assets} />;
      case 'production':
        return (
          <Production 
            logs={productionLogs} 
            setLogs={setProductionLogs} 
            assets={assets} 
            workOrders={workOrders}
            shifts={shifts}
            exceptions={exceptions}
            config={config}
          />
        );
      case 'settings':
        return (
          <Settings 
            config={config} 
            setConfig={setConfig} 
            shifts={shifts} 
            setShifts={setShifts} 
          />
        );
      default:
        return (
          <div className="bg-[#1e293b] rounded-3xl p-12 border border-white/5 shadow-2xl text-center">
            <h2 className="text-3xl font-black text-white mb-4 italic text-balance uppercase tracking-tighter">Módulo {activeTab}</h2>
            <p className="text-slate-500 uppercase tracking-[0.3em] text-xs font-black font-mono">Arquitectura Local - En Desarrollo</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans">
      {/* Header Estilo Power BI / Modern Dark */}
      <header className="bg-[#004796] border-b border-white/5 px-6 py-4 shadow-2xl z-20 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 ${plantInfo[selectedPlant].bg} rounded-2xl flex items-center justify-center font-bold text-white shadow-xl shadow-blue-500/10`}>
            <Factory className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-tighter text-white">{config.titulo_sistema}</h1>
              <span className="text-[10px] font-black px-2 py-0.5 bg-white/10 rounded overflow-hidden text-white/50 tracking-widest">v3.2</span>
            </div>
            <p className="text-[10px] flex items-center space-x-1.5 font-bold uppercase tracking-widest text-white/60">
              <span className={plantInfo[selectedPlant].color}>●</span>
              <span>Planta: {plantInfo[selectedPlant].name}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 px-4 py-2 bg-black/20 rounded-xl border border-white/5">
            <Database className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Almacén Local (Web Storage)</span>
          </div>
          
          <button 
            onClick={() => setSelectedPlant(null)}
            className="group flex items-center space-x-2 bg-white/5 hover:bg-red-600/20 px-4 py-2.5 rounded-xl border border-white/5 hover:border-red-500/50 transition-all duration-300"
          >
            <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-400 group-hover:-translate-x-1 transition-all" />
            <span className="text-xs font-black text-slate-400 group-hover:text-red-400 uppercase tracking-widest">Salir</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 overflow-y-auto bg-[#0f172a] p-8 custom-scrollbar">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Cargando Base de Datos...</p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
              {renderContent()}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
