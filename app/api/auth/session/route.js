import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase-admin";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/auth";
const body = z.object({ idToken: z.string().min(20) });
export async function POST(req) {
    const parsed = body.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
        return NextResponse.json({ error: { code: "invalid_input", message: "idToken required" } }, { status: 400 });
    try {
        const decoded = await adminAuth().verifyIdToken(parsed.data.idToken, true);
        if (decoded.firebase.sign_in_provider !== "google.com")
            return NextResponse.json({ error: { code: "forbidden", message: "Google sign-in only" } }, { status: 403 });
        if (Date.now() / 1000 - decoded.auth_time > 300)
            return NextResponse.json({ error: { code: "stale", message: "Sign in again" } }, { status: 401 });
        const cookie = await adminAuth().createSessionCookie(parsed.data.idToken, { expiresIn: SESSION_MAX_AGE_MS });
        const res = NextResponse.json({ ok: true });
        res.cookies.set(SESSION_COOKIE, cookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE_MS / 1000 });
        return res;
    }
    catch {
        return NextResponse.json({ error: { code: "unauthorized", message: "Invalid token" } }, { status: 401 });
    }
}
export async function DELETE(req) {
    const res = NextResponse.json({ ok: true });
    const token = req.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
    if (token) {
        try {
            const d = await adminAuth().verifySessionCookie(token);
            await adminAuth().revokeRefreshTokens(d.uid);
        }
        catch { }
    }
    res.cookies.delete(SESSION_COOKIE);
    return res;
}
