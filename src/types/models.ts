export type Role = 'admin' | 'employee';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  documentId?: string;
  role: Role;
  photoURL?: string;
  status?: 'pendiente' | 'activo' | 'rechazado';
  zoneId?: string;
  shiftId?: string; // ID del turno asignado
  customLunchStartTime?: string; // Formato HH:mm
  customLunchEndTime?: string; // Formato HH:mm
}

export interface Shift {
  id: string;
  name: string; // Ej: "Turno Mañana"
  entryTime: string; // Formato HH:mm
  exitTime: string; // Formato HH:mm
  lunchStartTime?: string; // Formato HH:mm
  lunchEndTime?: string; // Formato HH:mm
  entryTolerance?: number; // Tolerancia en minutos para la entrada
}

export interface Zone {
  id: string;
  name: string;
  polygon: { lat: number; lng: number }[]; // Arreglo de 4 puntos
  entryTime?: string; // Formato HH:mm
  exitTime?: string; // Formato HH:mm
  entryTolerance?: number; // Tolerancia en minutos
  workDays?: number[]; // [1, 2, 3, 4, 5] para Lunes a Viernes (0=Dom, 1=Lun...)
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  zoneId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // ISO date string
  checkInStatus?: 'on-time' | 'late';
  checkOut?: string; // ISO date string
  checkOutStatus?: 'on-time' | 'early';
  timestamp?: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string; // ISO date string (YYYY-MM-DD)
}
