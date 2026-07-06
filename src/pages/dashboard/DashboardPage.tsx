import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthContext } from '../../context/AuthContext';
import {
  Search, Bell, Settings, ChevronLeft, ChevronRight, LogOut,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  CheckCircle2, Clock, AlertCircle, FileText, MoreHorizontal
} from 'lucide-react';
import { authService } from '../../services/authService';
import { useOutletContext } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { employeeService } from '../../services/employeeService';
import { zoneService } from '../../services/zoneService';

// --- COMPONENTES UI REUTILIZABLES ---

const CircularProgress = ({ percentage, color, title, subtitle, className = '' }: { percentage: number, color: string, title: string, subtitle: string, className?: string }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`bg-white rounded-none p-3 lg:p-5 border border-[#6EA2B3]/30 border-t-4 border-t-primary-600 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-md transition-shadow ${className}`}>
      <h3 className="text-xs lg:text-sm font-semibold text-slate-800 mb-0 lg:mb-4 self-start w-full text-center truncate px-1">{title}</h3>
      <div className="relative flex items-center justify-center mb-1 lg:mb-2 scale-75 lg:scale-100 transform origin-center">
        <svg className="transform -rotate-90 w-24 h-24">
          <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
          <circle
            cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round" className={`${color} transition-all duration-1000 ease-out`}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-800">{percentage}%</span>
        </div>
      </div>
      <div className="flex items-center mt-2 space-x-4 text-xs font-medium text-slate-500">
        <div className="flex items-center"><span className={`w-2 h-2 rounded-full mr-1.5 ${color.replace('text-', 'bg-')}`}></span> {subtitle}</div>
      </div>
    </div>
  );
};

