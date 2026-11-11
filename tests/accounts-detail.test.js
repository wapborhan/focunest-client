import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { parseCreateAccount, parseUpdateAccount, normalizeMobile } from "@/lib/schemas/account";
import { BANKS, MFS_PROVIDERS, BANK_GROUPS, findBank } from "@/lib/banks";

let rs, acct, tx, cats, tr, loans, M;
const A = "user-a";
const bank = (o = {}) => ({ type: "bank", name: "Rahim Uddin", provider: "x", providerCode: "dbbl", identifier: "1234567890123", subtype: "saving", branch: "Gulshan", routingNumber: "090261725", openingBalanceMinor: 100000, openingDate: "2026-01-01", ...o });
const mfs = (o = {}) => ({ type: "mobile", name: "Rahim Uddin", provider: "x", providerCode: "bkash", identifier: "+880 1712-345678", openingBalanceMinor: 50000, openingDate: "2026-01-01", ...o });

beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = rs.getUri();
  await (await import("@/lib/db")).connectDB();
  acct = await import("@/lib/services/accounts"); tx = await import("@/lib/services/transactions"); cats = await import("@/lib/services/categories");
  tr = await import("@/lib/services/transfers"); loans = await import("@/lib/services/loans");
  M = Object.fromEntries(await Promise.all(["Account", "Operation", "LedgerEntry", "AuditLog", "Category", "Loan", "Repayment"].map(async (n) => [n, (await import(/* @vite-ignore */ `@/lib/models/${n}`)).default])));
});
afterAll(async () => { await mongoose.disconnect(); await rs.stop(); });
beforeEach(async () => { await Promise.all(Object.values(M).map((m) => m.deleteMany({}))); });

