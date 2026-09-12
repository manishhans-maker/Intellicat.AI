import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  requestCount: number;
  maxRequests: number;
  tier: 'free' | 'vip' | 'founder';
  createdAt: string;
  updatedAt: string;
}

export const FREE_TIER_MAX_REQUESTS = 15;

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authModalOpen: boolean;
  authModalMode: 'signin' | 'signup';
  openAuthModal: (mode?: 'signin' | 'signup') => void;
  closeAuthModal: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  remainingRequests: number;
  requestCount: number;
  maxRequests: number;
  isLimitReached: boolean;
  consumeRequest: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  const openAuthModal = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  // Listen to Auth State
  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      setUser(currentUser);
      if (!currentUser) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, 'users', currentUser.uid);
      
      // Real-time listener for user document & request usage
      unsubscribeDoc = onSnapshot(
        userRef,
        async (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // First time user login -> initialize profile in Firestore with free 15 requests
            const initialProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || 'anonymous@user.com',
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Intelicat Explorer',
              photoURL: currentUser.photoURL || '',
              requestCount: 0,
              maxRequests: FREE_TIER_MAX_REQUESTS,
              tier: 'free',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            try {
              await setDoc(userRef, initialProfile);
              setUserProfile(initialProfile);
            } catch (err) {
              console.error('Failed to create initial user profile in Firestore:', err);
              // Fallback local representation
              setUserProfile(initialProfile);
            }
          }
          setLoading(false);
        },
        (error) => {
          console.error('Error listening to user document:', error);
          setLoading(false);
        }
      );
    });

    return () => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
      }
      unsubscribeAuth();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setAuthModalOpen(false);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      setAuthModalOpen(false);
    } catch (err: any) {
      console.error('Email sign-in error:', err);
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, displayName?: string) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (displayName && res.user) {
        await updateProfile(res.user, { displayName });
      }
      setAuthModalOpen(false);
    } catch (err: any) {
      console.error('Email sign-up error:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (err: any) {
      console.error('Sign-out error:', err);
      throw err;
    }
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const requestCount = userProfile?.requestCount ?? 0;
  const maxRequests = userProfile?.maxRequests ?? FREE_TIER_MAX_REQUESTS;
  const tier = userProfile?.tier ?? 'free';
  const isUnlimited = tier === 'vip' || tier === 'founder';

  const isLimitReached = !isUnlimited && requestCount >= maxRequests;
  const remainingRequests = isUnlimited ? Infinity : Math.max(0, maxRequests - requestCount);

  // Consume 1 request count
  const consumeRequest = async (): Promise<boolean> => {
    if (!user) {
      openAuthModal('signin');
      return false;
    }

    if (isUnlimited) {
      return true;
    }

    if (requestCount >= maxRequests) {
      return false;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        requestCount: increment(1),
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (err) {
      console.warn('Could not increment request count in Firestore, falling back locally:', err);
      setUserProfile((prev) =>
        prev
          ? { ...prev, requestCount: prev.requestCount + 1, updatedAt: new Date().toISOString() }
          : null
      );
      return true;
    }
  };

  const value = useMemo(
    () => ({
      user,
      userProfile,
      loading,
      authModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      logout,
      sendPasswordReset,
      remainingRequests,
      requestCount,
      maxRequests,
      isLimitReached,
      consumeRequest,
    }),
    [
      user,
      userProfile,
      loading,
      authModalOpen,
      authModalMode,
      remainingRequests,
      requestCount,
      maxRequests,
      isLimitReached,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
