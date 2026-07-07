import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { employeeService } from '../../services/employeeService';
import { CheckCircle, XCircle, FileText, Loader2, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { LeaveRequest, User } from '../../types/models';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../config/firebase';

export const LeavesPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const { data: leaves = [], isLoading: isLoadingLeaves } = useQuery({
    queryKey: ['leaves'],
    queryFn: attendanceService.getAllLeaveRequests,
  });

  useEffect(() => {
    const q = query(collection(db, 'justificaciones'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaveRequest[];
      
      const sortedResults = results.sort((a, b) => {
        const dateA = a.startDate || (a as any).date;
        const dateB = b.startDate || (b as any).date;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

      queryClient.setQueryData(['leaves'], sortedResults);
    });

    return () => unsubscribe();
  }, [queryClient]);

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

  const deleteAllMutation = useMutation({
    mutationFn: attendanceService.deleteAllLeaveRequests,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast.success('Historial vaciado correctamente');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al vaciar el historial'),
  });

  const handleDeleteAll = () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar TODAS las justificaciones y permisos? Esta acción no se puede deshacer.')) {
      deleteAllMutation.mutate();
    }
  };

  const getEmployeeName = (userId: string) => {
    const employee = employees.find(e => e.uid === userId);
    if (!employee) return 'Usuario Desconocido';
    if (employee.firstName && employee.lastName) return `${employee.firstName} ${employee.lastName}`;
    return employee.displayName || 'Usuario Desconocido';
  };

  const filteredLeaves = leaves.filter(leave => {
    const employeeName = getEmployeeName(leave.userId).toLowerCase();
    const matchesSearch = employeeName.includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || leave.status === filterStatus;
    
    // Si el type no existe, asumimos que es 'leave' (permiso por defecto)
    const leaveType = leave.type || 'leave';
    const matchesType = filterType === 'all' || leaveType === filterType;

    return matchesSearch && matchesStatus && matchesType;
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
          <h2 className="text-2xl font-semibold tracking-wide text-slate-900 tracking-tight">Permisos y Justificaciones</h2>
        </div>
        <button
          onClick={handleDeleteAll}
          disabled={deleteAllMutation.isPending || leaves.length === 0}
          className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-none btn-angled shadow-sm hover:brightness-110 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleteAllMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 mr-2" />
          )}
          Vaciar Historial
        </button>
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
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2 outline-none cursor-pointer"
          >
            <option value="all">Todos los Tipos</option>
            <option value="leave">Permisos</option>
            <option value="tardiness">Tardanzas</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2 outline-none cursor-pointer"
          >
            <option value="all">Todos los Estados</option>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobados</option>
            <option value="rejected">Rechazados</option>
          </select>
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
                    <div className="flex flex-col gap-1">
                      {leave.type === 'leave' ? (
                        <span className="w-fit text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">PERMISO</span>
                      ) : (
                        <span className="w-fit text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">TARDANZA</span>
                      )}
                      <span className="truncate">{leave.reason}</span>
                    </div>
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
