import React, { useState, useEffect } from 'react';
import PlantSelector from './components/PlantSelector';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/Equipment';
import Logs from './pages/Logs';
import Production from './pages/Production';
import Settings from './pages/Settings';
import { PlantType, SystemConfig, Asset, WorkOrder, Shift, CalendarException, ProductionLog } from './types';
import { 
  getFromStorage, 
  saveToStorage, 
  INITIAL_CONFIG, 
  INITIAL_SHIFTS
} from './services/storage';
import { LogOut, LayoutDashboard, Settings as SettingsIcon, ShieldCheck, ClipboardList, Factory } from 'lucide-react';

const App: React.FC = () => {
  const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // State for the selected plant
  const [config, setConfig] = useState<SystemConfig>(INITIAL_CONFIG);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [exceptions, setExceptions] = useState<CalendarException[]>([]);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [quotaError, setQuotaError] = useState(false);
  const [isLoadingPlant, setIsLoadingPlant] = useState(false);

  // One-time cleanup to ensure the database starts empty as requested
  // This will clear existing mock data from all three plants in the user's browser
  useEffect(() => {
    const isReset = localStorage.getItem('cmms_full_reset_2026');
    if (!isReset) {
      ['polvo', 'solvente', 'liquida'].forEach(plant => {
        localStorage.removeItem(`cmms_${plant}`);
      });
      localStorage.setItem('cmms_full_reset_2026', 'true');
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setQuotaError(true);
      setTimeout(() => setQuotaError(false), 5000);
    };
    window.addEventListener('storage-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('storage-quota-exceeded', handleQuotaExceeded);
  }, []);

  // Load data when plant is selected
  useEffect(() => {
    if (selectedPlant) {
      const savedConfig = getFromStorage(selectedPlant, 'config', INITIAL_CONFIG);
      const savedAssets = getFromStorage(selectedPlant, 'assets', []);
      const savedWorkOrders = getFromStorage(selectedPlant, 'workOrders', []);
      const savedShifts = (getFromStorage(selectedPlant, 'shifts', INITIAL_SHIFTS) || []).map((s: any) => ({
        ...s,
        mes: s.mes !== undefined ? s.mes : new Date().getMonth(),
        anio: s.anio !== undefined ? s.anio : new Date().getFullYear()
      }));
      const savedExceptions = getFromStorage(selectedPlant, 'exceptions', []);
      const savedProductionLogs = getFromStorage(selectedPlant, 'productionLogs', []);
      
      setIsLoadingPlant(true);
      
      setConfig(savedConfig);
      setAssets(savedAssets);
      setWorkOrders(savedWorkOrders);
      setShifts(savedShifts);
      setExceptions(savedExceptions);
      setProductionLogs(savedProductionLogs);
      
      // Use a small timeout to ensure state has updated before allowing saves
      setTimeout(() => setIsLoadingPlant(false), 50);
    }
  }, [selectedPlant]);

  // Save data when state changes
  useEffect(() => {
    if (selectedPlant && !isLoadingPlant) {
      saveToStorage(selectedPlant, 'config', config);
      saveToStorage(selectedPlant, 'assets', assets);
      saveToStorage(selectedPlant, 'workOrders', workOrders);
      saveToStorage(selectedPlant, 'shifts', shifts);
      saveToStorage(selectedPlant, 'exceptions', exceptions);
      saveToStorage(selectedPlant, 'productionLogs', productionLogs);
    }
  }, [config, assets, workOrders, shifts, exceptions, productionLogs, selectedPlant, isLoadingPlant]);

  if (!selectedPlant) {
    return <PlantSelector onSelect={setSelectedPlant} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': 
        return <Dashboard 
          assets={assets} 
          workOrders={workOrders} 
          shifts={shifts} 
          exceptions={exceptions} 
          config={config}
          selectedPlant={selectedPlant}
        />;
      case 'equipment': 
        return <Equipment 
          assets={assets} 
          setAssets={setAssets} 
          productionLogs={productionLogs}
          setProductionLogs={setProductionLogs}
        />;
      case 'logs': 
        return <Logs 
          workOrders={workOrders} 
          setWorkOrders={setWorkOrders} 
          assets={assets}
          setAssets={setAssets}
          setProductionLogs={setProductionLogs}
          config={config}
        />;
      case 'production': 
        return <Production 
          assets={assets} 
          setAssets={setAssets} 
          productionLogs={productionLogs}
          setProductionLogs={setProductionLogs}
        />;
      case 'settings': 
        return <Settings 
          config={config} 
          setConfig={setConfig}
          shifts={shifts}
          setShifts={setShifts}
          exceptions={exceptions}
          setExceptions={setExceptions}
          assets={assets}
          setAssets={setAssets}
          workOrders={workOrders}
          setWorkOrders={setWorkOrders}
          productionLogs={productionLogs}
          setProductionLogs={setProductionLogs}
        />;
      default: 
        return <Dashboard 
          assets={assets} 
          workOrders={workOrders} 
          shifts={shifts} 
          exceptions={exceptions} 
          config={config}
          selectedPlant={selectedPlant}
        />;
    }
  };

  const plantInfo = {
    polvo: { name: 'Pintura en Polvo', color: 'text-blue-400', bg: 'bg-blue-600' },
    solvente: { name: 'Pintura Solvente', color: 'text-cyan-400', bg: 'bg-cyan-600' },
    liquida: { name: 'Pintura Líquida', color: 'text-emerald-400', bg: 'bg-emerald-600' }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans">
      {/* Header Estilo Power BI / Modern Dark */}
      <header className="bg-[#004796] border-b border-slate-700/50 px-6 py-3 shadow-2xl z-20">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            {config.logo_path ? (
              <div 
                className="flex items-center justify-center"
                style={{ width: '170px', height: '65px' }}
              >
                <img 
                  src={config.logo_path} 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className={`w-10 h-10 ${plantInfo[selectedPlant].bg} rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20`}>
                <Factory className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-white">{config.titulo_sistema}</h1>
                <span className="text-xs px-2 py-0.5 bg-slate-700 rounded-full text-slate-400 border border-slate-600">v2.0</span>
              </div>
              <p className="text-xs text-slate-400 opacity-80 flex items-center space-x-1">
                <span className={plantInfo[selectedPlant].color}>●</span>
                <span>Planta: {plantInfo[selectedPlant].name}</span>
                <span className="mx-1">|</span>
                <span>{config.subtitulo_sistema}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-slate-300">Sistema Online</span>
            </div>
            
            <button 
              onClick={() => setSelectedPlant(null)}
              className="bg-slate-800 hover:bg-red-600/20 hover:text-red-400 text-slate-400 text-xs font-bold py-2 px-4 rounded-xl border border-slate-700 hover:border-red-500/50 transition-all duration-300 flex items-center space-x-2 group"
            >
              <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Cambiar Planta</span>
            </button>
          </div>
        </div>
        
        {/* Navegación Horizontal */}
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gradient-to-b from-[#0f172a] to-[#1e293b] relative">
        {quotaError && (
          <div className="absolute top-4 right-4 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2 animate-in fade-in slide-in-from-top-4">
            <span className="font-bold">Error de Almacenamiento:</span>
            <span>La imagen es demasiado grande. Se ha intentado comprimir, pero sigue excediendo el límite.</span>
          </div>
        )}
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
