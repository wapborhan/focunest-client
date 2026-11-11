// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeProvider, { useTheme } from "@/components/ThemeProvider";
import ThemeSwitcher, { ThemeChoice } from "@/components/ThemeSwitcher";
import { THEME_SCRIPT, THEME_KEY } from "@/lib/theme-script";
import { chartColors } from "@/lib/chart-colors";

let osDark = false, listeners = [];
const mockOS = (dark) => { osDark = dark; listeners = [];
  window.matchMedia = vi.fn((q) => ({ get matches() { return osDark; }, media: q, addEventListener: (_, f) => listeners.push(f), removeEventListener: (_, f) => { listeners = listeners.filter((x) => x !== f); } })); };
const root = document.documentElement;
beforeEach(() => { localStorage.clear(); root.className = ""; root.style.colorScheme = ""; mockOS(false); });
afterEach(cleanup);
const runScript = () => new Function(THEME_SCRIPT)();

describe("no-flash script in <head>", () => {
  it("follows the device when nothing is saved", () => { mockOS(true); runScript(); expect(root.classList.contains("dark")).toBe(true); expect(root.style.colorScheme).toBe("dark"); root.className = ""; mockOS(false); runScript(); expect(root.classList.contains("dark")).toBe(false); expect(root.style.colorScheme).toBe("light"); });
  it("a saved choice beats the device in both directions", () => {
    mockOS(true); localStorage.setItem(THEME_KEY, "light"); runScript(); expect(root.classList.contains("dark")).toBe(false);
    mockOS(false); localStorage.setItem(THEME_KEY, "dark"); runScript(); expect(root.classList.contains("dark")).toBe(true);
  });
  it("ignores junk in storage and never throws if storage or matchMedia is unavailable", () => {
    mockOS(true); localStorage.setItem(THEME_KEY, "purple"); runScript(); expect(root.classList.contains("dark")).toBe(true);
    window.matchMedia = undefined; expect(() => runScript()).not.toThrow();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); }); expect(() => runScript()).not.toThrow(); vi.restoreAllMocks();
  });
});

const Probe = () => { const { theme, resolved } = useTheme(); return <p data-testid="state">{theme}/{resolved}</p>; };
const app = () => render(<ThemeProvider><ThemeSwitcher /><ThemeChoice /><Probe /></ThemeProvider>);
const state = () => screen.getByTestId("state").textContent;
const menuItem = (name) => screen.getByRole("menuitemradio", { name });

describe("theme provider and switcher", () => {
  it("starts on System and follows a light device", async () => {
    app(); await act(async () => {}); expect(state()).toBe("system/light"); expect(root.classList.contains("dark")).toBe(false);
  });
  it("offers Light, Dark and System, with the current one checked", async () => {
    app(); await act(async () => {}); const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "Theme" }));
    expect(screen.getAllByRole("menuitemradio").map((m) => m.textContent)).toEqual(["Light", "Dark", "System"]);
    expect(menuItem("System").getAttribute("aria-checked")).toBe("true"); expect(menuItem("Dark").getAttribute("aria-checked")).toBe("false");
  });
  it("choosing Dark turns dark mode on, remembers it, and closes the menu", async () => {
    app(); await act(async () => {}); const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "Theme" })); await u.click(menuItem("Dark"));
    expect(state()).toBe("dark/dark"); expect(root.classList.contains("dark")).toBe(true); expect(root.style.colorScheme).toBe("dark"); expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(screen.queryByRole("menu")).toBeNull();
    await u.click(screen.getByRole("button", { name: "Theme" })); expect(menuItem("Dark").getAttribute("aria-checked")).toBe("true");
  });
  it("choosing Light overrides a dark device", async () => {
    mockOS(true); app(); await act(async () => {}); expect(root.classList.contains("dark")).toBe(true);
    const u = userEvent.setup(); await u.click(screen.getByRole("button", { name: "Theme" })); await u.click(menuItem("Light"));
    expect(state()).toBe("light/light"); expect(root.classList.contains("dark")).toBe(false); expect(localStorage.getItem(THEME_KEY)).toBe("light");
  });
  it("System forgets the saved choice and then follows the device live", async () => {
    localStorage.setItem(THEME_KEY, "light"); mockOS(true); app(); await act(async () => {}); expect(state()).toBe("light/light");
    const u = userEvent.setup(); await u.click(screen.getByRole("button", { name: "Theme" })); await u.click(menuItem("System"));
    expect(localStorage.getItem(THEME_KEY)).toBeNull(); expect(state()).toBe("system/dark"); expect(root.classList.contains("dark")).toBe(true);
    osDark = false; await act(async () => listeners.forEach((f) => f())); expect(state()).toBe("system/light"); expect(root.classList.contains("dark")).toBe(false);
  });
  it("restores a saved choice on load", async () => { localStorage.setItem(THEME_KEY, "dark"); app(); await act(async () => {}); expect(state()).toBe("dark/dark"); expect(root.classList.contains("dark")).toBe(true); });
  it("follows a change made in another tab", async () => {
    app(); await act(async () => {}); expect(state()).toBe("system/light");
    await act(async () => { window.dispatchEvent(new StorageEvent("storage", { key: THEME_KEY, newValue: "dark" })); }); expect(state()).toBe("dark/dark");
    await act(async () => { window.dispatchEvent(new StorageEvent("storage", { key: THEME_KEY, newValue: null })); }); expect(state()).toBe("system/light");
  });
  it("the Settings choice is a radio group that stays in step with the menu", async () => {
    app(); await act(async () => {}); const u = userEvent.setup(); const group = screen.getByRole("radiogroup", { name: "Theme" });
    expect(screen.getAllByRole("radio").map((r) => r.textContent)).toEqual(["Light", "Dark", "System"]);
    await u.click(screen.getByRole("radio", { name: "Dark" })); expect(state()).toBe("dark/dark"); expect(group.querySelector('[aria-checked="true"]').textContent).toBe("Dark");
  });
});
describe("chart colours", () => {
  it("have a light and a dark palette with the same keys, and they differ", () => {
    const [l, d] = [chartColors(false), chartColors(true)]; expect(Object.keys(d)).toEqual(Object.keys(l));
    for (const k of ["income", "expense", "grid", "axis", "ref", "cursor"]) expect(d[k]).not.toBe(l[k]);
    expect(d.tip.background).not.toBe(l.tip.background);
  });
});
