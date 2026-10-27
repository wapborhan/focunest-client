import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { presetRange, weekStart } from "@/lib/dates";

let rs, acct, tx, cats, loans, tr, dash, rep, M;
const A = "user-a", B = "user-b", MAR = { from: "2026-03-01", to: "2026-03-31" };
const mk = (u, o = {}) => acct.createAccount(u, { type: "cash", name: "Wallet", openingBalanceMinor: 100000, openingDate: "2026-01-01", ...o });

beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = rs.getUri();
  await (await import("@/lib/db")).connectDB();
  acct = await import("@/lib/services/accounts"); tx = await import("@/lib/services/transactions"); cats = await import("@/lib/services/categories");
  loans = await import("@/lib/services/loans"); tr = await import("@/lib/services/transfers"); dash = await import("@/lib/services/dashboard"); rep = await import("@/lib/services/reports");
  M = Object.fromEntries(await Promise.all(["Account", "Operation", "LedgerEntry", "AuditLog", "Category", "Loan", "Repayment"].map(async (n) => [n, (await import(/* @vite-ignore */ `@/lib/models/${n}`)).default])));
});
afterAll(async () => { await mongoose.disconnect(); await rs.stop(); });
beforeEach(async () => { await Promise.all(Object.values(M).map((m) => m.deleteMany({}))); });

describe("dashboard accounting", () => {
  it("never double-counts transfers, loans or repayments, and keeps net worth consistent", async () => {
    const a = await mk(A), b = await mk(A, { name: "bKash", type: "mobile", provider: "bKash", openingBalanceMinor: 0 });
    const inc = (await cats.listCategories(A, "income"))[0], exp = (await cats.listCategories(A, "expense"))[0];
    const get = () => dash.getDashboard(A, MAR);
    expect((await get()).netWorthMinor).toBe(100000);

    await tx.createTransaction(A, { kind: "income", amountMinor: 50000, title: "Pay", categoryId: inc.id, accountId: a.id, date: "2026-03-05" });
    let d = await get(); expect([d.totals.incomeMinor, d.netWorthMinor]).toEqual([50000, 150000]);

    await tx.createTransaction(A, { kind: "expense", amountMinor: 20000, title: "Rent", categoryId: exp.id, accountId: a.id, date: "2026-03-06" });
    d = await get(); expect([d.totals.expenseMinor, d.netWorthMinor]).toEqual([20000, 130000]);

    await tr.createTransfer(A, { fromAccountId: a.id, toAccountId: b.id, amountMinor: 30000, date: "2026-03-07" });
    d = await get(); expect(d.netWorthMinor).toBe(130000); expect([d.totals.incomeMinor, d.totals.expenseMinor]).toEqual([50000, 20000]);
    expect([d.balances.cashMinor, d.balances.mobileMinor]).toEqual([100000, 30000]);

    const lent = await loans.createLoan(A, { direction: "lent", counterparty: "Rahim", principalMinor: 40000, accountId: a.id, date: "2026-03-08" });
    const borrowed = await loans.createLoan(A, { direction: "borrowed", counterparty: "Karim", principalMinor: 10000, accountId: b.id, date: "2026-03-08" });
    d = await get();
    expect(d.netWorthMinor).toBe(130000); expect([d.totals.incomeMinor, d.totals.expenseMinor]).toEqual([50000, 20000]);
    expect(d.loans).toMatchObject({ lentOutstandingMinor: 40000, borrowedOutstandingMinor: 10000 });
    expect(d.balances.availableMinor).toBe(100000);

    await loans.addRepayment(A, lent.id, { amountMinor: 15000, accountId: a.id, date: "2026-03-09" });
    await loans.addRepayment(A, borrowed.id, { amountMinor: 10000, accountId: b.id, date: "2026-03-09" });
    d = await get();
    expect(d.netWorthMinor).toBe(130000); expect([d.totals.incomeMinor, d.totals.expenseMinor]).toEqual([50000, 20000]);
    expect(d.loans).toMatchObject({ lentOutstandingMinor: 25000, borrowedOutstandingMinor: 0 });
    expect(d.balances.availableMinor).toBe(105000);   // 130,000 - 25,000 still lent out
  });
  it("net worth ignores archived accounts only when they are empty", async () => {
    const a = await mk(A), z = await mk(A, { name: "Old", openingBalanceMinor: 0 });
    await acct.updateAccount(A, z.id, { status: "archived" });
    expect((await rep.accountBalances(A)).netWorthMinor).toBe(100000);
    expect((await rep.accountBalances(A)).accounts.map((x) => x.id)).toEqual([a.id]);
  });
  it("fills empty days with zeros and groups by Dhaka day", async () => {
    const a = await mk(A); const inc = (await cats.listCategories(A, "income"))[0];
    await tx.createTransaction(A, { kind: "income", amountMinor: 1000, title: "x", categoryId: inc.id, accountId: a.id, date: "2026-03-10" });
    const r = await rep.cashFlow(A, MAR);
    expect(r.group).toBe("day"); expect(r.series).toHaveLength(31);
    expect(r.series[9]).toEqual({ period: "2026-03-10", incomeMinor: 1000, expenseMinor: 0, netMinor: 1000 });
    expect(r.series.filter((s) => s.incomeMinor).length).toBe(1);
    const y = await rep.cashFlow(A, { from: "2026-01-01", to: "2026-12-31" });
    expect(y.group).toBe("month"); expect(y.series).toHaveLength(12); expect(y.series[2].incomeMinor).toBe(1000);
  });
  it("rejects invalid ranges", async () => {
    await expect(rep.cashFlow(A, { from: "2026-03-10", to: "2026-03-01" })).rejects.toMatchObject({ status: 400 });
    await expect(rep.cashFlow(A, { from: "2010-01-01", to: "2026-03-01" })).rejects.toMatchObject({ status: 400 });
    await expect(rep.cashFlow(A, { from: "2025-01-01", to: "2026-03-01", group: "day" })).rejects.toMatchObject({ status: 400 });
  });
  it("lists recent activity, upcoming dues, and isolates users", async () => {
    const a = await mk(A);
    await loans.createLoan(A, { direction: "lent", counterparty: "Late", principalMinor: 1000, accountId: a.id, date: "2026-03-08", dueDate: "2026-03-20" });
    await loans.createLoan(A, { direction: "lent", counterparty: "Far", principalMinor: 1000, accountId: a.id, date: "2026-03-08", dueDate: "2099-01-01" });
    const d = await dash.getDashboard(A, MAR);
    expect(d.upcoming.map((l) => l.counterparty)).toEqual(["Late"]); expect(d.upcoming[0].overdue).toBe(true);
    expect(d.recent[0]).toMatchObject({ kind: "loan_out", flow: "out" }); expect(d.monthly).toHaveLength(12);
    const other = await dash.getDashboard(B, MAR);
    expect(other).toMatchObject({ netWorthMinor: 0, recent: [], upcoming: [], accounts: [] });
  });
});
describe("date presets", () => {
  it("computes whole-period boundaries (week starts Saturday)", () => {
    expect(weekStart("2026-03-11")).toBe("2026-03-07");          // Wednesday -> Saturday
    expect(presetRange("week", "2026-03-11")).toEqual({ from: "2026-03-07", to: "2026-03-13" });
    expect(presetRange("month", "2026-02-10")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(presetRange("year", "2026-03-11")).toEqual({ from: "2026-01-01", to: "2026-12-31" });
    expect(presetRange("today", "2026-03-11")).toEqual({ from: "2026-03-11", to: "2026-03-11" });
  });
});
