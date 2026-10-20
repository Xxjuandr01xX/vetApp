'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithCustomToken, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'free' | 'premium' | 'admin';
  paymentStatus: 'none' | 'pending' | 'approved' | 'rejected';
  premiumUntil: Date | null;
  onboardingCompleted: boolean;
}

// Caché en memoria compartida entre todos los componentes montados para evitar N lecturas a /users/{uid}
let cachedProfileUid: string | null = null;
let cachedProfilePromise: Promise<UserProfile | null> | null = null;
let cachedProfileData: UserProfile | null = null;

async function fetchUserProfileOnce(uid: string): Promise<UserProfile | null> {
  if (cachedProfileUid === uid && cachedProfileData) {
    return cachedProfileData;
  }
  if (cachedProfileUid === uid && cachedProfilePromise) {
    return cachedProfilePromise;
  }

  cachedProfileUid = uid;
  cachedProfilePromise = (async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const profile: UserProfile = {
          uid,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          paymentStatus: data.paymentStatus,
          premiumUntil: data.premiumUntil?.toDate ? data.premiumUntil.toDate() : null,
          onboardingCompleted: Boolean(data.onboardingCompleted),
        };
        cachedProfileData = profile;
        return profile;
      }
      return null;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      cachedProfilePromise = null;
      return cachedProfileData;
    }
  })();

  return cachedProfilePromise;
}

export function invalidateUserProfileCache() {
  cachedProfileUid = null;
  cachedProfilePromise = null;
  cachedProfileData = null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfileData);
  const [loading, setLoading] = useState(!cachedProfileData);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const prof = await fetchUserProfileOnce(firebaseUser.uid);
        setProfile(prof);
      } else {
        invalidateUserProfileCache();
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithToken = useCallback(async (customToken: string) => {
    invalidateUserProfileCache();
    await signInWithCustomToken(auth, customToken);
  }, []);

  const logout = useCallback(async () => {
    invalidateUserProfileCache();
    await signOut(auth);
    setProfile(null);
  }, []);

  return {
    user,
    profile,
    loading,
    loginWithToken,
    logout,
    isAuthenticated: !!user,
    isPremium: profile?.role === 'premium' || profile?.role === 'admin',
    isAdmin: profile?.role === 'admin',
  };
}
