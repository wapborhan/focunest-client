import { Sparkles } from "lucide-react";
export default function ComingNext({ phase, note }) {
  return (<div className="card animate-fade-up max-w-xl p-8 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand"><Sparkles aria-hidden /></span>
    <p className="mt-4 font-semibold">Coming in {phase}</p><p className="mt-1 text-muted">{note}</p></div>);
}
