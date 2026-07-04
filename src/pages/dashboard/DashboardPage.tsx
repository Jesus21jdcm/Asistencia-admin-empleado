import { useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { 
  Search, Bell, Settings, ChevronLeft, ChevronRight, 
  CheckCircle2, Clock, AlertCircle, FileText, MoreHorizontal 
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { employeeService } from '../../services/employeeService';
import { zoneService } from '../../services/zoneService';

// --- COMPONENTES UI REUTILIZABLES ---

const CircularProgress = ({ percentage, color, title, subtitle }: { percentage: number, color: string, title: string, subtitle: string }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
      <h3 className="text-sm font-semibold text-slate-800 mb-4 self-start w-full text-center">{title}</h3>
      <div className="relative flex items-center justify-center mb-2">
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

// --- DASHBOARD PRINCIPAL ---

export const DashboardPage = () => {
  const { user } = useAuthContext();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Queries de Firebase
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
  const recentList = records.slice(0, 5).map(record => {
     const emp = employees.find(e => e.uid === record.userId);
     const zone = zones.find(z => z.id === record.zoneId);
     
     const hasCheckOut = !!record.checkOut;
     const isLate = record.checkInStatus === 'late';
     
     let parsedDate = new Date();
     try {
       parsedDate = parseISO((hasCheckOut ? record.checkOut : record.checkIn) || new Date().toISOString());
     } catch(e){}

     return {
       id: record.id || Math.random().toString(),
       name: emp?.displayName || 'Usuario Eliminado',
       action: hasCheckOut ? 'Salida registrada' : (isLate ? 'Llegada tardía' : 'Entrada registrada'),
       time: format(parsedDate, 'hh:mm a'),
       type: hasCheckOut ? 'check-out' : (isLate ? 'late' : 'check-in'),
       size: zone?.name || 'Sede Eliminada'
     };
  });

  // Generar días del mes para el calendario
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Rellenar días en blanco al inicio (para alinear con el día de la semana)
  const startDay = monthStart.getDay(); // 0 = Domingo
  const blankDays = Array(startDay).fill(null);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500">
      
      {/* --- COLUMNA IZQUIERDA (Principal) --- */}
      <div className="flex-1 flex flex-col space-y-6 overflow-y-auto pr-1 pb-4 custom-scrollbar">
        
        {/* Top Search Bar (Mock) */}
        <div className="flex items-center bg-white rounded-2xl px-4 py-2.5 border border-slate-100 shadow-sm w-full max-w-md">
          <Search className="w-5 h-5 text-slate-400 mr-2" />
          <input type="text" placeholder="Buscar empleados o sedes..." className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder-slate-400" />
        </div>

        {/* Banner Welcome */}
        <div className="bg-primary-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg shadow-primary-600/20">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10 blur-2xl"></div>
          <div className="absolute bottom-0 right-32 w-32 h-32 rounded-full bg-white opacity-10 blur-xl"></div>
          
          <div className="relative z-10 max-w-lg">
            <h1 className="text-3xl font-bold mb-2">¡Bienvenido de nuevo, {user?.displayName?.split(' ')[0] || 'Admin'}!</h1>
            <p className="text-primary-100 text-sm leading-relaxed mb-6">
              El panel está actualizado. Hoy tienes un {attendancePercentage}% de asistencia general ({presentCount} de {employees.length} empleados) y {firstCheckInToday.size - onTimeCount} llegadas tardías.
            </p>
            <button className="bg-white text-primary-700 px-5 py-2 rounded-xl text-sm font-semibold hover:bg-primary-50 transition-colors shadow-sm">
              Ver reporte diario &rarr;
            </button>
          </div>

          {/* SVG Illustration Placeholder */}
          <div className="hidden md:block absolute right-8 bottom-0 w-64 h-48 bg-primary-500/20 rounded-t-3xl border-t border-l border-r border-primary-400/30 backdrop-blur-sm">
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
              <div className="w-12 h-24 bg-white/20 rounded-t-lg"></div>
              <div className="w-12 h-32 bg-white/40 rounded-t-lg"></div>
              <div className="w-12 h-16 bg-white/20 rounded-t-lg"></div>
              <div className="w-12 h-28 bg-white/30 rounded-t-lg"></div>
            </div>
          </div>
        </div>

        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CircularProgress percentage={attendancePercentage} color="text-amber-500" title="Asistencia de Hoy" subtitle={`${presentCount} Presentes`} />
          <CircularProgress percentage={onTimePercentage} color="text-indigo-500" title="Puntualidad Global" subtitle={`${onTimeCount} A tiempo`} />
          
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col">
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

        {/* Recent Activity List */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Actividad Reciente</h3>
            <button className="text-sm text-primary-600 font-medium hover:text-primary-700">Ver todo</button>
          </div>
          
          <div className="space-y-3">
            {recentList.length > 0 ? recentList.map((act) => (
              <div key={act.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${act.type === 'late' ? 'bg-amber-100' : act.type === 'check-out' ? 'bg-slate-100' : 'bg-indigo-50'}`}>
                    {act.type === 'late' ? <Clock className="w-5 h-5 text-amber-600" /> : <CheckCircle2 className={`w-5 h-5 ${act.type === 'check-out' ? 'text-slate-500' : 'text-indigo-600'}`} />}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{act.name}</h4>
                    <p className="text-xs text-slate-500">{act.action}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-8 text-sm">
                  <div className="hidden sm:flex items-center text-slate-500 w-24"><Clock className="w-4 h-4 mr-1.5 opacity-50"/>{act.time}</div>
                  <div className="hidden md:flex items-center text-slate-500 w-28 text-xs bg-slate-50 px-2 py-1 rounded-md">{act.size}</div>
                  <button className="text-slate-300 hover:text-slate-500"><MoreHorizontal className="w-5 h-5" /></button>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-slate-500 text-sm">No hay actividad reciente.</div>
            )}
          </div>
        </div>
      </div>

      {/* --- COLUMNA DERECHA (Sidebar Derecha) --- */}
      <div className="w-full lg:w-80 flex-shrink-0 flex flex-col space-y-6">
        
        {/* Top actions */}
        <div className="flex justify-end items-center space-x-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <div className="flex items-center pl-2 border-l border-slate-200">
            <div className="w-9 h-9 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm">
              {user?.displayName?.charAt(0) || 'A'}
            </div>
          </div>
        </div>

        {/* Calendar Widget */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
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
                  <button className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    today ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'text-slate-600 hover:bg-slate-100'
                  }`}>
                    {format(date, 'd')}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Alerts / Justifications Widget */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-amber-500 mb-0.5">Atención Requerida</p>
              <h3 className="font-bold text-slate-800">Alertas del Día</h3>
            </div>
          </div>
          
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Tienes solicitudes de justificación pendientes por revisar y empleados que no han marcado entrada.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-800 truncate">{firstCheckInToday.size - onTimeCount} Llegadas tardías</h4>
                <p className="text-xs text-slate-500 truncate">El día de hoy</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-800 truncate">{totalEmployees - presentCount} Ausentes</h4>
                <p className="text-xs text-slate-500 truncate">Sin registrar entrada</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex gap-2">
            <button className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
              Ignorar
            </button>
            <button className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20">
              Revisar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