describe("bank and MFS lists", () => {
  it("has unique codes, valid groups, and the major banks and providers", () => {
    const codes = [...BANKS, ...MFS_PROVIDERS].map((x) => x.code); expect(new Set(codes).size).toBe(codes.length);
    expect(BANKS.every((b) => BANK_GROUPS.includes(b.group) && b.name && b.short)).toBe(true); expect(BANKS.length).toBeGreaterThan(50);
    for (const c of ["dbbl", "brac", "sonali", "ibbl", "ebl", "city", "ucb"]) expect(findBank(c)).toBeTruthy();
    expect(MFS_PROVIDERS.map((m) => m.name)).toEqual(expect.arrayContaining(["bKash", "Nagad", "Rocket", "Upay"]));
  });
});
describe("account validation", () => {
  it("accepts a full bank account and normalizes the numbers", () => {
    const v = parseCreateAccount(bank({ cardType: "debit", cardNumber: "4111 1111 1111 1111" }));
    expect(v).toMatchObject({ identifier: "1234567890123", subtype: "saving", cardType: "debit", cardNumber: "4111111111111111" });
  });
  it("requires bank name, account number and account type for banks, and rejects a bad routing number or unknown bank", () => {
    expect(() => parseCreateAccount(bank({ identifier: undefined }))).toThrow(); expect(() => parseCreateAccount(bank({ subtype: "fixed" }))).toThrow();
    expect(() => parseCreateAccount(bank({ routingNumber: "123" }))).toThrow(); expect(() => parseCreateAccount(bank({ providerCode: "nosuchbank" }))).toThrow();
    expect(parseCreateAccount(bank({ providerCode: "other", provider: "My Local Bank" })).provider).toBe("My Local Bank");
  });
  it("requires a card number with a card type, and a card type with a card number", () => {
    expect(() => parseCreateAccount(bank({ cardType: "credit" }))).toThrow(); expect(() => parseCreateAccount(bank({ cardNumber: "1234" }))).toThrow();
    expect(parseCreateAccount(bank({ cardType: "credit", cardNumber: "1234" })).cardNumber).toBe("1234");
  });
  it("validates and normalizes Bangladeshi mobile numbers", () => {
    expect(parseCreateAccount(mfs()).identifier).toBe("01712345678");
    for (const n of ["8801712345678", "1712345678", "017-1234 5678"]) expect(normalizeMobile(n)).toBe("01712345678");
    for (const bad of ["01012345678", "0171234", "abc"]) expect(() => parseCreateAccount(mfs({ identifier: bad }))).toThrow();
  });
  it("rejects fields that don't belong to the account type", () => {
    expect(() => parseCreateAccount({ type: "cash", name: "Wallet", openingBalanceMinor: 0, openingDate: "2026-01-01", branch: "x" })).toThrow();
    expect(() => parseCreateAccount(mfs({ subtype: "saving" }))).toThrow(); expect(() => parseCreateAccount({ type: "gold" })).toThrow();
  });
  it("validates updates against the account's own type", () => {
    expect(parseUpdateAccount("mobile", { active: false })).toEqual({ active: false });
    expect(() => parseUpdateAccount("mobile", { subtype: "saving" })).toThrow(); expect(() => parseUpdateAccount("bank", {})).toThrow();
    expect(parseUpdateAccount("bank", { cardType: null })).toEqual({ cardType: null });
  });
});
describe("bank and MFS accounts", () => {
  it("stores the official bank name, masks the account number, and masks the account number, and keeps only the last 4 card digits", async () => {
    const a = await acct.createAccount(A, parseCreateAccount(bank({ cardType: "debit", cardNumber: "4111 1111 1111 1111" })));
    expect(a).toMatchObject({ provider: "Dutch-Bangla Bank PLC", providerCode: "dbbl", numberLabel: "••••890123", subtype: "saving", branch: "Gulshan", routingNumber: "090261725", cardType: "debit", cardLast4: "1111", cardMasked: "•••• 1111", active: true });
    expect(JSON.stringify(a)).not.toContain("1234567890123"); expect(JSON.stringify(a)).not.toContain("4111111111111111");
    const raw = await M.Account.findById(a.id).lean(); expect(JSON.stringify(raw)).not.toContain("4111111111111111");
    const audit = JSON.stringify(await M.AuditLog.find({ userId: A }).lean()); expect(audit).not.toContain("1234567890123"); expect(audit).not.toContain("1111");
  });
  it("shows an MFS number in full and records the provider", async () => {
    const a = await acct.createAccount(A, parseCreateAccount(mfs()));
    expect(a).toMatchObject({ provider: "bKash", numberLabel: "01712345678", active: true, type: "mobile" });
  });
  it("updates card, branch and active state; clearing the card removes both fields", async () => {
    const a = await acct.createAccount(A, parseCreateAccount(bank()));
    let u = await acct.updateAccount(A, a.id, { cardType: "credit", cardNumber: "5555 4444 3333 2222", branch: "Motijheel" });
    expect(u).toMatchObject({ cardType: "credit", cardLast4: "2222", branch: "Motijheel" });
    u = await acct.updateAccount(A, a.id, { cardType: null }); expect(u.cardType).toBeUndefined(); expect(u.cardLast4).toBeUndefined();
    await expect(acct.updateAccount(A, a.id, { cardType: "debit" })).rejects.toMatchObject({ status: 400 });
    await expect(acct.updateAccount(A, a.id, { active: false, subtype: "x" })).rejects.toBeTruthy();
  });
  it("an inactive account keeps its balance but refuses new postings, and old entries can still be reversed", async () => {
    const m = await acct.createAccount(A, parseCreateAccount(mfs())); const cash = await acct.createAccount(A, { type: "cash", name: "Wallet", openingBalanceMinor: 100000, openingDate: "2026-01-01" });
    const inc = (await cats.listCategories(A, "income"))[0];
    const t = await tx.createTransaction(A, { kind: "income", amountMinor: 1000, title: "x", categoryId: inc.id, accountId: m.id, date: "2026-03-10" });
    await acct.updateAccount(A, m.id, { active: false });
    const body = { kind: "income", amountMinor: 500, title: "y", categoryId: inc.id, accountId: m.id, date: "2026-03-11" };
    await expect(tx.createTransaction(A, body)).rejects.toMatchObject({ status: 409 });
    await expect(tr.createTransfer(A, { fromAccountId: cash.id, toAccountId: m.id, amountMinor: 100, date: "2026-03-11" })).rejects.toMatchObject({ status: 409 });
    await expect(loans.createLoan(A, { direction: "lent", counterparty: "R", principalMinor: 100, accountId: m.id, date: "2026-03-11" })).rejects.toMatchObject({ status: 409 });
    expect((await acct.getAccount(A, m.id)).balanceMinor).toBe(51000);
    await tx.deleteTransaction(A, t.id); expect((await acct.getAccount(A, m.id)).balanceMinor).toBe(50000);
    await acct.updateAccount(A, m.id, { active: true }); await tx.createTransaction(A, body);
    expect((await acct.getAccount(A, m.id)).balanceMinor).toBe(50500);
  });
  it("transfer history carries account details for icons", async () => {
    const b = await acct.createAccount(A, parseCreateAccount(bank())), m = await acct.createAccount(A, parseCreateAccount(mfs()));
    await tr.createTransfer(A, { fromAccountId: b.id, toAccountId: m.id, amountMinor: 2500, date: "2026-03-10", note: "top up" });
    const h = await tr.listTransfers(A);
    expect(h.items[0]).toMatchObject({ amountMinor: 2500, note: "top up", from: { type: "bank", providerCode: "dbbl", name: "Rahim Uddin" }, to: { type: "mobile", providerCode: "bkash" } });
  });
});
