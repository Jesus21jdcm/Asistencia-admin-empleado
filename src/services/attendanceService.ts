import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { AttendanceRecord } from '../types/models';

const COLLECTION_NAME = 'asistencias';

export const attendanceService = {
  getAttendanceRecords: async (): Promise<AttendanceRecord[]> => {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AttendanceRecord[];
  },

  createRecord: async (record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> => {
    const { addDoc } = await import('firebase/firestore');
    const docRef = await addDoc(collection(db, COLLECTION_NAME), record);
    return { id: docRef.id, ...record };
  },

  updateRecord: async (id: string, record: Partial<AttendanceRecord>): Promise<void> => {
    const { doc, updateDoc } = await import('firebase/firestore');
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, record);
  },

  deleteRecord: async (id: string): Promise<void> => {
    const { doc, deleteDoc } = await import('firebase/firestore');
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  getAttendanceRecordsByUser: async (userId: string): Promise<AttendanceRecord[]> => {
    const { where } = await import('firebase/firestore');
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const records = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AttendanceRecord[];
    return records.sort((a, b) => {
      const dateA = a.date || (a as unknown).timestamp || '';
      const dateB = b.date || (b as unknown).timestamp || '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  },

  getTodayRecordByUser: async (userId: string, dateStr: string): Promise<AttendanceRecord | null> => {
    const { where } = await import('firebase/firestore');
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('date', '==', dateStr)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as AttendanceRecord;
  },

  createLeaveRequest: async (request: Omit<import('../types/models').LeaveRequest, 'id'>): Promise<void> => {
    const { addDoc } = await import('firebase/firestore');
    await addDoc(collection(db, 'justificaciones'), request);
  },

  getLeaveRequestsByUser: async (userId: string): Promise<import('../types/models').LeaveRequest[]> => {
    const { where } = await import('firebase/firestore');
    const q = query(
      collection(db, 'justificaciones'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    // Sort manually by date desc if needed, or rely on date field
    const results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as import('../types/models').LeaveRequest[];
    return results.sort((a, b) => {
      const dateA = a.startDate || (a as any).date;
      const dateB = b.startDate || (b as any).date;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  },

  getAllLeaveRequests: async (): Promise<import('../types/models').LeaveRequest[]> => {
    const q = query(collection(db, 'justificaciones'));
    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as import('../types/models').LeaveRequest[];
    return results.sort((a, b) => {
      const dateA = a.startDate || (a as any).date;
      const dateB = b.startDate || (b as any).date;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  },

  updateLeaveRequestStatus: async (id: string, status: 'approved' | 'rejected'): Promise<void> => {
    const { doc, updateDoc } = await import('firebase/firestore');
    const leaveRef = doc(db, 'justificaciones', id);
    await updateDoc(leaveRef, { status });
  },

  deleteAllLeaveRequests: async (): Promise<void> => {
    const { doc, deleteDoc } = await import('firebase/firestore');
    const q = query(collection(db, 'justificaciones'));
    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map(document => deleteDoc(doc(db, 'justificaciones', document.id)));
    await Promise.all(deletePromises);
  }
};
