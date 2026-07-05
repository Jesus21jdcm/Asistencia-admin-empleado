import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User } from '../types/models';

export const authService = {
  login: async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Fetch user role from Firestore
      const userDocRef = doc(db, 'usuarios', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await signOut(auth);
        throw new Error('Usuario no encontrado en la base de datos.');
      }

      const userData = userDocSnap.data();

      // Ensure the user is admin or employee
      if (userData.role !== 'admin' && userData.role !== 'employee') {
        await signOut(auth);
        throw new Error('Acceso denegado. Rol no autorizado.');
      }

      if (userData.status === 'pendiente') {
        await signOut(auth);
        throw new Error('Tu cuenta está pendiente de validación por un administrador.');
      }

      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: userData.displayName || firebaseUser.displayName || (userData.role === 'admin' ? 'Admin' : 'Empleado'),
        firstName: userData.firstName,
        lastName: userData.lastName,
        documentId: userData.documentId,
        role: userData.role,
        photoURL: userData.photoURL || firebaseUser.photoURL || undefined,
        zoneId: userData.zoneId || undefined,
      };
    } catch (error: any) {
      console.error("Error during login:", error);
      throw error;
    }
  },

  register: async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string, 
    documentId: string, 
    role: 'admin' | 'employee'
  ): Promise<void> => {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    const { setDoc } = await import('firebase/firestore');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const displayName = `${firstName} ${lastName}`.trim();

      await setDoc(doc(db, 'usuarios', user.uid), {
        email,
        displayName,
        firstName,
        lastName,
        documentId,
        role,
        status: role === 'employee' ? 'pendiente' : 'activo',
        createdAt: new Date().toISOString(),
      });
      
      // After registering, logout so the user can login properly if needed,
      // or we just leave them logged in if that was the intent. 
      // But we just return for now.
      await signOut(auth);
    } catch (error) {
      console.error("Error during register:", error);
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  }
};
