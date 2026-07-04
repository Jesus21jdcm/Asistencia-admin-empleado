import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  createColumnHelper,
  getPaginationRowModel
} from '@tanstack/react-table';
import { 
  Loader2, 
  MapPin, 
  ArrowRightLeft, 
  AlertCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { attendanceService } from '../../services/attendanceService';
import { employeeService } from '../../services/employeeService';
import { zoneService } from '../../services/zoneService';
import type { AttendanceRecord } from '../../types/models';

interface EnrichedRecord extends AttendanceRecord {
  employeeName: string;
  zoneName: string;
  formattedDate: string;
  formattedCheckIn: string;
  formattedCheckOut: string;
  delayText: string;
}

export const AttendancePage = () => {
  // Filtros de UI
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterEmployee, setFilterEmployee] = useState<string>('');
  const [filterZone, setFilterZone] = useState<string>('');

  // Queries
  const { data: records = [], isLoading: isLoadingRecords } = useQuery({
    queryKey: ['attendance'],
    queryFn: attendanceService.getAttendanceRecords,
  });

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: employeeService.getActiveEmployees,
  });

  const { data: zones = [], isLoading: isLoadingZones } = useQuery({
    queryKey: ['zones'],
    queryFn: zoneService.getZones,
  });

  // Enriquecer registros uniendo colecciones localmente
  const enrichedRecords = useMemo((): EnrichedRecord[] => {
    return records.map(record => {
      const employee = employees.find(e => e.uid === record.userId);
      const zone = zones.find(z => z.id === record.zoneId);

      let formattedDate = record.date;
      let formattedCheckIn = '--:--';
      let formattedCheckOut = '--:--';
      
      try {
        if (!formattedDate && (record as any).timestamp) {
          // Fallback para datos viejos
          formattedDate = format(parseISO((record as any).timestamp), 'yyyy-MM-dd');
        }
        
        if (record.checkIn) {
          formattedCheckIn = format(parseISO(record.checkIn), 'hh:mm a');
        } else if ((record as any).timestamp) {
          formattedCheckIn = format(parseISO((record as any).timestamp), 'hh:mm a');
        }

        if (record.checkOut) {
          formattedCheckOut = format(parseISO(record.checkOut), 'hh:mm a');
        }
      } catch (e) {
        console.error('Error parsing date', e);
      }

      let delayText = '';
      if (record.checkInStatus === 'late') delayText += 'Llegó Tarde. ';
      if (record.checkOutStatus === 'early') delayText += 'Salió Temprano. ';
      if (!delayText) delayText = 'A Tiempo';

      return {
        ...record,
        employeeName: employee?.displayName || 'Empleado Desconocido',
        zoneName: zone?.name || 'Sede Desconocida',
        formattedDate: formattedDate || 'N/A',
        formattedCheckIn,
        formattedCheckOut,
        delayText
      };
    });
  }, [records, employees, zones]);

  // Filtrado de registros
  const filteredRecords = useMemo(() => {
    return enrichedRecords.filter(record => {
      if (filterDate) {
        try {
          if (record.date !== filterDate) return false;
        } catch {
          return false;
        }
      }
      // Filtro por Empleado
      if (filterEmployee && record.userId !== filterEmployee) {
        return false;
      }
      // Filtro por Sede
      if (filterZone && record.zoneId !== filterZone) {
        return false;
      }
      return true;
    });
  }, [enrichedRecords, filterDate, filterEmployee, filterZone]);

  // Table setup
  const columnHelper = createColumnHelper<EnrichedRecord>();
  const columns = [
    columnHelper.accessor('employeeName', {
      header: 'Empleado',
      cell: info => <span className="font-semibold text-slate-900">{info.getValue()}</span>,
    }),
    columnHelper.accessor('zoneName', {
      header: 'Sede / Geocerca',
      cell: info => (
        <span className="inline-flex items-center text-slate-700">
          <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('formattedDate', {
      header: 'Fecha',
      cell: info => <span className="text-slate-600">{info.getValue()}</span>
    }),
    columnHelper.accessor('formattedCheckIn', {
      header: 'Hora Entrada',
      cell: info => <span className="font-mono text-emerald-600 font-medium">{info.getValue()}</span>
    }),
    columnHelper.accessor('formattedCheckOut', {
      header: 'Hora Salida',
      cell: info => <span className="font-mono text-orange-600 font-medium">{info.getValue()}</span>
    }),
    columnHelper.accessor('delayText', {
      header: 'Estado',
      cell: info => {
        const text = info.getValue();
        const hasWarning = text.includes('Tarde') || text.includes('Temprano');
        
        return (
          <span className={`inline-flex items-center text-sm font-medium px-2 py-0.5 rounded-full ${hasWarning ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {hasWarning && <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-red-500 flex-shrink-0" />}
            {text}
          </span>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: filteredRecords,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const clearFilters = () => {
    setFilterDate('');
    setFilterEmployee('');
    setFilterZone('');
  };

  const isLoading = isLoadingRecords || isLoadingEmployees || isLoadingZones;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Auditoría de Asistencias</h2>
          <p className="text-slate-500 mt-1">Historial detallado de las entradas y salidas de los empleados.</p>
        </div>
        <button className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm hover:bg-slate-50 transition-colors font-medium text-sm">
          <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
          Exportar a Excel
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filtrar Historial</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Fecha */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Por Fecha</label>
            <div className="relative">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full pl-3 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Empleado */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Por Empleado</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todos los empleados</option>
              {employees.map(emp => (
                <option key={emp.uid} value={emp.uid}>{emp.displayName}</option>
              ))}
            </select>
          </div>

          {/* Sede */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Por Sede / Geocerca</label>
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todas las sedes</option>
              {zones.map(zone => (
                <option key={zone.id} value={zone.id}>{zone.name}</option>
              ))}
            </select>
          </div>
        </div>

        {(filterDate || filterEmployee || filterZone) && (
          <div className="flex justify-end pt-2">
            <button 
              onClick={clearFilters}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100/80 px-3 py-1.5 rounded-lg transition-colors"
            >
              Limpiar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-4 whitespace-nowrap">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                    Cargando historial de asistencia...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No se encontraron registros de asistencia.</p>
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

        {/* Pagination */}
        {filteredRecords.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/30">
            <div className="text-xs text-slate-500">
              Mostrando {table.getRowModel().rows.length} de {filteredRecords.length} registros
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-600 font-medium">
                Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
              </span>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-1.5 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
