import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { setBudgetSchema, stopBudgetQuery, budgetQuery } from "@/lib/schemas/budget";
import { currentMonth, shiftMonth, daysInMonth, fmtMonth } from "@/lib/dates";

let rs, acct, tx, cats, loans, tr, bud, M;
const A = "user-a", B = "user-b";
const line = (s, name) => s.lines.find((l) => l.nameEn === name);

beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = rs.getUri();
  await (await import("@/lib/db")).connectDB();
  acct = await import("@/lib/services/accounts"); tx = await import("@/lib/services/transactions"); cats = await import("@/lib/services/categories");
  loans = await import("@/lib/services/loans"); tr = await import("@/lib/services/transfers"); bud = await import("@/lib/services/budgets");
  M = Object.fromEntries(await Promise.all(["Account", "Operation", "LedgerEntry", "AuditLog", "Category", "Loan", "Repayment", "Budget"].map(async (n) => [n, (await import(/* @vite-ignore */ `@/lib/models/${n}`)).default])));
});
afterAll(async () => { await mongoose.disconnect(); await rs.stop(); });
beforeEach(async () => { await Promise.all(Object.values(M).map((m) => m.deleteMany({}))); });

async function setup(u = A) {
  const account = await acct.createAccount(u, { type: "cash", name: "Wallet", openingBalanceMinor: 100000000, openingDate: "2025-01-01" });
  const expense = await cats.listCategories(u, "expense"), income = await cats.listCategories(u, "income");
  const id = (n) => expense.find((c) => c.nameEn === n).id;
  const spend = (name, amountMinor, date) => tx.createTransaction(u, { kind: "expense", amountMinor, title: name, categoryId: id(name), accountId: account.id, date });
  return { account, id, spend, income: income[0], expense };
}

