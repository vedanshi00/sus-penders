"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  addDoc,
  deleteDoc,
  setDoc,
  getDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

const CATEGORIES = ["Cleaning", "Work", "Study", "Personal", "Other"];
const CATEGORY_COLORS: Record<string, string> = {
  Cleaning: "#3DDC97",
  Work: "#5B8DEF",
  Study: "#FFD166",
  Personal: "#E63950",
  Other: "#94A3B8",
};
const CATEGORY_ICONS: Record<string, string> = {
  Cleaning: "🧹",
  Work: "💼",
  Study: "📚",
  Personal: "🏠",
  Other: "📦",
};
const REACTIONS = ["👍", "🔥", "😂", "👏", "😮"];
const AVATAR_COLORS = ["#5B8DEF", "#A78BFA", "#F472B6", "#FB923C", "#2DD4BF", "#818CF8"];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{
        background: avatarColor(name || "?"),
        color: "white",
        width: size,
        height: size,
        fontSize: size * 0.45,
      }}
    >
      {name?.[0]?.toUpperCase() || "?"}
    </span>
  );
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function getBadges(completedCount: number) {
  const badges = [];
  if (completedCount >= 1) badges.push({ label: "First Task", color: "#94A3B8" });
  if (completedCount >= 5) badges.push({ label: "5 Done", color: "#3DDC97" });
  if (completedCount >= 10) badges.push({ label: "10 Done", color: "#FFD166" });
  if (completedCount >= 20) badges.push({ label: "20 Done", color: "#E63950" });
  return badges;
}

function getHeatmapData(tasks: any[]) {
  const counts: Record<string, number> = {};
  tasks.forEach((t) => {
    if (t.status === "done" && t.doneAt?.toDate) {
      const day = t.doneAt.toDate().toISOString().slice(0, 10);
      counts[day] = (counts[day] || 0) + 1;
    }
  });

  const days = [];
  const today = new Date();
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: counts[key] || 0 });
  }
  return days;
}

function heatColor(count: number) {
  if (count === 0) return "#1E3350";
  if (count === 1) return "#1F5C46";
  if (count === 2) return "#2A8C63";
  if (count <= 4) return "#3DDC97";
  return "#7FFFC3";
}

