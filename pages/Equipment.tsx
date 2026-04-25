import React, { useState, useRef } from 'react';
import { 
  Asset, 
  AssetClass, 
  AssetStatus, 
  Motor, 
  Pump, 
  Variator, 
  VariatorParameter,
  Manual,
  Transmission,
  Lubrication,
  ExtraData,
  ProductionLog
} from '../types';
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  Settings, 
  Activity, 
  Zap, 
  Droplets, 
  FileText, 
  History,
  Image as ImageIcon,
  Save,
  X,
  Trash2,
  Upload,
  ShieldCheck,
  Minimize2,
  Maximize2,
  Download,
  Printer,
  Calendar,
  Clock,
  MoreVertical,
  Edit2,
  ArrowLeft,
  Factory,
  CheckCircle2,
  ClipboardList
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EquipmentProps {
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  productionLogs: ProductionLog[];
  setProductionLogs: React.Dispatch<React.SetStateAction<ProductionLog[]>>;
}

const Equipment: React.FC<EquipmentProps> = ({ assets, setAssets, productionLogs, setProductionLogs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('generales');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [historyFilter, setHistoryFilter] = useState({ start: '', end: '' });
  const [selectedLog, setSelectedLog] = useState<ProductionLog | null>(null);
  const [isEditingLog, setIsEditingLog] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Form states for sub-entities
  const [tempAsset, setTempAsset] = useState<Asset | null>(null);
  const [isEditingSub, setIsEditingSub] = useState<{ type: string; id: number | null } | null>(null);

  const handleAssetImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tempAsset) return;

    // Use FileReader to convert to Base64 for long-term storage in localStorage
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      handleInputChange('imagen_equipo', base64String);
    };
    reader.readAsDataURL(file);
  };

  const filteredAssets = (assets || []).filter(asset => 
    asset.nombre_equipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.codigo_iso.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateCycleHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startDate = new Date(0, 0, 0, startH, startM);
    const endDate = new Date(0, 0, 0, endH, endM);
    let diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    if (diff < 0) diff += 24; // Handle overnight
    return diff;
  };

  const calculateHoursBreakdown = (assetId: number) => {
    const logs = (productionLogs || []).filter(log => log.id_activo === assetId);
    const produccion = logs
      .filter(l => l.tipo === 'Producción' || !l.tipo)
      .reduce((total, log) => total + log.horas_operacion, 0);
    const mantenimiento = logs
      .filter(l => l.tipo !== 'Producción' && l.tipo)
      .reduce((total, log) => total + log.horas_operacion, 0);
    return { produccion, mantenimiento, total: produccion + mantenimiento };
  };

  const calculateAccumulatedHours = (assetId: number) => calculateHoursBreakdown(assetId).total;

  const handleOpenModal = (asset: Asset | null) => {
    if (asset) {
      const breakdown = calculateHoursBreakdown(asset.id);
      const assetWithHours = { 
        ...asset, 
        horas_acumuladas: breakdown.total,
        horas_produccion: breakdown.produccion,
        horas_mantenimiento: breakdown.mantenimiento
      };
      setSelectedAsset(assetWithHours);
      setTempAsset(JSON.parse(JSON.stringify(assetWithHours)));
    } else {
      const newAsset: Asset = {
        id: Date.now(),
        imagen_equipo: '',
        codigo_iso: '',
        nombre_equipo: '',
        modelo: '',
        n_serie: '',
        fabricante: '',
        sector_area: '',
        clase: 'B',
        estado: 'Operativo',
        horas_acumuladas: 0,
        horas_produccion: 0,
        horas_mantenimiento: 0,
        nota_observaciones: '',
        motores: [],
        bombas: [],
        variadores: [],
        transmisiones: [],
        lubricacion: [],
        datos_extras: [],
        manuales: []
      };
      setSelectedAsset(null);
      setTempAsset(newAsset);
    }
    setIsModalOpen(true);
    setActiveTab('generales');
    setIsMinimized(false);
    setIsMaximized(false);
  };

  const handleCloseModal = () => {
    // Check if there are changes
    const hasChanges = JSON.stringify(tempAsset) !== JSON.stringify(selectedAsset || {
      id: tempAsset?.id,
      imagen_equipo: '',
      codigo_iso: '',
      nombre_equipo: '',
      modelo: '',
      n_serie: '',
      fabricante: '',
      sector_area: '',
      clase: 'B',
      estado: 'Operativo',
      horas_acumuladas: 0,
      nota_observaciones: '',
      motores: [],
      bombas: [],
      variadores: [],
      transmisiones: [],
      lubricacion: [],
      datos_extras: [],
      manuales: []
    });

    if (hasChanges) {
      setShowSavePrompt(true);
    } else {
      setIsModalOpen(false);
    }
  };

  const handleSaveAsset = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tempAsset) return;

    if (selectedAsset) {
      setAssets(prev => prev.map(a => a.id === tempAsset.id ? tempAsset : a));
    } else {
      setAssets(prev => [...prev, tempAsset]);
    }
    setIsModalOpen(false);
    setShowSavePrompt(false);
  };

  const handleInputChange = (field: keyof Asset, value: any) => {
    if (!tempAsset) return;
    setTempAsset({ ...tempAsset, [field]: value });
  };

  const handleAddVariatorParameter = (variadorId: number) => {
    if (!tempAsset) return;
    const newParam: VariatorParameter = { id: Date.now(), nombre: 'Nuevo Parámetro', valor: '' };
    const newList = (tempAsset.variadores || []).map(v => 
      v.id === variadorId ? { ...v, parametros: [...(v.parametros || []), newParam] } : v
    );
    setTempAsset({ ...tempAsset, variadores: newList });
  };

  const handleUpdateVariatorParameter = (variadorId: number, paramId: number, field: 'nombre' | 'valor', value: string) => {
    if (!tempAsset) return;
    const newList = (tempAsset.variadores || []).map(v => {
      if (v.id === variadorId) {
        const newParams = (v.parametros || []).map(p => 
          p.id === paramId ? { ...p, [field]: value } : p
        );
        return { ...v, parametros: newParams };
      }
      return v;
    });
    setTempAsset({ ...tempAsset, variadores: newList });
  };

  const handleRemoveVariatorParameter = (variadorId: number, paramId: number) => {
    if (!tempAsset) return;
    const newList = (tempAsset.variadores || []).map(v => {
      if (v.id === variadorId) {
        return { ...v, parametros: (v.parametros || []).filter(p => p.id !== paramId) };
      }
      return v;
    });
    setTempAsset({ ...tempAsset, variadores: newList });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tempAsset) return;

    const newManual: Manual = {
      id: Date.now(),
      nombre_archivo: file.name,
      fecha_subida: format(new Date(), 'yyyy-MM-dd'),
      tamano: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      ruta_archivo: URL.createObjectURL(file)
    };

    setTempAsset({
      ...tempAsset,
      manuales: [...(tempAsset.manuales || []), newManual]
    });
  };

  const handleUpdateManual = (id: number, field: keyof Manual, value: any) => {
    if (!tempAsset) return;
    const newList = (tempAsset.manuales || []).map(m => m.id === id ? { ...m, [field]: value } : m);
    setTempAsset({ ...tempAsset, manuales: newList });
  };

  const handleAddSubEntity = (type: string) => {
    if (!tempAsset) return;
    const newId = Date.now();
    let newEntity: any;

    switch (type) {
      case 'motores':
        newEntity = { id: newId, motor: '', descripcion: '', marca: '', modelo: '', n_serie: '', potencia: '', rpm: 0, cos_phi: 0, voltaje: 0, amperaje: 0, frecuencia: 50, rodamiento_del: '', rodamiento_tras: '' };
        break;
      case 'bombas':
        newEntity = { id: newId, descripcion: '', marca: '', modelo: '', n_serie: '', potencia: '', caudal_q: '', h_max: '', h_min: '', t_max: '', rpm: 0, voltaje: 0, amperaje: 0, p1: '', p2: '', frecuencia: 50, cos_phi: 0, rodamiento_del: '', rodamiento_tras: '', capacitor: '' };
        break;
      case 'variadores':
        newEntity = { 
          id: newId, 
          descripcion: '', 
          marca: '', 
          modelo: '', 
          n_serie: '', 
          fecha_instalacion: format(new Date(), 'yyyy-MM-dd'), 
          parametros: [
            { id: 1, nombre: 'Rampa Acc.', valor: '' },
            { id: 2, nombre: 'Rampa Dec.', valor: '' },
            { id: 3, nombre: 'Límite Corr.', valor: '' },
            { id: 4, nombre: 'Límite Vel.', valor: '' }
          ] 
        };
        break;
      case 'transmisiones':
        newEntity = { id: newId, descripcion: '', cantidad: 1, tipo_numero: '', frecuencia_revision: '' };
        break;
      case 'lubricacion':
        newEntity = { id: newId, descripcion: '', cantidad: 1, tipo_lubricante: '', frecuencia_revision: '' };
        break;
      case 'datos_extras':
        newEntity = { id: newId, descripcion_parte: '', cantidad: 1, sector_ubicacion: '', elemento: '', frecuencia_revision: '' };
        break;
    }

    if (newEntity) {
      setTempAsset({
        ...tempAsset,
        [type]: [...(tempAsset[type as keyof Asset] as any[] || []), newEntity]
      });
      setIsEditingSub({ type, id: newId });
    }
  };

  const handleUpdateSubEntity = (type: string, id: number, field: string, value: any) => {
    if (!tempAsset) return;
    const list = tempAsset[type as keyof Asset] as any[];
    const newList = (list || []).map(item => item.id === id ? { ...item, [field]: value } : item);
    setTempAsset({ ...tempAsset, [type]: newList });
  };

  const handleRemoveSubEntity = (type: string, id: number) => {
    if (!tempAsset) return;
    const list = tempAsset[type as keyof Asset] as any[];
    const newList = (list || []).filter(item => item.id !== id);
    setTempAsset({ ...tempAsset, [type]: newList });
  };

  const exportHistoryToPDF = () => {
    if (!tempAsset) return;
    const doc = new jsPDF();
    const logoUrl = '/logo.png'; // Use default logo

    // Header
    doc.setFontSize(20);
    doc.text('BITÁCORA DE INTERVENCIONES', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Equipo: ${tempAsset.nombre_equipo} (${tempAsset.codigo_iso})`, 105, 30, { align: 'center' });
    doc.text(`Planta: ${tempAsset.sector_area}`, 105, 38, { align: 'center' });

    const history = (productionLogs || []).filter(log => log.id_activo === tempAsset.id);
    
    const tableData = history.map(log => [
      log.fecha,
      'Producción', // Type
      log.horas_operacion,
      log.ciclos,
      log.observaciones
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Fecha', 'Tipo', 'Horas', 'Ciclos', 'Observaciones']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
      margin: { top: 50 },
      didDrawPage: (data: any) => {
        // Footer
        const str = 'Página ' + (doc as any).internal.getNumberOfPages();
        doc.setFontSize(10);
        doc.text(str, 105, (doc as any).internal.pageSize.height - 10, { align: 'center' });
      }
    });

    doc.save(`Historial_${tempAsset.codigo_iso}.pdf`);
  };

  const exportLogToPDF = (log: ProductionLog) => {
    if (!tempAsset) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text('DETALLE DE INTERVENCIÓN', 105, 25, { align: 'center' });
    
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.5);
    doc.line(20, 30, 190, 30);

    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105);
    doc.text(`Equipo: ${tempAsset.nombre_equipo} (${tempAsset.codigo_iso})`, 20, 45);
    doc.text(`Fecha: ${log.fecha}`, 20, 53);
    doc.text(`Horas de Operación: ${log.horas_operacion.toFixed(1)} h`, 20, 61);
    doc.text(`Ciclos Registrados: ${log.ciclos}`, 20, 69);
    
    let currentY = 85;

    if (log.ot_detalle) {
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Detalles de la Orden de Trabajo:', 20, currentY);
      currentY += 8;

      autoTable(doc, {
        startY: currentY,
        body: [
          ['Código de OT', log.ot_detalle.codigo_ot || `OT-${log.ot_detalle.id_ot.toString().padStart(4, '0')}`, 'Tipo', log.ot_detalle.tipo],
          ['Prioridad', log.ot_detalle.prioridad, 'Estado', log.ot_detalle.estado],
          ['Técnico', log.ot_detalle.tecnico, '', ''],
          ['Inicio Falla', log.ot_detalle.inicio_falla.replace('T', ' '), 'Fin Reparación', log.ot_detalle.fin_reparacion?.replace('T', ' ') || '-'],
          ['MDT Total', `${log.ot_detalle.mdt_total} min`, 'MTTR Técnico', `${log.ot_detalle.mttr_tecnico} min`],
          ['MWT Espera', `${log.ot_detalle.mwt_espera} min`, '', '']
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 }, 2: { fontStyle: 'bold', cellWidth: 30 } }
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(12);
      doc.text('Descripción de la Falla:', 20, currentY);
      currentY += 6;
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const splitDesc = doc.splitTextToSize(log.ot_detalle.descripcion, 170);
      doc.text(splitDesc, 20, currentY);
      currentY += (splitDesc.length * 5) + 8;

      if (log.ot_detalle.notas_adicionales) {
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text('Notas del Técnico:', 20, currentY);
        currentY += 6;
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        const splitNotes = doc.splitTextToSize(log.ot_detalle.notas_adicionales, 170);
        doc.text(splitNotes, 20, currentY);
        currentY += (splitNotes.length * 5) + 8;
      }

      if (log.ot_detalle.solicitud_repuesto || log.ot_detalle.motivo_espera) {
        doc.setFontSize(11);
        doc.text('Gestión de Repuestos / Espera:', 20, currentY);
        currentY += 6;
        doc.setFontSize(9);
        if (log.ot_detalle.solicitud_repuesto) {
          doc.text(`Solicitud: ${log.ot_detalle.solicitud_repuesto.replace('T', ' ')}`, 25, currentY);
          currentY += 5;
        }
        if (log.ot_detalle.llegada_repuesto) {
          doc.text(`Llegada: ${log.ot_detalle.llegada_repuesto.replace('T', ' ')}`, 25, currentY);
          currentY += 5;
        }
        if (log.ot_detalle.motivo_espera) {
          doc.text(`Motivo: ${log.ot_detalle.motivo_espera}`, 25, currentY);
          currentY += 5;
        }
        currentY += 5;
      }
    }

    if (!log.ot_detalle) {
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Observaciones y Notas:', 20, currentY);
      currentY += 8;
      
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      const splitObs = doc.splitTextToSize(log.observaciones || 'Sin observaciones registradas.', 170);
      doc.text(splitObs, 20, currentY);
      
      currentY += (splitObs.length * 5) + 10;
    }

    if (log.ciclos_detalle && log.ciclos_detalle.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [['Ciclo', 'Hora Inicio', 'Hora Fin', 'Horas Totales']],
        body: log.ciclos_detalle.map((c, i) => [
          `Ciclo ${i + 1}`,
          c.start,
          c.end,
          `${calculateCycleHours(c.start, c.end).toFixed(2)} h`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 },
        margin: { left: 20, right: 20 }
      });
    }
    
    doc.save(`Intervencion_${tempAsset.codigo_iso}_${log.fecha}.pdf`);
  };

  const exportAssetToPDF = () => {
    if (!tempAsset) return;
    setIsGeneratingPDF(true);
    
    // Small delay to show the "Generating" state
    setTimeout(() => {
      const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    const addHeader = (doc: jsPDF) => {
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text('PLANILLA TÉCNICA DE ACTIVO', pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, 10, { align: 'right' });
      doc.line(margin, 25, pageWidth - margin, 25);
    };

    const addFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
      doc.text('CMMS Industrial - Sistema de Gestión de Mantenimiento', margin, pageHeight - 10);
      doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    };

    addHeader(doc);

    // General Information
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Información General', margin, 35);
    
    const generalInfo = [
      ['Código ISO', tempAsset.codigo_iso || '-'],
      ['Nombre', tempAsset.nombre_equipo || '-'],
      ['Modelo', tempAsset.modelo || '-'],
      ['Nº Serie', tempAsset.n_serie || '-'],
      ['Fabricante', tempAsset.fabricante || '-'],
      ['Sector / Área', tempAsset.sector_area || '-'],
      ['Clase', tempAsset.clase || '-'],
      ['Estado', tempAsset.estado || '-'],
      ['Horas Acumuladas', tempAsset.horas_acumuladas?.toString() || '0']
    ];

    autoTable(doc, {
      startY: 40,
      body: generalInfo,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
      margin: { left: margin, right: margin }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // Motors
    if ((tempAsset.motores || []).length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Motores Asociados', margin, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Motor', 'Marca', 'Modelo', 'Potencia', 'RPM', 'Voltaje', 'Amperaje']],
        body: tempAsset.motores.map(m => [m.motor, m.marca, m.modelo, m.potencia, m.rpm, m.voltaje, m.amperaje]),
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8 },
        margin: { left: margin, right: margin }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Pumps
    if ((tempAsset.bombas || []).length > 0) {
      if (currentY > pageHeight - 40) { doc.addPage(); addHeader(doc); currentY = 35; }
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Bombas Asociadas', margin, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Descripción', 'Marca', 'Modelo', 'Potencia', 'Caudal Q', 'H Max', 'RPM']],
        body: tempAsset.bombas.map(b => [b.descripcion, b.marca, b.modelo, b.potencia, b.caudal_q, b.h_max, b.rpm]),
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8 },
        margin: { left: margin, right: margin }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Variators
    if ((tempAsset.variadores || []).length > 0) {
      if (currentY > pageHeight - 40) { doc.addPage(); addHeader(doc); currentY = 35; }
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Variadores Asociados', margin, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Descripción', 'Marca', 'Modelo', 'Potencia', 'Amp Nom', 'Rango Freq']],
        body: tempAsset.variadores.map(v => [v.descripcion, v.marca, v.modelo, v.potencia, v.amp_nom, v.rango_freq]),
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8 },
        margin: { left: margin, right: margin }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Transmissions
    if ((tempAsset.transmisiones || []).length > 0) {
      if (currentY > pageHeight - 40) { doc.addPage(); addHeader(doc); currentY = 35; }
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Transmisiones', margin, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Descripción', 'Cantidad', 'Tipo/Número', 'Frec. Revisión']],
        body: tempAsset.transmisiones.map(t => [t.descripcion, t.cantidad, t.tipo_numero, t.frecuencia_revision]),
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8 },
        margin: { left: margin, right: margin }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Lubrication
    if ((tempAsset.lubricacion || []).length > 0) {
      if (currentY > pageHeight - 40) { doc.addPage(); addHeader(doc); currentY = 35; }
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Lubricación', margin, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Descripción', 'Cantidad', 'Tipo Lubricante', 'Frec. Revisión']],
        body: tempAsset.lubricacion.map(l => [l.descripcion, l.cantidad, l.tipo_lubricante, l.frecuencia_revision]),
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8 },
        margin: { left: margin, right: margin }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Extra Data
    if ((tempAsset.datos_extras || []).length > 0) {
      if (currentY > pageHeight - 40) { doc.addPage(); addHeader(doc); currentY = 35; }
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Otros Datos / Componentes', margin, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Parte', 'Elemento', 'Cantidad', 'Ubicación', 'Frec. Revisión']],
        body: tempAsset.datos_extras.map(d => [d.descripcion_parte, d.elemento, d.cantidad, d.sector_ubicacion, d.frecuencia_revision]),
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8 },
        margin: { left: margin, right: margin }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Manuals
    if ((tempAsset.manuales || []).length > 0) {
      if (currentY > pageHeight - 40) { doc.addPage(); addHeader(doc); currentY = 35; }
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Manuales y Documentación', margin, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Archivo', 'Fecha de Subida', 'Tamaño']],
        body: tempAsset.manuales.map(m => [m.nombre_archivo, m.fecha_subida, m.tamano]),
        theme: 'striped',
        headStyles: { fillColor: [71, 85, 105] }, // Different header color for manuals
        styles: { fontSize: 8 },
        margin: { left: margin, right: margin }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // History (Historial de Intervenciones)
    const history = (productionLogs || []).filter(log => log.id_activo === tempAsset?.id);
    if (history.length > 0) {
      if (currentY > pageHeight - 40) { doc.addPage(); addHeader(doc); currentY = 35; }
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Historial de Intervenciones', margin, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Fecha', 'Tipo', 'OT / Descripción', 'Técnico', 'H. Op.', 'MDT']],
        body: history.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(log => [
          log.fecha,
          log.tipo || 'Producción',
          log.ot_detalle ? (log.ot_detalle.codigo_ot || `OT-${log.ot_detalle.id_ot.toString().padStart(4, '0')}`) : (log.observaciones || '-'),
          log.ot_detalle?.tecnico || '-',
          `${log.horas_operacion.toFixed(1)}h`,
          log.ot_detalle ? `${log.ot_detalle.mdt_total}m` : '-'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 7, cellPadding: 2 },
        margin: { left: margin, right: margin }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Observations
    if (tempAsset.nota_observaciones) {
      if (currentY > pageHeight - 40) { doc.addPage(); addHeader(doc); currentY = 35; }
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Observaciones', margin, currentY);
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      const splitText = doc.splitTextToSize(tempAsset.nota_observaciones, pageWidth - (margin * 2));
      doc.text(splitText, margin, currentY + 7);
    }

    // Add page numbering to all pages
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(doc, i, totalPages);
    }

    doc.save(`Planilla_${tempAsset.codigo_iso}.pdf`);
    
    // Open in a new tab to "view" it immediately
    const pdfData = doc.output('bloburl');
    window.open(pdfData, '_blank');
    setIsGeneratingPDF(false);
  }, 500);
};

  const renderMotors = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-bold text-white">Motores Asociados</h4>
        <button 
          onClick={() => handleAddSubEntity('motores')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Motor</span>
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {(tempAsset?.motores || []).map((motor) => (
          <div key={motor.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 flex-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Motor</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={motor.motor} onChange={(e) => handleUpdateSubEntity('motores', motor.id, 'motor', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Marca</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={motor.marca} onChange={(e) => handleUpdateSubEntity('motores', motor.id, 'marca', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Modelo</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={motor.modelo} onChange={(e) => handleUpdateSubEntity('motores', motor.id, 'modelo', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Nº Serie</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={motor.n_serie} onChange={(e) => handleUpdateSubEntity('motores', motor.id, 'n_serie', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Potencia (HP/KW)</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={motor.potencia} onChange={(e) => handleUpdateSubEntity('motores', motor.id, 'potencia', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">RPM</label>
                  <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={motor.rpm} onChange={(e) => handleUpdateSubEntity('motores', motor.id, 'rpm', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Cos Phi</label>
                  <input type="number" step="0.01" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={motor.cos_phi} onChange={(e) => handleUpdateSubEntity('motores', motor.id, 'cos_phi', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Voltaje</label>
                  <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={motor.voltaje} onChange={(e) => handleUpdateSubEntity('motores', motor.id, 'voltaje', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Amperaje</label>
                  <input type="number" step="0.1" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={motor.amperaje} onChange={(e) => handleUpdateSubEntity('motores', motor.id, 'amperaje', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Frecuencia</label>
                  <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={motor.frecuencia} onChange={(e) => handleUpdateSubEntity('motores', motor.id, 'frecuencia', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Rod. Delantero</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={motor.rodamiento_del} onChange={(e) => handleUpdateSubEntity('motores', motor.id, 'rodamiento_del', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Rod. Trasero</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={motor.rodamiento_tras} onChange={(e) => handleUpdateSubEntity('motores', motor.id, 'rodamiento_tras', e.target.value)} />
                </div>
              </div>
              <button onClick={() => handleRemoveSubEntity('motores', motor.id)} className="ml-4 p-2 text-slate-500 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Descripción</label>
              <textarea className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white min-h-[40px]" value={motor.descripcion} onChange={(e) => handleUpdateSubEntity('motores', motor.id, 'descripcion', e.target.value)} />
            </div>
          </div>
        ))}
        {(tempAsset?.motores || []).length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-2xl">
            <Zap className="w-10 h-10 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No hay motores registrados para este equipo.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderPumps = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-bold text-white">Bombas Asociadas</h4>
        <button 
          onClick={() => handleAddSubEntity('bombas')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Bomba</span>
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {(tempAsset?.bombas || []).map((bomba) => (
          <div key={bomba.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 flex-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Descripción</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={bomba.descripcion} onChange={(e) => handleUpdateSubEntity('bombas', bomba.id, 'descripcion', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Marca</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={bomba.marca} onChange={(e) => handleUpdateSubEntity('bombas', bomba.id, 'marca', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Modelo</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={bomba.modelo} onChange={(e) => handleUpdateSubEntity('bombas', bomba.id, 'modelo', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Nº Serie</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={bomba.n_serie} onChange={(e) => handleUpdateSubEntity('bombas', bomba.id, 'n_serie', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Potencia</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={bomba.potencia} onChange={(e) => handleUpdateSubEntity('bombas', bomba.id, 'potencia', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Q (Caudal)</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={bomba.caudal_q} onChange={(e) => handleUpdateSubEntity('bombas', bomba.id, 'caudal_q', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">H Max</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={bomba.h_max} onChange={(e) => handleUpdateSubEntity('bombas', bomba.id, 'h_max', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">H Min</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={bomba.h_min} onChange={(e) => handleUpdateSubEntity('bombas', bomba.id, 'h_min', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">T Max</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={bomba.t_max} onChange={(e) => handleUpdateSubEntity('bombas', bomba.id, 't_max', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">RPM</label>
                  <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={bomba.rpm} onChange={(e) => handleUpdateSubEntity('bombas', bomba.id, 'rpm', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Voltaje</label>
                  <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={bomba.voltaje} onChange={(e) => handleUpdateSubEntity('bombas', bomba.id, 'voltaje', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Amperaje</label>
                  <input type="number" step="0.1" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={bomba.amperaje} onChange={(e) => handleUpdateSubEntity('bombas', bomba.id, 'amperaje', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">P1</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={bomba.p1} onChange={(e) => handleUpdateSubEntity('bombas', bomba.id, 'p1', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">P2</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={bomba.p2} onChange={(e) => handleUpdateSubEntity('bombas', bomba.id, 'p2', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Capacitor</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={bomba.capacitor} onChange={(e) => handleUpdateSubEntity('bombas', bomba.id, 'capacitor', e.target.value)} />
                </div>
              </div>
              <button onClick={() => handleRemoveSubEntity('bombas', bomba.id)} className="ml-4 p-2 text-slate-500 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {(tempAsset?.bombas || []).length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-2xl">
            <Droplets className="w-10 h-10 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No hay bombas registradas para este equipo.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderVariators = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-bold text-white">Variadores Asociados</h4>
        <button 
          onClick={() => handleAddSubEntity('variadores')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Variador</span>
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {(tempAsset?.variadores || []).map((variador) => (
          <div key={variador.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 flex-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Descripción</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={variador.descripcion} onChange={(e) => handleUpdateSubEntity('variadores', variador.id, 'descripcion', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Marca</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={variador.marca} onChange={(e) => handleUpdateSubEntity('variadores', variador.id, 'marca', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Modelo</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={variador.modelo} onChange={(e) => handleUpdateSubEntity('variadores', variador.id, 'modelo', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha Inst.</label>
                  <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" value={variador.fecha_instalacion} onChange={(e) => handleUpdateSubEntity('variadores', variador.id, 'fecha_instalacion', e.target.value)} />
                </div>
              </div>
              <button onClick={() => handleRemoveSubEntity('variadores', variador.id)} className="ml-4 p-2 text-slate-500 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-bold text-blue-400 uppercase block">Registro de Parámetros</label>
                <button 
                  onClick={() => handleAddVariatorParameter(variador.id)}
                  className="text-[9px] font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Agregar Parámetro</span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(variador.parametros || []).map((param) => (
                  <div key={param.id} className="space-y-1 relative group/param">
                    <input 
                      type="text" 
                      className="w-full bg-transparent border-b border-slate-700 text-[9px] text-slate-500 font-bold uppercase focus:border-blue-500 outline-none" 
                      value={param.nombre} 
                      onChange={(e) => handleUpdateVariatorParameter(variador.id, param.id, 'nombre', e.target.value)}
                    />
                    <input 
                      type="text" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white focus:border-blue-500 outline-none" 
                      value={param.valor} 
                      onChange={(e) => handleUpdateVariatorParameter(variador.id, param.id, 'valor', e.target.value)}
                    />
                    <button 
                      onClick={() => handleRemoveVariatorParameter(variador.id, param.id)}
                      className="absolute -top-1 -right-1 p-1 bg-red-900/50 text-red-400 rounded-full opacity-0 group-hover/param:opacity-100 transition-opacity"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        {(tempAsset?.variadores || []).length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-2xl">
            <Activity className="w-10 h-10 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No hay variadores registrados para este equipo.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderVarios = () => (
    <div className="space-y-8">
      {/* Transmisión */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h5 className="text-sm font-bold text-slate-300 flex items-center space-x-2">
            <Settings className="w-4 h-4 text-blue-400" />
            <span>Transmisión (Correas / Cadena)</span>
          </h5>
          <button onClick={() => handleAddSubEntity('transmisiones')} className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1">
            <Plus className="w-3 h-3" />
            <span>Agregar Registro</span>
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {(tempAsset?.transmisiones || []).map((item) => (
            <div key={item.id} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-3 flex items-center space-x-4">
              <input type="text" placeholder="Descripción" className="flex-1 bg-transparent border-b border-slate-700 text-xs text-white focus:border-blue-500 outline-none" value={item.descripcion} onChange={(e) => handleUpdateSubEntity('transmisiones', item.id, 'descripcion', e.target.value)} />
              <input type="number" placeholder="Cant." className="w-16 bg-transparent border-b border-slate-700 text-xs text-white focus:border-blue-500 outline-none" value={item.cantidad} onChange={(e) => handleUpdateSubEntity('transmisiones', item.id, 'cantidad', Number(e.target.value))} />
              <input type="text" placeholder="Tipo y Número" className="flex-1 bg-transparent border-b border-slate-700 text-xs text-white focus:border-blue-500 outline-none" value={item.tipo_numero} onChange={(e) => handleUpdateSubEntity('transmisiones', item.id, 'tipo_numero', e.target.value)} />
              <input type="text" placeholder="Frec. Revisión" className="w-32 bg-transparent border-b border-slate-700 text-xs text-white focus:border-blue-500 outline-none" value={item.frecuencia_revision} onChange={(e) => handleUpdateSubEntity('transmisiones', item.id, 'frecuencia_revision', e.target.value)} />
              <button onClick={() => handleRemoveSubEntity('transmisiones', item.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Lubricación */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h5 className="text-sm font-bold text-slate-300 flex items-center space-x-2">
            <Droplets className="w-4 h-4 text-emerald-400" />
            <span>Lubricación</span>
          </h5>
          <button onClick={() => handleAddSubEntity('lubricacion')} className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1">
            <Plus className="w-3 h-3" />
            <span>Agregar Registro</span>
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {(tempAsset?.lubricacion || []).map((item) => (
            <div key={item.id} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-3 flex items-center space-x-4">
              <input type="text" placeholder="Descripción" className="flex-1 bg-transparent border-b border-slate-700 text-xs text-white focus:border-blue-500 outline-none" value={item.descripcion} onChange={(e) => handleUpdateSubEntity('lubricacion', item.id, 'descripcion', e.target.value)} />
              <input type="number" placeholder="Cant." className="w-16 bg-transparent border-b border-slate-700 text-xs text-white focus:border-blue-500 outline-none" value={item.cantidad} onChange={(e) => handleUpdateSubEntity('lubricacion', item.id, 'cantidad', Number(e.target.value))} />
              <input type="text" placeholder="Tipo Aceite/Grasa" className="flex-1 bg-transparent border-b border-slate-700 text-xs text-white focus:border-blue-500 outline-none" value={item.tipo_lubricante} onChange={(e) => handleUpdateSubEntity('lubricacion', item.id, 'tipo_lubricante', e.target.value)} />
              <input type="text" placeholder="Frec. Revisión" className="w-32 bg-transparent border-b border-slate-700 text-xs text-white focus:border-blue-500 outline-none" value={item.frecuencia_revision} onChange={(e) => handleUpdateSubEntity('lubricacion', item.id, 'frecuencia_revision', e.target.value)} />
              <button onClick={() => handleRemoveSubEntity('lubricacion', item.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Datos Extras */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h5 className="text-sm font-bold text-slate-300 flex items-center space-x-2">
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Datos Extras del Equipo</span>
          </h5>
          <button onClick={() => handleAddSubEntity('datos_extras')} className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-1">
            <Plus className="w-3 h-3" />
            <span>Agregar Registro</span>
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {(tempAsset?.datos_extras || []).map((item) => (
            <div key={item.id} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-3 flex items-center space-x-4">
              <input type="text" placeholder="Descripción Parte" className="flex-1 bg-transparent border-b border-slate-700 text-xs text-white focus:border-blue-500 outline-none" value={item.descripcion_parte} onChange={(e) => handleUpdateSubEntity('datos_extras', item.id, 'descripcion_parte', e.target.value)} />
              <input type="number" placeholder="Cant." className="w-16 bg-transparent border-b border-slate-700 text-xs text-white focus:border-blue-500 outline-none" value={item.cantidad} onChange={(e) => handleUpdateSubEntity('datos_extras', item.id, 'cantidad', Number(e.target.value))} />
              <input type="text" placeholder="Sector/Ubicación" className="flex-1 bg-transparent border-b border-slate-700 text-xs text-white focus:border-blue-500 outline-none" value={item.sector_ubicacion} onChange={(e) => handleUpdateSubEntity('datos_extras', item.id, 'sector_ubicacion', e.target.value)} />
              <input type="text" placeholder="Elemento" className="flex-1 bg-transparent border-b border-slate-700 text-xs text-white focus:border-blue-500 outline-none" value={item.elemento} onChange={(e) => handleUpdateSubEntity('datos_extras', item.id, 'elemento', e.target.value)} />
              <input type="text" placeholder="Frec. Revisión" className="w-32 bg-transparent border-b border-slate-700 text-xs text-white focus:border-blue-500 outline-none" value={item.frecuencia_revision} onChange={(e) => handleUpdateSubEntity('datos_extras', item.id, 'frecuencia_revision', e.target.value)} />
              <button onClick={() => handleRemoveSubEntity('datos_extras', item.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderManuals = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-bold text-white">Documentación y Manuales</h4>
        <div className="flex items-center space-x-3">
          <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center space-x-2 cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            <span>Subir Manual</span>
            <input type="file" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>
      <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-800/50 text-slate-500 font-bold uppercase tracking-widest">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Tamaño</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {(tempAsset?.manuales || []).map((manual) => (
              <tr key={manual.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3">
                  <input 
                    type="text" 
                    className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 text-slate-200 font-bold outline-none w-full"
                    value={manual.nombre_archivo}
                    onChange={(e) => handleUpdateManual(manual.id, 'nombre_archivo', e.target.value)}
                  />
                </td>
                <td className="px-4 py-3 text-slate-400">{manual.fecha_subida}</td>
                <td className="px-4 py-3 text-slate-400">{manual.tamano}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <a 
                    href={manual.ruta_archivo} 
                    download={manual.nombre_archivo}
                    className="inline-block p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-blue-400 transition-colors"
                    title="Descargar"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button 
                    onClick={() => handleRemoveSubEntity('manuales', manual.id)}
                    className="p-1.5 bg-slate-800 hover:bg-red-900/30 rounded-lg text-red-400 transition-colors"
                    title="Borrar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {(tempAsset?.manuales || []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">No hay manuales cargados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderLogDetail = () => {
    if (!selectedLog) return null;

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-8 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => {
                  setSelectedLog(null);
                  setIsEditingLog(false);
                }}
                className="p-3 bg-slate-900 hover:bg-slate-700 rounded-2xl text-slate-400 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h3 className="text-2xl font-bold text-white">Detalle de Intervención</h3>
                <p className="text-slate-400 text-sm">{selectedLog.fecha} • {tempAsset?.nombre_equipo}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => exportLogToPDF(selectedLog)}
                className="p-3 bg-slate-900 hover:bg-slate-700 rounded-2xl text-blue-400 transition-colors"
                title="Descargar PDF"
              >
                <Download className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setIsEditingLog(!isEditingLog)}
                className={cn(
                  "p-3 rounded-2xl transition-colors",
                  isEditingLog ? "bg-blue-600 text-white" : "bg-slate-900 hover:bg-slate-700 text-slate-400"
                )}
                title="Editar"
              >
                <Edit2 className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {selectedLog.tipo !== 'Producción' && selectedLog.ot_detalle ? (
              <div className="space-y-8">
                {/* OT Header Info */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-3xl border border-slate-700/50">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                      <ClipboardList className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Código de Intervención</p>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-xl font-black text-white font-mono">
                          {selectedLog.ot_detalle.codigo_ot || `OT-${selectedLog.ot_detalle.id_ot.toString().padStart(4, '0')}`}
                        </h3>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded border border-slate-700 uppercase">
                          {selectedLog.ot_detalle.tipo}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right hidden md:block">
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Estado de Orden</p>
                      <p className="text-emerald-400 font-bold text-sm flex items-center justify-end">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        {selectedLog.ot_detalle.estado}
                      </p>
                    </div>
                    <div className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold border",
                      selectedLog.ot_detalle.prioridad === 'Crítica' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      selectedLog.ot_detalle.prioridad === 'Alta' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                      "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    )}>
                      Prioridad {selectedLog.ot_detalle.prioridad}
                    </div>
                  </div>
                </div>

                {/* Main Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="bg-slate-800/30 p-6 rounded-3xl border border-slate-700/50 space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                        <Activity className="w-4 h-4 mr-2 text-blue-400" />
                        Descripción de la Falla
                      </h4>
                      <p className="text-slate-200 text-sm leading-relaxed">
                        {selectedLog.ot_detalle.descripcion}
                      </p>
                    </div>

                    <div className="bg-slate-800/30 p-6 rounded-3xl border border-slate-700/50 space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-amber-400" />
                        Notas del Técnico
                      </h4>
                      <p className="text-slate-300 text-sm italic leading-relaxed">
                        {selectedLog.ot_detalle.notas_adicionales || "Sin notas adicionales registradas."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-700/50 space-y-6">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-emerald-400" />
                        Cronometría de Intervención
                      </h4>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Inicio de Falla:</span>
                          <span className="text-slate-300 font-mono">{selectedLog.ot_detalle.inicio_falla.replace('T', ' ')}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Fin de Reparación:</span>
                          <span className="text-slate-300 font-mono">{selectedLog.ot_detalle.fin_reparacion?.replace('T', ' ') || '-'}</span>
                        </div>
                        <div className="pt-4 border-t border-slate-700/50 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">MDT Total</p>
                            <p className="text-white font-bold">{selectedLog.ot_detalle.mdt_total}m</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">MTTR</p>
                            <p className="text-blue-400 font-bold">{selectedLog.ot_detalle.mttr_tecnico}m</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">MWT</p>
                            <p className="text-amber-400 font-bold">{selectedLog.ot_detalle.mwt_espera}m</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-800/30 p-6 rounded-3xl border border-slate-700/50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                          <ShieldCheck className="w-4 h-4 mr-2 text-blue-400" />
                          Responsable
                        </h4>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-blue-400 font-bold">
                          {selectedLog.ot_detalle.tecnico.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">{selectedLog.ot_detalle.tecnico}</p>
                          <p className="text-slate-500 text-[10px] uppercase">Técnico de Mantenimiento</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spares Management */}
                {(selectedLog.ot_detalle.solicitud_repuesto || selectedLog.ot_detalle.motivo_espera) && (
                  <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center">
                        <Zap className="w-4 h-4 mr-2" />
                        Gestión de Repuestos y Esperas
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Solicitud</p>
                        <p className="text-slate-300 text-xs font-mono">{selectedLog.ot_detalle.solicitud_repuesto?.replace('T', ' ') || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Llegada</p>
                        <p className="text-slate-300 text-xs font-mono">{selectedLog.ot_detalle.llegada_repuesto?.replace('T', ' ') || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Motivo de Espera</p>
                        <p className="text-slate-300 text-xs">{selectedLog.ot_detalle.motivo_espera || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-800/30 p-6 rounded-3xl border border-slate-700/50">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Horas de Operación</p>
                    {isEditingLog ? (
                      <input 
                        type="number" 
                        step="0.1"
                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white w-full outline-none focus:border-blue-500"
                        value={selectedLog.horas_operacion}
                        onChange={(e) => setSelectedLog({ ...selectedLog, horas_operacion: parseFloat(e.target.value) || 0 })}
                      />
                    ) : (
                      <p className="text-3xl font-bold text-white">{selectedLog.horas_operacion.toFixed(1)} <span className="text-lg text-slate-500 font-normal">h</span></p>
                    )}
                  </div>
                  <div className="bg-slate-800/30 p-6 rounded-3xl border border-slate-700/50">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Ciclos Registrados</p>
                    {isEditingLog ? (
                      <input 
                        type="number" 
                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white w-full outline-none focus:border-blue-500"
                        value={selectedLog.ciclos}
                        onChange={(e) => setSelectedLog({ ...selectedLog, ciclos: parseInt(e.target.value) || 0 })}
                      />
                    ) : (
                      <p className="text-3xl font-bold text-white">{selectedLog.ciclos}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Observaciones</p>
                  {isEditingLog ? (
                    <textarea 
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-3xl p-6 text-slate-300 outline-none focus:border-blue-500 min-h-[150px]"
                      value={selectedLog.observaciones}
                      onChange={(e) => setSelectedLog({ ...selectedLog, observaciones: e.target.value })}
                    />
                  ) : (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 text-slate-300 italic leading-relaxed">
                      {selectedLog.observaciones || "Sin observaciones registradas."}
                    </div>
                  )}
                </div>

                {selectedLog.ciclos_detalle && selectedLog.ciclos_detalle.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Detalle de Ciclos</p>
                    <div className="bg-slate-800/30 rounded-3xl border border-slate-700/50 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-800/50 text-slate-500 font-bold uppercase tracking-widest">
                            <th className="px-6 py-4">Ciclo</th>
                            <th className="px-6 py-4">Inicio</th>
                            <th className="px-6 py-4">Fin</th>
                            <th className="px-6 py-4 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                          {selectedLog.ciclos_detalle.map((ciclo, idx) => (
                            <tr key={idx} className="text-slate-300">
                              <td className="px-6 py-4 font-bold">Ciclo {idx + 1}</td>
                              <td className="px-6 py-4">{ciclo.start}</td>
                              <td className="px-6 py-4">{ciclo.end}</td>
                              <td className="px-6 py-4 text-right font-mono text-blue-400">{calculateCycleHours(ciclo.start, ciclo.end).toFixed(2)} h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-8 bg-slate-800/50 border-t border-slate-700 flex justify-end space-x-4">
            {isEditingLog ? (
              <>
                <button 
                  onClick={() => setIsEditingLog(false)}
                  className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    const newLogs = productionLogs.map(l => l.id === selectedLog.id ? selectedLog : l);
                    setProductionLogs(newLogs);
                    setIsEditingLog(false);
                  }}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors flex items-center"
                >
                  <Save className="w-5 h-5 mr-2" />
                  Guardar Cambios
                </button>
              </>
            ) : (
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-colors"
              >
                Cerrar
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  };

  const renderHistory = () => {
    const history = (productionLogs || []).filter(log => log.id_activo === tempAsset?.id);
    const filteredHistory = (history || []).filter(log => {
      if (!historyFilter.start || !historyFilter.end) return true;
      const logDate = parseISO(log.fecha);
      return isWithinInterval(logDate, {
        start: parseISO(historyFilter.start),
        end: parseISO(historyFilter.end)
      });
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h4 className="text-lg font-bold text-white">Bitácora de Intervenciones</h4>
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-slate-800 rounded-xl px-3 py-1.5 border border-slate-700">
              <Calendar className="w-4 h-4 text-slate-500 mr-2" />
              <input type="date" className="bg-transparent text-xs text-white outline-none" value={historyFilter.start} onChange={(e) => setHistoryFilter({ ...historyFilter, start: e.target.value })} />
              <span className="mx-2 text-slate-600">-</span>
              <input type="date" className="bg-transparent text-xs text-white outline-none" value={historyFilter.end} onChange={(e) => setHistoryFilter({ ...historyFilter, end: e.target.value })} />
            </div>
            <button 
              onClick={exportHistoryToPDF}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-blue-400 border border-slate-700 transition-colors"
              title="Exportar a PDF"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-800/50 text-slate-500 font-bold uppercase tracking-widest">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Cant. Horas Intervención</th>
                <th className="px-4 py-3">Observaciones</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {(filteredHistory || []).map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-300">{log.fecha}</td>
                  <td className="px-4 py-3">
                    {log.ot_detalle ? (
                      <span className="text-blue-400 font-mono font-bold">{log.ot_detalle.codigo_ot || `OT-${log.ot_detalle.id_ot.toString().padStart(4, '0')}`}</span>
                    ) : (
                      <span className="text-slate-600 font-mono">PROD</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-bold">{log.tipo || 'Producción'}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">{log.horas_operacion.toFixed(1)} h</td>
                  <td className="px-4 py-3 text-slate-400 italic truncate max-w-[200px]">{log.observaciones}</td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-400 hover:text-blue-300 font-bold"
                    >
                      Detalle
                    </button>
                  </td>
                </tr>
              ))}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 italic">No se encontraron registros en este periodo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderGenerales = () => (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={exportAssetToPDF}
          disabled={isGeneratingPDF}
          className={cn(
            "px-4 py-2 text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition-all shadow-lg",
            isGeneratingPDF 
              ? "bg-slate-700 cursor-not-allowed" 
              : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
          )}
        >
          {isGeneratingPDF ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generando...</span>
            </>
          ) : (
            <>
              <Printer className="w-4 h-4" />
              <span>Planilla PDF</span>
            </>
          )}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Images */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 block">Fotografía Principal</label>
            <input 
              type="file" 
              ref={imageInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleAssetImageUpload} 
            />
            <div 
              className="aspect-video bg-slate-800 rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors group overflow-hidden relative"
              onClick={() => imageInputRef.current?.click()}
            >
              {tempAsset?.imagen_equipo ? (
                <>
                  <img src={tempAsset.imagen_equipo} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex flex-col items-center text-white scale-90 group-hover:scale-100 transition-transform">
                      <Upload className="w-8 h-8 mb-2" />
                      <span className="text-xs font-bold uppercase">Cambiar Imagen</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="w-10 h-10 text-slate-600 group-hover:text-blue-400 mb-2" />
                  <span className="text-xs text-slate-500 group-hover:text-blue-400">Click para subir foto del equipo</span>
                </>
              )}
            </div>
            {tempAsset?.imagen_equipo && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleInputChange('imagen_equipo', '');
                }}
                className="mt-3 w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold uppercase rounded-xl border border-red-500/20 transition-all flex items-center justify-center"
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Eliminar Imagen
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Código ISO *</label>
            <input 
              type="text" 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" 
              placeholder="Ej: EXT-01" 
              value={tempAsset?.codigo_iso || ''} 
              onChange={(e) => handleInputChange('codigo_iso', e.target.value)}
              required 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre del Equipo *</label>
            <input 
              type="text" 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" 
              placeholder="Nombre descriptivo" 
              value={tempAsset?.nombre_equipo || ''} 
              onChange={(e) => handleInputChange('nombre_equipo', e.target.value)}
              required 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Modelo</label>
            <input 
              type="text" 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" 
              value={tempAsset?.modelo || ''} 
              onChange={(e) => handleInputChange('modelo', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Nº Serie</label>
            <input 
              type="text" 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" 
              value={tempAsset?.n_serie || ''} 
              onChange={(e) => handleInputChange('n_serie', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Fabricante</label>
            <input 
              type="text" 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" 
              value={tempAsset?.fabricante || ''} 
              onChange={(e) => handleInputChange('fabricante', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Sector / Área</label>
            <input 
              type="text" 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" 
              value={tempAsset?.sector_area || ''} 
              onChange={(e) => handleInputChange('sector_area', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Clase (Criticidad)</label>
            <select 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" 
              value={tempAsset?.clase || 'B'}
              onChange={(e) => handleInputChange('clase', e.target.value as AssetClass)}
            >
              <option value="A">Clase A (Crítico)</option>
              <option value="B">Clase B (Importante)</option>
              <option value="C">Clase C (Soporte)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Estado</label>
            <select 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" 
              value={tempAsset?.estado || 'Operativo'}
              onChange={(e) => handleInputChange('estado', e.target.value as AssetStatus)}
            >
              <option value="Operativo">Operativo</option>
              <option value="En Reparación">En Reparación</option>
              <option value="Standby">Standby</option>
            </select>
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-700/50 sm:col-span-2 space-y-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Control de Horómetros</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Horas Módulo Producción</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg font-bold text-blue-400 focus:outline-none cursor-not-allowed transition-all" 
                    value={`${tempAsset?.horas_produccion?.toFixed(1) || 0} hs`} 
                    readOnly 
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Factory className="w-5 h-5 text-slate-700 group-hover:text-blue-500/50 transition-colors" />
                  </div>
                </div>
                <p className="text-[9px] text-slate-600 italic">Horas registradas en el módulo de producción.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Horas por Reparación</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg font-bold text-amber-400 focus:outline-none cursor-not-allowed transition-all" 
                    value={`${tempAsset?.horas_mantenimiento?.toFixed(1) || 0} hs`} 
                    readOnly 
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Clock className="w-5 h-5 text-slate-700 group-hover:text-amber-500/50 transition-colors" />
                  </div>
                </div>
                <p className="text-[9px] text-slate-600 italic">Horas acumuladas de intervenciones técnicas (OT).</p>
              </div>

              <div className="sm:col-span-2 pt-2">
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-widest block mb-1">Horas Acumuladas Totales</label>
                    <span className="text-3xl font-black text-emerald-400 tracking-tight">
                      {tempAsset?.horas_acumuladas?.toFixed(1) || 0} <span className="text-sm font-bold text-emerald-600 uppercase">hs</span>
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Observaciones</label>
            <textarea 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[80px]" 
              value={tempAsset?.nota_observaciones || ''} 
              onChange={(e) => handleInputChange('nota_observaciones', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-slate-700/50">
        <button type="button" onClick={handleCloseModal} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors">Cerrar</button>
        <button 
          type="button" 
          onClick={() => handleSaveAsset()}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{selectedAsset ? 'Actualizar Equipo' : 'Guardar Equipo'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestión de Activos</h2>
          <p className="text-sm text-slate-400">Inventario maestro y especificaciones técnicas</p>
        </div>
        <button 
          onClick={() => handleOpenModal(null)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 flex items-center space-x-2 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>NUEVO REGISTRO</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar por código, nombre o sector..." 
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl pl-12 pr-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center space-x-2 px-6 py-3 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-slate-400 hover:text-white transition-colors">
          <Filter className="w-5 h-5" />
          <span>Filtros Avanzados</span>
        </button>
      </div>

      {/* Asset Table */}
      <div className="bg-slate-900/50 rounded-3xl border border-slate-700/50 overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                <th className="px-6 py-4">Equipo / ISO</th>
                <th className="px-6 py-4">Sector / Área</th>
                <th className="px-6 py-4">Clase</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Horas Acum.</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-blue-500/50 transition-colors overflow-hidden">
                        <Settings className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white tracking-tight">{asset.nombre_equipo}</div>
                        <div className="text-[10px] font-mono text-slate-500 uppercase">{asset.codigo_iso}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{asset.sector_area}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold border",
                      asset.clase === 'A' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      asset.clase === 'B' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    )}>
                      Clase {asset.clase}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        asset.estado === 'Operativo' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                        asset.estado === 'En Reparación' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                        "bg-slate-500"
                      )} />
                      <span className="text-xs text-slate-300">{asset.estado}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span className="text-sm font-mono text-slate-300">{calculateAccumulatedHours(asset.id).toFixed(1)}h</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleOpenModal(asset)}
                      className="px-4 py-2 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-2 ml-auto"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Ver Detalles</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              drag={!isMaximized}
              dragMomentum={false}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                width: isMaximized ? '100vw' : '90vw',
                height: isMaximized ? '100vh' : 'auto',
                maxWidth: isMaximized ? 'none' : '1200px',
                maxHeight: isMaximized ? 'none' : '90vh'
              }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "bg-slate-900 border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col",
                isMaximized ? "rounded-none" : "rounded-[2.5rem]"
              )}
            >
              {/* Modal Header */}
              <div className="px-8 py-6 bg-slate-800/50 border-b border-slate-700/50 flex justify-between items-center cursor-move">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                    <Settings className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {selectedAsset ? `Editando: ${selectedAsset.nombre_equipo}` : 'Nuevo Registro de Activo'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Gestión de Activos Industriales</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                  >
                    <Minimize2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-slate-400 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {!isMinimized && (
                <>
                  {/* Modal Tabs */}
                  <div className="px-8 bg-slate-800/30 border-b border-slate-700/50 overflow-x-auto scrollbar-hide">
                    <div className="flex space-x-2 py-3">
                      {[
                        { id: 'generales', label: 'Generales', icon: <Settings className="w-4 h-4" /> },
                        { id: 'motores', label: 'Motores', icon: <Zap className="w-4 h-4" /> },
                        { id: 'bombas', label: 'Bombas', icon: <Droplets className="w-4 h-4" /> },
                        { id: 'variadores', label: 'Variadores', icon: <Activity className="w-4 h-4" /> },
                        { id: 'varios', label: 'Varios', icon: <MoreVertical className="w-4 h-4" /> },
                        { id: 'manuales', label: 'Manuales', icon: <FileText className="w-4 h-4" /> },
                        { id: 'historial', label: 'Historial', icon: <History className="w-4 h-4" /> },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            "flex items-center space-x-3 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                            activeTab === tab.id 
                              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                          )}
                        >
                          {tab.icon}
                          <span>{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Modal Content */}
                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {activeTab === 'generales' && renderGenerales()}
                    {activeTab === 'motores' && renderMotors()}
                    {activeTab === 'bombas' && renderPumps()}
                    {activeTab === 'variadores' && renderVariators()}
                    {activeTab === 'varios' && renderVarios()}
                    {activeTab === 'manuales' && renderManuals()}
                    {activeTab === 'historial' && renderHistory()}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedLog && renderLogDetail()}
      </AnimatePresence>

      {/* Save Prompt Modal */}
      <AnimatePresence>
        {showSavePrompt && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-slate-700 p-8 rounded-[2rem] max-w-md w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30 mx-auto mb-6">
                <Save className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2">¿Guardar cambios?</h3>
              <p className="text-slate-400 text-center mb-8">Has realizado modificaciones en el equipo. ¿Deseas guardarlas antes de salir?</p>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => handleSaveAsset()}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                >
                  Sí, guardar cambios
                </button>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setShowSavePrompt(false);
                  }}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
                >
                  No guardar
                </button>
                <button 
                  onClick={() => setShowSavePrompt(false)}
                  className="w-full py-3 bg-transparent hover:bg-slate-800 text-slate-500 font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Equipment;
