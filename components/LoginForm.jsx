"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signInWithGoogle } from "@/lib/firebase-client";
const G = () => (<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" /><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>);
export default function LoginForm() {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { await signInWithGoogle(); router.replace("/dashboard"); router.refresh(); }
    catch { toast.error("Sign-in failed. Check your connection and try again."); setBusy(false); }
  }
  return (<button onClick={go} disabled={busy} className="btn btn-ghost w-full !py-3 text-base shadow-sm hover:shadow-md"><G />{busy ? "Signing in…" : "Continue with Google"}</button>);
}
