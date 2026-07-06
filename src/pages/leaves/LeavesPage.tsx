import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { employeeService } from '../../services/employeeService';
import { CheckCircle, XCircle, FileText, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { LeaveRequest, Employee } from '../../types/models';

export const LeavesPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: leaves = [], isLoading: isLoadingLeaves } = useQuery({
    queryKey: ['leaves'],
    queryFn: attendanceService.getAllLeaveRequests,
  });

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: employeeService.getAllEmployees,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      attendanceService.updateLeaveRequestStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast.success('Estado de justificación actualizado');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al actualizar el estado'),
  });

  const handleUpdateStatus = (id: string, status: 'approved' | 'rejected') => {
    updateMutation.mutate({ id, status });
  };

  const getEmployeeName = (userId: string) => {
    const employee = employees.find(e => e.uid === userId);
    if (!employee) return 'Usuario Desconocido';
    if (employee.firstName && employee.lastName) return `${employee.firstName} ${employee.lastName}`;
    return employee.displayName || 'Usuario Desconocido';
  };

  const filteredLeaves = leaves.filter(leave => {
    const employeeName = getEmployeeName(leave.userId).toLowerCase();
    return employeeName.includes(searchTerm.toLowerCase());
  });

  if (isLoadingLeaves || isLoadingEmployees) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-wide text-slate-900 tracking-tight">Justificaciones</h2>
        </div>
      </div>

      {/* Control Bar (Filters) */}
      <div className="bg-white rounded-none border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between w-full">
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar empleado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-none border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col w-full">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left table-gradient-rows">
            <thead className="bg-white text-slate-700/80 font-semibold">
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 whitespace-nowrap uppercase tracking-wider text-[11px] font-bold text-slate-500">Fecha</th>
                <th className="px-6 py-4 whitespace-nowrap uppercase tracking-wider text-[11px] font-bold text-slate-500">Empleado</th>
                <th className="px-6 py-4 whitespace-nowrap uppercase tracking-wider text-[11px] font-bold text-slate-500">Motivo</th>
                <th className="px-6 py-4 whitespace-nowrap uppercase tracking-wider text-[11px] font-bold text-slate-500">Estado</th>
                <th className="px-6 py-4 whitespace-nowrap uppercase tracking-wider text-[11px] font-bold text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeaves.map((leave) => (
                <tr key={leave.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                      <span className="font-medium text-slate-700">
                        {(() => {
                          const dateA = leave.startDate || (leave as any).date;
                          const dateB = leave.endDate || (leave as any).date;
                          if (dateA === dateB) return format(new Date(dateA), "dd MMM yyyy", { locale: es });
                          
                          const diffTime = Math.abs(new Date(dateB).getTime() - new Date(dateA).getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                          return `Desde ${format(new Date(dateA), "dd MMM yyyy", { locale: es })} hasta ${format(new Date(dateB), "dd MMM yyyy", { locale: es })} (${diffDays} días)`;
                        })()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-900">{getEmployeeName(leave.userId)}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={leave.reason}>
                    {leave.reason}
                  </td>
                  <td className="px-6 py-4">
                    {leave.status === 'approved' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                        Aprobada
                      </span>
                    )}
                    {leave.status === 'rejected' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                        Rechazada
                      </span>
                    )}
                    {leave.status === 'pending' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {leave.status === 'pending' ? (
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleUpdateStatus(leave.id, 'approved')}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Aprobar"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(leave.id, 'rejected')}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Rechazar"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Resuelta</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLeaves.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No se encontraron justificaciones.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
