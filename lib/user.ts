import { User } from "firebase/auth";
import { arrayUnion, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export type UserProfile = {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  coins: number;
  lobbyIds: string[];
};

export function userRef(uid: string) {
  return doc(db, "users", uid);
}

export async function ensureUserDoc(user: User, fallbackName?: string) {
  const ref = userRef(user.uid);
  const snap = await getDoc(ref);
  const displayName =
    fallbackName?.trim() ||
    user.displayName ||
    user.email?.split("@")[0] ||
    "Crewmate";

  if (!snap.exists()) {
    const profile: UserProfile = {
      uid: user.uid,
      displayName,
      email: user.email,
      photoURL: user.photoURL,
      coins: 0,
      lobbyIds: [],
    };
    await setDoc(ref, profile);
    return profile;
  }

  const data = snap.data() as UserProfile;
  const next: UserProfile = {
    uid: user.uid,
    displayName: data.displayName || displayName,
    email: user.email ?? data.email ?? null,
    photoURL: user.photoURL ?? data.photoURL ?? null,
    coins: data.coins || 0,
    lobbyIds: data.lobbyIds || [],
  };

  await setDoc(ref, next, { merge: true });
  return next;
}

export async function rememberLobby(uid: string, code: string) {
  await setDoc(userRef(uid), { lobbyIds: arrayUnion(code) }, { merge: true });
}