export default function LobbyPage() {
  const { id } = useParams();
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskName, setTaskName] = useState("");
  const [difficulty, setDifficulty] = useState(5);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [personFilter, setPersonFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [goal, setGoal] = useState(100);
  const [editingGoal, setEditingGoal] = useState(false);
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [profileMember, setProfileMember] = useState<any | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUid(auth.currentUser?.uid || null);
  }, []);

  useEffect(() => {
    const unsubMembers = onSnapshot(
      collection(db, "lobbies", id as string, "members"),
      (snap) => {
        setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    const q = query(
      collection(db, "lobbies", id as string, "tasks"),
      orderBy("createdAt", "desc")
    );
    const unsubTasks = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    async function loadGoal() {
      const goalDoc = await getDoc(doc(db, "lobbies", id as string));
      if (goalDoc.exists() && goalDoc.data().goal) {
        setGoal(goalDoc.data().goal);
      }
    }
    loadGoal();

    return () => {
      unsubMembers();
      unsubTasks();
    };
  }, [id]);

  async function saveGoal(newGoal: number) {
    setGoal(newGoal);
    await setDoc(doc(db, "lobbies", id as string), { goal: newGoal }, { merge: true });
  }

  async function resetWeek() {
    if (!confirm("Reset scores for everyone this week? This can't be undone.")) return;
    for (const m of members) {
      await updateDoc(doc(db, "lobbies", id as string, "members", m.id), {
        score: 0,
        completedCount: 0,
        streak: 0,
      });
    }
    alert("Week reset! Fresh start for everyone.");
  }

  async function addTask() {
    const user = auth.currentUser;
    if (!user || !taskName) return alert("Enter a task name");
    const member = members.find((m) => m.id === user.uid);

    await addDoc(collection(db, "lobbies", id as string, "tasks"), {
      taskName,
      difficulty,
      category,
      doneBy: member?.name || "Unknown",
      doneByUid: user.uid,
      status: "pending",
      reactions: {},
      createdAt: serverTimestamp(),
    });

    setTaskName("");
  }

  async function completeTask(task: any) {
    const user = auth.currentUser;
    if (!user || user.uid !== task.doneByUid) {
      alert("You can only check off your own tasks!");
      return;
    }

    const taskRef = doc(db, "lobbies", id as string, "tasks", task.id);
    await updateDoc(taskRef, { status: "done", doneAt: serverTimestamp() });

    const member = members.find((m) => m.id === task.doneByUid);
    const memberRef = doc(db, "lobbies", id as string, "members", task.doneByUid);

    let newStreak = 1;
    if (member?.lastActiveDate === todayStr()) {
      newStreak = member.streak || 1;
    } else if (member?.lastActiveDate === yesterdayStr()) {
      newStreak = (member.streak || 0) + 1;
    }

    await updateDoc(memberRef, {
      score: increment(task.difficulty),
      completedCount: increment(1),
      streak: newStreak,
      lastActiveDate: todayStr(),
    });
  }
  async function leaveLobby() {
    if (!confirm("Leave this lobby?")) return;
    const user = auth.currentUser;
    if (!user) return;
    await deleteDoc(doc(db, "lobbies", id as string, "members", user.uid));
    router.push("/join");
  }
  async function deleteTask(taskId: string) {
    await deleteDoc(doc(db, "lobbies", id as string, "tasks", taskId));
  }

  async function addReaction(task: any, emoji: string) {
    const user = auth.currentUser;
    if (!user) return;
    const current = task.reactions || {};
    const updated = { ...current, [user.uid]: emoji };
    await updateDoc(doc(db, "lobbies", id as string, "tasks", task.id), {
      reactions: updated,
    });
    setReactionPickerFor(null);
  }

  function reactionCounts(reactions: Record<string, string> = {}) {
    const counts: Record<string, number> = {};
    Object.values(reactions).forEach((emoji) => {
      counts[emoji] = (counts[emoji] || 0) + 1;
    });
    return counts;
  }

  const myPendingTasks = tasks.filter((t) => t.status === "pending" && t.doneByUid === currentUid);
  const completedTasks = tasks
    .filter((t) => t.status === "done")
    .filter((t) => personFilter === "All" || t.doneBy === personFilter)
    .filter((t) => categoryFilter === "All" || t.category === categoryFilter);

  const totalScore = members.reduce((sum, m) => sum + (m.score || 0), 0);
  const progressPct = Math.min(100, Math.round((totalScore / goal) * 100));

  const tasksCompletedToday = tasks.filter((t) => {
    if (t.status !== "done" || !t.doneAt?.toDate) return false;
    return t.doneAt.toDate().toISOString().slice(0, 10) === todayStr();
  }).length;

  const longestStreakMember = members.reduce((best: any, m: any) => {
    if (!best || (m.streak || 0) > (best.streak || 0)) return m;
    return best;
  }, null);

  const activityFeed = [...tasks]
    .flatMap((t) => {
      const entries: { time: number; text: string }[] = [];
      if (t.createdAt?.toDate) {
        entries.push({
          time: t.createdAt.toDate().getTime(),
          text: `${t.doneBy} added "${t.taskName}"`,
        });
      }
      if (t.status === "done" && t.doneAt?.toDate) {
        entries.push({
          time: t.doneAt.toDate().getTime(),
          text: `${t.doneBy} completed "${t.taskName}" +${t.difficulty}`,
        });
      }
      return entries;
    })
    .sort((a, b) => b.time - a.time)
    .slice(0, 6);

  const heatmapDays = getHeatmapData(tasks);

  const profileTasks = profileMember
    ? tasks.filter((t) => t.doneByUid === profileMember.id)
    : [];
  const profilePending = profileTasks.filter((t) => t.status === "pending");
  const profileCompleted = profileTasks.filter((t) => t.status === "done");

  return (
    <div className="min-h-screen p-6 flex flex-col items-center gap-6">
      <div className="w-full flex justify-between max-w-6xl">
  <button
    onClick={() => router.push("/join")}
    className="text-sm underline"
    style={{ color: "var(--text-dim)" }}
  >
    ← Back to Home
  </button>
  <button
    onClick={leaveLobby}
    className="text-sm underline"
    style={{ color: "var(--red)" }}
  >
    Leave Lobby
  </button>
</div>

      <div className="text-center">
        <p className="text-sm mb-1" style={{ color: "var(--text-dim)" }}>
          Invite friends with this code
        </p>
        <div
          className="text-4xl font-bold tracking-widest cursor-pointer"
          style={{ color: "var(--mint)" }}
          onClick={() => {
            navigator.clipboard.writeText(id as string);
            alert("Code copied!");
          }}
        >
          {id}
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>tap to copy</p>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[260px_1fr_260px] gap-6 items-start">
        <div className="card order-2 lg:order-1">
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--mint)" }}>Team Stats</h2>
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <p style={{ color: "var(--text-dim)" }}>Total team points</p>
              <p className="text-2xl font-bold" style={{ color: "var(--mint)" }}>{totalScore}</p>
            </div>
            <div>
              <p style={{ color: "var(--text-dim)" }}>Tasks completed today</p>
              <p className="text-2xl font-bold" style={{ color: "var(--gold)" }}>{tasksCompletedToday}</p>
            </div>
            <div>
              <p style={{ color: "var(--text-dim)" }}>Longest streak</p>
              {longestStreakMember && (longestStreakMember.streak || 0) > 0 ? (
                <p className="text-lg font-bold flex items-center gap-2">
                  🔥 {longestStreakMember.streak}
                  <span className="flex items-center gap-1 text-sm font-normal" style={{ color: "var(--text-dim)" }}>
                    <Avatar name={longestStreakMember.name} size={18} /> {longestStreakMember.name}
                  </span>
                </p>
              ) : (
                <p className="text-sm" style={{ color: "var(--text-dim)" }}>No streaks yet</p>
              )}
            </div>
            <div>
              <p className="mb-2" style={{ color: "var(--text-dim)" }}>Last 28 days</p>
              <div className="grid grid-cols-7 gap-1">
                {heatmapDays.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.count} task${d.count !== 1 ? "s" : ""}`}
                    className="w-full aspect-square rounded-sm"
                    style={{ background: heatColor(d.count) }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 items-center order-1 lg:order-2">
          <div className="card w-full max-w-sm">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold" style={{ color: "var(--mint)" }}>Team Goal</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={resetWeek}
                  className="text-xs underline"
                  style={{ color: "var(--red)" }}
                >
                  reset week
                </button>
                {editingGoal ? (
                  <input
                    type="number"
                    defaultValue={goal}
                    autoFocus
                    className="w-20 p-1 rounded text-black bg-white text-sm"
                    onBlur={(e) => {
                      saveGoal(Number(e.target.value) || 100);
                      setEditingGoal(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                ) : (
                  <button
                    onClick={() => setEditingGoal(true)}
                    className="text-xs underline"
                    style={{ color: "var(--text-dim)" }}
                  >
                    edit goal
                  </button>
                )}
              </div>
            </div>
            <div className="w-full h-4 rounded-full overflow-hidden" style={{ background: "#1E3350" }}>
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: "var(--mint)" }}
              ></div>
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--text-dim)" }}>
              {totalScore} / {goal} pts ({progressPct}%)
            </p>
          </div>

          <div className="card w-full max-w-sm flex flex-col gap-3 items-center">
            <input
              className="p-3 rounded-lg text-black bg-white w-full"
              placeholder="Task name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
            />

            <select
              className="p-3 rounded-lg text-black bg-white w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
              ))}
            </select>

            <div className="flex items-center gap-2 w-full">
              <label className="whitespace-nowrap text-sm">Difficulty: {difficulty}</label>
              <input
                type="range"
                min="1"
                max="10"
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <button
              onClick={addTask}
              className="btn w-full"
              style={{ background: "var(--mint)", color: "#0D1B2A" }}
            >
              Add Task
            </button>
          </div>

          <button
            onClick={() => router.push(`/leaderboard/${id}`)}
            className="btn"
            style={{ background: "#7C3AED", color: "white" }}
          >
            View Leaderboard
          </button>

          <div className="card w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--mint)" }}>Members</h2>
            <p className="text-xs mb-2" style={{ color: "var(--text-dim)" }}>Tap a name to see their tasks</p>
            {members.map((m) => {
              const pct = totalScore > 0 ? Math.round(((m.score || 0) / totalScore) * 100) : 0;
              return (
                <div key={m.id} className="mb-3">
                  <div
                    className="flex justify-between text-sm mb-1 cursor-pointer"
                    onClick={() => setProfileMember(m)}
                  >
                    <span className="flex items-center gap-2">
                      <Avatar name={m.name} size={24} />
                      {m.name}
                      {m.id === currentUid && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#1E3350", color: "var(--text-dim)" }}>you</span>
                      )}
                    </span>
                    <span style={{ color: "var(--text-dim)" }}>
                      {m.completedCount || 0} tasks · <span key={m.score} className="pop-in inline-block">{m.score || 0} pts</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#1E3350" }}>
                    <div
                      className="h-full"
                      style={{ width: `${pct}%`, background: "var(--gold)" }}
                    ></div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {(m.streak || 0) > 0 && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background:
                            m.streak >= 7 ? "var(--red)" :
                            m.streak >= 3 ? "var(--gold)" :
                            "#3DDC97",
                          color: "#0D1B2A",
                        }}
                      >
                        🔥 {m.streak} day streak
                      </span>
                    )}
                    {getBadges(m.completedCount || 0).map((b) => (
                      <span
                        key={b.label}
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: b.color, color: "#0D1B2A" }}
                      >
                        {b.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--gold)" }}>Your To-Do</h2>
            {myPendingTasks.length === 0 && (
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>Nothing pending — add a task above</p>
            )}
            {myPendingTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b py-2" style={{ borderColor: "#243B57" }}>
                <div className="flex items-center gap-2">
                  <input type="checkbox" onChange={() => completeTask(t)} className="w-4 h-4" />
                  <div>
                    <div className="flex items-center gap-2">
                      {t.taskName}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-dim)" }}>
                      {CATEGORY_ICONS[t.category]} {t.category}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--gold)" }}>+{t.difficulty}</span>
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="text-xs"
                    style={{ color: "var(--red)" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="card w-full max-w-sm mb-10">
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--mint)" }}>Completed</h2>

            <div className="flex flex-wrap gap-2 mb-2">
              {["All", ...members.map((m) => m.name)].map((name) => (
                <button
                  key={name}
                  onClick={() => setPersonFilter(name)}
                  className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{
                    background: personFilter === name ? "var(--mint)" : "#1E3350",
                    color: personFilter === name ? "#0D1B2A" : "var(--text-dim)",
                  }}
                >
                  {name}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {["All", ...CATEGORIES].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{
                    background: categoryFilter === c ? (CATEGORY_COLORS[c] || "#5B8DEF") : "#1E3350",
                    color: categoryFilter === c ? "#0D1B2A" : "var(--text-dim)",
                  }}
                >
                  {c === "All" ? "All" : `${CATEGORY_ICONS[c]} ${c}`}
                </button>
              ))}
            </div>

            {completedTasks.length === 0 && (
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>No completed tasks here yet</p>
            )}
            {completedTasks.map((t) => {
              const counts = reactionCounts(t.reactions);
              return (
                <div key={t.id} className="border-b py-2" style={{ borderColor: "#243B57" }}>
                  <div className="flex justify-between items-center">
                    <span>{t.taskName}</span>
                    <span style={{ color: "var(--gold)" }}>+{t.difficulty}</span>
                  </div>
                  <div className="text-xs flex items-center gap-1" style={{ color: "var(--text-dim)" }}>
                    <Avatar name={t.doneBy} size={16} /> {t.doneBy} · {CATEGORY_ICONS[t.category]} {t.category}
                  </div>

                  <div className="flex items-center gap-1 mt-2 flex-wrap relative">
                    {Object.entries(counts).map(([emoji, count]) => (
                      <span
                        key={emoji}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "#1E3350" }}
                      >
                        {emoji} {count}
                      </span>
                    ))}
                    <button
                      onClick={() => setReactionPickerFor(reactionPickerFor === t.id ? null : t.id)}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "#1E3350", color: "var(--text-dim)" }}
                    >
                      + react
                    </button>
                    {reactionPickerFor === t.id && (
                      <div
                        className="flex gap-1 p-1 rounded-lg absolute top-6 left-0 z-10"
                        style={{ background: "#0D1B2A", border: "1px solid #243B57" }}
                      >
                        {REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => addReaction(t, emoji)}
                            className="text-lg hover:scale-125 transition"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card order-3">
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--mint)" }}>Recent Activity</h2>
          {activityFeed.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>Nothing yet — add a task to get started</p>
          )}
          <div className="flex flex-col gap-2">
            {activityFeed.map((entry, i) => (
              <p key={i} className="text-xs" style={{ color: "var(--text-dim)" }}>
                {entry.text}
              </p>
            ))}
          </div>
        </div>
      </div>

      {profileMember && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ background: "rgba(13,27,42,0.85)" }}
          onClick={() => setProfileMember(null)}
        >
          <div
            className="card w-full max-w-sm max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <Avatar name={profileMember.name} size={40} />
              <div>
                <h2 className="text-lg font-bold">{profileMember.name}</h2>
                <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                  {profileMember.score || 0} pts · {profileMember.completedCount || 0} tasks done
                </p>
              </div>
              <button
                onClick={() => setProfileMember(null)}
                className="ml-auto text-sm"
                style={{ color: "var(--text-dim)" }}
              >
                ✕
              </button>
            </div>

            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--gold)" }}>Pending</h3>
            {profilePending.length === 0 && (
              <p className="text-xs mb-3" style={{ color: "var(--text-dim)" }}>Nothing pending</p>
            )}
            {profilePending.map((t) => (
              <div key={t.id} className="flex justify-between text-sm border-b py-1" style={{ borderColor: "#243B57" }}>
                <span>{CATEGORY_ICONS[t.category]} {t.taskName}</span>
                <span style={{ color: "var(--gold)" }}>+{t.difficulty}</span>
              </div>
            ))}

            <h3 className="text-sm font-semibold mt-4 mb-2" style={{ color: "var(--mint)" }}>Completed</h3>
            {profileCompleted.length === 0 && (
              <p className="text-xs" style={{ color: "var(--text-dim)" }}>Nothing completed yet</p>
            )}
            {profileCompleted.map((t) => (
              <div key={t.id} className="flex justify-between text-sm border-b py-1" style={{ borderColor: "#243B57" }}>
                <span>{CATEGORY_ICONS[t.category]} {t.taskName}</span>
                <span style={{ color: "var(--gold)" }}>+{t.difficulty}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}