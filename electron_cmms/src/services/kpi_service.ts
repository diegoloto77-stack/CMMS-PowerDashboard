import { 
  Asset, 
  WorkOrder, 
  CalendarException, 
  Shift, 
  KPIStats, 
  SystemConfig 
} from '../types';
import { calculateMinutesBetween } from '../lib/utils';

export function calculatePlannedTime(
  month: number, 
  year: number, 
  shifts: Shift[], 
  exceptions: CalendarException[]
): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let totalHours = 0;

  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const calculateMergedHours = (intervals: {start: number, end: number}[]) => {
    if (intervals.length === 0) return 0;
    const normalizedIntervals: {start: number, end: number}[] = [];
    for (const inv of intervals) {
      if (inv.end < inv.start) {
        normalizedIntervals.push({ start: inv.start, end: 24 * 60 });
        normalizedIntervals.push({ start: 0, end: inv.end });
      } else {
        normalizedIntervals.push(inv);
      }
    }
    normalizedIntervals.sort((a, b) => a.start - b.start);
    const merged = [normalizedIntervals[0]];
    for (let i = 1; i < normalizedIntervals.length; i++) {
      const current = normalizedIntervals[i];
      const last = merged[merged.length - 1];
      if (current.start <= last.end) {
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push(current);
      }
    }
    return merged.reduce((sum, inv) => sum + (inv.end - inv.start), 0) / 60;
  };

  const monthShifts = (shifts || []).filter(s => s.mes === month && s.anio === year);
  const activeShifts = monthShifts;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    const dateStr = date.toISOString().split('T')[0];
    const exception = exceptions.find(e => e.fecha === dateStr);
    if (exception?.tipo === 'FERIADO') continue;

    const dayIntervals: {start: number, end: number}[] = [];
    for (const shift of activeShifts) {
      if (dayOfWeek >= 1 && dayOfWeek <= 4) {
        if (shift.lu_ju_in && shift.lu_ju_out) {
          dayIntervals.push({ start: timeToMinutes(shift.lu_ju_in), end: timeToMinutes(shift.lu_ju_out) });
        }
      } else if (dayOfWeek === 5) {
        if (shift.vi_in && shift.vi_out) {
          dayIntervals.push({ start: timeToMinutes(shift.vi_in), end: timeToMinutes(shift.vi_out) });
        }
      }
    }
    totalHours += calculateMergedHours(dayIntervals);
  }

  const extraDays = (exceptions || []).filter(e => {
    const d = new Date(e.fecha);
    return e.tipo === 'DIA_EXTRA' && d.getMonth() === month && d.getFullYear() === year;
  });
  totalHours += extraDays.length * 8;
  return totalHours;
}

export interface DailyPerformance {
  day: number;
  planned: number;
  lost: number;
  operational: number;
}

export function getDailyPlantPerformance(
  month: number,
  year: number,
  shifts: Shift[],
  exceptions: CalendarException[],
  workOrders: WorkOrder[]
): DailyPerformance[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const data: DailyPerformance[] = [];

  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const calculateMergedHours = (intervals: {start: number, end: number}[]) => {
    if (intervals.length === 0) return 0;
    const normalizedIntervals: {start: number, end: number}[] = [];
    for (const inv of intervals) {
      if (inv.end < inv.start) {
        normalizedIntervals.push({ start: inv.start, end: 24 * 60 });
        normalizedIntervals.push({ start: 0, end: inv.end });
      } else {
        normalizedIntervals.push(inv);
      }
    }
    normalizedIntervals.sort((a, b) => a.start - b.start);
    const merged = [normalizedIntervals[0]];
    for (let i = 1; i < normalizedIntervals.length; i++) {
      const current = normalizedIntervals[i];
      const last = merged[merged.length - 1];
      if (current.start <= last.end) {
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push(current);
      }
    }
    return merged.reduce((sum, inv) => sum + (inv.end - inv.start), 0) / 60;
  };

  const monthShifts = (shifts || []).filter(s => s.mes === month && s.anio === year);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = date.getDay();
    
    let planned = 0;
    const exception = exceptions.find(e => e.fecha === dateStr);
    
    if (exception?.tipo === 'DIA_EXTRA') {
      planned = 8;
    } else if (dayOfWeek !== 0 && dayOfWeek !== 6 && exception?.tipo !== 'FERIADO') {
      const dayIntervals: {start: number, end: number}[] = [];
      for (const shift of monthShifts) {
        if (dayOfWeek >= 1 && dayOfWeek <= 4) {
          if (shift.lu_ju_in && shift.lu_ju_out) {
            dayIntervals.push({ start: timeToMinutes(shift.lu_ju_in), end: timeToMinutes(shift.lu_ju_out) });
          }
        } else if (dayOfWeek === 5) {
          if (shift.vi_in && shift.vi_out) {
            dayIntervals.push({ start: timeToMinutes(shift.vi_in), end: timeToMinutes(shift.vi_out) });
          }
        }
      }
      planned = calculateMergedHours(dayIntervals);
    }

    // Lost hours for this day (aggregate all closed work orders created/started this day)
    const dayOTs = (workOrders || []).filter(ot => {
       const otDate = ot.fecha_creacion.split('T')[0];
       return otDate === dateStr && ot.estado === 'Cerrada';
    });
    const lost = dayOTs.reduce((acc, ot) => acc + (ot.data?.mdt_total || 0), 0) / 60;
    
    data.push({
      day,
      planned: parseFloat(planned.toFixed(1)),
      lost: parseFloat(lost.toFixed(1)),
      operational: parseFloat(Math.max(0, planned - lost).toFixed(1))
    });
  }

  return data;
}

export function getDowntimeByCategory(workOrders: WorkOrder[]) {
  const categories: Record<string, number> = {};
  
  workOrders.filter(ot => ot.estado === 'Cerrada' && ot.data?.mdt_total).forEach(ot => {
    const cat = ot.data?.categoria_falla || 'Otros';
    const mins = ot.data?.mdt_total || 0;
    categories[cat] = (categories[cat] || 0) + (mins / 60);
  });

  return Object.entries(categories)
    .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(1)) }))
    .sort((a, b) => b.hours - a.hours);
}

export function calculateAssetKPIs(
  asset: Asset, 
  workOrders: WorkOrder[], 
  tp: number
): KPIStats {
  const assetOTs = (workOrders || []).filter(ot => ot.id_activo === asset.id && ot.estado === 'Cerrada');
  
  // Re-calculate MDT/MTTR/MWT if needed or use pre-calculated from DB if available
  // Here we assume WorkOrder has mdt_total, mttr_tecnico, mwt_espera as stored in SQLite JSON or separate cols
  const mdtTotal = assetOTs.reduce((acc, ot) => acc + (ot.data?.mdt_total || 0), 0) / 60;
  const mttrTotal = assetOTs.reduce((acc, ot) => acc + (ot.data?.mttr_tecnico || 0), 0) / 60;
  const mwtTotal = assetOTs.reduce((acc, ot) => acc + (ot.data?.mwt_espera || 0), 0) / 60;
  
  const fallas = assetOTs.length;
  const mttr = fallas > 0 ? mttrTotal / fallas : 0;
  const mwt = fallas > 0 ? mwtTotal / fallas : 0;
  const disponibilidad = tp > 0 ? Math.max(0, ((tp - mdtTotal) / tp) * 100) : 0;
  const mtbf = fallas > 0 ? (tp - mdtTotal) / fallas : 0;

  return { disponibilidad, mtbf, mttr, mwt, mdt_total: mdtTotal, fallas, tp };
}
