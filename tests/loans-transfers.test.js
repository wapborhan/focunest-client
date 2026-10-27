import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

let rs, acct, tx, cats, loans, tr, M;
const A = "user-a", B = "user-b";
const mk = (u, o = {}) => acct.createAccount(u, { type: "cash", name: "Wallet", openingBalanceMinor: 100000, openingDate: "2026-01-01", ...o });
const bal = async (u, id) => (await acct.getAccount(u, id)).balanceMinor;
const loan = (accountId, o = {}) => ({ direction: "lent", counterparty: "Rahim", principalMinor: 40000, accountId, date: "2026-03-10", ...o });
const rep = (accountId, amountMinor, o = {}) => ({ amountMinor, accountId, date: "2026-03-20", ...o });

beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = rs.getUri();
  await (await import("@/lib/db")).connectDB();
  acct = await import("@/lib/services/accounts"); tx = await import("@/lib/services/transactions"); cats = await import("@/lib/services/categories");
  loans = await import("@/lib/services/loans"); tr = await import("@/lib/services/transfers");
  M = Object.fromEntries(await Promise.all(["Account", "Operation", "LedgerEntry", "AuditLog", "Category", "Loan", "Repayment"].map(async (n) => [n, (await import(/* @vite-ignore */ `@/lib/models/${n}`)).default])));
});
afterAll(async () => { await mongoose.disconnect(); await rs.stop(); });
beforeEach(async () => { await Promise.all(Object.values(M).map((m) => m.deleteMany({}))); });

