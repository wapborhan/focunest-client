import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

let rs, acct, tx, cats, loans, M;
const A = "user-a", B = "user-b";
const bank = { type: "bank", name: "Rahim Uddin", provider: "x", providerCode: "dbbl", identifier: "1234567890123", subtype: "saving", openingBalanceMinor: 100000, openingDate: "2026-01-01" };
const cash = (o = {}) => ({ type: "cash", name: "Wallet", openingBalanceMinor: 100000, openingDate: "2026-01-01", ...o });

beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = rs.getUri();
  await (await import("@/lib/db")).connectDB();
  acct = await import("@/lib/services/accounts"); tx = await import("@/lib/services/transactions"); cats = await import("@/lib/services/categories"); loans = await import("@/lib/services/loans");
  M = Object.fromEntries(await Promise.all(["Account", "Operation", "LedgerEntry", "AuditLog", "Category", "Loan", "Repayment"].map(async (n) => [n, (await import(/* @vite-ignore */ `@/lib/models/${n}`)).default])));
});
afterAll(async () => { await mongoose.disconnect(); await rs.stop(); });
beforeEach(async () => { await Promise.all(Object.values(M).map((m) => m.deleteMany({}))); });

describe("bank account number: masked to the last 6 digits, revealed on request", () => {
  it("masks by length", () => {
    expect(acct.maskNumber("1234567890123")).toBe("••••890123"); expect(acct.maskNumber("1234567890")).toBe("••••567890");
    expect(acct.maskNumber("12345678")).toBe("••••5678"); expect(acct.maskNumber("12345")).toBe("••••5");
  });
  it("never sends the full number in account data, but returns it on an explicit reveal (and logs that)", async () => {
    const a = await acct.createAccount(A, bank);
    expect(a.numberLabel).toBe("••••890123");
    expect(JSON.stringify(a)).not.toContain("1234567890123"); expect(JSON.stringify(await acct.listAccounts(A))).not.toContain("1234567890123");
    expect(JSON.stringify(await acct.getAccount(A, a.id))).not.toContain("1234567890123");
    expect(await acct.getAccountNumber(A, a.id)).toEqual({ accountNumber: "1234567890123" });
    expect(await M.AuditLog.countDocuments({ userId: A, action: "account.reveal_number" })).toBe(1);
    expect(JSON.stringify(await M.AuditLog.find({}).lean())).not.toContain("1234567890123");
  });
  it("only works for your own bank accounts", async () => {
    const a = await acct.createAccount(A, bank), c = await acct.createAccount(A, cash()), m = await acct.createAccount(A, { type: "mobile", name: "R", provider: "x", providerCode: "bkash", identifier: "01712345678", openingBalanceMinor: 0, openingDate: "2026-01-01" });
    await expect(acct.getAccountNumber(B, a.id)).rejects.toMatchObject({ status: 404 });
    await expect(acct.getAccountNumber(A, c.id)).rejects.toMatchObject({ status: 400 });
    await expect(acct.getAccountNumber(A, m.id)).rejects.toMatchObject({ status: 400 });      // a mobile number is already shown in full
    expect(m.numberLabel).toBe("01712345678");
  });
  it("is never cached", async () => {
    const src = (await import("node:fs")).readFileSync("app/api/accounts/[id]/number/route.js", "utf8");
    expect(src).toContain("no-store");
  });
});

