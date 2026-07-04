import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User } from '../types/models';

const COLLECTION_NAME = 'usuarios';

export interface Employee extends User {
  status: 'pendiente' | 'activo' | 'rechazado';
  zoneId?: string;
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

  approveEmployee: async (uid: string, zoneId: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, uid);
    await updateDoc(docRef, {
      status: 'activo',
      zoneId: zoneId
    });
  },

  updateEmployeeZone: async (uid: string, zoneId: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, uid);
    await updateDoc(docRef, {
      zoneId: zoneId
    });
  },

  rejectEmployee: async (uid: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, uid);
    // Podemos o borrar el documento o cambiar el estado a 'rechazado'
    await updateDoc(docRef, {
      status: 'rechazado'
    });
  }
};
