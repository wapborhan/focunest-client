import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { toCsv } from "@/lib/csv";

let rs, acct, tx, cats, M;
const A = "user-a", B = "user-b";
const mkAccount = (u, o = {}) => acct.createAccount(u, { type: "cash", name: "Wallet", openingBalanceMinor: 100000, openingDate: "2026-01-01", ...o });
const bal = async (u, id) => (await acct.getAccount(u, id)).balanceMinor;
async function setup(u = A, o) {
  const account = await mkAccount(u, o);
  const [inc] = await cats.listCategories(u, "income"); const [exp] = await cats.listCategories(u, "expense");
  return { account, inc, exp };
}
const body = (kind, accountId, categoryId, extra = {}) => ({ kind, amountMinor: 20000, title: "Test", categoryId, accountId, date: "2026-03-10", ...extra });

beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = rs.getUri();
  await (await import("@/lib/db")).connectDB();
  acct = await import("@/lib/services/accounts"); tx = await import("@/lib/services/transactions"); cats = await import("@/lib/services/categories");
  M = Object.fromEntries(await Promise.all(["Account", "Operation", "LedgerEntry", "AuditLog", "Category"].map(async (n) => [n, (await import(/* @vite-ignore */ `@/lib/models/${n}`)).default])));
});
afterAll(async () => { await mongoose.disconnect(); await rs.stop(); });
beforeEach(async () => { await Promise.all(Object.values(M).map((m) => m.deleteMany({}))); });

describe("transactions", () => {
  it("income adds and expense subtracts", async () => {
    const { account, inc, exp } = await setup();
    await tx.createTransaction(A, body("income", account.id, inc.id, { amountMinor: 50000 }));
    await tx.createTransaction(A, body("expense", account.id, exp.id, { amountMinor: 12000 }));
    expect(await bal(A, account.id)).toBe(138000);
  });
  it("blocks an expense that would overdraw, unless the account allows it", async () => {
    const { account, exp } = await setup();
    await expect(tx.createTransaction(A, body("expense", account.id, exp.id, { amountMinor: 100001 }))).rejects.toMatchObject({ status: 409 });
    expect(await bal(A, account.id)).toBe(100000);
    const neg = await mkAccount(A, { name: "Card", allowNegative: true });
    await tx.createTransaction(A, body("expense", neg.id, exp.id, { amountMinor: 150000 }));
    expect(await bal(A, neg.id)).toBe(-50000);
  });
  it("editing amount and account moves the balance effect", async () => {
    const { account, exp } = await setup(); const other = await mkAccount(A, { name: "Other" });
    const t = await tx.createTransaction(A, body("expense", account.id, exp.id, { amountMinor: 30000 }));
    await tx.updateTransaction(A, t.id, { amountMinor: 10000 });
    expect(await bal(A, account.id)).toBe(90000);
    await tx.updateTransaction(A, t.id, { accountId: other.id });
    expect(await bal(A, account.id)).toBe(100000); expect(await bal(A, other.id)).toBe(90000);
    expect(await M.AuditLog.countDocuments({ action: "expense.update" })).toBe(2);
  });
  it("delete reverses the effect, keeps history, and hides the record", async () => {
    const { account, inc } = await setup();
    const t = await tx.createTransaction(A, body("income", account.id, inc.id));
    await tx.deleteTransaction(A, t.id);
    expect(await bal(A, account.id)).toBe(100000);
    expect(await M.LedgerEntry.countDocuments({ userId: A })).toBe(2);
    expect((await tx.listTransactions(A, { kind: "income", sort: "date", dir: "desc", page: 1, limit: 20 })).total).toBe(0);
    await expect(tx.deleteTransaction(A, t.id)).rejects.toMatchObject({ status: 404 });
  });
  it("won't delete income that has already been spent", async () => {
    const { account, inc, exp } = await setup(A, { openingBalanceMinor: 0 });
    const i = await tx.createTransaction(A, body("income", account.id, inc.id, { amountMinor: 10000 }));
    await tx.createTransaction(A, body("expense", account.id, exp.id, { amountMinor: 9000 }));
    await expect(tx.deleteTransaction(A, i.id)).rejects.toMatchObject({ status: 409 });
    expect(await bal(A, account.id)).toBe(1000);
  });
  it("replaying an idempotency key creates one transaction", async () => {
    const { account, inc } = await setup();
    const b = body("income", account.id, inc.id, { idempotencyKey: "key-12345678" });
    const [x, y] = [await tx.createTransaction(A, b), await tx.createTransaction(A, b)];
    expect(y.id).toBe(x.id); expect(await bal(A, account.id)).toBe(120000);
  });
  it("isolates users and rejects foreign accounts or categories", async () => {
    const a = await setup(A); const b = await setup(B);
    await expect(tx.createTransaction(B, body("income", a.account.id, b.inc.id))).rejects.toMatchObject({ status: 404 });
    await expect(tx.createTransaction(B, body("income", b.account.id, a.inc.id))).rejects.toMatchObject({ status: 400 });
    const t = await tx.createTransaction(A, body("income", a.account.id, a.inc.id));
    await expect(tx.getTransaction(B, t.id)).rejects.toMatchObject({ status: 404 });
    await expect(tx.updateTransaction(B, t.id, { title: "x" })).rejects.toMatchObject({ status: 404 });
  });
  it("filters by date range (Dhaka days), paginates and totals", async () => {
    const { account, inc } = await setup();
    for (const d of ["2026-03-01", "2026-03-15", "2026-03-31", "2026-04-01"]) await tx.createTransaction(A, body("income", account.id, inc.id, { date: d, amountMinor: 1000, title: `Pay ${d}` }));
    const q = { kind: "income", from: "2026-03-01", to: "2026-03-31", sort: "date", dir: "asc", page: 1, limit: 2 };
    const r = await tx.listTransactions(A, q);
    expect(r.total).toBe(3); expect(r.items).toHaveLength(2); expect(r.totalAmountMinor).toBe(3000);
    expect((await tx.listTransactions(A, { ...q, page: 2 })).items).toHaveLength(1);
    expect((await tx.listTransactions(A, { ...q, from: undefined, to: undefined, q: "pay 2026-04" })).total).toBe(1);
  });
  it("treats search text literally, not as a regex", async () => {
    const { account, inc } = await setup();
    await tx.createTransaction(A, body("income", account.id, inc.id, { title: "A+B" }));
    expect((await tx.listTransactions(A, { kind: "income", q: ".*", sort: "date", dir: "desc", page: 1, limit: 20 })).total).toBe(0);
  });
});
describe("csv", () => {
  it("quotes cells and neutralizes formulas", () => {
    const out = toCsv(["a", "b"], [['=HYPERLINK("x")', 'say "hi", ok'], [5, null]]);
    expect(out).toContain(`"'=HYPERLINK(""x"")"`); expect(out).toContain(`"say ""hi"", ok"`); expect(out.endsWith("5,")).toBe(true);
  });
});
