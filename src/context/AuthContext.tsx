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
  owner: 999999,
};

export const FREE_TIER_MAX_REQUESTS = 10;
export const VIP_TIER_MAX_REQUESTS = 50;
export const FOUNDER_TIER_MAX_REQUESTS = 999999;

export const TIER_RECOVERY_ALLOWANCE: Record<UserPlanTier, number> = {
  free: 5,
  pro: 12,
  elite: 25,
  founder: 999999,
  owner: 999999,
};

export const COOLDOWN_STAGE_1_MS = 3 * 3600 * 1000; // 3 hours
export const COOLDOWN_STAGE_2_MS = 6 * 3600 * 1000; // 6 hours

// Strict platform administrator emails (exact matches only)
export const OWNER_EMAILS = [
  'manishhans@gmail.com',
  'ashwinhans2612@gmail.com',
];

export const checkIsOwnerEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return OWNER_EMAILS.includes(clean);
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

  // Local/Guest fallback quota state (used only when user is NOT logged in)
  const [localUsage, setLocalUsage] = useState<{
    count: number;
    cooldownStage: 0 | 1 | 2;
    cooldownUntil: string | null;
    isRecovery: boolean;
  }>(() => {
    try {
      const savedCount = Number(localStorage.getItem('intelicat_quota_count') || '0');
      const savedStage = Number(localStorage.getItem('intelicat_quota_stage') || '0') as 0 | 1 | 2;
      const savedUntil = localStorage.getItem('intelicat_quota_until');
      const savedRecovery = localStorage.getItem('intelicat_quota_recovery') === 'true';
      return {
        count: isNaN(savedCount) ? 0 : savedCount,
        cooldownStage: savedStage,
        cooldownUntil: savedUntil || null,
        isRecovery: savedRecovery,
      };
    } catch {
      return {
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

      const isOwner = checkIsOwnerEmail(currentUser.email);

      // Clean up rogue/stale dev flags from localStorage when non-owner logs in
      if (!isOwner) {
        try {
          localStorage.removeItem('intelicat_is_founder');
          localStorage.removeItem('intelicat_vip_active');
          localStorage.removeItem('intelicat_vip_tier');
          localStorage.removeItem('intelicat_tier');
        } catch {}
      }

      // Check if user already has tracked usage saved locally
      let cachedUsage = {
        count: 0,
        cooldownStage: 0 as 0 | 1 | 2,
        cooldownUntil: null as string | null,
        isRecovery: false,
      };
      try {
        const raw = localStorage.getItem(`intelicat_user_usage_${currentUser.uid}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          cachedUsage = {
            count: Number(parsed.count) || 0,
            cooldownStage: (Number(parsed.cooldownStage) || 0) as 0 | 1 | 2,
            cooldownUntil: parsed.cooldownUntil || null,
            isRecovery: Boolean(parsed.isRecovery),
          };
        } else if (localUsage.count > 0 || localUsage.cooldownStage > 0) {
          // Carry over guest session usage so logging in does not grant instant free quota bypass
          cachedUsage = {
            count: localUsage.count,
            cooldownStage: localUsage.cooldownStage,
            cooldownUntil: localUsage.cooldownUntil,
            isRecovery: localUsage.isRecovery,
          };
        }
      } catch {}

      const initialTier: UserPlanTier = isOwner ? 'owner' : 'free';
      const activeInitialMax = isOwner
        ? 999999
        : cachedUsage.isRecovery
        ? (TIER_RECOVERY_ALLOWANCE[initialTier] || 5)
        : (TIER_BASE_ALLOWANCE[initialTier] || 10);

      const immediateProfile: UserProfile = {
        uid: currentUser.uid,
        email: currentUser.email || 'anonymous@user.com',
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Intelicat Explorer',
        photoURL: currentUser.photoURL || '',
        requestCount: isOwner ? 0 : cachedUsage.count,
        maxRequests: activeInitialMax,
        tier: initialTier,
        cooldownStage: isOwner ? 0 : cachedUsage.cooldownStage,
        cooldownUntil: isOwner ? null : cachedUsage.cooldownUntil,
        isRecovery: isOwner ? false : cachedUsage.isRecovery,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastResetTime: new Date().toISOString(),
      };

      // Set immediately so userProfile is never null while user is authenticated
      setUserProfile(immediateProfile);

      const userRef = doc(db, 'users', currentUser.uid);

      // Real-time listener for user document & request usage
      unsubscribeDoc = onSnapshot(
        userRef,
        async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;

            // Strictly determine tier based on verified ownership or explicit purchase in Firestore
            let effectiveTier: UserPlanTier = 'free';
            if (isOwner) {
              effectiveTier = 'owner';
            } else if (data.tier === 'owner') {
              // Self-heal: non-owners can NEVER be owner under any circumstance!
              effectiveTier = 'free';
              updateDoc(userRef, {
                tier: 'free',
                maxRequests: TIER_BASE_ALLOWANCE['free'],
                updatedAt: new Date().toISOString(),
              }).catch(() => {});
            } else if (data.tier === 'founder' || data.tier === 'elite' || data.tier === 'pro') {
              effectiveTier = data.tier;
            } else {
              effectiveTier = 'free';
            }

            const activeMax = data.isRecovery
              ? (TIER_RECOVERY_ALLOWANCE[effectiveTier] || 5)
              : (TIER_BASE_ALLOWANCE[effectiveTier] || 10);

            const resolvedCount = isOwner ? 0 : Math.max(Number(data.requestCount) || 0, cachedUsage.count || 0);

            const profile: UserProfile = {
              ...data,
              tier: effectiveTier,
              maxRequests: isOwner ? 999999 : activeMax,
              requestCount: resolvedCount,
              cooldownStage: isOwner ? 0 : (data.cooldownStage ?? cachedUsage.cooldownStage ?? 0),
              cooldownUntil: isOwner ? null : (data.cooldownUntil ?? cachedUsage.cooldownUntil ?? null),
              isRecovery: isOwner ? false : Boolean(data.isRecovery || cachedUsage.isRecovery),
            };

            setUserProfile(profile);
            try {
              localStorage.setItem(
                `intelicat_user_usage_${currentUser.uid}`,
                JSON.stringify({
                  count: profile.requestCount,
                  cooldownStage: profile.cooldownStage,
                  cooldownUntil: profile.cooldownUntil,
                  isRecovery: profile.isRecovery,
                })
              );
            } catch {}
          } else {
            // First time user login -> initialize profile in Firestore
            // New Google user is strictly FREE (10 chats / 3 hours) unless platform owner
            try {
              await setDoc(userRef, immediateProfile);
            } catch (err) {
              console.warn('Initial user profile sync in Firestore:', err);
            }
          }
          setLoading(false);
        },
        (error) => {
          console.warn('User document listener notice:', error);
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
      try {
        localStorage.removeItem('intelicat_is_founder');
        localStorage.removeItem('intelicat_vip_active');
        localStorage.removeItem('intelicat_vip_tier');
        localStorage.removeItem('intelicat_tier');
      } catch {}
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

  // Authenticated user tier is driven by Firestore; unauthenticated guest is 'free'
  const tier: UserPlanTier = isOwner
    ? 'owner'
    : user
    ? (userProfile?.tier === 'owner' ? 'free' : (userProfile?.tier || 'free'))
    : 'free';

  // Only the verified owner or explicit founder is unlimited
  const isUnlimited = isOwner || tier === 'owner' || tier === 'founder';

  const cooldownStage: 0 | 1 | 2 = user ? (userProfile?.cooldownStage ?? 0) : localUsage.cooldownStage;
  const cooldownUntil: string | null = user ? (userProfile?.cooldownUntil ?? null) : localUsage.cooldownUntil;
  const isRecoveryStage: boolean = Boolean(user ? userProfile?.isRecovery : localUsage.isRecovery);

  const requestCount = user ? (userProfile?.requestCount ?? 0) : localUsage.count;
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

  // Upgrade Plan (when user purchases)
  const upgradeToTier = (newTier: UserPlanTier) => {
    // Non-owners can NEVER upgrade to owner rank
    const safeTier: UserPlanTier = newTier === 'owner' && !isOwner ? 'founder' : newTier;
    const newMax = TIER_BASE_ALLOWANCE[safeTier];
    setUserProfile((prev) =>
      prev
        ? {
            ...prev,
            tier: safeTier,
            maxRequests: newMax,
            requestCount: 0,
            cooldownStage: 0,
            cooldownUntil: null,
            isRecovery: false,
          }
        : null
    );

    setLocalUsage({
      count: 0,
      cooldownStage: 0,
      cooldownUntil: null,
      isRecovery: false,
    });

    if (user?.uid) {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, {
        tier: safeTier,
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

    // Update local state for guests
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
      // 1. Immediately update in-memory React profile and local user cache
      setUserProfile((prev) => {
        const base = prev || {
          uid: user.uid,
          email: user.email || 'anonymous@user.com',
          displayName: user.displayName || 'Intelicat Explorer',
          photoURL: user.photoURL || '',
          tier: 'free',
          maxRequests: maxRequests,
          createdAt: new Date().toISOString(),
        };
        const updated: UserProfile = {
          ...base,
          requestCount: nextCount,
          cooldownStage: nextStage,
          cooldownUntil: nextUntil,
          isRecovery: isRecoveryStage,
          updatedAt: new Date().toISOString(),
        };
        try {
          localStorage.setItem(
            `intelicat_user_usage_${user.uid}`,
            JSON.stringify({
              count: nextCount,
              cooldownStage: nextStage,
              cooldownUntil: nextUntil,
              isRecovery: isRecoveryStage,
            })
          );
        } catch {}
        return updated;
      });

      // 2. Persist update to Firestore in the background
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          requestCount: nextCount,
          ...(reached
            ? {
                cooldownStage: nextStage,
                cooldownUntil: nextUntil,
              }
            : {}),
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Firestore updateDoc notice:', err);
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
