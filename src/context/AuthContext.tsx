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
  setDoc,
  updateDoc,
  increment,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { UserPlanTier } from '../types';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  requestCount: number;
  maxRequests: number;
  tier: UserPlanTier;
  createdAt: string;
  updatedAt: string;
  lastResetTime?: string;
  cooldownStage?: 0 | 1 | 2; // 0: active, 1: 3-hr cooldown, 2: 6-hr cooldown
  cooldownUntil?: string | null; // ISO timestamp
  isRecovery?: boolean; // whether in smaller replenishment recovery
}

export const TIER_BASE_ALLOWANCE: Record<UserPlanTier, number> = {
  free: 10,
  pro: 25,
  elite: 50,
  founder: 999999,
};

export const FREE_TIER_MAX_REQUESTS = 10;
export const VIP_TIER_MAX_REQUESTS = 50;
export const FOUNDER_TIER_MAX_REQUESTS = 999999;

export const TIER_RECOVERY_ALLOWANCE: Record<UserPlanTier, number> = {
  free: 5,
  pro: 12,
  elite: 25,
  founder: 999999,
};

export const COOLDOWN_STAGE_1_MS = 3 * 3600 * 1000; // 3 hours
export const COOLDOWN_STAGE_2_MS = 6 * 3600 * 1000; // 6 hours

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

