"use client";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
const auth = () => getAuth(getApps().length ? getApp() : initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}));
/** Google is the only provider. Exchanges the ID token for an HTTP-only session cookie. */
export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth(), new GoogleAuthProvider());
  const idToken = await cred.user.getIdToken();
  const res = await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) });
  if (!res.ok) throw new Error("Could not start a session");
}
export async function signOutEverywhere() {
  await fetch("/api/auth/session", { method: "DELETE" });
  await signOut(auth());
}
