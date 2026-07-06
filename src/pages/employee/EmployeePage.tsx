import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { zoneService } from '../../services/zoneService';
import { shiftService } from '../../services/shiftService';
import { attendanceService } from '../../services/attendanceService';
import { LogOut, Loader2, CheckCircle2, Clock, AlertCircle, FileText, X, Navigation, CalendarRange, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { isPointInPolygon, getCenterOfBounds, getDistance } from 'geolib';
import type { Zone, AttendanceRecord, LeaveRequest, Shift } from '../../types/models';
import { format, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const EmployeePage: React.FC = () => {
  const { user } = useAuthContext();
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [shift, setShift] = useState<Shift | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [justifications, setJustifications] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Justificación / Permiso
  const [showJustifyModal, setShowJustifyModal] = useState(false);
  const [modalType, setModalType] = useState<'tardiness' | 'leave'>('tardiness');
  const [justifyReason, setJustifyReason] = useState('');
  const [justifyDate, setJustifyDate] = useState('');
  const [justifyEndDate, setJustifyEndDate] = useState('');
  const [isSubmittingJustification, setIsSubmittingJustification] = useState(false);

  const loadData = async () => {
    try {
      if (!user) return;
      try {
        const fetchedZones = await zoneService.getZones();
        setZones(fetchedZones);
      } catch (zoneError: unknown) {
        toast.error(`Error de permisos Firebase al cargar sedes: ${(zoneError as Error).message}`, { id: 'zone-error' });
      }

      try {
        if (user.shiftId) {
          const fetchedShift = await shiftService.getShiftById(user.shiftId);
          setShift(fetchedShift);
        } else {
          setShift(null);
        }
      } catch (shiftError) {
        console.error("Error cargando turno", shiftError);
      }

      try {
        const fetchedRecords = await attendanceService.getAttendanceRecordsByUser(user.uid);
        setAttendanceRecords(fetchedRecords);
        
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const record = await attendanceService.getTodayRecordByUser(user.uid, todayStr);
        setTodayRecord(record);

        const fetchedJustifications = await attendanceService.getLeaveRequestsByUser(user.uid);
        setJustifications(fetchedJustifications);
      } catch (recordError) {
        console.warn('El historial aún no se ha cargado o está vacío.', recordError);
      }
    } catch (error) {
      console.warn('Ocurrió un error general al cargar la información inicial.', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
// eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleLogout = async () => {
    try {
      await authService.logout();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Error al cerrar sesión', { id: 'logout-error' });
    }
  };

  const handleCheckIn = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización', { id: 'no-geo' });
      return;
    }

    if (!user?.zoneId) {
      toast.error('No tienes una sede asignada. Contacta al administrador.', { id: 'no-zone', duration: 4000 });
      return;
    }

    setIsCheckingIn(true);
    toast.info('Obteniendo tu ubicación GPS...', { id: 'gps-loading', duration: 2000 });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const userLocation = { latitude, longitude };
        let matchedZone = null;
        let minDistance = Infinity;

        // Solo evaluamos la sede asignada al empleado
        const assignedZone = zones.find(z => z.id === user.zoneId);

        if (assignedZone && assignedZone.polygon && assignedZone.polygon.length === 4) {
          const polygonCoords = assignedZone.polygon.map(p => ({ latitude: p.lat, longitude: p.lng }));
          
          if (isPointInPolygon(userLocation, polygonCoords)) {
            matchedZone = assignedZone;
            minDistance = 0;
          } else {
            const center = getCenterOfBounds(polygonCoords);
            const distanceToCenter = getDistance(userLocation, center);
            minDistance = distanceToCenter;
            
            if (distanceToCenter <= 150) {
              matchedZone = assignedZone;
            }
          }
        }

        if (matchedZone) {
          try {
            const now = new Date();
            const dateStr = format(now, 'yyyy-MM-dd');
            const timestampStr = now.toISOString();

            if (!todayRecord) {
              // --- ES UNA ENTRADA ---
              let isLate = false;
              const entryLimit = shift?.entryTime || matchedZone.entryTime;
              if (entryLimit) {
                const [hours, minutes] = entryLimit.split(':').map(Number);
                const limitTime = new Date();
                const tolerance = shift?.entryTolerance || matchedZone.entryTolerance || 0;
                limitTime.setHours(hours, minutes + tolerance, 0, 0);
                if (now > limitTime) isLate = true;
              } else {
                isLate = now.getHours() >= 9 && now.getMinutes() > 0;
              }
              
              await attendanceService.createRecord({
                userId: user?.uid || '',
                zoneId: matchedZone.id,
                date: dateStr,
                checkIn: timestampStr,
                checkInStatus: isLate ? 'late' : 'on-time'
              });
              
              if (isLate) {
                toast.warning(`¡Asistencia registrada con retraso! Justifica tu tardanza.`, { id: 'checkin-late' });
                setJustifyDate(dateStr);
                setModalType('tardiness');
                setShowJustifyModal(true);
              } else {
                toast.success(`¡Entrada registrada a tiempo en ${matchedZone.name}!`, { id: 'checkin-success' });
              }

            } else if (!todayRecord.checkOut) {
              // --- ES UNA SALIDA ---
              let isEarly = false;
              const exitLimit = shift?.exitTime || matchedZone.exitTime;
              if (exitLimit) {
                const [hours, minutes] = exitLimit.split(':').map(Number);
                const limitTime = new Date();
                limitTime.setHours(hours, minutes, 0, 0);
                if (now < limitTime) isEarly = true;
              }
              
              await attendanceService.updateRecord(todayRecord.id, {
                checkOut: timestampStr,
                checkOutStatus: isEarly ? 'early' : 'on-time'
              });
              
              if (isEarly) {
                toast.warning(`¡Saliste antes de tu hora! Quedará registrado en tu historial.`, { id: 'checkout-early' });
              } else {
                toast.success(`¡Salida registrada exitosamente! Nos vemos mañana.`, { id: 'checkout-success' });
              }
            }
            
            loadData(); // Recargar registros
          } catch {
            toast.error('Error al guardar la asistencia en Firebase', { id: 'save-error' });
          }
        } else {
          if (zones.length === 0) {
            toast.error('Error grave: Tu usuario Empleado descargó 0 sedes. Revisa las "Reglas de Firestore" en Firebase Console.', { id: 'zero-zones', duration: 6000 });
          } else {
            toast.error(
              `Estás a ${minDistance === Infinity ? '?' : Math.round(minDistance)} metros de la sede. Tu GPS tiene una precisión de ${Math.round(position.coords.accuracy)}m. Acércate más o sal al aire libre.`, 
              { id: 'distance-error', duration: 6000 }
            );
          }
        }
        setIsCheckingIn(false);
      },
      (error) => {
        setIsCheckingIn(false);
        if (error.code === 1) toast.error('Permiso de ubicación denegado.', { id: 'geo-denied' });
        else toast.error('No se pudo obtener tu ubicación.', { id: 'geo-error' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmitJustification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justifyReason || !justifyDate) return;
    
    setIsSubmittingJustification(true);
    try {
      await attendanceService.createLeaveRequest({
        userId: user?.uid || '',
        reason: justifyReason,
        status: 'pending',
        startDate: justifyDate,
        endDate: justifyEndDate || justifyDate,
        type: modalType
      });
      toast.success(modalType === 'leave' ? 'Permiso solicitado correctamente' : 'Justificación enviada correctamente', { id: 'justify-success' });
      setShowJustifyModal(false);
      setJustifyReason('');
      setJustifyDate('');
      setJustifyEndDate('');
      loadData(); // Recargar la lista de justificaciones
    } catch {
      toast.error('Error al enviar la justificación', { id: 'justify-error' });
    } finally {
      setIsSubmittingJustification(false);
    }
  };

  const getZoneName = (zoneId: string) => {
    return zones.find(z => z.id === zoneId)?.name || 'Sede desconocida';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Empleado */}
      <header className="bg-primary-800 px-6 py-4 flex items-center justify-between shadow-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-700 border-2 border-white/20 flex items-center justify-center text-white font-bold">
            {user?.displayName?.charAt(0).toUpperCase() || 'E'}
          </div>
          <div>
            <h1 className="font-semibold text-white leading-tight">{user?.displayName || 'Empleado'}</h1>
            <p className="text-xs text-white/80">Panel de Asistencia</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6 pb-20">
        
        {/* Información de Sede Asignada */}
        <section className="bg-white rounded-none shadow-sm border border-[#6EA2B3]/30 border-t-4 border-t-primary-800 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-left w-full">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-700 shrink-0">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-primary-700 uppercase tracking-wider mb-1">Tu Sede y Horario Asignado</h3>
              <p className="text-lg font-bold text-slate-900 leading-tight">
                {user?.zoneId ? (zones.find(z => z.id === user.zoneId)?.name || 'Cargando sede...') : 'Sin sede asignada'}
              </p>
              {user?.zoneId && zones.find(z => z.id === user.zoneId) && (
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-600 font-medium">
                  {shift ? (
                    <>
                      <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-primary-200 shadow-sm text-primary-700">
                        <CalendarRange className="w-3.5 h-3.5 text-primary-500" />
                        {shift.name} ({shift.entryTime} - {shift.exitTime})
                      </span>
                      {(user?.customLunchStartTime || shift.lunchStartTime) && (user?.customLunchEndTime || shift.lunchEndTime) && (
                        <span className="flex items-center gap-1.5 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 shadow-sm text-orange-700">
                          <Clock className="w-3.5 h-3.5 text-orange-500" />
                          Almuerzo: {user?.customLunchStartTime || shift.lunchStartTime} a {user?.customLunchEndTime || shift.lunchEndTime}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Entrada: {zones.find(z => z.id === user.zoneId)?.entryTime || '09:00'}
                      </span>
                      <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Salida: {zones.find(z => z.id === user.zoneId)?.exitTime || '18:00'}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          {!user?.zoneId && (
            <div className="bg-amber-50 text-amber-700 px-4 py-3 rounded-xl text-sm font-medium border border-amber-200 shrink-0">
              Contacta a un administrador para asignación.
            </div>
          )}
        </section>

        {/* Acción Principal */}
        <section className="bg-white w-full rounded-none shadow-sm border border-[#6EA2B3]/30 border-t-4 border-t-[#0A4174] p-8 flex flex-col md:flex-row items-center gap-6 justify-between relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center gap-4 text-left">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center border-4 border-primary-100 shrink-0">
              <Fingerprint className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Registrar Asistencia</h2>
              <p className="text-slate-500 text-sm mt-1 max-w-sm">
                El sistema detectará tu ubicación GPS para verificar si estás en tu sede asignada.
              </p>
            </div>
          </div>

          <button
            onClick={handleCheckIn}
            disabled={isCheckingIn || !!(todayRecord && todayRecord.checkOut)}
            className="w-full md:w-auto shrink-0 relative group"
          >
            <div className={`absolute -inset-1 rounded-none blur transition duration-200 ${
              todayRecord && todayRecord.checkOut 
                ? 'opacity-0' 
                : 'opacity-25 group-hover:opacity-50'
            } ${
              todayRecord && todayRecord.checkOut 
                ? 'bg-slate-400'
                : todayRecord 
                  ? 'bg-gradient-to-r from-[#4E8EA2] to-[#0A4174]' 
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
            }`}></div>
            <div className={`relative flex items-center justify-center px-8 py-4 text-white rounded-none btn-angled shadow-md transition-all active:scale-95 disabled:active:scale-100 ${
              todayRecord && todayRecord.checkOut 
                ? 'bg-slate-400 cursor-not-allowed opacity-90'
                : todayRecord 
                  ? 'bg-[#49769F] hover:brightness-110' 
                  : 'bg-[#0A4174] hover:brightness-110'
            }`}>
              {isCheckingIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="font-semibold">Validando...</span>
                </>
              ) : todayRecord && todayRecord.checkOut ? (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  <span className="font-semibold tracking-wide">Turno Completado</span>
                </>
              ) : todayRecord && !todayRecord.checkOut ? (
                <>
                  <LogOut className="w-5 h-5 mr-2 rotate-180" />
                  <span className="font-semibold tracking-wide">Marcar Salida</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  <span className="font-semibold tracking-wide">Marcar Entrada</span>
                </>
              )}
            </div>
          </button>
        </section>

        {/* Historial y Justificaciones */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 bg-white rounded-none shadow-sm border border-[#6EA2B3]/30 border-t-4 border-t-[#49769F] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-bold text-slate-900">Mi Historial Reciente</h2>
            </div>
            <div className="p-0 overflow-y-auto max-h-[400px]">
              <ul className="divide-y divide-slate-100">
                {Array.from({ length: 7 }).map((_, i) => {
                  const day = subDays(new Date(), i);
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const record = attendanceRecords.find(r => r.date === dayStr);
                  const isToday = i === 0;
                  
                  const activeLeave = justifications.find(l => {
                    if (l.status !== 'approved') return false;
                    const start = l.startDate || (l as any).date;
                    const end = l.endDate || (l as any).date;
                    if (!start) return false;
                    return dayStr >= start && dayStr <= end;
                  });
                  
                  return (
                    <li key={i} className={`p-4 hover:bg-slate-50 flex justify-between items-center transition-colors ${isToday ? 'bg-slate-50/50' : ''}`}>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm capitalize">
                          {isToday ? 'Hoy' : format(day, "eeee, d 'de' MMMM", { locale: es })}
                        </p>
                        {record ? (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Sede: {getZoneName(record.zoneId)}
                          </p>
                        ) : activeLeave ? (
                          <p className="text-xs text-blue-500 mt-0.5 font-medium truncate max-w-[200px]" title={activeLeave.reason}>
                            {activeLeave.reason}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5 italic">
                            Sin registro
                          </p>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        {record ? (
                          <>
                            {/* Check-In */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">ENTRADA</span>
                              <span className="font-mono text-slate-700 text-sm font-medium">
                                {record.checkIn ? format(parseISO(record.checkIn), "hh:mm a") : '--:--'}
                              </span>
                              {record.checkInStatus === 'late' && <span className="text-[10px] font-bold text-red-500">(Tarde)</span>}
                            </div>
                            {/* Check-Out */}
                            {record.checkOut && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">SALIDA</span>
                                <span className="font-mono text-slate-700 text-sm font-medium">
                                  {format(parseISO(record.checkOut), "hh:mm a")}
                                </span>
                                {record.checkOutStatus === 'early' && <span className="text-[10px] font-bold text-red-500">(Temprano)</span>}
                              </div>
                            )}
                          </>
                        ) : activeLeave ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                            Permiso Aprobado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            Ausente
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          <section className="bg-white rounded-none shadow-sm border border-[#6EA2B3]/30 border-t-4 border-t-[#49769F] p-6 flex flex-col justify-start">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900">Permisos y Justificaciones</h2>
              </div>
              <button
                onClick={() => {
                  setModalType('leave');
                  setJustifyDate('');
                  setJustifyEndDate('');
                  setJustifyReason('');
                  setShowJustifyModal(true);
                }}
                className="text-xs font-semibold bg-[#49769F]/10 text-[#49769F] px-3 py-1.5 rounded-none btn-angled hover:bg-[#49769F]/20 transition-colors"
              >
                + Solicitar Permiso
              </button>
            </div>
            
            <div className="overflow-y-auto overflow-x-hidden max-h-[300px] -mx-2 px-2 pb-2">
              {justifications.length === 0 ? (
                <div className="text-center text-slate-500 py-6">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No tienes permisos ni justificaciones.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {justifications.map(req => (
                    <li key={req.id} className="bg-white border border-slate-200 rounded-xl p-4 text-sm shadow-sm hover:shadow-md transition-all">
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                        <span className="font-semibold text-slate-800 text-xs">
                          {(() => {
                            const startD = req.startDate || (req as any).date;
                            const endD = req.endDate || (req as any).date;
                            if (startD === endD) return format(new Date(startD), "dd/MM/yyyy");
                            return `Del ${format(new Date(startD), "dd/MM/yyyy")} al ${format(new Date(endD), "dd/MM/yyyy")}`;
                          })()}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            req.type === 'leave' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {req.type === 'leave' ? 'Permiso' : 'Tardanza'}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 

                          req.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {req.status === 'approved' ? 'Aprobada' : req.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-600 line-clamp-2" title={req.reason}>{req.reason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Modal Justificación */}
      {showJustifyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-xl text-slate-900">
                {modalType === 'leave' ? 'Solicitar Permiso' : 'Justificar Tardanza'}
              </h3>
              <button 
                onClick={() => setShowJustifyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitJustification} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Desde
                  </label>
                  <input
                    type="date"
                    required
                    value={justifyDate}
                    onChange={(e) => setJustifyDate(e.target.value)}
                    readOnly={modalType === 'tardiness'}
                    className={`w-full px-3 py-2 border border-slate-200 rounded-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm ${modalType === 'tardiness' ? 'bg-slate-100 cursor-not-allowed text-slate-500' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Hasta (Opcional)
                  </label>
                  <input
                    type="date"
                    value={justifyEndDate}
                    min={justifyDate}
                    onChange={(e) => setJustifyEndDate(e.target.value)}
                    disabled={modalType === 'tardiness'}
                    className={`w-full px-3 py-2 border border-slate-200 rounded-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm ${modalType === 'tardiness' ? 'bg-slate-100 cursor-not-allowed opacity-50' : ''}`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Motivo o explicación
                </label>
                <textarea
                  required
                  rows={4}
                  value={justifyReason}
                  onChange={(e) => setJustifyReason(e.target.value)}
                  placeholder={modalType === 'leave' ? "Motivo del permiso (vacaciones, cita médica...)" : "Explica brevemente la razón de la tardanza..."}
                  className="w-full px-3 py-2 border border-slate-200 rounded-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowJustifyModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-none btn-angled font-semibold hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingJustification}
                  className="flex-1 flex px-4 py-2.5 font-semibold text-sm items-center justify-center bg-[#0A4174] text-white rounded-none btn-angled shadow-sm hover:brightness-110 active:scale-95 transition-all duration-200"
                >
                  {isSubmittingJustification ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Enviar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