describe("loan address", () => {
  const L = (accountId, o = {}) => ({ direction: "lent", counterparty: "Rahim", principalMinor: 1000, accountId, date: "2026-03-10", ...o });
  it("is saved with the loan, shown on read, and can be edited or cleared", async () => {
    const a = await acct.createAccount(A, cash());
    const l = await loans.createLoan(A, L(a.id, { address: "House 5, Road 3, Mirpur, Dhaka" }));
    expect(l.address).toBe("House 5, Road 3, Mirpur, Dhaka"); expect((await loans.listLoans(A, { page: 1, limit: 10 })).items[0].address).toBe("House 5, Road 3, Mirpur, Dhaka");
    expect((await loans.updateLoan(A, l.id, { address: "Uttara, Dhaka" })).address).toBe("Uttara, Dhaka");
    expect((await loans.updateLoan(A, l.id, { address: null })).address).toBeUndefined();
    expect((await loans.createLoan(A, L(a.id))).address).toBeUndefined();                  // optional
  });
  it("is length-limited by the input schema", async () => {
    const { createLoanSchema } = await import("@/lib/schemas/loan"); const ok = { direction: "borrowed", counterparty: "x", principalMinor: 5, accountId: "a".repeat(24), date: "2026-03-10" };
    expect(createLoanSchema.safeParse({ ...ok, address: "x".repeat(200) }).success).toBe(true); expect(createLoanSchema.safeParse({ ...ok, address: "x".repeat(201) }).success).toBe(false);
  });
});

describe("income and expense category management", () => {
  const expense = async (a, categoryId, o = {}) => tx.createTransaction(A, { kind: "expense", amountMinor: 100, title: "t", categoryId, accountId: a.id, date: "2026-03-10", ...o });
  it("lists every category with how many transactions use it, including archived ones", async () => {
    const a = await acct.createAccount(A, cash()); const [food, transport] = await cats.listCategories(A, "expense");
    await expense(a, food.id); await expense(a, food.id);
    const all = await cats.listCategoriesForManagement(A, "expense");
    expect(all.find((c) => c.id === food.id)).toMatchObject({ used: 2, archived: false, isDefault: true }); expect(all.find((c) => c.id === transport.id).used).toBe(0);
    expect((await cats.listCategoriesForManagement(A, "income")).length).toBe(7);
  });
  it("adds, renames and rejects duplicate names", async () => {
    await cats.listCategories(A, "expense");      // seeds the defaults, including "Food"
    const c = await cats.createCategory(A, { kind: "expense", nameEn: "Pets", nameBn: "পোষা প্রাণী" });
    expect((await cats.updateCategory(A, c.id, { nameEn: "Pet care", nameBn: null })).nameEn).toBe("Pet care");
    await expect(cats.updateCategory(A, c.id, { nameEn: "Food" })).rejects.toMatchObject({ status: 409 });
    await expect(cats.createCategory(A, { kind: "expense", nameEn: "Food" })).rejects.toMatchObject({ status: 409 });
  });
  it("archiving hides a category from new entries but old transactions keep working, including edits", async () => {
    const a = await acct.createAccount(A, cash()); const [food, transport] = await cats.listCategories(A, "expense");
    const t = await expense(a, food.id);
    await cats.updateCategory(A, food.id, { archived: true });
    expect((await cats.listCategories(A, "expense")).some((c) => c.id === food.id)).toBe(false);
    expect((await cats.listCategoriesForManagement(A, "expense")).find((c) => c.id === food.id)).toMatchObject({ archived: true, used: 1 });
    await expect(expense(a, food.id)).rejects.toMatchObject({ status: 400 });                                 // can't be picked for a new entry
    expect((await tx.updateTransaction(A, t.id, { title: "renamed", categoryId: food.id, amountMinor: 200 })).title).toBe("renamed");   // the form re-sends the same category
    await expect(tx.updateTransaction(A, t.id, { categoryId: (await cats.createCategory(A, { kind: "expense", nameEn: "X" })).id })).resolves.toBeTruthy();
    await cats.updateCategory(A, food.id, { archived: false });
    expect((await cats.listCategories(A, "expense")).some((c) => c.id === food.id)).toBe(true); expect(transport).toBeTruthy();
  });
  it("always keeps one active category per kind, and isolates users", async () => {
    const list = await cats.listCategories(A, "income");
    for (const c of list.slice(0, -1)) await cats.updateCategory(A, c.id, { archived: true });
    await expect(cats.updateCategory(A, list.at(-1).id, { archived: true })).rejects.toMatchObject({ status: 409 });
    await expect(cats.updateCategory(B, list[0].id, { nameEn: "Hacked" })).rejects.toMatchObject({ status: 404 });
    await expect(cats.updateCategory(A, "nope", { nameEn: "x" })).rejects.toMatchObject({ status: 404 });
  });
});
