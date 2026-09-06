"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, setDoc, getDocs, collection } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

export default function JoinPage() {
  const [name, setName] = useState("");
  const [lobbyCode, setLobbyCode] = useState("");
  const [recentLobbies, setRecentLobbies] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("lobbies") || "[]");
    setRecentLobbies(saved);
  }, []);

  function saveLobby(code: string) {
    const saved = JSON.parse(localStorage.getItem("lobbies") || "[]");
    if (!saved.includes(code)) {
      const updated = [code, ...saved].slice(0, 5);
      localStorage.setItem("lobbies", JSON.stringify(updated));
    }
  }

  async function nameTaken(lobbyId: string, nameToCheck: string) {
    const snap = await getDocs(collection(db, "lobbies", lobbyId, "members"));
    return snap.docs.some(
      (d) => d.data().name?.trim().toLowerCase() === nameToCheck.trim().toLowerCase()
    );
  }

  async function createLobby() {
    if (!name) return alert("Enter your name");
    const user = await signInAnonymously(auth);
    const newLobbyId = Math.random().toString(36).substring(2, 7).toUpperCase();
    await setDoc(doc(db, "lobbies", newLobbyId, "members", user.user.uid), {
      name: name.trim(),
      score: 0,
    });
    saveLobby(newLobbyId);
    router.push(`/lobby/${newLobbyId}`);
  }

  async function joinLobby() {
    if (!name || !lobbyCode) return alert("Enter name and lobby code");
    const code = lobbyCode.toUpperCase();

    const taken = await nameTaken(code, name);
    if (taken) {
      alert("That name is already used in this lobby. Pick a different name.");
      return;
    }

    const user = await signInAnonymously(auth);
    await setDoc(doc(db, "lobbies", code, "members", user.user.uid), {
      name: name.trim(),
      score: 0,
    });
    saveLobby(code);
    router.push(`/lobby/${code}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 relative" style={{ width: 56, height: 64 }}>
          <div style={{
            width: 56, height: 56, background: "var(--mint)",
            borderRadius: "28px 28px 20px 20px",
            position: "relative"
          }}>
            <div style={{
              width: 26, height: 16, background: "#A8E8CE",
              borderRadius: 8, position: "absolute", top: 10, right: -6,
              border: "3px solid var(--bg)"
            }}></div>
          </div>
          <div style={{
            width: 14, height: 20, background: "var(--mint)",
            position: "absolute", bottom: -12, left: 6, borderRadius: "0 0 6px 6px"
          }}></div>
        </div>
        <h1 className="text-3xl font-bold">Sus-Penders</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
          Log tasks. Climb the board. Don't be the Imposter.
        </p>
      </div>

      <div className="card w-full max-w-sm flex flex-col gap-4">
        <input
          className="p-3 rounded-lg text-black bg-white"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          onClick={createLobby}
          className="btn w-full"
          style={{ background: "var(--mint)", color: "#0D1B2A" }}
        >
          Create Lobby
        </button>

        <div className="flex items-center gap-2 my-1">
          <div className="flex-1 h-px" style={{ background: "#243B57" }}></div>
          <span className="text-xs" style={{ color: "var(--text-dim)" }}>OR</span>
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
          className="btn w-full"
          style={{ background: "#1E3350", color: "var(--text)" }}
        >
          Join Lobby
        </button>

        {recentLobbies.length > 0 && (
          <div className="mt-2 pt-4" style={{ borderTop: "1px solid #243B57" }}>
            <p className="text-xs mb-2" style={{ color: "var(--text-dim)" }}>Recent lobbies</p>
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