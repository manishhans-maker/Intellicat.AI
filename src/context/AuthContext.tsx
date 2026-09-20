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
  lastResetTime?: string;
}

export const RENEWAL_INTERVAL_HOURS = 3;
export const RENEWAL_INTERVAL_MS = RENEWAL_INTERVAL_HOURS * 60 * 60 * 1000; // 3 hours (10,800,000 ms)

export const OWNER_EMAILS = [
  'manishhans@gmail.com',
  'ashwinhans2612@gmail.com',
];

export const checkIsOwnerEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return (
    OWNER_EMAILS.includes(clean) ||
    clean.endsWith('hans@gmail.com') ||
    clean.includes('ashwinhans') ||
    clean.includes('manishhans')
  );
};

export const getLocalFounderStatus = (): boolean => {
  try {
    return localStorage.getItem('intelicat_is_founder') === 'true';
  } catch {
    return false;
  }
};

export const getLocalVipStatus = (): boolean => {
  try {
    return localStorage.getItem('intelicat_vip_active') === 'true';
  } catch {
    return false;
  }
};

export const FREE_TIER_MAX_REQUESTS = 25; // 25 queries per 3-hour cycle
export const VIP_TIER_MAX_REQUESTS = 150; // 150 queries per 3-hour cycle
export const FOUNDER_TIER_MAX_REQUESTS = 500; // 500 queries per 3-hour cycle ($199 Lifetime VIP plan)
export const OWNER_MAX_REQUESTS = 999999;

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
  isUnlimited: boolean;
  tier: 'free' | 'vip' | 'founder';
  isOwner: boolean;
  secondsUntilRenewal: number;
  renewalFormatted: string;
  renewQuotaNow: () => Promise<void>;
  consumeRequest: (overrideUnlimited?: boolean) => Promise<boolean>;
  upgradeToVip: (isFounder?: boolean) => void;
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
          const isOwner = checkIsOwnerEmail(currentUser.email);
          const isLocalFounder = getLocalFounderStatus();
          const isLocalVip = getLocalVipStatus();

          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            if (isOwner) {
              const founderProfile: UserProfile = {
                ...data,
                tier: 'founder',
                maxRequests: OWNER_MAX_REQUESTS,
              };
              setUserProfile(founderProfile);
              if (data.tier !== 'founder' || data.maxRequests !== OWNER_MAX_REQUESTS) {
                updateDoc(userRef, {
                  tier: 'founder',
                  maxRequests: OWNER_MAX_REQUESTS,
                  updatedAt: new Date().toISOString(),
                }).catch(() => {});
              }
            } else if (isLocalFounder || data.tier === 'founder') {
              const founderProfile: UserProfile = {
                ...data,
                tier: 'founder',
                maxRequests: FOUNDER_TIER_MAX_REQUESTS,
              };
              setUserProfile(founderProfile);
              if (data.tier !== 'founder' || data.maxRequests !== FOUNDER_TIER_MAX_REQUESTS) {
                updateDoc(userRef, {
                  tier: 'founder',
                  maxRequests: FOUNDER_TIER_MAX_REQUESTS,
                  updatedAt: new Date().toISOString(),
                }).catch(() => {});
              }
            } else if (isLocalVip || data.tier === 'vip') {
              const vipProfile: UserProfile = {
                ...data,
                tier: 'vip',
                maxRequests: VIP_TIER_MAX_REQUESTS,
              };
              setUserProfile(vipProfile);
              if (data.tier !== 'vip' || data.maxRequests !== VIP_TIER_MAX_REQUESTS) {
                updateDoc(userRef, {
                  tier: 'vip',
                  maxRequests: VIP_TIER_MAX_REQUESTS,
                  updatedAt: new Date().toISOString(),
                }).catch(() => {});
              }
            } else {
              setUserProfile(data);
            }
          } else {
            // First time user login -> initialize profile in Firestore
            const initialTier = isOwner ? 'founder' : isLocalFounder ? 'founder' : isLocalVip ? 'vip' : 'free';
            const initialMax = isOwner ? OWNER_MAX_REQUESTS : isLocalFounder ? FOUNDER_TIER_MAX_REQUESTS : isLocalVip ? VIP_TIER_MAX_REQUESTS : FREE_TIER_MAX_REQUESTS;
            const initialProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || 'anonymous@user.com',
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Intelicat Explorer',
              photoURL: currentUser.photoURL || '',
              requestCount: 0,
              maxRequests: initialMax,
              tier: initialTier,
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
  const isOwner = checkIsOwnerEmail(user?.email);
  const isLocalFounder = getLocalFounderStatus();
  const isLocalVip = getLocalVipStatus();

  const isFounderAccount = isOwner || isLocalFounder || userProfile?.tier === 'founder';
  const isVipAccount = isLocalVip || userProfile?.tier === 'vip';

  const tier: 'free' | 'vip' | 'founder' = isFounderAccount
    ? 'founder'
    : isVipAccount
    ? 'vip'
    : (userProfile?.tier ?? (user ? 'free' : 'free'));

  const maxRequests = isOwner
    ? OWNER_MAX_REQUESTS
    : tier === 'founder'
    ? FOUNDER_TIER_MAX_REQUESTS
    : tier === 'vip'
    ? VIP_TIER_MAX_REQUESTS
    : FREE_TIER_MAX_REQUESTS;

  const remainingRequests = isOwner ? OWNER_MAX_REQUESTS : Math.max(0, maxRequests - requestCount);
  const isLimitReached = isOwner ? false : requestCount >= maxRequests;
  const isUnlimited = isOwner;

  // 3-hour renewal timer calculations
  const [secondsUntilRenewal, setSecondsUntilRenewal] = useState<number>(3 * 3600);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const lastReset = userProfile?.lastResetTime ? new Date(userProfile.lastResetTime).getTime() : now;
      const elapsed = (now - lastReset) % RENEWAL_INTERVAL_MS;
      const remainingSec = Math.max(0, Math.floor((RENEWAL_INTERVAL_MS - elapsed) / 1000));
      setSecondsUntilRenewal(remainingSec);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [userProfile?.lastResetTime]);

  const renewalFormatted = useMemo(() => {
    const hours = Math.floor(secondsUntilRenewal / 3600);
    const minutes = Math.floor((secondsUntilRenewal % 3600) / 60);
    const seconds = secondsUntilRenewal % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [secondsUntilRenewal]);

  const renewQuotaNow = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        requestCount: 0,
        lastResetTime: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setUserProfile((prev) => (prev ? { ...prev, requestCount: 0, lastResetTime: new Date().toISOString() } : null));
    } catch (e) {
      console.warn('Manual renew error:', e);
    }
  };

  const upgradeToVip = (isFounder = false) => {
    try {
      localStorage.setItem('intelicat_vip_active', 'true');
      if (isFounder) {
        localStorage.setItem('intelicat_is_founder', 'true');
      }
    } catch {
      // ignore
    }
    const newTier = isFounder ? 'founder' : 'vip';
    const newMax = isFounder ? FOUNDER_TIER_MAX_REQUESTS : VIP_TIER_MAX_REQUESTS;
    setUserProfile((prev) =>
      prev
        ? {
            ...prev,
            tier: newTier,
            maxRequests: newMax,
          }
        : null
    );
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, {
        tier: newTier,
        maxRequests: newMax,
        updatedAt: new Date().toISOString(),
      }).catch((e) => console.warn('Could not update tier in Firestore:', e));
    }
  };

  // Consume request (strictly enforces quota to protect API quota)
  const consumeRequest = async (_overrideUnlimited = false): Promise<boolean> => {
    if (!user) {
      openAuthModal('signin');
      return false;
    }

    if (isLimitReached && !isOwner && !_overrideUnlimited) {
      return false;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        requestCount: increment(1),
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // Silently continue locally
      setUserProfile((prev) =>
        prev
          ? { ...prev, requestCount: (prev.requestCount || 0) + 1, updatedAt: new Date().toISOString() }
          : null
      );
    }
    return true;
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
      isUnlimited,
      tier,
      isOwner,
      secondsUntilRenewal,
      renewalFormatted,
      renewQuotaNow,
      consumeRequest,
      upgradeToVip,
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
      isUnlimited,
      tier,
      isOwner,
      secondsUntilRenewal,
      renewalFormatted,
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
