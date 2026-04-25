import { 
  Asset, 
  WorkOrder, 
  CalendarException, 
  Shift, 
  KPIStats, 
  SystemConfig 
} from '../types';
import { calculateMinutesBetween } from '../lib/utils';

/**
 * MTTR (Técnico): Fin_Reparacion − Inicio_Falla − MWT. (Eficiencia técnica pura).
 * MWT (Logístico): Llegada_Repuesto − Solicitud_Repuesto. (Cuello de botella de almacén/compras).
 * MDT Total: MTTR + MWT. (Tiempo total de indisponibilidad).
 */
export function calculateOTIndicators(ot: WorkOrder) {
  const mwt = calculateMinutesBetween(ot.solicitud_repuesto, ot.llegada_repuesto);
  const totalDowntime = calculateMinutesBetween(ot.inicio_falla, ot.fin_reparacion);
  const mttr = totalDowntime - mwt;

  return {
    mwt: Math.max(0, mwt),
    mttr: Math.max(0, mttr),
    mdt: Math.max(0, totalDowntime)
  };
}

/**
 * Algoritmo de Tiempo Planificado (Tp)
 * 1. Calcular días del mes según calendario.
 * 2. Multiplicar días laborables por horas de turnos activos.
 * 3. Resta de Feriados: Resta las horas de los días registrados como 'FERIADO'.
 * 4. Suma de Días Extra: Suma las horas operativas de los días registrados como 'DIA_EXTRA'.
 * Fórmula: Tp = (DíasLab × HorasTurno) − ∑ HorasFeriados + ∑ HorasExtra.
 */
export function calculatePlannedTime(
  month: number, 
  year: number, 
  shifts: Shift[], 
  exceptions: CalendarException[]
): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let totalHours = 0;

  // Helper to parse time to minutes from midnight
  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Helper to merge intervals and calculate total hours
  const calculateMergedHours = (intervals: {start: number, end: number}[]) => {
    if (intervals.length === 0) return 0;
    
    // Handle overnight shifts (end < start)
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
    
    const totalMinutes = merged.reduce((sum, inv) => sum + (inv.end - inv.start), 0);
    return totalMinutes / 60;
  };

  const monthShifts = (shifts || []).filter(s => s.mes === month && s.anio === year);
  
  let activeShifts = monthShifts;
  if (activeShifts.length === 0 && (shifts || []).length > 0) {
     const sortedShifts = [...(shifts || [])].sort((a, b) => {
        if (a.anio !== b.anio) return b.anio - a.anio;
        return b.mes - a.mes;
     });
     const pastShifts = sortedShifts.filter(s => s.anio < year || (s.anio === year && s.mes <= month));
     if (pastShifts.length > 0) {
       const latestYear = pastShifts[0].anio;
       const latestMonth = pastShifts[0].mes;
       activeShifts = pastShifts.filter(s => s.anio === latestYear && s.mes === latestMonth);
     } else {
       activeShifts = sortedShifts.filter(s => s.anio === sortedShifts[0].anio && s.mes === sortedShifts[0].mes);
     }
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay(); // 0: Sunday, 1-4: Mon-Thu, 5: Fri, 6: Sat

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Check for exceptions
    const exception = exceptions.find(e => e.fecha === dateStr);
    if (exception?.tipo === 'FERIADO') continue;

    const dayIntervals: {start: number, end: number}[] = [];

    for (const shift of activeShifts) {
      if (dayOfWeek >= 1 && dayOfWeek <= 4) {
        if (shift.lu_ju_in && shift.lu_ju_out) {
          dayIntervals.push({
            start: timeToMinutes(shift.lu_ju_in),
            end: timeToMinutes(shift.lu_ju_out)
          });
        }
      } else if (dayOfWeek === 5) {
        if (shift.vi_in && shift.vi_out) {
          dayIntervals.push({
            start: timeToMinutes(shift.vi_in),
            end: timeToMinutes(shift.vi_out)
          });
        }
      }
    }

    totalHours += calculateMergedHours(dayIntervals);
  }

  // Add extra days
  const extraDays = (exceptions || []).filter(e => {
    const d = new Date(e.fecha);
    return e.tipo === 'DIA_EXTRA' && d.getMonth() === month && d.getFullYear() === year;
  });
  
  // Assuming extra days add 8 hours for now
  totalHours += extraDays.length * 8;

  return totalHours;
}

export function calculateAssetKPIs(
  asset: Asset, 
  workOrders: WorkOrder[], 
  tp: number
): KPIStats {
  const closedOTs = (workOrders || []).filter(ot => ot.id_activo === asset.id && ot.estado === 'Cerrada');
  
  // MTBF and MTTR are usually calculated based on CORRECTIVE failures
  const fallasOTs = closedOTs.filter(ot => ot.tipo === 'Correctivo');
  const fallas = fallasOTs.length;

  const mdtTotal = closedOTs.reduce((acc, ot) => acc + ot.mdt_total, 0) / 60; // hours (Total unavailability)
  const mttrTotal = fallasOTs.reduce((acc, ot) => acc + ot.mttr_tecnico, 0) / 60; // hours (Repair time for failures)
  const mwtTotal = closedOTs.reduce((acc, ot) => acc + ot.mwt_espera, 0) / 60; // hours (Total wait time for any intervention)
  
  // MTTR (Mean Time To Repair) - average time to repair a FAILURE
  const mttr = fallas > 0 ? mttrTotal / fallas : 0;
  
  // MWT (Mean Wait Time) - average wait time across ALL interventions (usually wait time is wait time regardless of type)
  const interventions = closedOTs.length;
  const mwt = interventions > 0 ? mwtTotal / interventions : 0;
  
  // Disponibilidad (%) = (Tp - MDT_Total) / Tp * 100
  // Note: Here we use mdtTotal which includes all closed OTs (Preventive, Corrective, etc.) 
  // as any closed OT implies the equipment was unavailable during that time if mdt_total > 0.
  const disponibilidad = tp > 0 ? Math.max(0, ((tp - mdtTotal) / tp) * 100) : 100;
  
  // MTBF (Mean Time Between Failures) = (Tp - MDT_Total) / Numero de Fallas (Correctivos)
  const uptime = tp - mdtTotal;
  const mtbf = fallas > 0 ? uptime / fallas : tp;

  return {
    disponibilidad,
    mtbf,
    mttr,
    mwt,
    mdt_total: mdtTotal,
    fallas,
    tp
  };
}
