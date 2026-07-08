import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper
} from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit2, Trash2, Clock, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { shiftService } from '../../services/shiftService';
import type { Shift } from '../../types/models';

const shiftSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  entryTime: z.string().min(1, 'La hora de entrada es obligatoria'),
  exitTime: z.string().min(1, 'La hora de salida es obligatoria'),
  lunchStartTime: z.string().optional(),
  lunchEndTime: z.string().optional(),
  entryTolerance: z.number().min(0, 'No puede ser negativo'),
});

type ShiftFormValues = z.infer<typeof shiftSchema>;

export const ShiftsPage = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  // Fetch shifts
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: shiftService.getShifts,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: shiftService.createShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Turno creado exitosamente');
      closeModal();
    },
    onError: (error: Error) => toast.error(error.message || 'Error al crear el turno'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ShiftFormValues> }) =>
      shiftService.updateShift(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Turno actualizado exitosamente');
      closeModal();
    },
    onError: (error: Error) => toast.error(error.message || 'Error al actualizar el turno'),
  });

  const deleteMutation = useMutation({
    mutationFn: shiftService.deleteShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Turno eliminado');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al eliminar el turno'),
  });

  // Form setup
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      name: '',
      entryTime: '08:00',
      exitTime: '17:00',
      lunchStartTime: '12:00',
      lunchEndTime: '13:00',
      entryTolerance: 0
    }
  });

  const openModal = (shift?: Shift) => {
    if (shift) {
      setEditingShift(shift);
      setValue('name', shift.name);
      setValue('entryTime', shift.entryTime);
      setValue('exitTime', shift.exitTime);
      setValue('lunchStartTime', shift.lunchStartTime || '');
      setValue('lunchEndTime', shift.lunchEndTime || '');
      setValue('entryTolerance', shift.entryTolerance || 0);
    } else {
      setEditingShift(null);
      setValue('name', '');
      setValue('entryTime', '08:00');
      setValue('exitTime', '17:00');
      setValue('lunchStartTime', '12:00');
      setValue('lunchEndTime', '13:00');
      setValue('entryTolerance', 0);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingShift(null);
  };

  const onSubmit = async (data: ShiftFormValues) => {
    if (editingShift) {
      updateMutation.mutate({ id: editingShift.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este turno? Los empleados asignados a este turno quedarán sin turno asignado.')) {
      deleteMutation.mutate(id);
    }
  };

  // Table setup
  const columnHelper = createColumnHelper<Shift>();
  const columns = [
    columnHelper.accessor('name', {
      header: 'Nombre del Turno',
      cell: info => <span className="font-medium text-slate-900">{info.getValue()}</span>,
    }),
    columnHelper.display({
      id: 'horario',
      header: 'Horario',
      cell: info => {
        const { entryTime, exitTime } = info.row.original;
        return <span className="inline-flex items-center text-sm text-slate-600"><Clock className="w-3.5 h-3.5 mr-1.5 opacity-50" /> {entryTime} - {exitTime}</span>
      }
    }),
    columnHelper.display({
      id: 'almuerzo',
      header: 'Almuerzo (Automático)',
      cell: info => {
        const { lunchStartTime, lunchEndTime } = info.row.original;
        if (!lunchStartTime || !lunchEndTime) return <span className="text-slate-400 text-xs">Sin almuerzo</span>;
        return <span className="inline-flex items-center text-sm text-slate-600">{lunchStartTime} - {lunchEndTime}</span>
      }
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => openModal(info.row.original)}
            className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(info.row.original.id)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    }),
  ];

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: shifts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-wide text-slate-900 tracking-tight">Gestión de Turnos</h2>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center justify-center px-4 py-2 font-medium text-sm bg-primary-600 text-white rounded-none btn-angled shadow-sm shadow-black/10 hover:bg-primary-700 hover:scale-[1.02] active:bg-primary-800 active:scale-95 transition-all duration-200"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Turno
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-none border border-slate-200 shadow-sm overflow-hidden flex-1 w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left table-gradient-rows">
            <thead className="bg-white text-slate-700/80 font-semibold">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-4">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                    Cargando turnos...
                  </td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No hay turnos creados.</p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingShift ? 'Editar Turno' : 'Nuevo Turno'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Turno</label>
                <input
                  type="text"
                  placeholder="Ej. Turno Mañana A"
                  className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.name ? 'border-red-300' : 'border-slate-200'}`}
                  {...register('name')}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="col-span-2">
                  <h4 className="text-sm font-semibold text-slate-800 flex items-center"><Clock className="w-4 h-4 mr-1.5 text-indigo-500" /> Horario Laboral</h4>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Hora Entrada</label>
                  <input
                    type="time"
                    className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.entryTime ? 'border-red-300' : 'border-slate-200 bg-white'}`}
                    {...register('entryTime')}
                  />
                  {errors.entryTime && <p className="mt-1 text-xs text-red-500">{errors.entryTime.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Hora Salida</label>
                  <input
                    type="time"
                    className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.exitTime ? 'border-red-300' : 'border-slate-200 bg-white'}`}
                    {...register('exitTime')}
                  />
                  {errors.exitTime && <p className="mt-1 text-xs text-red-500">{errors.exitTime.message}</p>}
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tolerancia (minutos)</label>
                  <input
                    type="number"
                    min="0"
                    className={`w-full px-3 py-2 border bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.entryTolerance ? 'border-red-300' : 'border-slate-200'}`}
                    {...register('entryTolerance', { valueAsNumber: true })}
                  />
                  {errors.entryTolerance && <p className="mt-1 text-xs text-red-500">{errors.entryTolerance.message}</p>}
                  <p className="text-xs text-slate-500 mt-1">Margen de tiempo permitido después de la hora de entrada antes de marcar tarde.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
                <div className="col-span-2">
                  <h4 className="text-sm font-semibold text-orange-800 flex items-center">Hora de Almuerzo (Opcional)</h4>
                  <p className="text-xs text-orange-600 mt-0.5">El sistema descontará automáticamente este tiempo de la jornada total del empleado.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-orange-700 mb-1">Inicio Almuerzo</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-orange-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    {...register('lunchStartTime')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-orange-700 mb-1">Fin Almuerzo</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-orange-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    {...register('lunchEndTime')}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-none btn-angled transition-colors border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2.5 font-medium text-sm disabled:opacity-70 bg-primary-600 text-white rounded-none btn-angled shadow-sm shadow-black/10 hover:bg-primary-700 hover:scale-[1.02] active:bg-primary-800 active:scale-95 transition-all duration-200"
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </span>
                  ) : (
                    <span>{editingShift ? 'Actualizar Turno' : 'Guardar Turno'}</span>
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
