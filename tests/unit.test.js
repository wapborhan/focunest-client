import { describe, it, expect } from "vitest";
import { NAV, hasActive, trail } from "@/lib/nav";
import { toMinor, formatBDT } from "@/lib/money";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("navigation config", () => {
  it("has no nested Account Management submenu: accounts is one page with tabs", () => {
    const cash = NAV.find((i) => i.id === "cash");
    expect(cash.children.map((c) => c.en)).toEqual(["Dashboard", "Income", "Expenses", "Lending", "Borrowing", "Accounts", "Transfers", "Settings"]);
    expect(cash.children.every((c) => !c.children && c.href)).toBe(true);
  });
  it("finds the breadcrumb trail for pages and detail routes", () => {
    expect(trail(NAV, "/cash/accounts").map((i) => i.en)).toEqual(["Cash Management", "Accounts"]);
    expect(trail(NAV, "/cash/accounts/64b0c0ffee").map((i) => i.id)).toEqual(["cash", "accounts"]);
    expect(trail(NAV, "/cash/lending/64b0c0ffee").map((i) => i.id)).toEqual(["cash", "lending"]);      // lending and borrowing are separate pages
    expect(trail(NAV, "/cash/borrowing/64b0c0ffee").map((i) => i.id)).toEqual(["cash", "borrowing"]);
    expect(trail(NAV, "/dashboard").map((i) => i.id)).toEqual(["dashboard"]);                       // main dashboard: five totals
    expect(trail(NAV, "/cash/dashboard").map((i) => i.id)).toEqual(["cash", "cash-dashboard"]);   // detailed cash dashboard
    expect(trail(NAV, "/nowhere")).toEqual([]);
  });
  it("marks only the matching branch active", () => {
    const cash = NAV.find((i) => i.id === "cash");
    expect(hasActive(cash, "/cash/income")).toBe(true);
    expect(hasActive(cash, "/ibadat")).toBe(false);
    expect(hasActive(NAV.find((i) => i.id === "dashboard"), "/dashboard-other")).toBe(false);
    expect(hasActive(NAV.find((i) => i.id === "dashboard"), "/cash/dashboard")).toBe(false);      // the two dashboards never highlight together
    expect(hasActive(cash, "/cash/dashboard")).toBe(true);
    const lending = cash.children.find((c) => c.id === "lending"); expect(hasActive(lending, "/cash/lending")).toBe(true); expect(hasActive(lending, "/cash/borrowing")).toBe(false);
  });
});
describe("money", () => {
  it("converts to whole poisha without float drift and formats BDT", () => {
    expect(toMinor(19.99)).toBe(1999); expect(toMinor(0.1 + 0.2)).toBe(30);
    expect(() => toMinor(NaN)).toThrow(); expect(() => toMinor(Infinity)).toThrow();
    expect(formatBDT(123450)).toMatch(/1,234\.50/);
  });
});
describe("route protection", () => {
  const prot = ["/dashboard", "/cash/dashboard", "/cash/income", "/cash/accounts/abc", "/ibadat", "/tasks", "/settings"];
  it.each(prot)("redirects %s to /login without a session cookie", (p) => {
    const res = middleware(new NextRequest(`http://localhost${p}`));
    expect(res.status).toBe(307); expect(new URL(res.headers.get("location")).pathname).toBe("/login");
  });
  it("lets a request with a session cookie continue to the server-side check", () => {
    const res = middleware(new NextRequest("http://localhost/dashboard", { headers: { cookie: "__session=abc" } }));
    expect(res.headers.get("location")).toBeNull();
  });
});
