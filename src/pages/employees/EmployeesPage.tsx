import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Users,
  Loader2,
  Building,
  UserCog,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { employeeService, type Employee } from '../../services/employeeService';
import { zoneService } from '../../services/zoneService';
import { shiftService } from '../../services/shiftService';
import { useOutletContext } from 'react-router-dom';

export const EmployeesPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');

  // Guardamos localmente qué sede ha seleccionado el admin para cada empleado pendiente
  const [selectedZones, setSelectedZones] = useState<Record<string, string>>({});
  const [selectedShifts, setSelectedShifts] = useState<Record<string, string>>({});

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Employee>>({});

  // Queries
  const { data: pendingEmployees = [], isLoading: isLoadingPending } = useQuery({
    queryKey: ['employees', 'pending'],
    queryFn: employeeService.getPendingEmployees,
  });

  const { data: activeEmployees = [], isLoading: isLoadingActive } = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: employeeService.getActiveEmployees,
  });

  const { searchQuery = '' } = useOutletContext<{ searchQuery: string }>() || {};

  const filteredActiveEmployees = activeEmployees.filter(emp => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const docId = emp.documentId?.toLowerCase() || '';
    return fullName.includes(s) || docId.includes(s);
  });

  const filteredPendingEmployees = pendingEmployees.filter(emp => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const docId = emp.documentId?.toLowerCase() || '';
    return fullName.includes(s) || docId.includes(s);
  });

  const { data: zones = [], isLoading: isLoadingZones } = useQuery({
    queryKey: ['zones'],
    queryFn: zoneService.getZones,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: shifts = [] } = useQuery({
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
    onError: (error: Error) => toast.error(error.message || 'Error al aprobar empleado'),
  });

  const rejectMutation = useMutation({
    mutationFn: employeeService.rejectEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Registro de empleado rechazado');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al rechazar empleado'),
  });

  const updateZoneMutation = useMutation({
    mutationFn: ({ uid, zoneId, shiftId }: { uid: string; zoneId: string, shiftId: string }) =>
      employeeService.updateEmployeeZoneAndShift(uid, zoneId, shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Sede reasignada correctamente');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al reasignar sede'),
  });

  const updateLunchMutation = useMutation({
    mutationFn: ({ uid, start, end }: { uid: string; start: string | null; end: string | null }) =>
      employeeService.updateEmployeeLunchTime(uid, start, end),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Horario de almuerzo actualizado');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al actualizar almuerzo'),
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ uid, data }: { uid: string, data: Partial<Employee> }) =>
      employeeService.updateEmployeeProfile(uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Perfil actualizado correctamente');
      setSelectedEmployee(null);
    },
    onError: (error: Error) => toast.error(error.message || 'Error al actualizar perfil'),
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
        <h2 className="text-2xl font-semibold tracking-wide text-slate-900 tracking-tight">Aprobación y Asignación</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-4 px-6 text-sm font-semibold transition-all relative ${activeTab === 'pending'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          Pendientes Aprobación
          {filteredPendingEmployees.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-700">
              {filteredPendingEmployees.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`py-3 px-1 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'active' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'
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
          ) : filteredPendingEmployees.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-inner">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{searchQuery ? 'Sin resultados' : 'Todo al día'}</h3>
              <p className="text-slate-500 text-sm mt-1">{searchQuery ? 'No se encontraron solicitudes con esa búsqueda.' : 'No hay nuevas solicitudes de registro en este momento.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPendingEmployees.map((employee) => (
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
                      className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold bg-primary-600 text-white rounded-full shadow-sm shadow-black/10 hover:bg-primary-700 hover:scale-[1.02] active:bg-primary-800 active:scale-95 transition-all duration-200"
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
        <div className="bg-white rounded-none border border-slate-200 shadow-sm overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left table-gradient-rows">
              <thead className="bg-white text-slate-700/80 font-semibold">
                <tr>
                  <th className="px-6 py-4">Empleado</th>
                  <th className="px-6 py-4">Correo</th>
                  <th className="px-6 py-4">Sede Asignada</th>
                  <th className="px-6 py-4">Turno Asignado</th>
                  <th className="px-6 py-4">Almuerzo</th>
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
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>No hay empleados activos en el sistema.</p>
                    </td>
                  </tr>
                ) : (
                  filteredActiveEmployees.map((employee) => {
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
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={employee.customLunchStartTime || ''}
                              onChange={(e) => updateLunchMutation.mutate({ uid: employee.uid, start: e.target.value || null, end: employee.customLunchEndTime || null })}
                              className="bg-transparent text-sm border-b border-transparent focus:border-slate-300 pb-0.5 cursor-pointer max-w-[80px]"
                            />
                            <span className="text-slate-400">-</span>
                            <input
                              type="time"
                              value={employee.customLunchEndTime || ''}
                              onChange={(e) => updateLunchMutation.mutate({ uid: employee.uid, start: employee.customLunchStartTime || null, end: e.target.value || null })}
                              className="bg-transparent text-sm border-b border-transparent focus:border-slate-300 pb-0.5 cursor-pointer max-w-[80px]"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setEditFormData({ displayName: employee.displayName, documentId: employee.documentId });
                            }}
                            className="inline-flex items-center text-xs font-semibold text-primary-600 hover:text-primary-800 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
                            title="Editar Perfil"
                          >
                            <UserCog className="w-4 h-4 mr-1" />
                            Editar
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(employee.uid)}
                            className="inline-flex items-center text-xs font-semibold    px-3 py-1.5  transition-colors bg-[#49769F] text-white rounded-none btn-angled shadow-sm shadow-black/10 hover:brightness-110 hover:scale-[1.02] active:brightness-90 active:scale-95 transition-all duration-200"
                            title="Desactivar"
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

      {/* Edit Profile Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-xl text-slate-900">Editar Perfil</h3>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateProfileMutation.mutate({ uid: selectedEmployee.uid, data: editFormData });
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editFormData.displayName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cédula / Documento</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={editFormData.documentId || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setEditFormData({ ...editFormData, documentId: value });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  disabled
                  value={selectedEmployee.email || ''}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-sm cursor-not-allowed"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedEmployee(null)}
                  className="flex-1 px-4 py-2.5 bg-[#49769F] text-white rounded-none btn-angled font-semibold hover:brightness-110 hover:scale-[1.02] active:brightness-90 active:scale-95 transition-all duration-200 text-sm shadow-sm shadow-black/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-none btn-angled font-semibold hover:bg-primary-700 hover:scale-[1.02] active:bg-primary-800 active:scale-95 transition-all duration-200 text-sm flex items-center justify-center shadow-sm shadow-black/10"
                >
                  {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
