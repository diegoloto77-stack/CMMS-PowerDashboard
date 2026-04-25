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
}

export interface Shift {
  id_turno: number;
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

export interface Motor {
  id: number;
  motor: string;
  descripcion: string;
  marca: string;
  modelo: string;
  n_serie: string;
  potencia: string;
  rpm: number;
  cos_phi: number;
  voltaje: number;
  amperaje: number;
  frecuencia: number;
  rodamiento_del: string;
  rodamiento_tras: string;
}

export interface Pump {
  id: number;
  descripcion: string;
  marca: string;
  modelo: string;
  n_serie: string;
  potencia: string;
  caudal_q: string;
  h_max: string;
  h_min: string;
  t_max: string;
  rpm: number;
  voltaje: number;
  amperaje: number;
  p1: string;
  p2: string;
  frecuencia: number;
  cos_phi: number;
  rodamiento_del: string;
  rodamiento_tras: string;
  capacitor: string;
}

export interface VariatorParameter {
  id: number;
  nombre: string;
  valor: string;
}

export interface Variator {
  id: number;
  descripcion: string;
  marca: string;
  modelo: string;
  n_serie: string;
  fecha_instalacion: string;
  parametros: VariatorParameter[];
}

export interface Transmission {
  id: number;
  descripcion: string;
  cantidad: number;
  tipo_numero: string;
  frecuencia_revision: string;
}

export interface Lubrication {
  id: number;
  descripcion: string;
  cantidad: number;
  tipo_lubricante: string;
  frecuencia_revision: string;
}

export interface ExtraData {
  id: number;
  descripcion_parte: string;
  cantidad: number;
  sector_ubicacion: string;
  elemento: string;
  frecuencia_revision: string;
}

export interface Manual {
  id: number;
  nombre_archivo: string;
  fecha_subida: string;
  tamano: string;
  ruta_archivo: string;
}

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
  horas_acumuladas: number; // This will be calculated from production logs
  horas_produccion?: number;
  horas_mantenimiento?: number;
  nota_observaciones: string;
  // New sectors
  motores: Motor[];
  bombas: Pump[];
  variadores: Variator[];
  transmisiones: Transmission[];
  lubricacion: Lubrication[];
  datos_extras: ExtraData[];
  manuales: Manual[];
}

export type OTType = 'Correctivo' | 'Preventivo' | 'Predictivo' | 'Mejora';
export type OTStatus = 'Abierta' | 'En Progreso' | 'Esperando Repuesto' | 'Cerrada';
export type OTPriority = 'Baja' | 'Media' | 'Alta' | 'Crítica';

export interface WorkOrder {
  id_ot: number;
  codigo_ot?: string;
  id_activo: number;
  tipo: OTType;
  prioridad: OTPriority;
  estado: OTStatus;
  tecnico: string;
  descripcion: string;
  inicio_falla: string;
  fin_reparacion: string | null;
  solicitud_repuesto: string | null;
  llegada_repuesto: string | null;
  motivo_espera: string | null;
  notas_adicionales: string;
  mdt_total: number; // minutes
  mttr_tecnico: number; // minutes
  mwt_espera: number; // minutes
}

export interface OTImage {
  id: number;
  id_ot: number;
  ruta_imagen: string;
  nota: string;
}

export interface ProductionCycle {
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface ProductionLog {
  id: number;
  fecha: string;
  id_activo: number;
  horas_operacion: number;
  ciclos: number;
  tipo?: string;
  observaciones: string;
  ciclos_detalle?: ProductionCycle[];
  ot_detalle?: WorkOrder;
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
