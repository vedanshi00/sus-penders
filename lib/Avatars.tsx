"use client";

import { AVATAR_COLORS } from "./constants";

export function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({
  name,
  photoURL,
  size = 24,
}: {
  name: string;
  photoURL?: string | null;
  size?: number;
}) {
  if (photoURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoURL}
        alt={name || "avatar"}
        className="rounded-full flex-shrink-0 object-cover"
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }

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
