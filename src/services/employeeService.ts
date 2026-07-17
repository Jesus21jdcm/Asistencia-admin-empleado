import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User } from '../types/models';

const COLLECTION_NAME = 'usuarios';

export interface Employee extends User {
  status: 'pendiente' | 'activo' | 'rechazado';
  zoneId?: string;
  shiftId?: string;
  createdAt?: string;
}

export const employeeService = {
  getPendingEmployees: async (): Promise<Employee[]> => {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('role', '==', 'employee'),
      where('status', '==', 'pendiente')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    })) as Employee[];
  },

  getAllEmployees: async (): Promise<Employee[]> => {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('role', '==', 'employee')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    })) as Employee[];
  },

  getActiveEmployees: async (): Promise<Employee[]> => {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('role', '==', 'employee'),
      where('status', '==', 'activo')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    })) as Employee[];
  },

  approveEmployee: async (uid: string, zoneId: string, shiftId?: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, uid);
    const data: Record<string, unknown> = {
      status: 'activo',
      zoneId: zoneId
    };
    if (shiftId) data.shiftId = shiftId;
    
    await updateDoc(docRef, data);
  },

  updateEmployeeZoneAndShift: async (uid: string, zoneId: string, shiftId: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, uid);
    const data: Record<string, unknown> = {};
    if (zoneId) data.zoneId = zoneId;
    if (shiftId !== undefined) data.shiftId = shiftId; // could be empty to remove shift
    await updateDoc(docRef, data);
  },

  updateEmployeeLunchTime: async (uid: string, customLunchStartTime?: string | null, customLunchEndTime?: string | null): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, uid);
    const data: Record<string, unknown> = {};
    if (customLunchStartTime !== undefined) data.customLunchStartTime = customLunchStartTime;
    if (customLunchEndTime !== undefined) data.customLunchEndTime = customLunchEndTime;
    await updateDoc(docRef, data);
  },

  updateEmployeeProfile: async (uid: string, data: Partial<Employee>): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, uid);
    await updateDoc(docRef, data as { [x: string]: any });
  },

  rejectEmployee: async (uid: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, uid);
    // Podemos o borrar el documento o cambiar el estado a 'rechazado'
    await updateDoc(docRef, {
      status: 'rechazado'
    });
  }
};