describe("lending and borrowing", () => {
  it("lending reduces the account, is not an expense, and repayments are not income", async () => {
    const a = await mk(A); const l = await loans.createLoan(A, loan(a.id));
    expect(await bal(A, a.id)).toBe(60000); expect(l.outstandingMinor).toBe(40000);
    await loans.addRepayment(A, l.id, rep(a.id, 15000));
    expect(await bal(A, a.id)).toBe(75000);
    const t = await tx.periodTotals(A, "income"), e = await tx.periodTotals(A, "expense");
    expect([t.year, e.year]).toEqual([0, 0]);
    expect(await loans.loanSummary(A)).toMatchObject({ lentOutstandingMinor: 25000, borrowedOutstandingMinor: 0 });
  });
  it("borrowing adds money and repaying it takes money out", async () => {
    const a = await mk(A); const l = await loans.createLoan(A, loan(a.id, { direction: "borrowed", principalMinor: 30000 }));
    expect(await bal(A, a.id)).toBe(130000);
    await loans.addRepayment(A, l.id, rep(a.id, 30000));
    expect(await bal(A, a.id)).toBe(100000);
    expect((await loans.getLoan(A, l.id)).status).toBe("repaid");
  });
  it("tracks partial then full status and rejects overpayment or paying a repaid loan", async () => {
    const a = await mk(A); const l = await loans.createLoan(A, loan(a.id));
    expect((await loans.addRepayment(A, l.id, rep(a.id, 10000))).status).toBe("partial");
    await expect(loans.addRepayment(A, l.id, rep(a.id, 30001))).rejects.toMatchObject({ status: 409 });
    const done = await loans.addRepayment(A, l.id, rep(a.id, 30000));
    expect(done).toMatchObject({ status: "repaid", outstandingMinor: 0 }); expect(done.repayments).toHaveLength(2);
    await expect(loans.addRepayment(A, l.id, rep(a.id, 1))).rejects.toMatchObject({ status: 409 });
  });
  it("two simultaneous repayments can't together exceed the outstanding amount", async () => {
    const a = await mk(A); const l = await loans.createLoan(A, loan(a.id, { principalMinor: 10000 }));
    const r = await Promise.allSettled([loans.addRepayment(A, l.id, rep(a.id, 6000)), loans.addRepayment(A, l.id, rep(a.id, 6000))]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect((await loans.getLoan(A, l.id)).repaidMinor).toBe(6000);
  });
  it("blocks repaying a borrowed loan from an account without enough balance", async () => {
    const a = await mk(A, { openingBalanceMinor: 0 }); const l = await loans.createLoan(A, loan(a.id, { direction: "borrowed", principalMinor: 5000 }));
    const poor = await mk(A, { name: "Empty", openingBalanceMinor: 100 });
    await expect(loans.addRepayment(A, l.id, rep(poor.id, 5000))).rejects.toMatchObject({ status: 409 });
    expect(await bal(A, poor.id)).toBe(100);
  });
  it("replays of the same repayment key apply once", async () => {
    const a = await mk(A); const l = await loans.createLoan(A, loan(a.id));
    const r = rep(a.id, 5000, { idempotencyKey: "rep-12345678" });
    await loans.addRepayment(A, l.id, r); await loans.addRepayment(A, l.id, r);
    expect((await loans.getLoan(A, l.id)).repaidMinor).toBe(5000); expect(await bal(A, a.id)).toBe(65000);
  });
  it("flags and filters overdue loans, and ignores repaid ones", async () => {
    const a = await mk(A);
    const late = await loans.createLoan(A, loan(a.id, { counterparty: "Late", dueDate: "2026-03-20", principalMinor: 1000 }));
    await loans.createLoan(A, loan(a.id, { counterparty: "Later", dueDate: "2099-01-01", principalMinor: 1000 }));
    const q = { page: 1, limit: 20 };
    expect((await loans.listLoans(A, { ...q, overdue: "true" })).items.map((x) => x.counterparty)).toEqual(["Late"]);
    expect((await loans.listLoans(A, q)).summary.overdueCount).toBe(1);
    await loans.addRepayment(A, late.id, rep(a.id, 1000));
    expect((await loans.listLoans(A, { ...q, overdue: "true" })).total).toBe(0);
    expect((await loans.listLoans(A, { ...q, q: "lat" })).total).toBe(2);
  });
  it("rejects repayments dated before the loan, and isolates users", async () => {
    const a = await mk(A), b = await mk(B); const l = await loans.createLoan(A, loan(a.id));
    await expect(loans.addRepayment(A, l.id, rep(a.id, 100, { date: "2026-03-01" }))).rejects.toMatchObject({ status: 400 });
    await expect(loans.getLoan(B, l.id)).rejects.toMatchObject({ status: 404 });
    await expect(loans.addRepayment(B, l.id, rep(b.id, 100))).rejects.toMatchObject({ status: 404 });
    await expect(loans.createLoan(B, loan(a.id))).rejects.toMatchObject({ status: 404 });
  });
  it("keeps an audit trail of loan changes", async () => {
    const a = await mk(A); const l = await loans.createLoan(A, loan(a.id));
    await loans.addRepayment(A, l.id, rep(a.id, 1000)); await loans.updateLoan(A, l.id, { phone: "01712345678", dueDate: null });
    expect(await M.AuditLog.countDocuments({ userId: A, entity: "Loan" })).toBe(3);
  });
});

describe("transfers", () => {
  it("moves equal and opposite amounts and leaves income and expenses untouched", async () => {
    const a = await mk(A), b = await mk(A, { name: "bKash", type: "mobile", provider: "bKash", openingBalanceMinor: 0 });
    await tr.createTransfer(A, { fromAccountId: a.id, toAccountId: b.id, amountMinor: 25000, date: "2026-03-10" });
    expect([await bal(A, a.id), await bal(A, b.id)]).toEqual([75000, 25000]);
    expect(await M.LedgerEntry.countDocuments({ userId: A })).toBe(2);
    expect((await tx.periodTotals(A, "income")).year + (await tx.periodTotals(A, "expense")).year).toBe(0);
    expect((await acct.getAccountHistory(A, b.id)).byKind.transfer).toBe(25000);
  });
  it("rejects same-account, overdraw, archived and foreign accounts without partial writes", async () => {
    const a = await mk(A), b = await mk(A, { name: "B", openingBalanceMinor: 0 }), other = await mk(B);
    const t = (f, to, n = 100) => ({ fromAccountId: f, toAccountId: to, amountMinor: n, date: "2026-03-10" });
    await expect(tr.createTransfer(A, t(a.id, a.id))).rejects.toMatchObject({ status: 400 });
    await expect(tr.createTransfer(A, t(a.id, b.id, 100001))).rejects.toMatchObject({ status: 409 });
    await expect(tr.createTransfer(A, t(a.id, other.id))).rejects.toMatchObject({ status: 404 });
    await acct.updateAccount(A, b.id, { status: "archived" });
    await expect(tr.createTransfer(A, t(a.id, b.id))).rejects.toMatchObject({ status: 409 });
    expect(await M.LedgerEntry.countDocuments({ userId: A })).toBe(0); expect(await bal(A, a.id)).toBe(100000);
  });
  it("is idempotent and can be deleted with reversal", async () => {
    const a = await mk(A), b = await mk(A, { name: "B", openingBalanceMinor: 0 });
    const body = { fromAccountId: a.id, toAccountId: b.id, amountMinor: 5000, date: "2026-03-10", idempotencyKey: "tr-12345678" };
    const x = await tr.createTransfer(A, body), y = await tr.createTransfer(A, body);
    expect(y.id).toBe(x.id); expect(await bal(A, b.id)).toBe(5000);
    await tr.deleteTransfer(A, x.id);
    expect([await bal(A, a.id), await bal(A, b.id)]).toEqual([100000, 0]);
    expect((await tr.listTransfers(A)).total).toBe(0);
    await expect(tr.deleteTransfer(A, x.id)).rejects.toMatchObject({ status: 404 });
  });
  it("blocks deleting a transfer whose funds were already spent", async () => {
    const a = await mk(A), b = await mk(A, { name: "B", openingBalanceMinor: 0 }); const [, exp] = [0, (await cats.listCategories(A, "expense"))[0]];
    const t = await tr.createTransfer(A, { fromAccountId: a.id, toAccountId: b.id, amountMinor: 5000, date: "2026-03-10" });
    await tx.createTransaction(A, { kind: "expense", amountMinor: 4000, title: "x", categoryId: exp.id, accountId: b.id, date: "2026-03-11" });
    await expect(tr.deleteTransfer(A, t.id)).rejects.toMatchObject({ status: 409 });
  });
});
