import { 
  Asset, 
  WorkOrder, 
  ProductionLog, 
  SystemConfig, 
  Shift, 
  CalendarException, 
  PlantType,
  PlantData
} from '../types';

export const INITIAL_CONFIG: SystemConfig = {
  id: 1,
  titulo_sistema: 'CMMS Industrial Pro',
  subtitulo_sistema: 'Gestión de Mantenimiento Local',
  logo_path: '',
  pie_pagina: '© 2026 CMMS Local Pro — Todos los derechos reservados',
  mes_curso: new Date().getMonth(),
  anio_curso: new Date().getFullYear(),
  obj_disp_anual: 95.0,
  obj_mtbf: 50,
  obj_mttr: 4,
  obj_mwt: 2,
  obj_mdt: 12,
  mwt_verde: { a: 2, b: 4, c: 8 },
  mwt_rojo: { a: 8, b: 16, c: 24 },
  titulo_plan_accion: 'Plan de Acción Global',
  empresa: 'SOLVENCIA S.A.',
  planta: '',
  turnos: [
    { nombre: 'Mañana', inicio: '--:--', fin: '--:--' },
    { nombre: 'Tarde', inicio: '--:--', fin: '--:--' },
    { nombre: 'Noche', inicio: '--:--', fin: '--:--' }
  ]
};

export const INITIAL_SHIFTS: Shift[] = [
  {
    id: 1,
    nombre: 'Turno A',
    lu_ju_in: '--:--',
    lu_ju_out: '--:--',
    vi_in: '--:--',
    vi_out: '--:--',
    mes: new Date().getMonth(),
    anio: new Date().getFullYear()
  }
];

const STORAGE_KEYS = {
  ASSETS: 'assets',
  ORDERS: 'orders',
  PRODUCTION: 'production',
  CONFIG: 'config',
  SHIFTS: 'shifts',
  EXCEPTIONS: 'exceptions'
};

let currentPrefix = '';

export const setPlantScope = (plant: PlantType) => {
  currentPrefix = `${plant}_`;
};

const getFromStorage = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(currentPrefix + key);
  return data ? JSON.parse(data) : defaultValue;
};

const saveToStorage = <T>(key: string, data: T): void => {
  localStorage.setItem(currentPrefix + key, JSON.stringify(data));
};

export const switchPlant = async (plant: PlantType): Promise<void> => {
  setPlantScope(plant);
  return Promise.resolve();
};

export const getFullPlantData = async (): Promise<PlantData> => {
  return {
    config: getFromStorage(STORAGE_KEYS.CONFIG, null),
    assets: getFromStorage(STORAGE_KEYS.ASSETS, []),
    workOrders: getFromStorage(STORAGE_KEYS.ORDERS, []),
    shifts: getFromStorage(STORAGE_KEYS.SHIFTS, []),
    exceptions: getFromStorage(STORAGE_KEYS.EXCEPTIONS, []),
    logs: getFromStorage(STORAGE_KEYS.PRODUCTION, [])
  };
};

export const savePlantConfig = async (config: SystemConfig): Promise<void> => {
  saveToStorage(STORAGE_KEYS.CONFIG, config);
};

// ASSETS
export const getDbAssets = async (): Promise<Asset[]> => {
  return getFromStorage(STORAGE_KEYS.ASSETS, []);
};

export const addDbAsset = async (asset: Partial<Asset>): Promise<{ id: number }> => {
  const assets = await getDbAssets();
  const id = Date.now();
  const newAsset = { ...asset, id } as Asset;
  saveToStorage(STORAGE_KEYS.ASSETS, [...assets, newAsset]);
  return { id };
};

export const updateDbAsset = async (asset: Asset): Promise<void> => {
  const assets = await getDbAssets();
  saveToStorage(STORAGE_KEYS.ASSETS, assets.map(a => a.id === asset.id ? asset : a));
};

export const deleteDbAsset = async (id: number): Promise<void> => {
  const assets = await getDbAssets();
  saveToStorage(STORAGE_KEYS.ASSETS, assets.filter(a => a.id !== id));
};

// WORK ORDERS
export const addDbWorkOrder = async (ot: Partial<WorkOrder>): Promise<{ id: number }> => {
  const orders = getFromStorage<WorkOrder[]>(STORAGE_KEYS.ORDERS, []);
  const id = Date.now();
  const newOrder = { ...ot, id } as WorkOrder;
  saveToStorage(STORAGE_KEYS.ORDERS, [newOrder, ...orders]);
  return { id };
};

export const updateDbWorkOrder = async (ot: WorkOrder): Promise<void> => {
  const orders = getFromStorage<WorkOrder[]>(STORAGE_KEYS.ORDERS, []);
  saveToStorage(STORAGE_KEYS.ORDERS, orders.map(o => o.id === ot.id ? ot : o));
};

// SHIFTS
export const saveDbShifts = async (shifts: Shift[]): Promise<void> => {
  saveToStorage(STORAGE_KEYS.SHIFTS, shifts);
};

// PRODUCTION LOGS
export const addDbProductionLog = async (log: Partial<ProductionLog>): Promise<{ id: number }> => {
  const logs = getFromStorage<ProductionLog[]>(STORAGE_KEYS.PRODUCTION, []);
  const id = Date.now();
  const newLog = { ...log, id } as ProductionLog;
  saveToStorage(STORAGE_KEYS.PRODUCTION, [newLog, ...logs]);
  return { id };
};

export const deleteDbProductionLog = async (id: number): Promise<void> => {
  const logs = getFromStorage<ProductionLog[]>(STORAGE_KEYS.PRODUCTION, []);
  saveToStorage(STORAGE_KEYS.PRODUCTION, logs.filter(l => l.id !== id));
};
