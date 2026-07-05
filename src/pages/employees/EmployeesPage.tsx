import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Check, 
  Users, 
  Loader2, 
  Building
} from 'lucide-react';
import { toast } from 'sonner';
import { employeeService } from '../../services/employeeService';
import { zoneService } from '../../services/zoneService';
import { shiftService } from '../../services/shiftService';

export const EmployeesPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');
  
  // Guardamos localmente qué sede ha seleccionado el admin para cada empleado pendiente
  const [selectedZones, setSelectedZones] = useState<Record<string, string>>({});
  const [selectedShifts, setSelectedShifts] = useState<Record<string, string>>({});

  // Queries
  const { data: pendingEmployees = [], isLoading: isLoadingPending } = useQuery({
    queryKey: ['employees', 'pending'],
    queryFn: employeeService.getPendingEmployees,
  });

  const { data: activeEmployees = [], isLoading: isLoadingActive } = useQuery({
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

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({ uid, zoneId, shiftId }: { uid: string; zoneId: string; shiftId?: string }) => 
      employeeService.approveEmployee(uid, zoneId, shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Empleado aprobado y asignado correctamente');
    },
    onError: (error: any) => toast.error(error.message || 'Error al aprobar empleado'),
  });

  const rejectMutation = useMutation({
    mutationFn: employeeService.rejectEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Registro de empleado rechazado');
    },
    onError: (error: any) => toast.error(error.message || 'Error al rechazar empleado'),
  });

  const updateZoneMutation = useMutation({
    mutationFn: ({ uid, zoneId, shiftId }: { uid: string; zoneId: string, shiftId: string }) => 
      employeeService.updateEmployeeZoneAndShift(uid, zoneId, shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Sede reasignada correctamente');
    },
    onError: (error: any) => toast.error(error.message || 'Error al reasignar sede'),
  });

  const handleApprove = (uid: string) => {
    const zoneId = selectedZones[uid];
    const shiftId = selectedShifts[uid];
    if (!zoneId) {
      toast.warning('Por favor, selecciona una sede antes de aprobar.');
      return;
    }
    approveMutation.mutate({ uid, zoneId, shiftId });
  };

  const handleZoneChange = (uid: string, zoneId: string) => {
    setSelectedZones(prev => ({ ...prev, [uid]: zoneId }));
  };

  const handleShiftChange = (uid: string, shiftId: string) => {
    setSelectedShifts(prev => ({ ...prev, [uid]: shiftId }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Aprobación y Asignación</h2>
        <p className="text-slate-500 mt-1">Gestiona el acceso de los empleados que se registraron desde la app móvil.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-4 px-6 text-sm font-semibold transition-all relative ${
            activeTab === 'pending' 
              ? 'text-primary-600 border-b-2 border-primary-600' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Pendientes Aprobación
          {pendingEmployees.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-700">
              {pendingEmployees.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-4 px-6 text-sm font-semibold transition-all relative ${
            activeTab === 'active' 
              ? 'text-primary-600 border-b-2 border-primary-600' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Empleados Activos
        </button>
      </div>

      {/* Content */}
      {activeTab === 'pending' ? (
        <div className="space-y-4">
          {isLoadingPending || isLoadingZones ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
              <p className="text-slate-500 text-sm">Cargando solicitudes pendientes...</p>
            </div>
          ) : pendingEmployees.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-inner">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Todo al día</h3>
              <p className="text-slate-500 text-sm mt-1">No hay nuevas solicitudes de registro en este momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingEmployees.map((employee) => (
                <div 
                  key={employee.uid} 
                  className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group"
                >
                  <div>
                    {/* User profile */}
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                        {employee.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">{employee.displayName}</h4>
                        <p className="text-xs text-slate-500 truncate">{employee.email}</p>
                      </div>
                    </div>

                    {/* Sede Selector */}
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Sede Física
                        </label>
                        <select
                          value={selectedZones[employee.uid] || ''}
                          onChange={(e) => handleZoneChange(employee.uid, e.target.value)}
                          className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-white transition-colors"
                        >
                          <option value="">Selecciona una sede...</option>
                          {zones.map((zone) => (
                            <option key={zone.id} value={zone.id}>
                              {zone.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Turno (Opcional)
                        </label>
                        <select
                          value={selectedShifts[employee.uid] || ''}
                          onChange={(e) => handleShiftChange(employee.uid, e.target.value)}
                          className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-white transition-colors"
                        >
                          <option value="">Horario por defecto de la Sede</option>
                          {shifts.map((shift) => (
                            <option key={shift.id} value={shift.id}>
                              {shift.name} ({shift.entryTime} - {shift.exitTime})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex items-center gap-3">
                    <button
                      onClick={() => rejectMutation.mutate(employee.uid)}
                      disabled={rejectMutation.isPending}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => handleApprove(employee.uid)}
                      disabled={approveMutation.isPending}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 shadow-sm shadow-primary-500/20 transition-all"
                    >
                      Aprobar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Empleado</th>
                  <th className="px-6 py-4">Correo</th>
                  <th className="px-6 py-4">Sede Asignada</th>
                  <th className="px-6 py-4">Turno Asignado</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingActive || isLoadingZones ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                      Cargando empleados activos...
                    </td>
                  </tr>
                ) : activeEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>No hay empleados activos en el sistema.</p>
                    </td>
                  </tr>
                ) : (
                  activeEmployees.map((employee) => {
                    return (
                      <tr key={employee.uid} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xs">
                              {employee.displayName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-900">{employee.displayName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{employee.email}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-slate-700">
                            <Building className="w-4 h-4 mr-2 text-slate-400" />
                            <select
                              value={employee.zoneId || ''}
                              onChange={(e) => updateZoneMutation.mutate({ uid: employee.uid, zoneId: e.target.value, shiftId: employee.shiftId || '' })}
                              className="bg-transparent text-sm focus:outline-none border-b border-transparent focus:border-slate-300 pb-0.5 cursor-pointer font-medium hover:text-primary-600 transition-colors max-w-[150px] truncate"
                            >
                              {zones.map((zone) => (
                                <option key={zone.id} value={zone.id}>
                                  {zone.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-slate-700">
                            <select
                              value={employee.shiftId || ''}
                              onChange={(e) => updateZoneMutation.mutate({ uid: employee.uid, zoneId: employee.zoneId || '', shiftId: e.target.value })}
                              className="bg-transparent text-sm focus:outline-none border-b border-transparent focus:border-slate-300 pb-0.5 cursor-pointer font-medium hover:text-primary-600 transition-colors max-w-[150px] truncate"
                            >
                              <option value="">Por defecto (Sede)</option>
                              {shifts.map((shift) => (
                                <option key={shift.id} value={shift.id}>
                                  {shift.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => rejectMutation.mutate(employee.uid)}
                            className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Desactivar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
