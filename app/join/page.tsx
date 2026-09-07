"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, setDoc, getDocs, getDoc, collection, updateDoc } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { rememberLobby } from "@/lib/user";

export default function JoinPage() {
  const { user, profile, loading, isSignedIn, signInWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [lobbyCode, setLobbyCode] = useState("");
  const [recentLobbies, setRecentLobbies] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (profile?.displayName && !name) setName(profile.displayName);
  }, [profile, name]);

  useEffect(() => {
    const local: string[] = JSON.parse(localStorage.getItem("lobbies") || "[]");
    const cloud = profile?.lobbyIds || [];
    const merged = [...cloud, ...local.filter((c) => !cloud.includes(c))].slice(0, 8);
    setRecentLobbies(merged);
  }, [profile]);

  function saveLobbyLocal(code: string) {
    const saved = JSON.parse(localStorage.getItem("lobbies") || "[]");
    if (!saved.includes(code)) {
      localStorage.setItem("lobbies", JSON.stringify([code, ...saved].slice(0, 5)));
    }
  }

  async function saveLobby(code: string) {
    saveLobbyLocal(code);
    const uid = auth.currentUser?.uid;
    if (uid) await rememberLobby(uid, code);
  }

  async function nameTaken(lobbyId: string, nameToCheck: string, exceptUid?: string) {
    const snap = await getDocs(collection(db, "lobbies", lobbyId, "members"));
    return snap.docs.some(
      (d) =>
        d.id !== exceptUid &&
        d.data().name?.trim().toLowerCase() === nameToCheck.trim().toLowerCase()
    );
  }

  async function requireUser() {
    if (auth.currentUser && !auth.currentUser.isAnonymous) return auth.currentUser;
    await signInWithGoogle();
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
      throw new Error("Sign in with Google so your progress follows you across devices.");
    }
    return auth.currentUser;
  }

  async function upsertMember(lobbyId: string, uid: string, memberName: string) {
    const memberRef = doc(db, "lobbies", lobbyId, "members", uid);
    const existing = await getDoc(memberRef);
    const photoURL = auth.currentUser?.photoURL || profile?.photoURL || null;
    if (existing.exists()) {
      await updateDoc(memberRef, { name: memberName, photoURL });
    } else {
      await setDoc(memberRef, {
        name: memberName,
        score: 0,
        coins: 0,
        completedCount: 0,
        streak: 0,
        treatsOwed: 0,
        photoURL,
      });
    }
  }

  async function createLobby() {
    if (!name.trim()) return alert("Enter your name");
    try {
      setBusy(true);
      const signedIn = await requireUser();
      const newLobbyId = Math.random().toString(36).substring(2, 7).toUpperCase();
      await upsertMember(newLobbyId, signedIn.uid, name.trim());
      await saveLobby(newLobbyId);
      router.push(`/lobby/${newLobbyId}`);
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        alert(err?.message || "Could not create lobby");
      }
    } finally {
      setBusy(false);
    }
  }

  async function joinLobby() {
    if (!name.trim() || !lobbyCode) return alert("Enter name and lobby code");
    const code = lobbyCode.toUpperCase();
    try {
      setBusy(true);
      const signedIn = await requireUser();
      const taken = await nameTaken(code, name, signedIn.uid);
      if (taken) {
        alert("That name is already used in this lobby. Pick a different name.");
        return;
      }
      await upsertMember(code, signedIn.uid, name.trim());
      await saveLobby(code);
      router.push(`/lobby/${code}`);
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        alert(err?.message || "Could not join lobby");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 relative" style={{ width: 56, height: 64 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: "var(--mint)",
              borderRadius: "28px 28px 20px 20px",
              position: "relative",
            }}
          >
            <div
              style={{
                width: 26,
                height: 16,
                background: "#A8E8CE",
                borderRadius: 8,
                position: "absolute",
                top: 10,
                right: -6,
                border: "3px solid var(--bg)",
              }}
            ></div>
          </div>
          <div
            style={{
              width: 14,
              height: 20,
              background: "var(--mint)",
              position: "absolute",
              bottom: -12,
              left: 6,
              borderRadius: "0 0 6px 6px",
            }}
          ></div>
        </div>
        <h1 className="text-3xl font-bold">Sus-Penders</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
          Log tasks. Climb the board. Don&apos;t be the Imposter.
        </p>
      </div>

      <div className="card w-full max-w-sm flex flex-col gap-4">
        {!loading && !isSignedIn && (
          <div className="rounded-lg p-3" style={{ background: "#1E3350" }}>
            <p className="text-sm mb-3">
              Sign in so your coins, lobbies, and score stay the same on every device.
            </p>
            <button
              onClick={() => signInWithGoogle().catch((e) => alert(e.message))}
              className="btn w-full"
              style={{ background: "white", color: "#0D1B2A" }}
            >
              Sign in with Google
            </button>
          </div>
        )}

        {isSignedIn && (
          <p className="text-xs" style={{ color: "var(--mint)" }}>
            Signed in as {user?.email || profile?.displayName}. Same account = same progress.
          </p>
        )}

        <input
          className="p-3 rounded-lg text-black bg-white"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          onClick={createLobby}
          disabled={busy}
          className="btn w-full"
          style={{ background: "var(--mint)", color: "#0D1B2A" }}
        >
          Create Lobby
        </button>

        <div className="flex items-center gap-2 my-1">
          <div className="flex-1 h-px" style={{ background: "#243B57" }}></div>
          <span className="text-xs" style={{ color: "var(--text-dim)" }}>
            OR
          </span>
          <div className="flex-1 h-px" style={{ background: "#243B57" }}></div>
        </div>

        <input
          className="p-3 rounded-lg text-black bg-white"
          placeholder="Lobby code"
          value={lobbyCode}
          onChange={(e) => setLobbyCode(e.target.value)}
        />
        <button
          onClick={joinLobby}
          disabled={busy}
          className="btn w-full"
          style={{ background: "#1E3350", color: "var(--text)" }}
        >
          Join Lobby
        </button>

        {recentLobbies.length > 0 && (
          <div className="mt-2 pt-4" style={{ borderTop: "1px solid #243B57" }}>
            <p className="text-xs mb-2" style={{ color: "var(--text-dim)" }}>
              Recent lobbies
            </p>
            <div className="flex flex-wrap gap-2">
              {recentLobbies.map((code) => (
                <button
                  key={code}
                  onClick={() => router.push(`/lobby/${code}`)}
                  className="text-xs px-3 py-1 rounded-full"
                  style={{ background: "#1E3350" }}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
