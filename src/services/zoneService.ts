import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Zone } from '../types/models';

const COLLECTION_NAME = 'sedes';

export const zoneService = {
  getZones: async (): Promise<Zone[]> => {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Zone[];
  },

  createZone: async (zone: Omit<Zone, 'id'>): Promise<Zone> => {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), zone);
    return { id: docRef.id, ...zone };
  },

  updateZone: async (id: string, zone: Partial<Omit<Zone, 'id'>>): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, zone);
  },

  deleteZone: async (id: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }
};