describe("budget status", () => {
  it("with no budgets, lists every active expense category with its spending and no limit", async () => {
    const { spend } = await setup(); await spend("Food", 2500, "2026-03-10");
    const s = await bud.getBudgetStatus(A, "2026-03");
    expect(s.lines).toHaveLength(10); expect(s.overall).toBeNull(); expect(s.totalSpentMinor).toBe(2500);
    expect(line(s, "Food")).toMatchObject({ budgetMinor: null, spentMinor: 2500, status: "none", remainingMinor: null, percent: null });
    expect(s.lines[0].nameEn).toBe("Food");   // spending categories first
  });
  it("counts only expenses dated inside the month, with both end days included", async () => {
    const { spend, account, income, id } = await setup();
    await spend("Food", 1000, "2026-02-28"); await spend("Food", 2000, "2026-03-01"); await spend("Food", 4000, "2026-03-31"); await spend("Food", 8000, "2026-04-01");
    const s = await bud.getBudgetStatus(A, "2026-03"); expect(line(s, "Food").spentMinor).toBe(6000); expect(line(s, "Food").count).toBe(2);
    expect((await bud.getBudgetStatus(A, "2026-02")).totalSpentMinor).toBe(1000); expect((await bud.getBudgetStatus(A, "2026-04")).totalSpentMinor).toBe(8000);
    expect(id("Food")).toBeTruthy(); expect(account.id).toBeTruthy(); expect(income.id).toBeTruthy();
  });
  it("ignores income, transfers, loans, repayments and deleted expenses", async () => {
    const { spend, account, income } = await setup(); const other = await acct.createAccount(A, { type: "cash", name: "Drawer", openingBalanceMinor: 0, openingDate: "2025-01-01" });
    await spend("Food", 3000, "2026-03-05"); const gone = await spend("Food", 9000, "2026-03-06");
    await tx.createTransaction(A, { kind: "income", amountMinor: 50000, title: "Pay", categoryId: income.id, accountId: account.id, date: "2026-03-07" });
    await tr.createTransfer(A, { fromAccountId: account.id, toAccountId: other.id, amountMinor: 20000, date: "2026-03-08" });
    const l = await loans.createLoan(A, { direction: "lent", counterparty: "R", principalMinor: 15000, accountId: account.id, date: "2026-03-09" });
    await loans.addRepayment(A, l.id, { amountMinor: 5000, accountId: account.id, date: "2026-03-10" });
    await tx.deleteTransaction(A, gone.id);
    expect((await bud.getBudgetStatus(A, "2026-03")).totalSpentMinor).toBe(3000);
  });
  it("follows edits: moving an expense to another month or category moves it between budgets", async () => {
    const { spend, id } = await setup(); const t = await spend("Food", 5000, "2026-03-10");
    await tx.updateTransaction(A, t.id, { categoryId: id("Shopping") }); let s = await bud.getBudgetStatus(A, "2026-03");
    expect([line(s, "Food").spentMinor, line(s, "Shopping").spentMinor]).toEqual([0, 5000]);
    await tx.updateTransaction(A, t.id, { date: "2026-04-02" }); expect((await bud.getBudgetStatus(A, "2026-03")).totalSpentMinor).toBe(0); expect((await bud.getBudgetStatus(A, "2026-04")).totalSpentMinor).toBe(5000);
  });
  it("marks a line ok, warning or over: 80% and 100% are warnings, anything above 100% is over", async () => {
    const { spend, id } = await setup(); await bud.setBudget(A, { categoryId: id("Food"), month: "2026-03", amountMinor: 10000 });
    const at = async (n) => line(await bud.getBudgetStatus(A, "2026-03"), n);
    await spend("Food", 7999, "2026-03-02"); expect(await at("Food")).toMatchObject({ status: "ok", percent: 80, remainingMinor: 2001 });
    await spend("Food", 1, "2026-03-03"); expect((await at("Food")).status).toBe("warning");                         // exactly 80%
    await spend("Food", 2000, "2026-03-04"); expect(await at("Food")).toMatchObject({ status: "warning", remainingMinor: 0, percent: 100 });   // exactly 100%
    await spend("Food", 1, "2026-03-05"); expect(await at("Food")).toMatchObject({ status: "over", remainingMinor: -1 });
    expect((await bud.getBudgetStatus(A, "2026-03")).overCount).toBe(1);
  });
  it("shows percent with one decimal and orders budgeted lines by how much of the limit is used", async () => {
    const { spend, id } = await setup(); for (const [n, a] of [["Food", 30000], ["Shopping", 10000], ["Transportation", 20000]]) await bud.setBudget(A, { categoryId: id(n), month: "2026-03", amountMinor: a });
    await spend("Food", 10000, "2026-03-02"); await spend("Shopping", 9000, "2026-03-02"); await spend("Transportation", 3333, "2026-03-02");
    const s = await bud.getBudgetStatus(A, "2026-03"); expect(s.lines.slice(0, 3).map((l) => [l.nameEn, l.percent])).toEqual([["Shopping", 90], ["Food", 33.3], ["Transportation", 16.7]]);
  });
});
describe("budgets carry forward month by month", () => {
  it("applies from its month onward and not before", async () => {
    const { id } = await setup(); await bud.setBudget(A, { categoryId: id("Food"), month: "2026-03", amountMinor: 15000 });
    const at = async (m) => line(await bud.getBudgetStatus(A, m), "Food");
    expect((await at("2026-02")).budgetMinor).toBeNull(); expect(await at("2026-03")).toMatchObject({ budgetMinor: 15000, since: "2026-03" });
    expect(await at("2026-09")).toMatchObject({ budgetMinor: 15000, since: "2026-03" }); expect((await at("2030-01")).budgetMinor).toBe(15000);
  });
  it("changing the amount later keeps earlier months exactly as they were", async () => {
    const { id } = await setup(); const c = id("Food");
    await bud.setBudget(A, { categoryId: c, month: "2026-03", amountMinor: 15000 }); await bud.setBudget(A, { categoryId: c, month: "2026-06", amountMinor: 18000 });
    const at = async (m) => line(await bud.getBudgetStatus(A, m), "Food").budgetMinor;
    expect([await at("2026-03"), await at("2026-05"), await at("2026-06"), await at("2026-12")]).toEqual([15000, 15000, 18000, 18000]);
    await bud.setBudget(A, { categoryId: c, month: "2026-06", amountMinor: 20000 }); expect(await at("2026-06")).toBe(20000);   // same month again: updates in place
    expect(await M.Budget.countDocuments({ userId: A })).toBe(2);
  });
  it("one month can differ from the next: a later row wins from its month", async () => {
    const { id } = await setup(); const c = id("Food");
    await bud.setBudget(A, { categoryId: c, month: "2026-03", amountMinor: 10000 }); await bud.setBudget(A, { categoryId: c, month: "2026-04", amountMinor: 25000 }); await bud.setBudget(A, { categoryId: c, month: "2026-05", amountMinor: 10000 });
    const at = async (m) => line(await bud.getBudgetStatus(A, m), "Food").budgetMinor; expect([await at("2026-03"), await at("2026-04"), await at("2026-05")]).toEqual([10000, 25000, 10000]);
  });
  it("stopping ends it from that month, keeps earlier months, and removes later changes so it can't come back", async () => {
    const { id } = await setup(); const c = id("Food");
    await bud.setBudget(A, { categoryId: c, month: "2026-01", amountMinor: 10000 }); await bud.setBudget(A, { categoryId: c, month: "2026-04", amountMinor: 20000 });
    await bud.stopBudget(A, { categoryId: c, month: "2026-03" });
    const at = async (m) => line(await bud.getBudgetStatus(A, m), "Food").budgetMinor;
    expect([await at("2026-02"), await at("2026-03"), await at("2026-04"), await at("2026-12")]).toEqual([10000, null, null, null]);
  });
  it("stopping a budget that has no earlier version leaves nothing behind", async () => {
    const { id } = await setup(); const c = id("Food"); await bud.setBudget(A, { categoryId: c, month: "2026-03", amountMinor: 10000 });
    await bud.stopBudget(A, { categoryId: c, month: "2026-03" }); expect(await M.Budget.countDocuments({ userId: A })).toBe(0);
    await expect(bud.stopBudget(A, { categoryId: c, month: "2026-03" })).rejects.toMatchObject({ status: 404 });          // nothing to stop
    await expect(bud.stopBudget(A, { categoryId: c, month: "2026-01" })).rejects.toMatchObject({ status: 404 });
  });
  it("a stopped budget can be set again later", async () => {
    const { id } = await setup(); const c = id("Food"); await bud.setBudget(A, { categoryId: c, month: "2026-01", amountMinor: 10000 }); await bud.stopBudget(A, { categoryId: c, month: "2026-03" });
    await bud.setBudget(A, { categoryId: c, month: "2026-06", amountMinor: 12000 }); const at = async (m) => line(await bud.getBudgetStatus(A, m), "Food").budgetMinor;
    expect([await at("2026-02"), await at("2026-04"), await at("2026-06")]).toEqual([10000, null, 12000]);
  });
});
describe("overall budget", () => {
  it("without a total budget, compares the category budgets with spending in those categories", async () => {
    const { spend, id } = await setup(); await bud.setBudget(A, { categoryId: id("Food"), month: "2026-03", amountMinor: 20000 }); await bud.setBudget(A, { categoryId: id("Shopping"), month: "2026-03", amountMinor: 10000 });
    await spend("Food", 12000, "2026-03-02"); await spend("Charity", 7000, "2026-03-03");
    const s = await bud.getBudgetStatus(A, "2026-03");
    expect(s.overall).toMatchObject({ source: "categories", budgetMinor: 30000, spentMinor: 12000, remainingMinor: 18000, percent: 40, status: "ok" }); expect(s.unbudgetedSpentMinor).toBe(7000); expect(s.totalSpentMinor).toBe(19000);
  });
  it("with a total budget, compares it with all spending, budgeted or not", async () => {
    const { spend, id } = await setup(); await bud.setBudget(A, { categoryId: null, month: "2026-03", amountMinor: 20000 }); await bud.setBudget(A, { categoryId: id("Food"), month: "2026-03", amountMinor: 5000 });
    await spend("Food", 4000, "2026-03-02"); await spend("Charity", 17000, "2026-03-03");
    expect((await bud.getBudgetStatus(A, "2026-03")).overall).toMatchObject({ source: "total", budgetMinor: 20000, spentMinor: 21000, remainingMinor: -1000, status: "over", allocatedMinor: 5000 });
  });
  it("the total budget carries forward and can be stopped like any other", async () => {
    await setup(); await bud.setBudget(A, { categoryId: null, month: "2026-03", amountMinor: 50000 });
    expect((await bud.getBudgetStatus(A, "2026-08")).overall).toMatchObject({ source: "total", budgetMinor: 50000, since: "2026-03" });
    await bud.stopBudget(A, { categoryId: null, month: "2026-08" }); expect((await bud.getBudgetStatus(A, "2026-08")).overall).toBeNull(); expect((await bud.getBudgetStatus(A, "2026-07")).overall.budgetMinor).toBe(50000);
  });
  it("tracks pace: whole month elapsed in the past, none in the future, and a projection only for this month", async () => {
    const { spend, id } = await setup(); const cur = currentMonth(); await bud.setBudget(A, { categoryId: id("Food"), month: shiftMonth(cur, -2), amountMinor: 30000 }); await spend("Food", 6000, `${cur}-01`);
    const past = await bud.getBudgetStatus(A, shiftMonth(cur, -1)), future = await bud.getBudgetStatus(A, shiftMonth(cur, 1)), now = await bud.getBudgetStatus(A, cur);
    expect([past.elapsed, past.daysLeft, past.overall.projectedMinor]).toEqual([1, 0, null]); expect([future.elapsed, future.daysLeft, future.overall.projectedMinor]).toEqual([0, daysInMonth(shiftMonth(cur, 1)), null]);
    expect(now.elapsed).toBeGreaterThan(0); expect(now.elapsed).toBeLessThanOrEqual(1); expect(now.daysLeft).toBe(daysInMonth(cur) - Number(now.currentMonth === cur ? new Date().toISOString().slice(8, 10) : 0) + (Number(new Date().toISOString().slice(8, 10)) - Number(new Date(Date.now() + 6 * 3600e3).toISOString().slice(8, 10))));
    expect(now.overall.projectedMinor).toBe(Math.round(6000 / now.elapsed));
  });
});
describe("categories, validation and privacy", () => {
  it("shows an archived category only when it has a budget or spending that month", async () => {
    const { spend, id } = await setup(); await spend("Charity", 1000, "2026-03-02");
    for (const n of ["Charity", "Family"]) await cats.updateCategory(A, id(n), { archived: true });
    const names = (await bud.getBudgetStatus(A, "2026-03")).lines.map((l) => l.nameEn); expect(names).toContain("Charity"); expect(names).not.toContain("Family"); expect(names).toHaveLength(9);
  });
  it("rejects a bad month, an unknown category, an income category, and another user's category", async () => {
    const { id, income } = await setup(); await setup(B); const bCat = (await cats.listCategories(B, "expense"))[0].id;
    await expect(bud.getBudgetStatus(A, "2026-13")).rejects.toMatchObject({ status: 400 }); await expect(bud.setBudget(A, { categoryId: id("Food"), month: "March", amountMinor: 1 })).rejects.toMatchObject({ status: 400 });
    await expect(bud.setBudget(A, { categoryId: "nope", month: "2026-03", amountMinor: 1 })).rejects.toMatchObject({ status: 404 });
    await expect(bud.setBudget(A, { categoryId: income.id, month: "2026-03", amountMinor: 100 })).rejects.toMatchObject({ status: 400 });
    await expect(bud.setBudget(A, { categoryId: bCat, month: "2026-03", amountMinor: 100 })).rejects.toMatchObject({ status: 400 });
  });
  it("validates the request shapes", () => {
    const ok = { categoryId: "64b0c0ffee64b0c0ffee64b0", month: "2026-03", amountMinor: 1000 };
    expect(setBudgetSchema.parse(ok)).toEqual(ok); expect(setBudgetSchema.parse({ ...ok, categoryId: null }).categoryId).toBeNull();
    for (const bad of [{ ...ok, amountMinor: 0 }, { ...ok, amountMinor: -5 }, { ...ok, amountMinor: 1.5 }, { ...ok, amountMinor: 1e14 }, { ...ok, month: "2026-3" }, { ...ok, month: "1999-12" }, { ...ok, categoryId: "x" }, { ...ok, extra: 1 }]) expect(() => setBudgetSchema.parse(bad)).toThrow();
    expect(stopBudgetQuery.parse({ month: "2026-03" })).toEqual({ month: "2026-03" }); expect(budgetQuery.parse({})).toEqual({}); expect(() => budgetQuery.parse({ month: "2026-00" })).toThrow();
  });
  it("keeps users apart", async () => {
    const a = await setup(); await setup(B); await bud.setBudget(A, { categoryId: a.id("Food"), month: "2026-03", amountMinor: 9000 }); await a.spend("Food", 1000, "2026-03-02");
    const b = await bud.getBudgetStatus(B, "2026-03"); expect(b.overall).toBeNull(); expect(b.totalSpentMinor).toBe(0); expect(b.lines.every((l) => l.budgetMinor === null)).toBe(true);
    await expect(bud.stopBudget(B, { categoryId: a.id("Food"), month: "2026-03" })).rejects.toMatchObject({ status: 404 });
  });
  it("writes an audit trail for setting and stopping", async () => {
    const { id } = await setup(); await bud.setBudget(A, { categoryId: id("Food"), month: "2026-03", amountMinor: 9000 }); await bud.setBudget(A, { categoryId: id("Food"), month: "2026-04", amountMinor: 12000 }); await bud.stopBudget(A, { categoryId: id("Food"), month: "2026-05" });
    const log = await M.AuditLog.find({ userId: A, entity: "Budget" }).sort({ createdAt: 1 }).lean();
    expect(log.map((l) => l.action)).toEqual(["budget.set", "budget.set", "budget.stop"]); expect(log[1].before.amountMinor).toBe(9000); expect(log[1].after.amountMinor).toBe(12000);
  });
  it("hints list this month's budgeted categories only", async () => {
    const { id, spend } = await setup(); const cur = currentMonth(); await bud.setBudget(A, { categoryId: id("Food"), month: shiftMonth(cur, -1), amountMinor: 9000 }); await spend("Food", 2500, `${cur}-01`);
    expect(await bud.getBudgetHints(A)).toEqual({ [id("Food")]: { name: "Food", budgetMinor: 9000, spentMinor: 2500, month: cur } });
  });
  it("month helpers", () => { expect(shiftMonth("2026-12", 1)).toBe("2027-01"); expect(shiftMonth("2026-01", -1)).toBe("2025-12"); expect(daysInMonth("2026-02")).toBe(28); expect(daysInMonth("2028-02")).toBe(29); expect(fmtMonth("2026-11")).toBe("November 2026"); });
});
