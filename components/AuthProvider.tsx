"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  GoogleAuthProvider,
  User,
  linkWithPopup,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { onSnapshot } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import {
  UserProfile,
  ensureUserDoc,
  userRef,
} from "@/lib/user";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isSignedIn: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (next) => {
      setUser(next);
      if (!next) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        await ensureUserDoc(next);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(userRef(user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data() as UserProfile);
    });
    return () => unsub();
  }, [user]);

  const isSignedIn = !!(user && !user.isAnonymous);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isSignedIn,
      signInWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        if (auth.currentUser?.isAnonymous) {
          try {
            const cred = await linkWithPopup(auth.currentUser, provider);
            await ensureUserDoc(cred.user);
            return;
          } catch (err: any) {
            if (err?.code !== "auth/credential-already-in-use") throw err;
          }
        }
        const cred = await signInWithPopup(auth, provider);
        await ensureUserDoc(cred.user);
      },
      logout: async () => {
        await signOut(auth);
      },
    }),
    [user, profile, loading, isSignedIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
