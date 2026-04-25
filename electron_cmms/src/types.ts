export type PlantType = 'polvo' | 'solvente' | 'liquida';

export interface SystemConfig {
  id: number;
  titulo_sistema: string;
  subtitulo_sistema: string;
  logo_path: string;
  pie_pagina: string;
  mes_curso: number;
  anio_curso: number;
  obj_disp_anual: number;
  obj_mtbf: number;
  obj_mttr: number;
  obj_mwt: number;
  obj_mdt: number;
  mwt_verde: { a: number; b: number; c: number };
  mwt_rojo: { a: number; b: number; c: number };
  historicalObjectives?: { mes: number; anio: number; obj_disp: number }[];
  titulo_plan_accion?: string;
  planta?: string; // Added for plant description
  empresa?: string; // Added for enterprise name
  turnos?: { nombre: string; inicio: string; fin: string }[]; // Simplified for UI
}

export interface KPIStats {
  disponibilidad: number;
  mtbf: number;
  mttr: number;
  mwt: number;
  mdt_total: number;
  fallas: number;
  tp: number;
}

declare global {
  interface Window {
    electron: {
      getAppPath: () => Promise<string>;
    };
  }
}

export interface Shift {
  id: number;
  nombre: string;
  lu_ju_in: string;
  lu_ju_out: string;
  vi_in: string;
  vi_out: string;
  mes: number;
  anio: number;
}

export interface CalendarException {
  id: number;
  fecha: string;
  descripcion: string;
  tipo: 'FERIADO' | 'DIA_EXTRA';
}

export type AssetClass = 'A' | 'B' | 'C';
export type AssetStatus = 'Operativo' | 'En Reparación' | 'Standby';

export interface Asset {
  id: number;
  imagen_equipo: string;
  codigo_iso: string;
  nombre_equipo: string;
  modelo: string;
  n_serie: string;
  fabricante: string;
  sector_area: string;
  clase: AssetClass;
  estado: AssetStatus;
  horas_acumuladas: number;
  nota_observaciones: string;
  data?: any; // For extended JSON props if needed
}

export type OTType = 'Correctivo' | 'Preventivo' | 'Predictivo' | 'Mejora';
export type OTStatus = 'Abierta' | 'En Progreso' | 'Esperando Repuesto' | 'Cerrada';
export type OTPriority = 'Baja' | 'Media' | 'Alta' | 'Crítica';

export interface WorkOrder {
  id: number;
  id_activo: number;
  codigo_iso?: string; // Virtual join
  nombre_equipo?: string; // Virtual join
  tipo: OTType;
  prioridad: OTPriority;
  estado: OTStatus;
  tecnico: string;
  descripcion: string;
  fecha_creacion: string;
  data?: any;
}

export interface ProductionLog {
  id: number;
  id_activo: number;
  cantidad: number;
  fecha: string;
  data?: any;
}

export interface PlantData {
  config: any;
  assets: Asset[];
  workOrders: WorkOrder[];
  shifts: Shift[];
  exceptions: CalendarException[];
  logs: ProductionLog[];
}