export const getLocalTier = (): UserPlanTier => {
  try {
    if (localStorage.getItem('intelicat_is_founder') === 'true') return 'founder';
    const storedTier = localStorage.getItem('intelicat_tier') as UserPlanTier;
    if (storedTier && (storedTier === 'free' || storedTier === 'pro' || storedTier === 'elite' || storedTier === 'founder')) {
      return storedTier;
    }
    if (localStorage.getItem('intelicat_vip_active') === 'true') {
      const vipTier = localStorage.getItem('intelicat_vip_tier');
      if (vipTier === 'elite' || vipTier === 'lifetime') return 'elite';
      return 'pro';
    }
  } catch {
    // fallback
  }
  return 'free';
};

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
  tier: UserPlanTier;
  isOwner: boolean;
  cooldownStage: 0 | 1 | 2;
  isRecoveryStage: boolean;
  cooldownRemainingSeconds: number;
  cooldownFormatted: string;
  cooldownUntil: string | null;
  renewalFormatted: string; // compatibility alias
  renewQuotaNow: () => Promise<void>;
  consumeRequest: (overrideUnlimited?: boolean) => Promise<boolean>;
  upgradeToTier: (tier: UserPlanTier) => void;
  upgradeToVip: (isFounder?: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  // Local/Guest fallback quota state
  const [localUsage, setLocalUsage] = useState<{
    tier: UserPlanTier;
    count: number;
    cooldownStage: 0 | 1 | 2;
    cooldownUntil: string | null;
    isRecovery: boolean;
  }>(() => {
    try {
      const savedTier = getLocalTier();
      const savedCount = Number(localStorage.getItem('intelicat_quota_count') || '0');
      const savedStage = Number(localStorage.getItem('intelicat_quota_stage') || '0') as 0 | 1 | 2;
      const savedUntil = localStorage.getItem('intelicat_quota_until');
      const savedRecovery = localStorage.getItem('intelicat_quota_recovery') === 'true';
      return {
        tier: savedTier,
        count: isNaN(savedCount) ? 0 : savedCount,
        cooldownStage: savedStage,
        cooldownUntil: savedUntil || null,
        isRecovery: savedRecovery,
      };
    } catch {
      return {
        tier: 'free',
        count: 0,
        cooldownStage: 0,
        cooldownUntil: null,
        isRecovery: false,
      };
    }
  });

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
          const localTier = getLocalTier();

          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            const effectiveTier: UserPlanTier = isOwner
              ? 'founder'
              : data.tier === 'founder' || localTier === 'founder'
              ? 'founder'
              : data.tier === 'elite' || localTier === 'elite'
              ? 'elite'
              : data.tier === 'pro' || localTier === 'pro'
              ? 'pro'
              : 'free';

            const activeMax = data.isRecovery
              ? (TIER_RECOVERY_ALLOWANCE[effectiveTier] || 5)
              : (TIER_BASE_ALLOWANCE[effectiveTier] || 10);

            const profile: UserProfile = {
              ...data,
              tier: effectiveTier,
              maxRequests: isOwner ? 999999 : activeMax,
              cooldownStage: data.cooldownStage ?? 0,
              cooldownUntil: data.cooldownUntil ?? null,
              isRecovery: Boolean(data.isRecovery),
            };

            setUserProfile(profile);

            // Sync tier if updated locally
            if (data.tier !== effectiveTier) {
              updateDoc(userRef, {
                tier: effectiveTier,
                updatedAt: new Date().toISOString(),
              }).catch(() => {});
            }
          } else {
            // First time user login -> initialize profile in Firestore
            const initialTier: UserPlanTier = isOwner ? 'founder' : localTier;
            const initialMax = isOwner ? 999999 : TIER_BASE_ALLOWANCE[initialTier];
            const initialProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || 'anonymous@user.com',
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Intelicat Explorer',
              photoURL: currentUser.photoURL || '',
              requestCount: 0,
              maxRequests: initialMax,
              tier: initialTier,
              cooldownStage: 0,
              cooldownUntil: null,
              isRecovery: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastResetTime: new Date().toISOString(),
            };

            try {
              await setDoc(userRef, initialProfile);
              setUserProfile(initialProfile);
            } catch (err) {
              console.error('Failed to create initial user profile in Firestore:', err);
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

  // Determine current active plan & permissions
  const isOwner = checkIsOwnerEmail(user?.email);
  const isLocalFounder = getLocalFounderStatus();
  const rawTier: UserPlanTier = isOwner
    ? 'founder'
    : isLocalFounder
    ? 'founder'
    : userProfile?.tier || localUsage.tier;

  const tier: UserPlanTier = rawTier;
  const isUnlimited = isOwner || tier === 'founder';

  const cooldownStage: 0 | 1 | 2 = userProfile?.cooldownStage ?? localUsage.cooldownStage;
  const cooldownUntil: string | null = userProfile?.cooldownUntil ?? localUsage.cooldownUntil;
  const isRecoveryStage: boolean = Boolean(userProfile?.isRecovery ?? localUsage.isRecovery);

  const requestCount = userProfile?.requestCount ?? localUsage.count;
  const maxRequests = isUnlimited
    ? 999999
    : isRecoveryStage
    ? (TIER_RECOVERY_ALLOWANCE[tier] || 5)
    : (TIER_BASE_ALLOWANCE[tier] || 10);

  // Live Cooldown countdown ticker
  const [cooldownRemainingSeconds, setCooldownRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    const checkCooldownAndTick = async () => {
      if (isUnlimited) {
        setCooldownRemainingSeconds(0);
        return;
      }

      const now = Date.now();

      if (cooldownStage > 0 && cooldownUntil) {
        const untilMs = new Date(cooldownUntil).getTime();
        const diffMs = untilMs - now;

        if (diffMs > 0) {
          setCooldownRemainingSeconds(Math.ceil(diffMs / 1000));
        } else {
          // Cooldown has expired!
          setCooldownRemainingSeconds(0);

          if (cooldownStage === 1) {
            // Stage 1 (3 hours) finished -> transition to Recovery Stage!
            const newMax = TIER_RECOVERY_ALLOWANCE[tier];
            if (user?.uid) {
              const userRef = doc(db, 'users', user.uid);
              updateDoc(userRef, {
                cooldownStage: 0,
                cooldownUntil: null,
                isRecovery: true,
                requestCount: 0,
                maxRequests: newMax,
                updatedAt: new Date().toISOString(),
              }).catch(() => {});
            }
            setUserProfile((prev) =>
              prev
                ? {
                    ...prev,
                    cooldownStage: 0,
                    cooldownUntil: null,
                    isRecovery: true,
                    requestCount: 0,
                    maxRequests: newMax,
                  }
                : null
            );
            setLocalUsage((prev) => {
              const next = { ...prev, cooldownStage: 0 as const, cooldownUntil: null, isRecovery: true, count: 0 };
              try {
                localStorage.setItem('intelicat_quota_stage', '0');
                localStorage.removeItem('intelicat_quota_until');
                localStorage.setItem('intelicat_quota_recovery', 'true');
                localStorage.setItem('intelicat_quota_count', '0');
              } catch {}
              return next;
            });
          } else if (cooldownStage === 2) {
            // Stage 2 (6 hours) finished -> complete full cycle reset!
            const newMax = TIER_BASE_ALLOWANCE[tier];
            if (user?.uid) {
              const userRef = doc(db, 'users', user.uid);
              updateDoc(userRef, {
                cooldownStage: 0,
                cooldownUntil: null,
                isRecovery: false,
                requestCount: 0,
                maxRequests: newMax,
                lastResetTime: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }).catch(() => {});
            }
            setUserProfile((prev) =>
              prev
                ? {
                    ...prev,
                    cooldownStage: 0,
                    cooldownUntil: null,
                    isRecovery: false,
                    requestCount: 0,
                    maxRequests: newMax,
                    lastResetTime: new Date().toISOString(),
                  }
                : null
            );
            setLocalUsage((prev) => {
              const next = { ...prev, cooldownStage: 0 as const, cooldownUntil: null, isRecovery: false, count: 0 };
              try {
                localStorage.setItem('intelicat_quota_stage', '0');
                localStorage.removeItem('intelicat_quota_until');
                localStorage.setItem('intelicat_quota_recovery', 'false');
                localStorage.setItem('intelicat_quota_count', '0');
              } catch {}
              return next;
            });
          }
        }
      } else {
        setCooldownRemainingSeconds(0);
      }
    };

    checkCooldownAndTick();
    const interval = setInterval(checkCooldownAndTick, 1000);
    return () => clearInterval(interval);
  }, [cooldownStage, cooldownUntil, isUnlimited, tier, user?.uid]);

  const cooldownFormatted = useMemo(() => {
    if (cooldownRemainingSeconds <= 0) return '00:00:00';
    const hours = Math.floor(cooldownRemainingSeconds / 3600);
    const minutes = Math.floor((cooldownRemainingSeconds % 3600) / 60);
    const seconds = cooldownRemainingSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [cooldownRemainingSeconds]);

  const remainingRequests = isUnlimited
    ? 999999
    : cooldownRemainingSeconds > 0
    ? 0
    : Math.max(0, maxRequests - requestCount);

  const isLimitReached = isUnlimited ? false : remainingRequests <= 0 || cooldownRemainingSeconds > 0;

  // Upgrade Plan
  const upgradeToTier = (newTier: UserPlanTier) => {
    try {
      localStorage.setItem('intelicat_tier', newTier);
      if (newTier === 'founder') {
        localStorage.setItem('intelicat_is_founder', 'true');
        localStorage.setItem('intelicat_vip_active', 'true');
      } else if (newTier === 'elite' || newTier === 'pro') {
        localStorage.setItem('intelicat_vip_active', 'true');
      }
      localStorage.setItem('intelicat_quota_stage', '0');
      localStorage.removeItem('intelicat_quota_until');
      localStorage.setItem('intelicat_quota_recovery', 'false');
      localStorage.setItem('intelicat_quota_count', '0');
    } catch {}

    const newMax = TIER_BASE_ALLOWANCE[newTier];
    setUserProfile((prev) =>
      prev
        ? {
            ...prev,
            tier: newTier,
            maxRequests: newMax,
            requestCount: 0,
            cooldownStage: 0,
            cooldownUntil: null,
            isRecovery: false,
          }
        : null
    );

    setLocalUsage({
      tier: newTier,
      count: 0,
      cooldownStage: 0,
      cooldownUntil: null,
      isRecovery: false,
    });

    if (user?.uid) {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, {
        tier: newTier,
        maxRequests: newMax,
        requestCount: 0,
        cooldownStage: 0,
        cooldownUntil: null,
        isRecovery: false,
        updatedAt: new Date().toISOString(),
      }).catch((e) => console.warn('Could not update tier in Firestore:', e));
    }
  };

  const upgradeToVip = (isFounder = false) => {
    upgradeToTier(isFounder ? 'founder' : 'pro');
  };

  const renewQuotaNow = async () => {
    if (user?.uid) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          requestCount: 0,
          cooldownStage: 0,
          cooldownUntil: null,
          isRecovery: false,
          maxRequests: TIER_BASE_ALLOWANCE[tier],
          lastResetTime: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Manual renew error:', e);
      }
    }
    setUserProfile((prev) =>
      prev
        ? {
            ...prev,
            requestCount: 0,
            cooldownStage: 0,
            cooldownUntil: null,
            isRecovery: false,
            maxRequests: TIER_BASE_ALLOWANCE[tier],
            lastResetTime: new Date().toISOString(),
          }
        : null
    );
    setLocalUsage((prev) => ({
      ...prev,
      count: 0,
      cooldownStage: 0,
      cooldownUntil: null,
      isRecovery: false,
    }));
  };

  // Consume chat request & activate 3-hour or 6-hour cooldowns when limit is hit
  const consumeRequest = async (_overrideUnlimited = false): Promise<boolean> => {
    if (isUnlimited || isOwner || _overrideUnlimited) {
      return true;
    }

    if (isLimitReached) {
      return false;
    }

    const nextCount = requestCount + 1;
    const reached = nextCount >= maxRequests;

    let nextStage: 0 | 1 | 2 = 0;
    let nextUntil: string | null = null;

    if (reached) {
      if (!isRecoveryStage) {
        // Stage 1 (3-hour cooldown)
        nextStage = 1;
        nextUntil = new Date(Date.now() + COOLDOWN_STAGE_1_MS).toISOString();
      } else {
        // Stage 2 (Extended 6-hour cooldown)
        nextStage = 2;
        nextUntil = new Date(Date.now() + COOLDOWN_STAGE_2_MS).toISOString();
      }
    }

    // Update local state
    setLocalUsage((prev) => {
      const next = {
        ...prev,
        count: nextCount,
        cooldownStage: nextStage,
        cooldownUntil: nextUntil,
      };
      try {
        localStorage.setItem('intelicat_quota_count', String(nextCount));
        localStorage.setItem('intelicat_quota_stage', String(nextStage));
        if (nextUntil) {
          localStorage.setItem('intelicat_quota_until', nextUntil);
        } else {
          localStorage.removeItem('intelicat_quota_until');
        }
      } catch {}
      return next;
    });

    if (user?.uid) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          requestCount: increment(1),
          ...(reached
            ? {
                cooldownStage: nextStage,
                cooldownUntil: nextUntil,
              }
            : {}),
          updatedAt: new Date().toISOString(),
        });
      } catch {
        setUserProfile((prev) =>
          prev
            ? {
                ...prev,
                requestCount: nextCount,
                cooldownStage: nextStage,
                cooldownUntil: nextUntil,
                updatedAt: new Date().toISOString(),
              }
            : null
        );
      }
    } else {
      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              requestCount: nextCount,
              cooldownStage: nextStage,
              cooldownUntil: nextUntil,
              updatedAt: new Date().toISOString(),
            }
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
      cooldownStage,
      isRecoveryStage,
      cooldownRemainingSeconds,
      cooldownFormatted,
      cooldownUntil,
      renewalFormatted: cooldownFormatted,
      renewQuotaNow,
      consumeRequest,
      upgradeToTier,
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
      cooldownStage,
      isRecoveryStage,
      cooldownRemainingSeconds,
      cooldownFormatted,
      cooldownUntil,
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
