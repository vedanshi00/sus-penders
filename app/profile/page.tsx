"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const AVATAR_COLORS = ["#5B8DEF", "#A78BFA", "#F472B6", "#FB923C", "#2DD4BF", "#818CF8"];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [lobbies, setLobbies] = useState<{ code: string; score: number; completedCount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = auth.currentUser;
      const savedCodes: string[] = JSON.parse(localStorage.getItem("lobbies") || "[]").slice(0, 3);

      const results = [];
      for (const code of savedCodes) {
        if (!user) continue;
        const memberDoc = await getDoc(doc(db, "lobbies", code, "members", user.uid));
        if (memberDoc.exists()) {
          const data = memberDoc.data();
          if (!name) setName(data.name || "");
          results.push({
            code,
            score: data.score || 0,
            completedCount: data.completedCount || 0,
          });
        }
      }
      setLobbies(results);
      setLoading(false);
    }
    load();
  }, []);

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

      <div className="flex flex-col items-center gap-2">
        <span
          className="rounded-full flex items-center justify-center font-bold"
          style={{
            background: avatarColor(name || "?"),
            color: "white",
            width: 64,
            height: 64,
            fontSize: 28,
          }}
        >
          {name?.[0]?.toUpperCase() || "?"}
        </span>
        <h1 className="text-xl font-bold">{name || "Your Profile"}</h1>
      </div>

      <div className="card w-full max-w-sm flex justify-around text-center">
        <div>
          <p className="text-2xl font-bold" style={{ color: "var(--mint)" }}>{totalScore}</p>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>Total points</p>
        </div>
        <div>
          <p className="text-2xl font-bold" style={{ color: "var(--gold)" }}>{totalTasks}</p>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>Tasks done</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{lobbies.length}</p>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>Lobbies</p>
        </div>
      </div>

      <div className="card w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--mint)" }}>Your Lobbies</h2>
        {loading && <p className="text-sm" style={{ color: "var(--text-dim)" }}>Loading...</p>}
        {!loading && lobbies.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>No lobbies yet — join or create one!</p>
        )}
        {lobbies.map((l) => (
          <div
            key={l.code}
            className="flex justify-between items-center border-b py-2 cursor-pointer"
            style={{ borderColor: "#243B57" }}
            onClick={() => router.push(`/lobby/${l.code}`)}
          >
            <span className="font-semibold" style={{ color: "var(--mint)" }}>{l.code}</span>
            <span className="text-sm" style={{ color: "var(--text-dim)" }}>
              {l.score} pts · {l.completedCount} tasks
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}