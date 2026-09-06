"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function LeaderboardPage() {
  const { id } = useParams();
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [showReveal, setShowReveal] = useState(false);
  const [revealStage, setRevealStage] = useState<"suspense" | "name">("suspense");

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "lobbies", id as string, "members"),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a: any, b: any) => b.score - a.score);
        setMembers(data);
      }
    );
    return () => unsub();
  }, [id]);

  const imposter = members[members.length - 1];
  const topScorer = members[0];

  function startReveal() {
    setShowReveal(true);
    setRevealStage("suspense");
    setTimeout(() => setRevealStage("name"), 1800);
  }

  return (
    <div className="min-h-screen p-6 flex flex-col items-center gap-6">
      <button
        onClick={() => router.push(`/lobby/${id}`)}
        className="self-start text-sm underline"
        style={{ color: "var(--text-dim)" }}
      >
        ← Back to Lobby
      </button>

      <h1 className="text-2xl font-bold">Leaderboard</h1>

      <div className="card w-full max-w-sm">
        {members.map((m, i) => (
          <div
            key={m.id}
            className="flex justify-between items-center border-b py-2"
            style={{ borderColor: "#243B57" }}
          >
            <span className="flex items-center gap-1">
                {i === 0 && members.length > 1 && <span>👑</span>}
                {i + 1}. {m.name}
            </span>
            <span className="flex items-center gap-2">
              {m.score} pts
              {i === 0 && members.length > 1 && (
                <span
                  className="text-xs px-2 py-1 rounded-full font-semibold"
                  style={{ background: "var(--gold)", color: "#0D1B2A" }}
                >
                  Leading Crewmate
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {members.length > 1 && (
        <button
          onClick={startReveal}
          className="btn"
          style={{ background: "var(--red)", color: "white" }}
        >
          🚨 Reveal the Imposter
        </button>
      )}

      {showReveal && (
        <div
          className="reveal-overlay fixed inset-0 flex flex-col items-center justify-center gap-4 z-50"
          style={{ background: "rgba(13,27,42,0.97)" }}
          onClick={() => setShowReveal(false)}
        >
          {revealStage === "suspense" && (
            <p className="text-xl animate-pulse" style={{ color: "var(--text-dim)" }}>
              Calculating suspicion levels...
            </p>
          )}
          {revealStage === "name" && imposter && (
            <>
              <p className="text-lg" style={{ color: "var(--text-dim)" }}>
                The Imposter was...
              </p>
              <div
                className="reveal-name text-5xl font-bold"
                style={{ color: "var(--red)" }}
              >
                {imposter.name}
              </div>
              <p className="text-sm mt-2" style={{ color: "var(--text-dim)" }}>
                Lowest score: {imposter.score} pts. Log more tasks next round!
              </p>
              <button
                className="btn mt-4"
                style={{ background: "#1E3350" }}
                onClick={() => setShowReveal(false)}
              >
                Close
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}