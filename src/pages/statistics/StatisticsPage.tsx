import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { Loader2, TrendingUp, CalendarDays, Calendar } from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  LabelList
} from 'recharts';
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  startOfMonth, 
  endOfMonth, 
  isSameDay, 
  parseISO 
} from 'date-fns';
import { es } from 'date-fns/locale';

export const StatisticsPage: React.FC = () => {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendances', 'statistics'],
    queryFn: attendanceService.getAttendanceRecords,
  });

  const weeklyData = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 }); // Empezar en Lunes
    const end = endOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const count = records.filter(record => {
        if (!record.date) return false;
        // Asume que date puede ser un string 'YYYY-MM-DD' o un timestamp de Firestore
        const recordDate = typeof record.date === 'string' ? parseISO(record.date) : new Date(record.date);
        return isSameDay(recordDate, day);
      }).length;

      // Nombre del día con primera letra mayúscula, pero corto (ej: Lun, Mar)
      let dayName = format(day, 'E', { locale: es });
      dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);

      return {
        name: dayName,
        asistencias: count,
      };
    });
  }, [records]);

  const monthlyData = useMemo(() => {
    const today = new Date();
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const count = records.filter(record => {
        if (!record.date) return false;
        const recordDate = typeof record.date === 'string' ? parseISO(record.date) : new Date(record.date);
        return isSameDay(recordDate, day);
      }).length;

      return {
        name: format(day, 'd'), // Solo el número del día
        asistencias: count,
      };
    });
  }, [records]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
        <p className="text-slate-500">Cargando estadísticas...</p>
      </div>
    );
  }

  // Renderizador personalizado para las etiquetas encima de los puntos
  const renderCustomizedLabel = (props: any) => {
    const { x, y, value } = props;
    return (
      <text x={x} y={y - 15} fill="#4f46e5" fontSize={14} fontWeight="bold" textAnchor="middle">
        {value}
      </text>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-wide text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary-600" />
            Estadísticas
          </h2>
          <p className="text-slate-500 text-sm mt-1">Análisis de la asistencia del personal.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Gráfica Semanal */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <CalendarDays className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Asistencia de la Semana</h3>
          </div>
          
          <div className="w-full" style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={weeklyData}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="colorSemana" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 14, fontWeight: 500 }} 
                  dy={20}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 13 }} 
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}
                  itemStyle={{ color: '#4f46e5', fontWeight: 600 }}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="asistencias" 
                  name="Asistencias" 
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSemana)"
                  activeDot={{ r: 7, fill: '#fff', stroke: '#4f46e5', strokeWidth: 3 }} 
                  dot={{ r: 5, fill: '#fff', stroke: '#4f46e5', strokeWidth: 3 }}
                >
                  <LabelList dataKey="asistencias" content={renderCustomizedLabel} />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica Mensual */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Asistencia del Mes</h3>
          </div>
          
          <div className="w-full" style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyData}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="colorMes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 13 }} 
                  dy={20}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 13 }} 
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}
                  itemStyle={{ color: '#4f46e5', fontWeight: 600 }}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="asistencias" 
                  name="Asistencias" 
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorMes)"
                  activeDot={{ r: 7, fill: '#fff', stroke: '#4f46e5', strokeWidth: 3 }} 
                  dot={{ r: 3, fill: '#fff', stroke: '#4f46e5', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
