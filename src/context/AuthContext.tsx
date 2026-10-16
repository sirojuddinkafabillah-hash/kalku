import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  User,
  testConnection
} from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isOnline: boolean;
  signInWithGoogle: () => Promise<User>;
  signInWithEmail: (email: string, pass: string) => Promise<User>;
  signUpWithEmail: (email: string, pass: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    testConnection().then((connected) => {
      setIsOnline(connected);
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<User> => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      return res.user;
    } catch (err: unknown) {
      console.error('Google Sign-in failed:', err);
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string): Promise<User> => {
    try {
      const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
      return res.user;
    } catch (err: unknown) {
      console.error('Email sign-in failed:', err);
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string): Promise<User> => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      return res.user;
    } catch (err: unknown) {
      console.error('Email sign-up failed:', err);
      throw err;
    }
  };

  const logout = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isOnline,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
