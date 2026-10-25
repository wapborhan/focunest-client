"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signInWithGoogle } from "@/lib/firebase-client";
export default function LoginPage() {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    async function go() {
        setBusy(true);
        try {
            await signInWithGoogle();
            router.replace("/dashboard");
            router.refresh();
        }
        catch {
            toast.error("Sign-in failed. Check your connection and try again.");
            setBusy(false);
        }
    }
    return (<main className="min-h-screen grid place-items-center p-6">
      <section className="w-full max-w-sm rounded-xl border border-line bg-white p-8">
        <h1 className="text-2xl font-semibold">My Life Manager</h1>
        <p className="mt-2 text-muted">Your money, tasks and worship in one place. আপনার সব হিসাব এক জায়গায়।</p>
        <button onClick={go} disabled={busy} className="mt-8 w-full rounded-lg bg-brand px-4 py-3 font-medium text-white hover:opacity-90 disabled:opacity-60">
          {busy ? "Signing in…" : "Continue with Google"}
        </button>
      </section>
    </main>);
}
