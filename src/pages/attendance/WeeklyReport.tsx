import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, startOfWeek, subWeeks, addWeeks, isAfter, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, UserX, UserCheck, CalendarDays, Clock } from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';
import { employeeService } from '../../services/employeeService';
import { zoneService } from '../../services/zoneService';

export const WeeklyReport = () => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: records = [] } = useQuery({
    queryKey: ['attendance'],
    queryFn: attendanceService.getAttendanceRecords,
  });

  const { data: leaves = [] } = useQuery({
    queryKey: ['leaves'],
    queryFn: attendanceService.getAllLeaveRequests,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: employeeService.getActiveEmployees,
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: zoneService.getZones,
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Empezamos en Lunes

  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  const reportData = useMemo(() => {
    if (!selectedEmployeeId) return [];

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const record = records.find(r => r.userId === selectedEmployeeId && r.date === dateStr);
      const isFuture = isAfter(day, new Date()) && !isToday(day);

      let leaveInfo = null;
      if (!record && !isFuture) {
        // Buscar un permiso aprobado para esta fecha
        const activeLeave = leaves.find(l => {
          if (l.userId !== selectedEmployeeId || l.status !== 'approved') return false;
          const startDate = l.startDate || (l as any).date;
          const endDate = l.endDate || (l as any).date || startDate;
          if (!startDate) return false;
          return day >= parseISO(startDate) && day <= parseISO(endDate);
        });
        if (activeLeave) {
          leaveInfo = activeLeave;
        }
      }

      return {
        date: day,
        dateStr,
        isFuture,
        record,
        leaveInfo
      };
    });
  }, [selectedEmployeeId, days, records, leaves]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="bg-white p-6 border border-[#6EA2B3]/30 border-t-4 border-t-[#0A4174] shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Seleccionar Empleado</label>
          <select
            className="w-full border border-slate-200 p-2.5 bg-slate-50 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm font-medium"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
          >
            <option value="">-- Elige un empleado para ver su semana --</option>
            {employees.map(emp => (
              <option key={emp.uid} value={emp.uid}>{emp.firstName} {emp.lastName} ({emp.documentId})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center bg-slate-50 border border-slate-200 p-1 w-full md:w-auto shrink-0 justify-between">
          <button onClick={handlePrevWeek} className="p-2 hover:bg-slate-200 text-slate-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-4 font-semibold text-sm text-slate-700 capitalize flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary-600" />
            {format(weekStart, "dd MMM", { locale: es })} - {format(addDays(weekStart, 6), "dd MMM, yyyy", { locale: es })}
          </div>
          <button onClick={handleNextWeek} className="p-2 hover:bg-slate-200 text-slate-600 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {!selectedEmployeeId ? (
        <div className="bg-white border border-slate-200 border-dashed p-12 flex flex-col items-center justify-center text-slate-400">
          <UserCheck className="w-12 h-12 mb-4 text-slate-300" />
          <p>Selecciona un empleado arriba para generar su reporte semanal</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[800px]">
              <thead className="bg-slate-50 text-slate-700/80 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px] font-bold">Fecha</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px] font-bold">Estado</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px] font-bold">Entrada</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px] font-bold">Salida</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px] font-bold">Sede / Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map(({ date, dateStr, isFuture, record, leaveInfo }) => {
                  const isAbsent = !record && !isFuture && !leaveInfo;

                  return (
                    <tr key={dateStr} className={`hover:bg-slate-50/80 transition-colors ${isAbsent ? 'bg-red-50/20' : record ? '' : leaveInfo ? 'bg-blue-50/20' : 'bg-slate-50/30 opacity-70'
                      }`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 capitalize">{format(date, 'EEEE', { locale: es })}</span>
                          <span className="text-slate-500 font-medium">{format(date, 'dd/MM/yyyy')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isFuture ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            PRÓXIMAMENTE
                          </span>
                        ) : record ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <UserCheck className="w-3 h-3 mr-1" /> ASISTIÓ
                          </span>
                        ) : leaveInfo ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                            <UserCheck className="w-3 h-3 mr-1" /> PERMISO
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            <UserX className="w-3 h-3 mr-1" /> AUSENTE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-slate-800">
                              {record.checkIn ? format(parseISO(record.checkIn), 'HH:mm') : '--:--'}
                            </span>
                            {record.checkInStatus === 'late' && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">Tarde</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">--:--</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-slate-800">
                              {record.checkOut ? format(parseISO(record.checkOut), 'HH:mm') : '--:--'}
                            </span>
                            {record.checkOutStatus === 'early' && (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">Temprano</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">--:--</span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-[200px] truncate" title={leaveInfo ? leaveInfo.reason : (record ? (zones.find(z => z.id === record.zoneId)?.name || 'Desconocida') : '')}>
                        {record ? (
                          <span className="text-slate-600 text-xs font-medium flex items-center">
                            Sede: {zones.find(z => z.id === record.zoneId)?.name || 'Desconocida'}
                          </span>
                        ) : leaveInfo ? (
                          <span className="text-blue-600 text-xs font-semibold flex items-center">
                            Motivo: {leaveInfo.reason}
                          </span>
                        ) : isAbsent ? (
                          <span className="text-red-400 text-xs font-medium">Sin actividad registrada en 24h</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
