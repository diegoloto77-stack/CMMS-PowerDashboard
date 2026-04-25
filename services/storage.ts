import { 
  Asset, 
  WorkOrder, 
  SystemConfig, 
  Shift, 
  CalendarException, 
  Motor, 
  Pump, 
  Variator, 
  Manual, 
  PlantType,
  ProductionLog 
} from '../types';

const STORAGE_KEY_PREFIX = 'cmms_';

export function getPlantKey(plant: PlantType): string {
  return `${STORAGE_KEY_PREFIX}${plant}`;
}

export function saveToStorage<T>(plant: PlantType, key: string, data: T) {
  const plantKey = getPlantKey(plant);
  const currentData = JSON.parse(localStorage.getItem(plantKey) || '{}');
  currentData[key] = data;
  try {
    localStorage.setItem(plantKey, JSON.stringify(currentData));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('QuotaExceededError: The file is too large to be saved in local storage.');
      // Dispatch a custom event so the UI can show a notification
      window.dispatchEvent(new CustomEvent('storage-quota-exceeded'));
    }
  }
}

export function getFromStorage<T>(plant: PlantType, key: string, defaultValue: T): T {
  const plantKey = getPlantKey(plant);
  const currentData = JSON.parse(localStorage.getItem(plantKey) || '{}');
  return currentData[key] !== undefined ? currentData[key] : defaultValue;
}

export function clearStorage(plant: PlantType) {
  localStorage.removeItem(getPlantKey(plant));
}

// Initial Data Generators
export const INITIAL_CONFIG: SystemConfig = {
  id: 1,
  titulo_sistema: 'CMMS Industrial',
  subtitulo_sistema: 'Sistema de Gestión de Mantenimiento Computarizado',
  logo_path: '',
  pie_pagina: '© 2026 CMMS Industrial — Todos los derechos reservados',
  mes_curso: new Date().getMonth(),
  anio_curso: new Date().getFullYear(),
  obj_disp_anual: 90.0,
  obj_mtbf: 50,
  obj_mttr: 4,
  obj_mwt: 2,
  obj_mdt: 12,
  mwt_verde: { a: 2, b: 4, c: 8 },
  mwt_rojo: { a: 8, b: 16, c: 24 },
  titulo_plan_accion: 'Plan de Acción / Notas Gerencia'
};

export const INITIAL_SHIFTS: Shift[] = [
  {
    id_turno: 1,
    nombre: 'Turno Mañana',
    lu_ju_in: '08:00',
    lu_ju_out: '17:00',
    vi_in: '08:00',
    vi_out: '16:00',
    mes: new Date().getMonth(),
    anio: new Date().getFullYear()
  }
];

export const MOCK_ASSETS: Asset[] = [];

export const MOCK_WORK_ORDERS: WorkOrder[] = [];

export const MOCK_PRODUCTION_LOGS: ProductionLog[] = [];
