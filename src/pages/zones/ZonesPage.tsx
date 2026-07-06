import { useState, useEffect } from 'react';
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
import { Plus, Edit2, Trash2, MapPin, X, Loader2, RefreshCw, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { zoneService } from '../../services/zoneService';
import type { Zone } from '../../types/models';
import { MapContainer, TileLayer, Polygon, useMapEvents, Marker, Popup, useMap, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import 'leaflet-control-geocoder';

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const zoneSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  polygon: z.array(
    z.object({
      lat: z.number(),
      lng: z.number()
    })
  ).length(4, 'Debes marcar exactamente 4 puntos en el mapa'),
  entryTime: z.string().optional(),
  exitTime: z.string().optional(),
  entryTolerance: z.coerce.number().min(0, 'No puede ser negativo').optional().default(0),
  workDays: z.array(z.coerce.number()).optional().default([1, 2, 3, 4, 5]),
});

type ZoneFormValues = z.infer<typeof zoneSchema>;

function MapClickHandler({ points, setPoints }: { points: { lat: number, lng: number }[], setPoints: (p: { lat: number, lng: number }[]) => void }) {
  useMapEvents({
    click(e) {
      if (points.length < 4) {
        setPoints([...points, { lat: e.latlng.lat, lng: e.latlng.lng }]);
      } else {
        toast.info("Ya has marcado los 4 puntos del polígono. Usa el botón limpiar si quieres rehacerlo.");
      }
    },
  });
  return null;
}

function GeocoderControl() {
  const map = useMap();

  useEffect(() => {
    // @ts-expect-error
    const geocoder = L.Control.geocoder({
      defaultMarkGeocode: false,
      placeholder: "Buscar ubicación...",
    })
      .on('markgeocode', function (e: any) {
        const latlng = e.geocode.center;
        map.flyTo(latlng, 18, { animate: true, duration: 1.5 });
      })
      .addTo(map);

    return () => {
      map.removeControl(geocoder);
    };
  }, [map]);

  return null;
}

function LocationEvents({
  setIsLocating,
  setUserLocation
}: {
  setIsLocating: (val: boolean) => void,
  setUserLocation: (val: { lat: number, lng: number } | null) => void
}) {
  useMapEvents({
    locationfound(e) {
      setIsLocating(false);
      setUserLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      toast.success("Ubicación encontrada");
    },
    locationerror() {
      setIsLocating(false);
      toast.error("No se pudo obtener la ubicación. Verifica permisos.");
    },
  });

  return null;
}

