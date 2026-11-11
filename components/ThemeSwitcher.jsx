"use client";
import { useState } from "react";
import { Check, Monitor, Moon, Sun, SunMoon } from "lucide-react";
import Popover from "./ui/Popover";
import { useTheme } from "./ThemeProvider";
export const THEMES = [["light", "Light", Sun], ["dark", "Dark", Moon], ["system", "System", Monitor]];

/** Icon button in the top bar. Opens a small menu: Light, Dark or System. */
export default function ThemeSwitcher() {
  const { theme, resolved, setTheme, mounted } = useTheme(); const [open, setOpen] = useState(false);
  const Icon = !mounted ? SunMoon : resolved === "dark" ? Moon : Sun;   // neutral icon until the saved choice is known
  return (
    <Popover open={open} onOpenChange={setOpen} placement="bottom-end" className="w-44 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-xl"
      trigger={(p) => (<button type="button" {...p} aria-label="Theme" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="icon-btn !p-2.5"><Icon size={18} aria-hidden /></button>)}>
      <div role="menu" aria-label="Theme">{THEMES.map(([k, label, I]) => {
        const on = mounted && theme === k;
        return (<button key={k} type="button" role="menuitemradio" aria-checked={on} onClick={() => { setTheme(k); setOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-brand-soft">
          <I size={16} aria-hidden className="text-primary" /><span className="flex-1">{label}</span>{on && <Check size={14} aria-hidden className="text-primary" />}</button>);
      })}</div>
    </Popover>
  );
}
/** Three big choices, used on the Settings page. */
export function ThemeChoice() {
  const { theme, setTheme, mounted } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-3">{THEMES.map(([k, label, I]) => {
      const on = mounted && theme === k;
      return (<button key={k} type="button" role="radio" aria-checked={on} onClick={() => setTheme(k)}
        className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-medium transition ${on ? "border-brand bg-brand-soft text-primary-strong" : "border-line bg-surface hover:border-line-strong"}`}><I size={20} aria-hidden />{label}</button>);
    })}</div>
  );
}
