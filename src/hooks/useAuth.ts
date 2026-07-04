import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User } from '../types/models';
import { authService } from '../services/authService';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      let unsubscribeSnapshot: (() => void) | undefined;

      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'usuarios', firebaseUser.uid);
          
          unsubscribeSnapshot = onSnapshot(userDocRef, async (userDocSnap) => {
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              if (userData.role === 'admin' || userData.role === 'employee') {
                setUser({
                  uid: firebaseUser.uid,
                  email: firebaseUser.email!,
                  displayName: userData.displayName || firebaseUser.displayName || (userData.role === 'admin' ? 'Admin' : 'Empleado'),
                  role: userData.role,
                  photoURL: userData.photoURL || firebaseUser.photoURL || undefined,
                  zoneId: userData.zoneId || undefined,
                });
              } else {
                await authService.logout();
                setUser(null);
              }
            } else {
              await authService.logout();
              setUser(null);
            }
            setLoading(false);
          }, (error) => {
            console.error("Error fetching user data:", error);
            setUser(null);
            setLoading(false);
          });
          
        } catch (error) {
          console.error("Error setting up snapshot:", error);
          setUser(null);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
      
      return () => {
        if (unsubscribeSnapshot) unsubscribeSnapshot();
      };
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
};
