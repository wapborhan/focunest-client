import { describe, it, expect, vi } from "vitest";
import { ZodError, z } from "zod";
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));   // no session cookie

const ROUTES = {
  "accounts": () => import("@/app/api/accounts/route"), "accounts/[id]": () => import("@/app/api/accounts/[id]/route"),
  "categories": () => import("@/app/api/categories/route"), "dashboard": () => import("@/app/api/dashboard/route"),
  "loans": () => import("@/app/api/loans/route"), "loans/[id]": () => import("@/app/api/loans/[id]/route"),
  "loans/[id]/repayments": () => import("@/app/api/loans/[id]/repayments/route"),
  "reports/account-balances": () => import("@/app/api/reports/account-balances/route"), "reports/cash-flow": () => import("@/app/api/reports/cash-flow/route"),
  "transactions": () => import("@/app/api/transactions/route"), "transactions/[id]": () => import("@/app/api/transactions/[id]/route"),
  "transactions/export": () => import("@/app/api/transactions/export/route"), "transactions/totals": () => import("@/app/api/transactions/totals/route"),
  "transfers": () => import("@/app/api/transfers/route"), "transfers/[id]": () => import("@/app/api/transfers/[id]/route"),
};
describe("unauthorized API access", () => {
  for (const [name, load] of Object.entries(ROUTES)) {
    it(`${name} returns 401 for every method without a session`, async () => {
      const mod = await load(); const methods = ["GET", "POST", "PATCH", "DELETE"].filter((m) => mod[m]);
      expect(methods.length).toBeGreaterThan(0);
      for (const m of methods) {
        const res = await mod[m](new Request(`http://localhost/api/${name}`, { method: m, ...(m === "POST" || m === "PATCH" ? { body: "{}", headers: { "Content-Type": "application/json" } } : {}) }), { params: Promise.resolve({ id: "x" }) });
        expect(res.status, `${m} /api/${name}`).toBe(401);
        expect((await res.json()).error.code).toBe("unauthorized");
      }
    });
  }
});
describe("route wrapper error handling", () => {
  it("maps validation, domain, duplicate and unexpected errors without leaking internals", async () => {
    vi.resetModules();
    vi.doMock("@/lib/auth", () => ({ requireUser: async () => ({ uid: "u1" }) }));
    const { route } = await import("@/lib/api"); const { ApiError } = await import("@/lib/errors");
    const call = (fn) => route(fn)(new Request("http://localhost/x"), {});
    const zerr = (() => { try { z.object({ a: z.string() }).parse({}); } catch (e) { return e; } })();
    expect(zerr).toBeInstanceOf(ZodError);
    let r = await call(() => { throw zerr; }); expect(r.status).toBe(400); expect((await r.json()).error.details.a).toBeDefined();
    r = await call(() => { throw new ApiError(409, "conflict", "Nope"); }); expect([r.status, (await r.json()).error.message]).toEqual([409, "Nope"]);
    r = await call(() => { throw Object.assign(new Error("dup"), { code: 11000 }); }); expect(r.status).toBe(409);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    r = await call(() => { throw new Error("mongodb://user:secret@host failed"); });
    const body = await r.text(); expect(r.status).toBe(500); expect(body).not.toContain("secret"); expect(body).not.toContain("mongodb"); spy.mockRestore();
    r = await call(() => ({ ok: true })); expect(r.status).toBe(200);
  });
});
