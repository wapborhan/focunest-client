import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
let rs, acct, tx, cats, loans, tr, dash, ov, M;
const A = "user-a", B = "user-b", WIDE = { from: "2019-01-01", to: "2026-12-31" }, MARCH = { from: "2026-03-01", to: "2026-03-31" };
const cash = (u, name, opening = 0) => acct.createAccount(u, { type: "cash", name, openingBalanceMinor: opening, openingDate: "2019-01-01" });

beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = rs.getUri();
  await (await import("@/lib/db")).connectDB();
  acct = await import("@/lib/services/accounts"); tx = await import("@/lib/services/transactions"); cats = await import("@/lib/services/categories");
  loans = await import("@/lib/services/loans"); tr = await import("@/lib/services/transfers"); dash = await import("@/lib/services/dashboard"); ov = await import("@/lib/services/overview");
  M = Object.fromEntries(await Promise.all(["Account", "Operation", "LedgerEntry", "AuditLog", "Category", "Loan", "Repayment"].map(async (n) => [n, (await import(/* @vite-ignore */ `@/lib/models/${n}`)).default])));
});
afterAll(async () => { await mongoose.disconnect(); await rs.stop(); });
beforeEach(async () => { await Promise.all(Object.values(M).map((m) => m.deleteMany({}))); });

describe("main dashboard overview", () => {
  it("is all zeros for a new user, and echoes the period", async () => {
    expect(await ov.getOverview(A, WIDE)).toEqual({ range: WIDE, totals: { incomeMinor: 0, expenseMinor: 0 }, balances: { availableMinor: 0 }, loans: { lentOutstandingMinor: 0, borrowedOutstandingMinor: 0, overdueCount: 0 } });
  });
  it("defaults to the current month when no period is given", async () => {
    const o = await ov.getOverview(A); expect(o.range.from.endsWith("-01")).toBe(true); expect(o.range.to >= o.range.from).toBe(true);
  });
  it("counts income and expenses in the period only, with both end dates included", async () => {
    const a = await cash(A, "Wallet", 100000); const inc = (await cats.listCategories(A, "income"))[0], exp = (await cats.listCategories(A, "expense"))[0];
    const income = (amountMinor, date) => tx.createTransaction(A, { kind: "income", amountMinor, title: "Pay", categoryId: inc.id, accountId: a.id, date });
    const expense = (amountMinor, date) => tx.createTransaction(A, { kind: "expense", amountMinor, title: "Spend", categoryId: exp.id, accountId: a.id, date });
    await income(1000, "2026-02-28"); await income(30000, "2026-03-01"); await income(5000, "2026-03-31"); await income(7000, "2026-04-01"); await expense(4000, "2026-03-20"); await expense(900, "2026-04-10");
    expect((await ov.getOverview(A, MARCH)).totals).toEqual({ incomeMinor: 35000, expenseMinor: 4000 });                       // the 1st and 31st count; 28 Feb and 1 Apr do not
    expect((await ov.getOverview(A, { from: "2026-04-01", to: "2026-04-30" })).totals).toEqual({ incomeMinor: 7000, expenseMinor: 900 });
    expect((await ov.getOverview(A, { from: "2026-03-15", to: "2026-03-15" })).totals).toEqual({ incomeMinor: 0, expenseMinor: 0 });   // a one-day period
    expect((await ov.getOverview(A, WIDE)).totals).toEqual({ incomeMinor: 43000, expenseMinor: 4900 });
    const [m, ap] = [await ov.getOverview(A, MARCH), await ov.getOverview(A, { from: "2026-04-01", to: "2026-04-30" })];
    expect(m.balances).toEqual(ap.balances);                                                                                   // balance is as of now, whatever the period
  });
  it("ignores transfers, loans, repayments and deleted entries, and reports balance, lent and borrowed as of now", async () => {
    const a = await cash(A, "Wallet", 100000), b = await cash(A, "Drawer");
    const inc = (await cats.listCategories(A, "income"))[0], exp = (await cats.listCategories(A, "expense"))[0];
    const income = (amountMinor, date) => tx.createTransaction(A, { kind: "income", amountMinor, title: "Pay", categoryId: inc.id, accountId: a.id, date });
    await income(50000, "2020-05-01"); const gone = await income(30000, "2026-03-05");
    await tx.createTransaction(A, { kind: "expense", amountMinor: 20000, title: "Rent", categoryId: exp.id, accountId: a.id, date: "2026-03-06" });
    await tr.createTransfer(A, { fromAccountId: a.id, toAccountId: b.id, amountMinor: 10000, date: "2026-03-07" });
    const lent = await loans.createLoan(A, { direction: "lent", counterparty: "Rahim", principalMinor: 40000, accountId: a.id, date: "2026-03-08" });
    await loans.createLoan(A, { direction: "borrowed", counterparty: "Karim", principalMinor: 10000, accountId: b.id, date: "2026-03-08" });
    await loans.addRepayment(A, lent.id, { amountMinor: 15000, accountId: a.id, date: "2026-03-09" });
    await tx.deleteTransaction(A, gone.id);
    const o = await ov.getOverview(A, WIDE);
    expect(o.totals).toEqual({ incomeMinor: 50000, expenseMinor: 20000 });
    expect(o.loans).toMatchObject({ lentOutstandingMinor: 25000, borrowedOutstandingMinor: 10000 });
    expect(o.balances.availableMinor).toBe(115000);
  });
  it("agrees with the cash dashboard for the same period", async () => {
    const a = await cash(A, "Wallet", 80000); const inc = (await cats.listCategories(A, "income"))[0];
    await tx.createTransaction(A, { kind: "income", amountMinor: 12345, title: "x", categoryId: inc.id, accountId: a.id, date: "2026-02-10" });
    await loans.createLoan(A, { direction: "lent", counterparty: "R", principalMinor: 5000, accountId: a.id, date: "2026-02-11" });
    const range = { from: "2026-01-01", to: "2026-12-31" }; const [o, d] = [await ov.getOverview(A, range), await dash.getDashboard(A, range)];
    expect(o.totals).toEqual({ incomeMinor: d.totals.incomeMinor, expenseMinor: d.totals.expenseMinor }); expect(o.balances.availableMinor).toBe(d.balances.availableMinor); expect(o.loans).toEqual(d.loans);
  });
  it("rejects a backwards or over-long period", async () => {
    await expect(ov.getOverview(A, { from: "2026-03-10", to: "2026-03-01" })).rejects.toMatchObject({ status: 400 });
    await expect(ov.getOverview(A, { from: "2010-01-01", to: "2026-03-01" })).rejects.toMatchObject({ status: 400 });
  });
  it("only counts the signed-in user's data", async () => {
    const a = await cash(A, "Wallet", 5000); await cash(B, "Other", 999999); const inc = (await cats.listCategories(A, "income"))[0];
    await tx.createTransaction(A, { kind: "income", amountMinor: 700, title: "x", categoryId: inc.id, accountId: a.id, date: "2026-02-10" });
    expect(await ov.getOverview(A, WIDE)).toMatchObject({ totals: { incomeMinor: 700 }, balances: { availableMinor: 5700 } });
  });
});
