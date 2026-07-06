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
      
      return {
        date: day,
        dateStr,
        isFuture,
        record
      };
    });
  }, [selectedEmployeeId, days, records]);

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
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {reportData.map(({ date, dateStr, isFuture, record }, idx) => {
            const isAbsent = !record && !isFuture;
            
            return (
              <div 
                key={dateStr} 
                className={`bg-white border flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow relative ${
                  isAbsent ? 'border-red-200' : record ? 'border-emerald-200' : 'border-slate-100 opacity-60'
                }`}
              >
                {/* Cabecera del día */}
                <div className={`p-3 text-center border-b ${
                  isAbsent ? 'bg-red-50 border-red-100' : record ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'
                }`}>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{format(date, 'EEEE', { locale: es })}</p>
                  <p className="text-lg font-black text-slate-800">{format(date, 'dd')}</p>
                </div>

                {/* Contenido */}
                <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
                  {isFuture ? (
                    <p className="text-xs font-medium text-slate-400 italic">Próximamente</p>
                  ) : record ? (
                    <div className="space-y-3 w-full">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sede</p>
                        <p className="text-xs font-semibold text-slate-700 truncate">{zones.find(z => z.id === record.zoneId)?.name || 'Desconocida'}</p>
                      </div>
                      <div className="bg-slate-50 p-2 border border-slate-100">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase flex items-center justify-center gap-1"><Clock className="w-3 h-3"/> Entrada</p>
                        <p className="text-sm font-mono font-bold text-slate-800">{record.checkIn ? format(parseISO(record.checkIn), 'HH:mm') : '--:--'}</p>
                        {record.checkInStatus === 'late' && <span className="text-[10px] font-bold text-red-500">Tarde</span>}
                      </div>
                      <div className="bg-slate-50 p-2 border border-slate-100">
                        <p className="text-[10px] font-bold text-orange-600 uppercase flex items-center justify-center gap-1"><Clock className="w-3 h-3"/> Salida</p>
                        <p className="text-sm font-mono font-bold text-slate-800">{record.checkOut ? format(parseISO(record.checkOut), 'HH:mm') : '--:--'}</p>
                        {record.checkOutStatus === 'early' && <span className="text-[10px] font-bold text-red-500">Temprano</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                        <UserX className="w-6 h-6 text-red-500" />
                      </div>
                      <span className="font-black text-red-600 tracking-widest text-lg">AUSENTE</span>
                      <p className="text-[10px] text-red-400 mt-1 font-medium text-center">Sin actividad en 24h</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
