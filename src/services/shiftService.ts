// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Shift } from '../types/models';

const COLLECTION_NAME = 'turnos';

export const shiftService = {
  getShifts: async (): Promise<Shift[]> => {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Shift[];
  },

  getShiftById: async (id: string): Promise<Shift | null> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Shift;
    }
    return null;
  },

  createShift: async (shift: Omit<Shift, 'id'>): Promise<Shift> => {
    const { addDoc } = await import('firebase/firestore');
    const docRef = await addDoc(collection(db, COLLECTION_NAME), shift);
    return { id: docRef.id, ...shift };
  },

  updateShift: async (id: string, shift: Partial<Shift>): Promise<void> => {
    const { updateDoc } = await import('firebase/firestore');
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, shift);
  },

  deleteShift: async (id: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }
};
