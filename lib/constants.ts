export const PENALTY_DARES = [
  { id: "dance", emoji: "💃", label: "Upload yourself dancing" },
  { id: "snacks", emoji: "🍿", label: "Buy the group snacks" },
  { id: "icecream", emoji: "🍦", label: "Treat everyone to ice cream" },
  { id: "sing", emoji: "🎤", label: "Send a singing voice note" },
  { id: "pushups", emoji: "💪", label: "Do 20 push-ups on camera" },
  { id: "apology", emoji: "📝", label: "Write a dramatic public apology" },
] as const;

export type DareId = (typeof PENALTY_DARES)[number]["id"] | "custom";

export const AVATAR_COLORS = [
  "#5B8DEF",
  "#A78BFA",
  "#F472B6",
  "#FB923C",
  "#2DD4BF",
  "#818CF8",
];
