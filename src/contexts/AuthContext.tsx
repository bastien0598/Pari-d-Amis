import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface CustomUser {
  uid: string;
  displayName: string;
}

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  login: (username: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  login: async () => {},
  logout: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedUserId = localStorage.getItem('userId');
      const storedUsername = localStorage.getItem('username');

      if (storedUserId && storedUsername) {
        setUser({ uid: storedUserId, displayName: storedUsername });
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (username: string) => {
    setLoading(true);
    try {
      let userId = localStorage.getItem('userId');
      if (!userId) {
        userId = typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('userId', userId);
      }
      
      localStorage.setItem('username', username);
      
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          username: username,
          createdAt: serverTimestamp(),
        });
      } else {
        await setDoc(userRef, {
          username: username,
          createdAt: userSnap.data().createdAt
        });
      }
      
      setUser({ uid: userId, displayName: username });
    } catch (error) {
      console.error("Login error", error);
      handleFirestoreError(error, OperationType.WRITE, `users`);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
