"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { Avatar } from "@/lib/avatar";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isSignedIn, signInWithGoogle } = useAuth();
  const [lobbies, setLobbies] = useState<
    { code: string; score: number; coins: number; completedCount: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (authLoading) return;
      if (!user) {
        setLobbies([]);
        setLoading(false);
        return;
      }

      const savedCodes: string[] = JSON.parse(localStorage.getItem("lobbies") || "[]");
      const codes = [...(profile?.lobbyIds || []), ...savedCodes].filter(
        (c, i, arr) => arr.indexOf(c) === i
      );

      const results = [];
      for (const code of codes) {
        const memberDoc = await getDoc(doc(db, "lobbies", code, "members", user.uid));
        if (memberDoc.exists()) {
          const data = memberDoc.data();
          results.push({
            code,
            score: data.score || 0,
            coins: data.coins || 0,
            completedCount: data.completedCount || 0,
          });
        }
      }
      setLobbies(results);
      setLoading(false);
    }
    load();
  }, [user, profile, authLoading]);

  const name = profile?.displayName || user?.displayName || "Your Profile";
  const totalScore = lobbies.reduce((s, l) => s + l.score, 0);
  const totalTasks = lobbies.reduce((s, l) => s + l.completedCount, 0);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10 gap-6">
      <button
        onClick={() => router.push("/join")}
        className="self-start text-sm underline"
        style={{ color: "var(--text-dim)" }}
      >
        ← Back to Home
      </button>

      {!isSignedIn && !authLoading && (
        <div className="card w-full max-w-sm text-center">
          <p className="mb-3">Sign in to keep your profile on every device.</p>
          <button
            onClick={() => signInWithGoogle()}
            className="btn w-full"
            style={{ background: "var(--mint)", color: "#0D1B2A" }}
          >
            Sign in with Google
          </button>
        </div>
      )}

      {isSignedIn && user && (
        <>
          <div className="flex flex-col items-center gap-2">
            <Avatar name={name} photoURL={profile?.photoURL || user.photoURL} size={72} />
            <h1 className="text-xl font-bold">{name}</h1>
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              {user.email}
            </p>
          </div>

          <div className="card w-full max-w-sm flex justify-around text-center">
            <div>
              <p className="text-2xl font-bold" style={{ color: "var(--gold)" }}>
                {profile?.coins ?? 0}
              </p>
              <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                Coins
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: "var(--mint)" }}>
                {totalScore}
              </p>
              <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                Total points
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold">{totalTasks}</p>
              <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                Tasks done
              </p>
            </div>
          </div>

          <div className="card w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--mint)" }}>
              Your Lobbies
            </h2>
            {loading && (
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>
                Loading...
              </p>
            )}
            {!loading && lobbies.length === 0 && (
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>
                No lobbies yet — join or create one!
              </p>
            )}
            {lobbies.map((l) => (
              <div
                key={l.code}
                className="flex justify-between items-center border-b py-2 cursor-pointer"
                style={{ borderColor: "#243B57" }}
                onClick={() => router.push(`/lobby/${l.code}`)}
              >
                <span className="font-semibold" style={{ color: "var(--mint)" }}>
                  {l.code}
                </span>
                <span className="text-sm" style={{ color: "var(--text-dim)" }}>
                  {l.score} pts · 🪙 {l.coins} · {l.completedCount} tasks
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
