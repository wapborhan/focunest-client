import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "./firebase-admin";
export const SESSION_COOKIE = "__session";
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

/** Verifies the cookie server-side, including revocation. Memoized per request, so the layout and the page share one check. */
export const getSessionUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const d = await adminAuth().verifySessionCookie(token, true);
    return { uid: d.uid, email: d.email, name: d.name, picture: d.picture };
  } catch { return null; }
});
/** For pages/layouts: redirects to /login. */
export async function requirePageUser() {
  const u = await getSessionUser(); if (!u) redirect("/login"); return u;
}
/** For route handlers: throws a Response the handler wrapper returns as 401. */
export async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw Response.json({ error: { code: "unauthorized", message: "Sign in required" } }, { status: 401 });
  return u;
}
