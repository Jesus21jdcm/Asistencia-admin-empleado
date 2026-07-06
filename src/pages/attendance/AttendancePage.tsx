import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  getPaginationRowModel
} from '@tanstack/react-table';
import {
  Loader2,
  MapPin,
  ArrowRightLeft,
  AlertCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CalendarRange,
  Clock,
  UserCircle,
  CheckCircle2,
  Filter,
  Users,
  UserPlus,
  X
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { attendanceService } from '../../services/attendanceService';
import { employeeService } from '../../services/employeeService';
import { zoneService } from '../../services/zoneService';
import { shiftService } from '../../services/shiftService';
import type { AttendanceRecord } from '../../types/models';
import { WeeklyReport } from './WeeklyReport';

interface EnrichedRecord extends AttendanceRecord {
  employeeName: string;
  employeeEmail: string;
  documentId: string;
  zoneName: string;
  shiftName: string;
  shiftEntry: string;
  shiftExit: string;
  shiftLunch: string;
  formattedDate: string;
  formattedCheckIn: string;
  formattedCheckOut: string;
  delayText: string;
  isLate: boolean;
  isEarlyCheckout: boolean;
  isLeave?: boolean;
}

export const AttendancePage = () => {
  const [activeTab, setActiveTab] = useState<'diario' | 'semanal'>('diario');
  // Filtros de UI
  const [filterDate, setFilterDate] = useState<string>(format(new Date(), 'yyyy-MM-dd')); // Hoy por defecto
  const [filterEmployee, setFilterEmployee] = useState<string>('');
  const [filterZone] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'late' | 'ontime'>('all');

  // Estados para Registro Manual
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [manualUserId, setManualUserId] = useState('');
  const [manualType, setManualType] = useState<'in' | 'out'>('in');
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualTime, setManualTime] = useState(format(new Date(), 'HH:mm'));

  // Queries
  const queryClient = useQueryClient();

  const { data: records = [], isLoading: isLoadingRecords } = useQuery({
    queryKey: ['attendance'],
    queryFn: attendanceService.getAttendanceRecords,
  });

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: employeeService.getActiveEmployees,
  });

  const { data: zones = [], isLoading: isLoadingZones } = useQuery({
    queryKey: ['zones'],
    queryFn: zoneService.getZones,
  });

  const { data: shifts = [], isLoading: isLoadingShifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: shiftService.getShifts,
  });

  const { data: allLeaves = [] } = useQuery({
    queryKey: ['leaves'],
    queryFn: attendanceService.getAllLeaveRequests,
  });

  const deleteMutation = useMutation({
    mutationFn: attendanceService.deleteRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Registro eliminado correctamente.');
    },
    onError: (error) => {
      toast.error('Error al eliminar el registro.');
      console.error(error);
    }
  });

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este registro? Esto permitirá al empleado volver a marcar asistencia.')) {
      deleteMutation.mutate(id);
    }
  };

  const manualRecordMutation = useMutation({
    mutationFn: async () => {
      if (!manualUserId || !manualDate || !manualTime) throw new Error('Faltan campos obligatorios');

      const employee = employees.find(e => e.uid === manualUserId);
      if (!employee) throw new Error('Empleado no encontrado');

      const zone = zones.find(z => z.id === employee.zoneId);
      const shift = employee.shiftId ? shifts.find(s => s.id === employee.shiftId) : null;

      const expectedEntry = shift ? shift.entryTime : (zone?.entryTime || '09:00');
      const expectedExit = shift ? shift.exitTime : (zone?.exitTime || '18:00');
      const toleranceMinutes = shift?.entryTolerance || zone?.entryTolerance || 0;

      const currentIsoTime = new Date(`${manualDate}T${manualTime}:00`).toISOString();
      const existingRecord = await attendanceService.getTodayRecordByUser(manualUserId, manualDate);

      if (manualType === 'in') {
        if (existingRecord) throw new Error('El empleado ya tiene un registro para esta fecha. Debes editar la salida.');

        const [h, m] = expectedEntry.split(':').map(Number);
        const limitTime = new Date();
        limitTime.setHours(h, m + toleranceMinutes, 0, 0);

        const [mh, mm] = manualTime.split(':').map(Number);
        const manTime = new Date();
        manTime.setHours(mh, mm, 0, 0);

        let status: 'on-time' | 'late' = 'on-time';
        if (manTime > limitTime) status = 'late';

        await attendanceService.createRecord({
          userId: manualUserId,
          zoneId: employee.zoneId || '',
          checkIn: currentIsoTime,
          checkInStatus: status,
          date: manualDate,
          timestamp: currentIsoTime
        });
      } else {
        if (!existingRecord) throw new Error('No hay una entrada registrada para esta fecha. Debes registrar la entrada primero.');
        if (existingRecord.checkOut) throw new Error('Ya existe una salida para esta fecha.');

        let outStatus: 'on-time' | 'early' = 'on-time';
        if (manualTime < expectedExit) outStatus = 'early';

        await attendanceService.updateRecord(existingRecord.id, {
          checkOut: currentIsoTime,
          checkOutStatus: outStatus
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Registro manual guardado correctamente.');
      setIsManualModalOpen(false);
      setManualUserId('');
      setManualTime(format(new Date(), 'HH:mm'));
    },
    onError: (error: unknown) => {
      toast.error((error as Error).message || 'Error al guardar el registro manual.');
    }
  });

  const handleOpenManualModal = () => {
    setManualDate(format(new Date(), 'yyyy-MM-dd'));
    setManualTime(format(new Date(), 'HH:mm'));
    setManualSearch('');
    setManualUserId('');
    setIsManualModalOpen(true);
  };

  // Enriquecer registros uniendo colecciones localmente
  const enrichedRecords = useMemo((): EnrichedRecord[] => {
    return records.map(record => {
      const employee = employees.find(e => e.uid === record.userId);
      const zone = zones.find(z => z.id === record.zoneId);
      const shift = employee?.shiftId ? shifts.find(s => s.id === employee.shiftId) : null;

      let formattedDate = record.date;
      let formattedCheckIn = '--:--';
      let formattedCheckOut = '--:--';

      try {
        if (!formattedDate && record.timestamp) {
          formattedDate = format(parseISO(record.timestamp), 'yyyy-MM-dd');
        }

        if (record.checkIn) {
          formattedCheckIn = format(parseISO(record.checkIn), 'hh:mm a');
        } else if (record.timestamp) {
          formattedCheckIn = format(parseISO(record.timestamp), 'hh:mm a');
        }

        if (record.checkOut) {
          formattedCheckOut = format(parseISO(record.checkOut), 'hh:mm a');
        }
      } catch (e) {
        console.error('Error parsing date', e);
      }

      let delayText = '';
      const isLate = record.checkInStatus === 'late';
      const isEarlyCheckout = record.checkOutStatus === 'early';

      if (isLate) delayText += 'Llegó Tarde. ';
      if (isEarlyCheckout) delayText += 'Salió Temprano. ';
      if (!delayText) delayText = 'A Tiempo';

      const shiftEntry = shift ? shift.entryTime : (zone?.entryTime || '09:00');
      const shiftExit = shift ? shift.exitTime : (zone?.exitTime || '18:00');
      const empLunchStart = employee?.customLunchStartTime || shift?.lunchStartTime;
      const empLunchEnd = employee?.customLunchEndTime || shift?.lunchEndTime;
      const shiftLunch = empLunchStart && empLunchEnd ? `${empLunchStart} - ${empLunchEnd}` : '';

      return {
        ...record,
        employeeName: employee?.displayName || 'Empleado Desconocido',
        employeeEmail: employee?.email || '',
        documentId: employee?.documentId || '',
        zoneName: zone?.name || 'Sede Desconocida',
        shiftName: shift?.name || 'Sede (Por Defecto)',
        shiftEntry,
        shiftExit,
        shiftLunch,
        formattedDate: formattedDate || 'N/A',
        formattedCheckIn,
        formattedCheckOut,
        delayText,
        isLate,
        isEarlyCheckout
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || (b.checkIn || '').localeCompare(a.checkIn || ''));
  }, [records, employees, zones, shifts]);

  // Filtrado de registros + Inyección de Permisos (Registros Virtuales)
  const filteredRecords = useMemo(() => {
    const baseFiltered = enrichedRecords.filter(record => {
      // Filtro por Fecha
      if (filterDate && record.date !== filterDate) return false;

      // Filtro por Empleado
      if (filterEmployee) {
        const s = filterEmployee.toLowerCase();
        const matchesName = record.employeeName.toLowerCase().includes(s);
        const matchesId = record.documentId.toLowerCase().includes(s);
        if (!matchesName && !matchesId) return false;
      }

      // Filtro por Sede
      if (filterZone && record.zoneId !== filterZone) return false;

      // Filtro por Estado
      if (filterStatus === 'late' && !record.isLate) return false;
      if (filterStatus === 'ontime' && record.isLate) return false;

      return true;
    });

    // Inyectar permisos aprobados como registros virtuales (solo si hay fecha específica filtrada)
    if (filterDate) {
      const approvedLeaves = allLeaves.filter(l => l.status === 'approved');
      
      approvedLeaves.forEach(leave => {
        const start = leave.startDate || (leave as any).date;
        const end = leave.endDate || (leave as any).date;
        
        if (start && end && filterDate >= start && filterDate <= end) {
          const emp = employees.find(e => e.uid === leave.userId);
          if (!emp) return;

          // Respetar filtros actuales
          if (filterEmployee) {
            const s = filterEmployee.toLowerCase();
            const matchesName = (emp.displayName || '').toLowerCase().includes(s);
            const matchesId = (emp.documentId || '').toLowerCase().includes(s);
            if (!matchesName && !matchesId) return;
          }
          if (filterZone && emp.zoneId !== filterZone) return;
          if (filterStatus === 'late' || filterStatus === 'ontime') return; // Los permisos no son tardanzas
          
          // Verificamos que no tenga un registro real ese mismo día
          const hasRecord = baseFiltered.some(r => r.userId === leave.userId);
          
          if (!hasRecord) {
            const zone = zones.find(z => z.id === emp.zoneId);
            baseFiltered.push({
              id: `leave-${leave.id}-${filterDate}`,
              userId: leave.userId,
              zoneId: emp.zoneId || '',
              date: filterDate,
              checkIn: '',
              checkOut: '',
              checkInStatus: 'on-time',
              checkOutStatus: 'on-time',
              timestamp: '',
              employeeName: emp.displayName || 'Empleado Desconocido',
              employeeEmail: emp.email || '',
              documentId: emp.documentId || '',
              zoneName: zone?.name || 'No Asignada',
              shiftName: 'Permiso',
              shiftEntry: '',
              shiftExit: '',
              shiftLunch: '',
              formattedDate: filterDate,
              formattedCheckIn: '--:--',
              formattedCheckOut: '--:--',
              delayText: `PERMISO APROBADO: ${leave.reason}`,
              isLate: false,
              isEarlyCheckout: false,
              isLeave: true
            } as EnrichedRecord);
          }
        }
      });
    }

    return baseFiltered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || (b.checkIn || '').localeCompare(a.checkIn || ''));
  }, [enrichedRecords, filterDate, filterEmployee, filterZone, filterStatus, allLeaves, employees, zones]);

  // Cálculos para KPIs
  const kpis = useMemo(() => {
    const total = filteredRecords.length;
    const onTimeCount = filteredRecords.filter(r => !r.isLate).length;
    const lateCount = filteredRecords.filter(r => r.isLate).length;
    const earlyOutCount = filteredRecords.filter(r => r.isEarlyCheckout).length;

    return {
      total,
      onTimeCount,
      onTimePercentage: total === 0 ? 0 : Math.round((onTimeCount / total) * 100),
      lateCount,
      latePercentage: total === 0 ? 0 : Math.round((lateCount / total) * 100),
      earlyOutCount
    };
  }, [filteredRecords]);

  const generateSummaryData = () => {
    const summaryMap = new Map<string, any>();
    const approvedLeaves = allLeaves.filter(l => l.status === 'approved');

    employees.forEach(emp => {
      if (filterZone && emp.zoneId !== filterZone) return;
      if (filterEmployee) {
        const s = filterEmployee.toLowerCase();
        const matchesName = (emp.displayName || '').toLowerCase().includes(s);
        const matchesId = (emp.documentId || '').toLowerCase().includes(s);
        if (!matchesName && !matchesId) return;
      }
      
      summaryMap.set(emp.uid, {
        'Empleado': emp.displayName || 'Empleado',
        'Cédula': emp.documentId || '',
        'Días Trabajados': 0,
        'Fechas Trabajadas': '',
        'Total Horas Trabajadas': 0,
        'Minutos de Tardanza': 0,
        'Horas Extras': 0,
        'Días Justificados': 0,
        '_diasSet': new Set<string>(),
        '_zoneId': emp.zoneId
      });
    });

    filteredRecords.forEach(r => {
      if (!summaryMap.has(r.userId)) {
        summaryMap.set(r.userId, {
          'Empleado': r.employeeName,
          'Cédula': r.documentId,
          'Días Trabajados': 0,
          'Fechas Trabajadas': '',
          'Total Horas Trabajadas': 0,
          'Minutos de Tardanza': 0,
          'Horas Extras': 0,
          'Días Justificados': 0,
          '_diasSet': new Set<string>(),
          '_zoneId': r.zoneId
        });
      }
      const summary = summaryMap.get(r.userId);
      if (r.formattedDate) {
        summary['_diasSet'].add(r.formattedDate);
      }

      const hasLeaveThisDay = approvedLeaves.some(l => {
        if (l.userId !== r.userId) return false;
        const start = l.startDate || (l as any).date;
        const end = l.endDate || (l as any).date;
        return r.formattedDate >= start && r.formattedDate <= end;
      });

      if (r.isLate && r.checkIn && !hasLeaveThisDay) {
        try {
          const shiftEntry = r.shiftEntry || '09:00';
          const expectedTime = new Date(`2000-01-01T${shiftEntry}:00`);
          const checkInDate = parseISO(r.checkIn);
          const checkInTime = new Date(`2000-01-01T${format(checkInDate, 'HH:mm')}:00`);

          if (checkInTime > expectedTime) {
            const diffMs = checkInTime.getTime() - expectedTime.getTime();
            summary['Minutos de Tardanza'] += diffMs / 60000;
          }
        } catch (e) {
          console.error("Error calculando tardanza", e);
        }
      }

      if (r.checkIn && r.checkOut) {
        try {
          const inDate = parseISO(r.checkIn);
          const outDate = parseISO(r.checkOut);
          let workedMs = outDate.getTime() - inDate.getTime();

          const employee = employees.find(e => e.uid === r.userId);
          const shift = employee?.shiftId ? shifts.find(s => s.id === employee.shiftId) : null;
          const zone = zones.find(z => z.id === r.zoneId);

          const empLunchStart = employee?.customLunchStartTime || shift?.lunchStartTime;
          const empLunchEnd = employee?.customLunchEndTime || shift?.lunchEndTime;

          if (empLunchStart && empLunchEnd) {
            const lunchStart = new Date(`2000-01-01T${empLunchStart}:00`);
            const lunchEnd = new Date(`2000-01-01T${empLunchEnd}:00`);
            const lunchMs = Math.max(0, lunchEnd.getTime() - lunchStart.getTime());
            workedMs = Math.max(0, workedMs - lunchMs);
          }

          const workedHours = workedMs / (1000 * 60 * 60);
          summary['Total Horas Trabajadas'] += workedHours;

          const expectedEntry = shift ? shift.entryTime : (zone?.entryTime || '09:00');
          const expectedExit = shift ? shift.exitTime : (zone?.exitTime || '18:00');
          const entryTime = new Date(`2000-01-01T${expectedEntry}:00`);
          const exitTime = new Date(`2000-01-01T${expectedExit}:00`);
          let expectedMs = exitTime.getTime() - entryTime.getTime();

          const empExpLunchStart = employee?.customLunchStartTime || shift?.lunchStartTime;
          const empExpLunchEnd = employee?.customLunchEndTime || shift?.lunchEndTime;

          if (empExpLunchStart && empExpLunchEnd) {
            const lunchStart = new Date(`2000-01-01T${empExpLunchStart}:00`);
            const lunchEnd = new Date(`2000-01-01T${empExpLunchEnd}:00`);
            expectedMs -= Math.max(0, lunchEnd.getTime() - lunchStart.getTime());
          }

          const expectedHours = expectedMs / (1000 * 60 * 60);

          if (workedHours > expectedHours) {
            summary['Horas Extras'] += (workedHours - expectedHours);
          }
        } catch (e) {
          console.error("Error calculando horas", e);
        }
      }
    });

    approvedLeaves.forEach(leave => {
       if (!summaryMap.has(leave.userId)) return;
       const summary = summaryMap.get(leave.userId);
       const start = leave.startDate || (leave as any).date;
       const end = leave.endDate || (leave as any).date;
       const zone = zones.find(z => z.id === summary['_zoneId']);
       const workDays = zone?.workDays || [1,2,3,4,5];
       
       if (filterDate) {
         if (filterDate >= start && filterDate <= end) {
            const dateObj = new Date(`${filterDate}T12:00:00`);
            if (workDays.includes(dateObj.getDay())) {
               if (!summary['_diasSet'].has(filterDate)) {
                  summary['Días Justificados'] += 1;
               }
            }
         }
       } else {
         const startDateObj = new Date(`${start}T12:00:00`);
         const endDateObj = new Date(`${end}T12:00:00`);
         for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
            const dateStr = format(d, 'yyyy-MM-dd');
            if (workDays.includes(d.getDay())) {
               if (!summary['_diasSet'].has(dateStr)) {
                  summary['Días Justificados'] += 1;
               }
            }
         }
       }
    });

    return Array.from(summaryMap.values())
      .filter(s => s['_diasSet'].size > 0 || s['Días Justificados'] > 0)
      .map(s => {
        const diasArray = Array.from(s['_diasSet'] as Set<string>).sort();
        return {
          'Empleado': s['Empleado'],
          'Cédula': s['Cédula'],
          'Días Trabajados': diasArray.length,
          'Días Justificados': s['Días Justificados'],
          'Fechas Trabajadas': diasArray.join(', '),
          'Total Horas Trabajadas': Number(s['Total Horas Trabajadas'].toFixed(2)),
          'Minutos de Tardanza': Math.round(s['Minutos de Tardanza']),
          'Horas Extras': Number(s['Horas Extras'].toFixed(2))
        };
      });
  };

  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      toast.error('No hay registros para exportar en el rango actual.');
      return;
    }

    const detailData = filteredRecords.map(r => ({
      'Empleado': r.employeeName,
      'Cédula': r.documentId,
      'Fecha': r.formattedDate,
      'Entrada': r.formattedCheckIn,
      'Salida': r.formattedCheckOut,
      'Estado': r.delayText,
      'Sede': r.zoneName,
      'Turno': r.shiftName
    }));

    const summaryData = generateSummaryData();

    const wb = XLSX.utils.book_new();
    const wsDetail = XLSX.utils.json_to_sheet(detailData);
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);

    const wscolsDetail = [
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }
    ];
    wsDetail['!cols'] = wscolsDetail;

    const wscolsSummary = [
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 20 }
    ];
    wsSummary['!cols'] = wscolsSummary;

    XLSX.utils.book_append_sheet(wb, wsDetail, "Detalle de Asistencias");
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen de Nómina");

    XLSX.writeFile(wb, `Reporte_Asistencia_${filterDate || 'Historico'}.xlsx`);
    toast.success('Reporte Excel exportado correctamente');
  };

  const handleExportPDF = () => {
    if (filteredRecords.length === 0) {
      toast.error('No hay registros para exportar en el rango actual.');
      return;
    }

    const doc = new jsPDF('landscape');
    const title = `Reporte de Asistencia - ${filterDate || 'Histórico'}`;
    
    // Configuración de estilo global
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    
    // --- 1. Tabla de Resumen ---
    doc.setFontSize(12);
    doc.text('Resumen por Empleado', 14, 25);
    
    const summaryData = generateSummaryData();
    const summaryColumns = [
      'Empleado', 'Cédula', 'Días Trab.', 'Días Justif.', 'Fechas', 'Total Hrs', 'Tardanza (Min)', 'Hrs Extras'
    ];
    const summaryRows = summaryData.map(s => [
      s['Empleado'],
      s['Cédula'],
      s['Días Trabajados'],
      s['Días Justificados'],
      s['Fechas Trabajadas'],
      s['Total Horas Trabajadas'],
      s['Minutos de Tardanza'],
      s['Horas Extras']
    ]);

    autoTable(doc, {
      startY: 30,
      head: [summaryColumns],
      body: summaryRows,
      theme: 'grid',
      headStyles: { fillColor: [73, 118, 159] },
      styles: { fontSize: 8 },
      columnStyles: { 4: { cellWidth: 80 } } // Fechas column width
    });

    // --- 2. Tabla de Detalles ---
    const finalY = (doc as any).lastAutoTable.finalY || 30;
    doc.addPage();
    doc.setFontSize(12);
    doc.text('Detalle de Registros', 14, 15);

    const detailColumns = [
      'Empleado', 'Cédula', 'Fecha', 'Entrada', 'Salida', 'Estado', 'Sede', 'Turno'
    ];
    const detailRows = filteredRecords.map(r => [
      r.employeeName,
      r.documentId,
      r.formattedDate,
      r.formattedCheckIn,
      r.formattedCheckOut,
      r.delayText,
      r.zoneName,
      r.shiftName
    ]);

    autoTable(doc, {
      startY: 20,
      head: [detailColumns],
      body: detailRows,
      theme: 'grid',
      headStyles: { fillColor: [73, 118, 159] },
      styles: { fontSize: 8 }
    });

    doc.save(`Reporte_Asistencia_${filterDate || 'Historico'}.pdf`);
    toast.success('Reporte PDF exportado correctamente');
  };

  // Botones Rápidos de Fecha
  const setQuickDate = (type: 'today' | 'yesterday' | 'all') => {
    if (type === 'today') setFilterDate(format(new Date(), 'yyyy-MM-dd'));
    if (type === 'yesterday') setFilterDate(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
    if (type === 'all') setFilterDate('');
  };

  // Table setup
  const columnHelper = createColumnHelper<EnrichedRecord>();
  const columns = [
    columnHelper.display({
      id: 'employee',
      header: 'Empleado',
      cell: info => (
        <div className="flex items-center space-x-3 py-1">
          <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shadow-inner border border-indigo-100">
            {info.row.original.employeeName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-slate-900">{info.row.original.employeeName}</div>
            <div className="text-xs text-slate-500">{info.row.original.employeeEmail}</div>
          </div>
        </div>
      )
    }),
    columnHelper.display({
      id: 'shiftDetails',
      header: 'Turno & Sede',
      cell: info => (
        <div className="space-y-1 py-1">
          <div className="flex items-center text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md inline-block">
            <CalendarRange className="w-3 h-3 mr-1.5 text-slate-400" />
            {info.row.original.shiftName}
          </div>
          <div className="flex items-center text-xs text-slate-500">
            <MapPin className="w-3 h-3 mr-1.5 text-slate-400" />
            {info.row.original.zoneName}
          </div>
        </div>
      )
    }),
    columnHelper.display({
      id: 'timeline',
      header: 'Progreso del Día',
      cell: info => {
        const r = info.row.original;
        
        if (r.isLeave) {
          return (
            <div className="flex flex-col space-y-1.5 min-w-[200px]">
              <div className="flex items-center text-sm font-semibold text-indigo-700">
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-indigo-500" />
                Permiso Aprobado
              </div>
              <span className="text-xs text-slate-500 line-clamp-2" title={r.delayText.replace('PERMISO APROBADO: ', '')}>
                {r.delayText.replace('PERMISO APROBADO: ', '')}
              </span>
            </div>
          );
        }

        return (
          <div className="flex flex-col space-y-1.5 min-w-[200px]">
            {/* Entrada */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${r.isLate ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                <span className="font-semibold text-slate-700">Entrada: {r.formattedCheckIn}</span>
              </div>
              <span className="text-slate-400 text-[10px]">Turno: {r.shiftEntry}</span>
            </div>

            {/* Almuerzo (opcional) */}
            {r.shiftLunch && (
              <div className="flex items-center justify-between text-xs pl-4 border-l-2 border-slate-100 ml-1">
                <span className="text-orange-600 font-medium">Almuerzo</span>
                <span className="text-orange-400 text-[10px]">{r.shiftLunch}</span>
              </div>
            )}

            {/* Salida */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${!r.checkOut ? 'bg-slate-300' : r.isEarlyCheckout ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                <span className="font-semibold text-slate-700">Salida: {r.formattedCheckOut}</span>
              </div>
              <span className="text-slate-400 text-[10px]">Turno: {r.shiftExit}</span>
            </div>
          </div>
        );
      }
    }),
    columnHelper.display({
      id: 'status',
      header: 'Estado',
      cell: info => {
        const r = info.row.original;

        if (r.isLeave) {
          return (
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center w-max text-xs font-semibold px-2.5 py-1 rounded-lg border bg-indigo-50 text-indigo-700 border-indigo-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                Permiso
              </span>
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-1">
            <span className={`inline-flex items-center w-max text-xs font-semibold px-2.5 py-1 rounded-lg border ${r.isLate ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
              {r.isLate ? <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-red-500" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />}
              {r.isLate ? 'Entrada Tarde' : 'A Tiempo'}
            </span>
            {r.isEarlyCheckout && (
              <span className="inline-flex items-center w-max text-xs font-semibold px-2.5 py-1 rounded-lg border bg-amber-50 text-amber-700 border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                Salida Temprana
              </span>
            )}
            {!r.checkOut && (
              <span className="inline-flex items-center w-max text-xs font-semibold px-2.5 py-1 rounded-lg border bg-blue-50 text-blue-700 border-blue-200">
                <Clock className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                En Turno
              </span>
            )}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: info => (
        <div className="flex justify-end">
          <button
            onClick={() => handleDelete(info.row.original.id)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            title="Eliminar registro (Permite volver a marcar)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    }),
  ];

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredRecords,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const isLoading = isLoadingRecords || isLoadingEmployees || isLoadingZones || isLoadingShifts;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out flex flex-col min-h-[calc(100vh-10rem)]">
      {/* Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-wide text-slate-900 tracking-tight">Centro de Asistencia</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleOpenManualModal}
            className="w-full inline-flex items-center justify-center px-4 py-2 font-medium text-sm bg-primary-600 text-white rounded-none btn-angled shadow-sm shadow-black/10 hover:bg-primary-700 hover:scale-[1.02] active:bg-primary-800 active:scale-95 transition-all duration-200"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Registro Manual
          </button>
          <button
            onClick={handleExportExcel}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-[#49769F] text-white rounded-none btn-angled shadow-sm hover:brightness-110 transition-colors font-medium text-sm"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-none btn-angled shadow-sm hover:brightness-110 transition-colors font-medium text-sm"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('diario')}
          className={`py-3 px-1 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'diario' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Registro Diario
        </button>
        <button
          onClick={() => setActiveTab('semanal')}
          className={`py-3 px-1 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'semanal' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Reporte Semanal (Ausencias)
        </button>
      </div>

      {activeTab === 'diario' ? (
        <>
          {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-16 h-16 text-slate-600" />
          </div>
          <p className="text-sm font-semibold text-slate-500 mb-1 relative z-10">Total Asistencias</p>
          <p className="text-3xl font-bold text-slate-900 relative z-10">{kpis.total}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle2 className="w-16 h-16 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold text-emerald-600 mb-1 relative z-10">A Tiempo</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <p className="text-3xl font-bold text-emerald-700">{kpis.onTimeCount}</p>
            <p className="text-sm font-medium text-emerald-500">({kpis.onTimePercentage}%)</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertCircle className="w-16 h-16 text-red-600" />
          </div>
          <p className="text-sm font-semibold text-red-600 mb-1 relative z-10">Tardanzas</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <p className="text-3xl font-bold text-red-700">{kpis.lateCount}</p>
            <p className="text-sm font-medium text-red-500">({kpis.latePercentage}%)</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-16 h-16 text-amber-600" />
          </div>
          <p className="text-sm font-semibold text-amber-600 mb-1 relative z-10">Salidas Tempranas</p>
          <p className="text-3xl font-bold text-amber-700 relative z-10">{kpis.earlyOutCount}</p>
        </div>
      </div>

      {/* Control Bar (Filters) */}
      <div className="bg-white rounded-none border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between w-full">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setQuickDate('today')}
            className={`whitespace-nowrap px-4 py-2 rounded-none btn-angled text-sm font-medium transition-colors ${filterDate === format(new Date(), 'yyyy-MM-dd') ? 'bg-primary-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'} hover:scale-[1.02] active:bg-primary-800 active:scale-95 transition-all duration-200`}
          >
            Hoy
          </button>
          <button
            onClick={() => setQuickDate('yesterday')}
            className={`whitespace-nowrap px-4 py-2 rounded-none btn-angled text-sm font-medium transition-colors ${filterDate === format(subDays(new Date(), 1), 'yyyy-MM-dd') ? 'bg-primary-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'} hover:scale-[1.02] active:bg-primary-800 active:scale-95 transition-all duration-200`}
          >
            Ayer
          </button>
          <button
            onClick={() => setQuickDate('all')}
            className={`whitespace-nowrap px-4 py-2 rounded-none btn-angled text-sm font-medium transition-colors ${filterDate === '' ? 'bg-primary-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'} hover:scale-[1.02] active:bg-primary-800 active:scale-95 transition-all duration-200`}
          >
            Todo el Historial
          </button>
          <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'late' | 'ontime')}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
            >
              <option value="all">Todos los estados</option>
              <option value="late">Llegadas Tarde</option>
              <option value="ontime">A Tiempo</option>
            </select>
          </div>

          <div className="relative flex-1 md:w-48">
            <UserCircle className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar Cédula o Nombre..."
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-none border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col w-full min-h-[500px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left min-w-[800px] table-gradient-rows">
            <thead className="bg-white text-slate-700/80 font-semibold">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-4">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary-500" />
                    <p className="text-slate-500 font-medium">Cargando registros...</p>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <ArrowRightLeft className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-600 font-bold text-lg">No hay registros</p>
                    <p className="text-slate-500 text-sm mt-1">Prueba ajustando los filtros de fecha o empleado.</p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredRecords.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
            <div className="text-sm text-slate-500 font-medium">
              Mostrando {table.getRowModel().rows.length} de {filteredRecords.length} registros
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-2 border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 hover:text-primary-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-600 transition-colors shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-700 font-bold px-4">
                Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
              </span>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-2 border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 hover:text-primary-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-600 transition-colors shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Check-in Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <UserPlus className="w-5 h-5 mr-2 text-primary-600" />
                Fichaje Manual
              </h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Buscar Empleado</label>
                <input
                  type="text"
                  placeholder="Escribe el nombre o cédula para filtrar..."
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
                />

                <select
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                  size={4}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 overflow-y-auto"
                >
                  {employees
                    .filter(emp => {
                      if (!manualSearch) return true;
                      const s = manualSearch.toLowerCase();
                      return emp.displayName.toLowerCase().includes(s) || (emp.documentId && emp.documentId.toLowerCase().includes(s));
                    })
                    .map(emp => (
                      <option key={emp.uid} value={emp.uid} className="py-1">
                        {emp.documentId ? `V-${emp.documentId} - ` : ''}{emp.displayName}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Registro</label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value as 'in' | 'out')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="in">Entrada</option>
                    <option value="out">Salida</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Hora</label>
                  <input
                    type="time"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => manualRecordMutation.mutate()}
                disabled={manualRecordMutation.isPending || !manualUserId}
                className="inline-flex items-center justify-center px-4 py-2 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-[#0A4174] text-white rounded-none btn-angled shadow-sm hover:brightness-110 active:scale-95 transition-all duration-200"
              >
                {manualRecordMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                <span className="font-semibold">{manualType === 'in' ? 'Guardar Entrada' : 'Guardar Salida'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      ) : (
        <WeeklyReport />
      )}
    </div>
  );
};
