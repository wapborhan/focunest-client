import { ShieldCheck, WalletCards, LineChart } from "lucide-react";
import Logo from "@/components/Logo";
import LoginForm from "@/components/LoginForm";
export const metadata = { title: "Sign in", description: "Sign in to My Life Manager with Google to track income, expenses, loans and accounts in one place.", alternates: { canonical: "/login" }, robots: { index: true, follow: true } };
const POINTS = [[WalletCards, "Every account in one place", "Cash, bank and mobile banking, with transfers that always balance."], [LineChart, "Clear, honest numbers", "Loans and transfers never get counted as income or spending."], [ShieldCheck, "Private by design", "Google sign-in only. Your records are visible to you alone."]];
export default function LoginPage() {
  const ld = { "@context": "https://schema.org", "@type": "WebApplication", name: "My Life Manager", applicationCategory: "FinanceApplication", operatingSystem: "Web", description: "Personal finance manager for income, expenses, lending, borrowing and accounts." };
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#0a2925] via-[#0c3a34] to-brand p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" /><div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative flex items-center gap-3"><Logo size={44} /><span className="text-xl font-semibold">My Life Manager</span></div>
        <div className="relative space-y-8"><h2 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">Know where your money is, and where it's going.</h2>
          <ul className="space-y-5">{POINTS.map(([Icon, t, d], i) => (<li key={t} style={{ "--i": i + 2 }} className="animate-fade-up flex gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15"><Icon size={20} aria-hidden /></span><div><p className="font-medium">{t}</p><p className="text-sm text-white/70">{d}</p></div></li>))}</ul></div>
        <p className="relative text-sm text-white/50">আপনার সব হিসাব এক জায়গায়</p>
      </section>
      <section className="grid place-items-center p-6">
        <div className="animate-fade-up w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><Logo /><span className="text-lg font-semibold">My Life Manager</span></div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1><p className="mb-8 mt-2 text-muted">Sign in to see your accounts, income and expenses.</p>
          <LoginForm /><p className="mt-6 text-center text-xs text-muted">We only use your Google name, email and photo to identify your account.</p></div>
      </section>
    </main>
  );
}
