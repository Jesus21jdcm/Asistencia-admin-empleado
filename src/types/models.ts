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
}

export interface Shift {
  id: string;
  name: string; // Ej: "Turno Mañana"
  entryTime: string; // Formato HH:mm
  exitTime: string; // Formato HH:mm
  lunchStartTime?: string; // Formato HH:mm
  lunchEndTime?: string; // Formato HH:mm
}

export interface Zone {
  id: string;
  name: string;
  polygon: { lat: number; lng: number }[]; // Arreglo de 4 puntos
  entryTime?: string; // Formato HH:mm
  exitTime?: string; // Formato HH:mm
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
}

export interface LeaveRequest {
  id: string;
  userId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string; // ISO date string
}
