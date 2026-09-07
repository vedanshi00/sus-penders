"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { Avatar } from "@/lib/avatar";

export default function Header() {
  const router = useRouter();
  const { user, profile, loading, isSignedIn, signInWithGoogle, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const name = profile?.displayName || user?.displayName || "Crewmate";

  async function handleGoogle() {
    try {
      setSigningIn(true);
      await signInWithGoogle();
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/unauthorized-domain") {
        alert(
          "Google sign-in is blocked for this domain. In Firebase Console → Authentication → Settings → Authorized domains, add localhost and your Vercel URL."
        );
      } else if (code === "auth/operation-not-allowed") {
        alert(
          "Enable Google in Firebase Console → Authentication → Sign-in method."
        );
      } else if (code !== "auth/popup-closed-by-user") {
        alert(err?.message || "Sign-in failed");
      }
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-2 px-4 py-3 border-b border-[#1E3350] bg-[rgba(13,27,42,0.85)] backdrop-blur">
      <button
        onClick={() => router.push("/join")}
        className="flex items-center gap-2"
      >
        <div className="w-6 h-6 rounded-full bg-[var(--mint)]"></div>
        <h1 className="font-display font-extrabold text-xl tracking-tight">
          Sus-Penders
        </h1>
      </button>

      <div className="relative">
        {loading ? (
          <div className="text-xs" style={{ color: "var(--text-dim)" }}>
            …
          </div>
        ) : isSignedIn ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full pl-2 pr-1 py-1"
            style={{ background: "#1E3350" }}
          >
            <span className="text-xs font-semibold" style={{ color: "var(--gold)" }}>
              🪙 {profile?.coins ?? 0}
            </span>
            <Avatar name={name} photoURL={profile?.photoURL || user?.photoURL} size={32} />
          </button>
        ) : (
          <button
            onClick={handleGoogle}
            disabled={signingIn}
            className="text-sm font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "var(--mint)", color: "#0D1B2A" }}
          >
            {signingIn ? "Signing in…" : "Sign in"}
          </button>
        )}

        {open && isSignedIn && (
          <div
            className="absolute right-0 mt-2 w-56 rounded-xl p-3 shadow-lg"
            style={{ background: "var(--bg-card)", border: "1px solid #243B57" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Avatar name={name} photoURL={profile?.photoURL || user?.photoURL} size={40} />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{name}</p>
                <p className="text-xs truncate" style={{ color: "var(--text-dim)" }}>
                  {user?.email}
                </p>
              </div>
            </div>
            <p className="text-xs mb-3" style={{ color: "var(--gold)" }}>
              🪙 {profile?.coins ?? 0} coins
            </p>
            <button
              className="w-full text-left text-sm py-2"
              onClick={() => {
                setOpen(false);
                router.push("/profile");
              }}
            >
              View profile
            </button>
            <button
              className="w-full text-left text-sm py-2"
              style={{ color: "var(--red)" }}
              onClick={async () => {
                setOpen(false);
                await logout();
                router.push("/join");
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
