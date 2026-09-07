"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Avatar } from "@/lib/avatar";

function ImposterIcon({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 100 115">
      <ellipse cx="50" cy="60" rx="38" ry="45" fill="#E63950" />
      <rect x="55" y="35" width="30" height="18" rx="8" fill="#8B1E2E" stroke="#0D1B2A" strokeWidth="3" />
      <rect x="20" y="95" width="16" height="20" rx="6" fill="#E63950" />
      <rect x="55" y="95" width="16" height="20" rx="6" fill="#E63950" />
    </svg>
  );
}

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
  const podium = members.slice(0, 3);
  const rest = members.slice(3);

  function playRevealSound() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.6);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.6);
}

function startReveal() {
  playRevealSound();
  setShowReveal(true);
  setRevealStage("suspense");
  setTimeout(() => setRevealStage("name"), 2000);
}

  const podiumOrder = podium.length === 3 ? [podium[1], podium[0], podium[2]] : podium;
  const podiumHeights = [90, 130, 70];

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

      {podium.length > 0 && (
        <div className="flex items-end justify-center gap-3 w-full max-w-sm">
          {podiumOrder.map((m, idx) => {
            const realRank = podium.indexOf(m);
            const height = podium.length === 3 ? podiumHeights[idx] : 100;
            const barColor = realRank === 0 ? "var(--gold)" : realRank === 1 ? "#C0C0C0" : "#CD7F32";
            return (
              <div key={m.id} className="flex flex-col items-center gap-1 flex-1">
                {realRank === 0 && <span className="text-lg">👑</span>}
                <Avatar name={m.name} photoURL={m.photoURL} size={32} />
                <p className="text-xs font-semibold truncate max-w-full">{m.name}</p>
                <p className="text-xs" style={{ color: "var(--text-dim)" }}>{m.score} pts</p>
                <div
                  className="w-full rounded-t-lg flex items-start justify-center pt-1"
                  style={{ height, background: barColor }}
                >
                  <span className="text-sm font-bold" style={{ color: "#0D1B2A" }}>{realRank + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rest.length > 0 && (
        <div className="card w-full max-w-sm">
          {rest.map((m, i) => (
            <div
              key={m.id}
              className="flex justify-between items-center py-2 border-b"
              style={{ borderColor: "#243B57" }}
            >
              <span className="flex items-center gap-2">
                <Avatar name={m.name} photoURL={m.photoURL} size={24} />
                {i + 4}. {m.name}
              </span>
              <span>{m.score} pts</span>
            </div>
          ))}
        </div>
      )}

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
            <>
              <div className="text-6xl animate-pulse">❓</div>
              <p className="text-xl animate-pulse" style={{ color: "var(--text-dim)" }}>
                Calculating suspicion levels...
              </p>
            </>
          )}
          {revealStage === "name" && imposter && (
            <>
              <div className="reveal-name">
                <ImposterIcon size={110} />
              </div>
              <p className="text-lg mt-2" style={{ color: "var(--text-dim)" }}>
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