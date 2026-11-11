"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { THEME_KEY } from "@/lib/theme-script";

const Ctx = createContext({ theme: "system", resolved: "light", setTheme: () => {}, mounted: false });
export const useTheme = () => useContext(Ctx);
const query = () => window.matchMedia("(prefers-color-scheme: dark)");
const resolve = (t) => (t === "dark" || (t === "system" && query().matches) ? "dark" : "light");
const paint = (r) => { const el = document.documentElement; el.classList.toggle("dark", r === "dark"); el.style.colorScheme = r; };

/** "system" follows the device and is the default. "light" and "dark" are remembered in this browser. */
export default function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("system"); const [resolved, setResolved] = useState("light"); const [mounted, setMounted] = useState(false);
  useEffect(() => {   // read the saved choice once, after the first paint
    let t = "system"; try { const s = localStorage.getItem(THEME_KEY); if (s === "light" || s === "dark") t = s; } catch {}
    setThemeState(t); setMounted(true);
  }, []);
  useEffect(() => { if (!mounted) return; const r = resolve(theme); setResolved(r); paint(r); }, [theme, mounted]);
  useEffect(() => {   // while on "system", follow the device if it switches
    if (!mounted || theme !== "system") return; const mq = query();
    const on = () => { const r = mq.matches ? "dark" : "light"; setResolved(r); paint(r); };
    mq.addEventListener("change", on); return () => mq.removeEventListener("change", on);
  }, [theme, mounted]);
  useEffect(() => {   // keep other open tabs in step
    const on = (e) => { if (e.key === THEME_KEY) setThemeState(e.newValue === "dark" || e.newValue === "light" ? e.newValue : "system"); };
    addEventListener("storage", on); return () => removeEventListener("storage", on);
  }, []);
  const setTheme = useCallback((t) => { setThemeState(t); try { if (t === "system") localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, t); } catch {} }, []);
  const value = useMemo(() => ({ theme, resolved, setTheme, mounted }), [theme, resolved, setTheme, mounted]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
