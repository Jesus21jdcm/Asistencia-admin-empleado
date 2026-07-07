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
import 'leaflet/dist/leaflet.css';
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
  subZones: z.array(
    z.object({
      name: z.string().min(1, 'El nombre de la sub-sede no puede estar vacío'),
      polygon: z.array(
        z.object({ lat: z.number(), lng: z.number() })
      ).length(4, 'La sub-sede debe tener exactamente 4 puntos')
    })
  ).optional().default([]),
  entryTime: z.string().optional(),
  exitTime: z.string().optional(),
  entryTolerance: z.coerce.number().min(0, 'No puede ser negativo').optional().default(0),
  workDays: z.array(z.coerce.number()).optional().default([1, 2, 3, 4, 5]),
});

type ZoneFormValues = z.infer<typeof zoneSchema>;

function MapClickHandler({ 
  onPointAdd 
}: { 
  onPointAdd: (lat: number, lng: number) => void 
}) {
  useMapEvents({
    click(e) {
      onPointAdd(e.latlng.lat, e.latlng.lng);
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

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    // Esperar a que la animación del modal termine para que el contenedor tenga su tamaño final
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export const ZonesPage = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [currentPoints, setCurrentPoints] = useState<{ lat: number, lng: number }[]>([]);
  const [subZones, setSubZones] = useState<{ name: string, polygon: { lat: number, lng: number }[] }[]>([]);
  const [activePolygonIndex, setActivePolygonIndex] = useState<number>(-1); // -1 means main polygon, 0+ means subZone index

  // Geolocation state
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');

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
      subZones: [],
      entryTime: '08:00',
      exitTime: '17:00',
      entryTolerance: 0,
      workDays: [1, 2, 3, 4, 5]
    }
  });

  // Sincronizar el estado de polígonos con react-hook-form
  useEffect(() => {
    setValue('polygon', currentPoints, { shouldValidate: currentPoints.length > 0 });
  }, [currentPoints, setValue]);

  useEffect(() => {
    setValue('subZones', subZones, { shouldValidate: true });
  }, [subZones, setValue]);

  const openModal = (zone?: Zone) => {
    if (zone) {
      setEditingZone(zone);
      setCurrentPoints(zone.polygon || []);
      setSubZones(zone.subZones || []);
      setActivePolygonIndex(-1);
      setValue('name', zone.name);
      setValue('polygon', zone.polygon || []);
      setValue('subZones', zone.subZones || []);
      setValue('entryTime', zone.entryTime || '08:00');
      setValue('exitTime', zone.exitTime || '17:00');
      setValue('entryTolerance', zone.entryTolerance || 0);
      setValue('workDays', zone.workDays || [1, 2, 3, 4, 5]);
    } else {
      setEditingZone(null);
      setCurrentPoints([]);
      setSubZones([]);
      setActivePolygonIndex(-1);
      setValue('name', '');
      setValue('polygon', []);
      setValue('subZones', []);
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
    setSubZones([]);
    setActivePolygonIndex(-1);
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
    if (activePolygonIndex === -1) {
      setCurrentPoints([]);
    } else {
      setSubZones(prev => prev.map((sz, i) => i === activePolygonIndex ? { ...sz, polygon: [] } : sz));
    }
    setGpsError('');
  };

  const handleAddSubZone = () => {
    setSubZones([...subZones, { name: '', polygon: [] }]);
    setActivePolygonIndex(subZones.length);
  };

  const handleRemoveSubZone = (index: number) => {
    setSubZones(prev => prev.filter((_, i) => i !== index));
    if (activePolygonIndex === index) setActivePolygonIndex(-1);
    else if (activePolygonIndex > index) setActivePolygonIndex(activePolygonIndex - 1);
  };

  const handleUpdateSubZoneName = (index: number, name: string) => {
    setSubZones(prev => prev.map((sz, i) => i === index ? { ...sz, name } : sz));
  };

  const handleMapClick = (lat: number, lng: number) => {
    const newPoint = { lat, lng };
    if (activePolygonIndex === -1) {
      if (currentPoints.length < 4) setCurrentPoints([...currentPoints, newPoint]);
      else toast.info("Ya has marcado los 4 puntos del polígono principal. Usa limpiar si quieres rehacerlo.");
    } else {
      const sz = subZones[activePolygonIndex];
      if (sz && sz.polygon.length < 4) {
        setSubZones(prev => prev.map((s, i) => i === activePolygonIndex ? { ...s, polygon: [...s.polygon, newPoint] } : s));
      } else {
        toast.info("Ya has marcado los 4 puntos de esta sub-sede.");
      }
    }
  };

  const handleCaptureCurrentLocation = () => {
    if (currentPoints.length >= 4) {
      toast.info('Ya has capturado los 4 puntos. Usa Limpiar Polígono para reiniciar.');
      return;
    }

    if (!navigator.geolocation) {
      setGpsError('Tu navegador no soporta GPS.');
      toast.error('Tu navegador no soporta GPS.');
      return;
    }

    setIsCapturingGps(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsCapturingGps(false);
        const { latitude, longitude, accuracy } = position.coords;
        if (accuracy > 50) {
          toast.warning(`Precisión baja (${Math.round(accuracy)}m). Intenta salir al aire libre o acercarte a una ventana.`);
        }

        const newPoint = { lat: latitude, lng: longitude };

        // Añadir el punto al polígono activo
        if (activePolygonIndex === -1) {
          setCurrentPoints(prev => {
            if (prev.length >= 4) return prev;
            return [...prev, newPoint];
          });
        } else {
          setSubZones(prev => prev.map((sz, i) => {
            if (i === activePolygonIndex) {
              if (sz.polygon.length >= 4) return sz;
              return { ...sz, polygon: [...sz.polygon, newPoint] };
            }
            return sz;
          }));
        }

        if (mapInstance) {
          mapInstance.setView([latitude, longitude], 19);
        }

        toast.success(`Punto capturado con éxito.`);
      },
      (error) => {
        setIsCapturingGps(false);
        setGpsError(error.message);
        toast.error(`Error al obtener ubicación: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
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

            <form onSubmit={handleSubmit(onSubmit as any)} className="p-4 md:p-6 flex flex-col flex-1 overflow-y-auto">
              <div className="flex flex-col md:flex-row gap-6 h-full md:overflow-hidden">
                {/* Panel Izquierdo: Formulario */}
                <div className="w-full md:w-1/3 space-y-4 md:overflow-y-auto sidebar-scrollbar md:pr-2 shrink-0 md:shrink">
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
                        const currentDays = register('workDays').value || [1, 2, 3, 4, 5];
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

                  {/* Sub-sedes */}
                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-slate-700">Sub-sedes (Sucursales)</label>
                      <button
                        type="button"
                        onClick={handleAddSubZone}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center bg-primary-50 px-2 py-1 rounded"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Añadir
                      </button>
                    </div>
                    {subZones.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {subZones.map((sz, index) => (
                          <div 
                            key={`sz-${index}`} 
                            className={`p-3 rounded-lg border ${activePolygonIndex === index ? 'border-primary-500 bg-primary-50/30' : 'border-slate-200 bg-white'}`}
                          >
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text"
                                placeholder="Nombre sub-sede"
                                value={sz.name}
                                onChange={(e) => handleUpdateSubZoneName(index, e.target.value)}
                                className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-primary-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveSubZone(index)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500">{sz.polygon.length} / 4 Puntos GPS</span>
                              <button
                                type="button"
                                onClick={() => setActivePolygonIndex(index)}
                                className={`px-2 py-1 rounded font-medium ${activePolygonIndex === index ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                              >
                                {activePolygonIndex === index ? 'Editando polígono...' : 'Editar polígono'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`p-4 rounded-xl border text-sm transition-colors ${activePolygonIndex === -1 ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary-600" />
                        {activePolygonIndex === -1 ? 'Sede Principal' : `Sub-sede ${activePolygonIndex + 1}`}
                      </h4>
                      {activePolygonIndex !== -1 && (
                        <button 
                          type="button" 
                          onClick={() => setActivePolygonIndex(-1)}
                          className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-600 hover:bg-slate-50"
                        >
                          Volver
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mb-3 text-xs text-slate-600">
                      <span>Dibuja 4 puntos en el mapa o usa el GPS.</span>
                      <span className="font-bold text-primary-700 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                        {activePolygonIndex === -1 ? currentPoints.length : subZones[activePolygonIndex]?.polygon.length || 0} / 4
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCaptureCurrentLocation}
                      disabled={isCapturingGps || (activePolygonIndex === -1 ? currentPoints.length >= 4 : subZones[activePolygonIndex]?.polygon.length >= 4)}
                      className="w-full flex items-center justify-center px-4 py-2.5 bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 hover:shadow-md transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed group text-sm"
                    >
                      {isCapturingGps ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Obteniendo...
                        </>
                      ) : (
                        <>
                          <Navigation className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                          Guardar mi posición actual
                        </>
                      )}
                    </button>
                    {gpsError && <p className="mt-2 text-xs text-red-500 text-center font-medium">{gpsError}</p>}
                    {errors.polygon && <p className="mt-2 text-xs text-red-500 font-bold bg-red-50 p-2 rounded-lg border border-red-100">{errors.polygon.message}</p>}

                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={handleClearMap}
                        className="w-full flex items-center justify-center px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors text-xs font-semibold"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Limpiar Puntos
                      </button>
                    </div>
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
                <div className="w-full md:w-2/3 h-80 md:h-full min-h-[300px] rounded-2xl overflow-hidden border border-slate-200 relative shrink-0">
                  <MapContainer
                    center={currentPoints.length > 0 ? [currentPoints[0].lat, currentPoints[0].lng] : [8.6226, -70.2075]} // Default Barinas
                    zoom={15}
                    style={{ height: '100%', minHeight: '300px', width: '100%', zIndex: 10 }}
                    ref={setMapInstance}
                  >
                    <MapResizer />
                    <GeocoderControl />
                    <LocationEvents setIsLocating={setIsLocating} setUserLocation={setUserLocation} />

                    {/* Layer Híbrido: Satélite + Nombres de Calles y Locales (Google Hybrid) */}
                    <TileLayer
                      attribution='&copy; Google'
                      url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                      maxZoom={20}
                    />
                    <MapClickHandler onPointAdd={handleMapClick} />

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
                        <Marker key={`pt-main-${pt.lat}-${pt.lng}-${idx}`} position={[pt.lat, pt.lng]}>
                          <Popup>Punto Principal {idx + 1}</Popup>
                        </Marker>
                      ))}
                      {subZones.flatMap((sz, szIdx) => 
                        sz.polygon.map((pt, idx) => (
                          <Marker key={`pt-sz${szIdx}-${pt.lat}-${pt.lng}-${idx}`} position={[pt.lat, pt.lng]}>
                            <Popup>Sede: {sz.name || `Sub-sede ${szIdx+1}`} - Punto {idx + 1}</Popup>
                          </Marker>
                        ))
                      )}
                    </LayerGroup>

                    <LayerGroup>
                      {currentPoints.length >= 3 && (
                        <Polygon positions={currentPoints.map(p => [p.lat, p.lng])} pathOptions={{ color: '#4f46e5', fillColor: '#6366f1', fillOpacity: activePolygonIndex === -1 ? 0.4 : 0.1, weight: activePolygonIndex === -1 ? 3 : 1 }} />
                      )}
                      {subZones.map((sz, idx) => (
                        sz.polygon.length >= 3 && (
                          <Polygon 
                            key={`poly-sz-${idx}`}
                            positions={sz.polygon.map(p => [p.lat, p.lng])} 
                            pathOptions={{ 
                              color: '#10b981', // Verde para sub-sedes
                              fillColor: '#34d399', 
                              fillOpacity: activePolygonIndex === idx ? 0.4 : 0.1,
                              weight: activePolygonIndex === idx ? 3 : 1 
                            }} 
                          />
                        )
                      ))}
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
