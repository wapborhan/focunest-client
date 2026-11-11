import { describe, it, expect } from "vitest";
import fs from "node:fs"; import path from "node:path";
/** Every colour must be a theme token. This fails if someone adds a light-only colour class that would look wrong in dark mode. */
const BANNED = [
  [/(?<![\w-])bg-white(?!\/(?:10|25)(?!\d))/, "bg-white (use bg-surface)", ["Sidebar.jsx"]],      // the sidebar's active pill is white in both themes
  [/(?:bg|text|border|ring|divide)-slate-\d/, "slate-* (use surface-2/3, line, line-strong, muted)", []],
  [/text-red-\d/, "text-red-* (use text-danger)", []], [/bg-red-(?:50|100)(?!\d)/, "bg-red-50/100 (use bg-danger-soft)", []], [/border-red-\d/, "border-red-* (use border-danger)", []],
  [/(?<![\w-])text-brand(?![\w-])/, "text-brand (use text-primary)", []], [/text-brand-dark/, "text-brand-dark (use text-primary-strong)", ["Sidebar.jsx"]],
  [/bg-ink\/\d/, "bg-ink/* backdrops flip in dark mode (use bg-black/*)", []],
  [/["'`]#(?:0f766e|ef4444|e2e8e5|94a3a0)["'`]/i, "hard-coded chart colour (use lib/chart-colors.js)", ["Logo.jsx", "manifest.js", "layout.jsx"]],
];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
describe("theme guard", () => {
  it("no component uses a fixed light-only colour", () => {
    const hits = [];
    for (const f of [...walk("app"), ...walk("components")].filter((f) => /\.jsx?$/.test(f))) {
      fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => { for (const [re, why, allow] of BANNED) if (re.test(line) && !allow.includes(path.basename(f))) hits.push(`${f}:${i + 1} ${why}`); });
    }
    expect(hits).toEqual([]);
  });
  it("the stylesheet defines every token in both themes", () => {
    const css = fs.readFileSync("app/globals.css", "utf8"); const dark = css.slice(css.indexOf(".dark {"), css.indexOf("}", css.indexOf(".dark {")));
    for (const t of ["--color-paper", "--color-ink", "--color-muted", "--color-line", "--color-line-strong", "--color-surface", "--color-surface-2", "--color-surface-3", "--color-brand-soft", "--color-primary", "--color-primary-strong", "--color-danger", "--color-danger-soft"]) {
      expect(css.includes(`${t}:`), `${t} in light`).toBe(true); expect(dark.includes(`${t}:`), `${t} in dark`).toBe(true);
    }
    expect(dark).toContain("color-scheme: dark");
  });
});