export const ZonesPage = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [currentPoints, setCurrentPoints] = useState<{ lat: number, lng: number }[]>([]);

  // Geolocation state
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

  // Fetch zones
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['zones'],
    queryFn: zoneService.getZones,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: zoneService.createZone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      toast.success('Sede creada exitosamente');
      closeModal();
    },
    onError: (error: any) => toast.error(error.message || 'Error al crear la sede'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ZoneFormValues> }) =>
      zoneService.updateZone(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      toast.success('Sede actualizada exitosamente');
      closeModal();
    },
    onError: (error: any) => toast.error(error.message || 'Error al actualizar la sede'),
  });

  const deleteMutation = useMutation({
    mutationFn: zoneService.deleteZone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      toast.success('Sede eliminada');
    },
    onError: (error: any) => toast.error(error.message || 'Error al eliminar la sede'),
  });

  // Form setup
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneSchema) as any,
    defaultValues: {
      name: '',
      polygon: [],
      entryTime: '08:00',
      exitTime: '17:00',
      entryTolerance: 0,
      workDays: [1, 2, 3, 4, 5]
    }
  });

  // Sincronizar el estado de currentPoints con react-hook-form
  useEffect(() => {
    setValue('polygon', currentPoints, { shouldValidate: currentPoints.length > 0 });
  }, [currentPoints, setValue]);

  const openModal = (zone?: Zone) => {
    if (zone) {
      setEditingZone(zone);
      setCurrentPoints(zone.polygon || []);
      setValue('name', zone.name);
      setValue('polygon', zone.polygon || []);
      setValue('entryTime', zone.entryTime || '08:00');
      setValue('exitTime', zone.exitTime || '17:00');
      setValue('entryTolerance', zone.entryTolerance || 0);
      setValue('workDays', zone.workDays || [1, 2, 3, 4, 5]);
    } else {
      setEditingZone(null);
      setCurrentPoints([]);
      setValue('name', '');
      setValue('polygon', []);
      setValue('entryTime', '08:00');
      setValue('exitTime', '17:00');
      setValue('entryTolerance', 0);
      setValue('workDays', [1, 2, 3, 4, 5]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingZone(null);
    setCurrentPoints([]);
    setUserLocation(null);
  };

  const handleLocate = () => {
    if (mapInstance) {
      setIsLocating(true);
      mapInstance.locate({ setView: true, maxZoom: 18, enableHighAccuracy: true });
    }
  };

  const onSubmit = async (data: ZoneFormValues) => {
    if (editingZone) {
      updateMutation.mutate({ id: editingZone.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta sede?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleClearMap = () => {
    setCurrentPoints([]);
  };

  // Table setup
  const columnHelper = createColumnHelper<Zone>();
  const columns = [
    columnHelper.accessor('name', {
      header: 'Nombre de la Sede',
      cell: info => <span className="font-medium text-slate-900">{info.getValue()}</span>,
    }),
    columnHelper.display({
      id: 'area',
      header: 'Área Asignada',
      cell: info => {
        const poly = info.row.original.polygon;
        if (!poly || poly.length !== 4) return <span className="text-red-500 text-xs">Inválido</span>;
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">Polígono 4 puntos</span>
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
    data: zones,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-wide text-slate-900 tracking-tight">Oficinas</h2>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center justify-center px-4 py-2 font-medium text-sm bg-primary-600 text-white rounded-none btn-angled shadow-sm shadow-black/10 hover:bg-primary-700 hover:scale-[1.02] active:bg-primary-800 active:scale-95 transition-all duration-200"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Sede
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
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                    Cargando sedes...
                  </td>
                </tr>
              ) : zones.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No hay sedes registradas.</p>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingZone ? 'Editar Sede (Mapa)' : 'Nueva Sede (Mapa)'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit as any)} className="p-6 flex flex-col flex-1 overflow-hidden">
              <div className="flex flex-col md:flex-row gap-6 h-full">
                {/* Panel Izquierdo: Formulario */}
                <div className="w-full md:w-1/3 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Sede</label>
                    <input
                      type="text"
                      placeholder="Ej. Sede Central"
                      className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.name ? 'border-red-300' : 'border-slate-200'}`}
                      {...register('name')}
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Hora Entrada</label>
                      <input
                        type="time"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        {...register('entryTime')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Hora Salida</label>
                      <input
                        type="time"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        {...register('exitTime')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tolerancia de Entrada (minutos)</label>
                    <input
                      type="number"
                      min="0"
                      className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.entryTolerance ? 'border-red-300' : 'border-slate-200 bg-white'}`}
                      {...register('entryTolerance')}
                    />
                    {errors.entryTolerance && <p className="mt-1 text-xs text-red-500">{errors.entryTolerance.message}</p>}
                    <p className="text-xs text-slate-500 mt-1">Margen de tiempo permitido después de la hora de entrada antes de marcar tarde.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Días Laborables</label>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5, 6, 0].map(day => {
                        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                        const currentDays = register('workDays').value || [1,2,3,4,5];
                        // As we use react-hook-form uncontrolled we need a helper or watch
                        return (
                          <label key={day} className="flex items-center space-x-1.5 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100">
                            <input
                              type="checkbox"
                              value={day}
                              {...register('workDays')}
                              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-xs font-medium text-slate-700">{dayNames[day]}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                    <p className="font-semibold text-slate-700 mb-2">Instrucciones:</p>
                    <p className="text-slate-600 mb-2">Haz clic en el mapa para marcar exactamente 4 puntos que formarán la oficina perimetral (geocerca).</p>
                    <p className="text-indigo-600 font-medium">Puntos marcados: {currentPoints.length} / 4</p>
                    {errors.polygon && <p className="mt-2 text-xs text-red-500 font-bold">{errors.polygon.message}</p>}

                    <button
                      type="button"
                      onClick={handleClearMap}
                      className="mt-4 w-full flex items-center justify-center px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-none btn-angled hover:bg-slate-100 transition-colors text-xs font-semibold"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Limpiar Polígono
                    </button>
                  </div>

                  <div className="pt-4 flex flex-col gap-3 mt-auto">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex items-center justify-center px-4 py-2.5 font-medium text-sm disabled:opacity-70 bg-primary-600 text-white rounded-none btn-angled shadow-sm shadow-black/10 hover:bg-primary-700 hover:scale-[1.02] active:bg-primary-800 active:scale-95 transition-all duration-200"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Guardando...
                        </span>
                      ) : (
                        <span>{editingZone ? 'Actualizar Sede' : 'Guardar Sede'}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="w-full px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-none btn-angled transition-colors border border-slate-200"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>

                {/* Panel Derecho: Mapa */}
                <div className="w-full md:w-2/3 h-64 md:h-[500px] rounded-2xl overflow-hidden border border-slate-200 relative">
                  <MapContainer
                    center={currentPoints.length > 0 ? [currentPoints[0].lat, currentPoints[0].lng] : [8.6226, -70.2075]} // Default Barinas
                    zoom={15}
                    style={{ height: '100%', width: '100%', zIndex: 10 }}
                    ref={setMapInstance}
                  >
                    <GeocoderControl />
                    <LocationEvents setIsLocating={setIsLocating} setUserLocation={setUserLocation} />

                    {/* Layer Híbrido: Satélite + Nombres de Calles y Locales (Google Hybrid) */}
                    <TileLayer
                      attribution='&copy; Google'
                      url="http://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                      maxZoom={20}
                    />
                    <MapClickHandler points={currentPoints} setPoints={setCurrentPoints} />

                    {/* Isolating conditional and dynamic components in LayerGroups prevents React DOM conflicts (insertBefore errors) */}
                    <LayerGroup>
                      {userLocation && (
                        <Marker position={[userLocation.lat, userLocation.lng]}>
                          <Popup>Estás aquí</Popup>
                        </Marker>
                      )}
                    </LayerGroup>

                    <LayerGroup>
                      {currentPoints.map((pt, idx) => (
                        <Marker key={`pt-${pt.lat}-${pt.lng}-${idx}`} position={[pt.lat, pt.lng]}>
                          <Popup>Punto {idx + 1}</Popup>
                        </Marker>
                      ))}
                    </LayerGroup>

                    <LayerGroup>
                      {currentPoints.length >= 3 && (
                        <Polygon positions={currentPoints.map(p => [p.lat, p.lng])} pathOptions={{ color: '#4f46e5', fillColor: '#6366f1', fillOpacity: 0.3 }} />
                      )}
                    </LayerGroup>
                  </MapContainer>

                  {/* Botón flotante fuera del MapContainer para evitar conflictos con Leaflet DOM */}
                  <div className="absolute top-20 left-4 z-[100]">
                    <button
                      type="button"
                      onClick={handleLocate}
                      disabled={isLocating}
                      className="bg-white p-2.5 rounded-xl shadow-md border border-slate-200 text-slate-700 hover:text-primary-600 hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center"
                      title="Mi ubicación actual"
                    >
                      {isLocating ? <Loader2 className="w-5 h-5 animate-spin text-primary-600" /> : <Navigation className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