const HorizontalBar = ({ label, percentage, colorClass }: { label: string, percentage: number, colorClass: string }) => (
  <div className="flex items-center text-sm w-full">
    <span className="w-20 text-slate-500 font-medium truncate">{label}</span>
    <div className="flex-1 mx-3 h-2 bg-slate-100 rounded-full overflow-hidden flex">
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${percentage}%` }}></div>
    </div>
    <span className="w-10 text-right font-semibold text-slate-700">{percentage}%</span>
  </div>
);

// --- HELPERS ---

// --- COMPONENTES UI REUTILIZABLES ---

export const DashboardPage = () => {
  const { user } = useAuthContext();
  const { searchQuery = '' } = useOutletContext<{ searchQuery: string }>() || {};
  const [currentDate, setCurrentDate] = useState(new Date());
  const [clearedActivityIds, setClearedActivityIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('geoasisto_cleared_activities');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Queries de Firebase
  const { data: records = [] } = useQuery({
    queryKey: ['attendance'],
    queryFn: attendanceService.getAttendanceRecords,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: employeeService.getAllEmployees,
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: zoneService.getZones,
  });

  const { data: allLeaves = [] } = useQuery({
    queryKey: ['leaves'],
    queryFn: attendanceService.getAllLeaveRequests,
  });

  // Procesamiento de datos reales
  const today = new Date();

  // 1. Filtrar registros de hoy
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayRecords = records.filter(record => {
    return record.date === todayStr;
  });

  // 2. Estado actual por empleado (última acción del día)
  const employeeStatusToday = new Map();
  todayRecords.forEach(record => {
    if (!employeeStatusToday.has(record.userId)) {
      employeeStatusToday.set(record.userId, record);
    }
  });

  const presentEmployees = Array.from(employeeStatusToday.values()).filter(r => r.checkIn && !r.checkOut);
  const totalEmployees = employees.length || 1;
  const presentCount = presentEmployees.length;
  const attendancePercentage = Math.round((presentCount / totalEmployees) * 100);

  // 3. Puntualidad (basado en el PRIMER check-in del día de cada empleado)
  const firstCheckInToday = new Map();
  [...todayRecords].reverse().forEach(record => {
    if (record.checkIn && !firstCheckInToday.has(record.userId)) {
      firstCheckInToday.set(record.userId, record);
    }
  });

  let onTimeCount = 0;
  firstCheckInToday.forEach(record => {
    const isLate = record.checkInStatus === 'late';
    if (!isLate) onTimeCount++;
  });

  const totalCheckIns = firstCheckInToday.size || 1;
  const onTimePercentage = firstCheckInToday.size === 0 ? 100 : Math.round((onTimeCount / totalCheckIns) * 100);

  // 4. Ocupación por Sedes
  const zoneOccupancy = new Map();
  zones.forEach(z => zoneOccupancy.set(z.id, 0));

  presentEmployees.forEach(record => {
    if (zoneOccupancy.has(record.zoneId)) {
      zoneOccupancy.set(record.zoneId, zoneOccupancy.get(record.zoneId) + 1);
    }
  });

  const maxCapacity = presentCount || 1;
  const zoneStats = zones.map(zone => {
    const count = zoneOccupancy.get(zone.id) || 0;
    const percentage = presentCount === 0 ? 0 : Math.round((count / maxCapacity) * 100);
    return { name: zone.name, percentage, count };
  }).sort((a, b) => b.percentage - a.percentage).slice(0, 4);

  // 5. Actividad Reciente (Últimos 5 globales)
  const recentList = records.map(record => {
    const emp = employees.find(e => e.uid === record.userId);
    const zone = zones.find(z => z.id === record.zoneId);

    const hasCheckOut = !!record.checkOut;
    const isLate = record.checkInStatus === 'late';

    let parsedDate = new Date(0);
    try {
      parsedDate = parseISO((hasCheckOut ? record.checkOut : record.checkIn) || new Date().toISOString());
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) { }

    return {
      id: record.id || Date.now().toString(),
      name: emp?.displayName || 'Usuario Eliminado',
      documentId: emp?.documentId || '',
      action: hasCheckOut ? 'Salida registrada' : (isLate ? 'Llegada tardía' : 'Entrada registrada'),
      time: format(parsedDate, 'hh:mm a'),
      timestamp: parsedDate.getTime(),
      type: hasCheckOut ? 'check-out' : (isLate ? 'late' : 'check-in'),
      size: zone?.name || 'Sede Eliminada'
    };
  })
  .sort((a, b) => b.timestamp - a.timestamp)
  .filter(act => !clearedActivityIds.has(act.id))
  .slice(0, 5);

  const filteredRecentList = recentList.filter(act => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return act.name.toLowerCase().includes(s) || act.documentId.toLowerCase().includes(s);
  });

  // Generar días del mes para el calendario
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Rellenar días en blanco al inicio (para alinear con el día de la semana)
  const startDay = monthStart.getDay(); // 0 = Domingo
  const blankDays = Array(startDay).fill(null);

  const pendingLeaves = allLeaves.filter(leave => leave.status === 'pending');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const filteredPendingLeaves = pendingLeaves.filter(leave => {
    if (!searchQuery) return true;
    const emp = employees.find(e => e.uid === leave.userId);
    if (!emp) return false;
    const s = searchQuery.toLowerCase();
    return emp.displayName.toLowerCase().includes(s) || (emp.documentId && emp.documentId.toLowerCase().includes(s));
  });

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 overflow-y-auto custom-scrollbar pb-8">

      {/* 3 Metrics Cards (Full Width) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
        <CircularProgress percentage={attendancePercentage} color="text-amber-500" title="Asistencia" subtitle={`${presentCount} Presentes`} className="col-span-1" />
        <CircularProgress percentage={onTimePercentage} color="text-indigo-500" title="Puntualidad" subtitle={`${onTimeCount} A tiempo`} className="col-span-1" />

        <div className="col-span-2 lg:col-span-1 bg-white rounded-none p-4 lg:p-5 border border-[#6EA2B3]/30 border-t-4 border-t-[#4E8EA2] shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 text-center">Ocupación por Sedes</h3>
          <div className="space-y-4 mt-2">
            {zoneStats.length > 0 ? zoneStats.map((z, i) => {
              const colors = ['bg-indigo-500', 'bg-blue-400', 'bg-emerald-400', 'bg-slate-300'];
              return <HorizontalBar key={i} label={z.name} percentage={z.percentage} colorClass={colors[i % colors.length]} />;
            }) : (
              <div className="text-center text-slate-400 text-xs mt-8">Sin datos de ocupación</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Activity (Left) & Calendar (Right) */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Recent Activity List */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Actividad Reciente</h3>
            <button 
              onClick={() => {
                const newCleared = new Set(clearedActivityIds);
                filteredRecentList.forEach(act => newCleared.add(act.id));
                setClearedActivityIds(newCleared);
                localStorage.setItem('geoasisto_cleared_activities', JSON.stringify(Array.from(newCleared)));
              }}
              className="text-sm text-red-500 font-medium hover:text-red-600 transition-colors bg-red-50 px-3 py-1 rounded-full"
            >
              Vaciar todo
            </button>
          </div>

          <div className="space-y-3">
            {filteredRecentList.length > 0 ? filteredRecentList.map((act) => (
              <div key={act.id} className="flex items-center justify-between p-4 bg-white rounded-none border border-[#6EA2B3]/30 shadow-sm hover:shadow-md hover:bg-gradient-to-r hover:from-white hover:to-[#BDD8E9]/20 transition-all group border-l-4 border-l-[#7BBDE8]">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${act.type === 'late' ? 'bg-amber-100' : act.type === 'check-out' ? 'bg-slate-100' : 'bg-indigo-50'}`}>
                    {act.type === 'late' ? <Clock className="w-5 h-5 text-amber-600" /> : <CheckCircle2 className={`w-5 h-5 ${act.type === 'check-out' ? 'text-slate-500' : 'text-indigo-600'}`} />}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{act.name}</h4>
                    {act.documentId && <p className="text-[10px] text-slate-400 font-mono">V-{act.documentId}</p>}
                    <p className="text-xs text-slate-500">{act.action}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-8 text-sm">
                  <div className="hidden sm:flex items-center text-slate-500 w-24"><Clock className="w-4 h-4 mr-1.5 opacity-50" />{act.time}</div>
                  <div className="hidden md:flex items-center text-slate-500 w-28 text-xs bg-slate-50 px-2 py-1 rounded-md">{act.size}</div>
                  <button className="text-slate-300 hover:text-slate-500"><MoreHorizontal className="w-5 h-5" /></button>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-slate-500 text-sm">No hay resultados.</div>
            )}
          </div>
        </div>

        {/* --- COLUMNA DERECHA (Sidebar Derecha - Calendar) --- */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col space-y-6">
          {/* Calendar Widget */}
          <div className="bg-white rounded-none p-6 border border-[#6EA2B3]/30 border-t-4 border-t-primary-800 shadow-sm h-fit">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-slate-800 capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h3>
              <div className="flex space-x-1">
                <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-slate-50 text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-slate-50 text-slate-400"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => (
                <div key={d} className="text-xs font-semibold text-amber-500 py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {blankDays.map((_, i) => (
                <div key={`blank-${i}`} className="p-1.5"></div>
              ))}
              {daysInMonth.map((date, i) => {
                const today = isToday(date);
                return (
                  <div key={i} className="p-1">
                    <button className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium transition-colors ${today ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'text-slate-600 hover:bg-slate-100'
                      }`}>
                      {format(date, 'd')}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
