import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { parseCreateAccount, parseUpdateAccount, normalizeMobile } from "@/lib/schemas/account";
import { BANKS, MFS_PROVIDERS, BANK_GROUPS, findBank } from "@/lib/banks";

const OPEN = { openingBalanceMinor: 100000, openingDate: "2026-01-01" };
const bank = (o = {}) => ({ type: "bank", name: "Rahim Uddin", provider: "x", providerCode: "dbbl", identifier: "1234 5678 90", subtype: "saving", ...OPEN, ...o });
const mfs = (o = {}) => ({ type: "mobile", name: "Rahim Uddin", provider: "x", providerCode: "bkash", identifier: "+880 1712-345678", ...OPEN, ...o });
const bad = (fn) => { try { fn(); return null; } catch (e) { return e.flatten().fieldErrors; } };

describe("bank and MFS lists", () => {
  it("has unique codes, every bank in a known group, and the major providers", () => {
    for (const list of [BANKS, MFS_PROVIDERS]) expect(new Set(list.map((x) => x.code)).size).toBe(list.length);
    expect(BANKS.every((b) => BANK_GROUPS.includes(b.group))).toBe(true);
    expect(BANKS.length).toBeGreaterThanOrEqual(50);
    for (const c of ["dbbl", "brac", "sonali", "ibbl", "ebl", "city", "scb"]) expect(findBank(c)).toBeTruthy();
    expect(MFS_PROVIDERS.map((m) => m.name)).toEqual(expect.arrayContaining(["bKash", "Nagad", "Rocket", "Upay"]));
  });
});
describe("account validation", () => {
  it("normalizes Bangladeshi mobile numbers", () => {
    expect(["+880 1712-345678", "8801712345678", "1712345678", "01712345678"].map(normalizeMobile)).toEqual(Array(4).fill("01712345678"));
    expect(parseCreateAccount(mfs()).identifier).toBe("01712345678");
    expect(bad(() => parseCreateAccount(mfs({ identifier: "0212345678" })))?.identifier).toBeTruthy();
  });
  it("requires the bank details and checks routing number, provider and card pairing", () => {
    expect(parseCreateAccount(bank()).identifier).toBe("1234567890");   // spaces removed
    expect(bad(() => parseCreateAccount(bank({ identifier: undefined })))?.identifier).toBeTruthy();
    expect(bad(() => parseCreateAccount(bank({ subtype: undefined })))?.subtype).toBeTruthy();
    expect(bad(() => parseCreateAccount(bank({ routingNumber: "123" })))?.routingNumber).toBeTruthy();
    expect(parseCreateAccount(bank({ routingNumber: "090261234", branch: "Gulshan" })).routingNumber).toBe("090261234");
    expect(bad(() => parseCreateAccount(bank({ providerCode: "nosuchbank" })))?.providerCode).toBeTruthy();
    expect(parseCreateAccount(bank({ providerCode: "other", provider: "Some Local Bank" })).provider).toBe("Some Local Bank");
    expect(bad(() => parseCreateAccount(bank({ cardType: "debit" })))?.cardNumber).toBeTruthy();
    expect(bad(() => parseCreateAccount(bank({ cardNumber: "4111111111111111" })))?.cardType).toBeTruthy();
    expect(parseCreateAccount(bank({ cardType: "credit", cardNumber: "4111 1111 1111 1111" })).cardNumber).toBe("4111111111111111");
  });
  it("rejects fields that don't belong to the account type", () => {
    expect(bad(() => parseCreateAccount({ type: "cash", name: "Wallet", ...OPEN, provider: "bKash" }))).toBeTruthy();
    expect(bad(() => parseCreateAccount(mfs({ subtype: "saving" })))).toBeTruthy();
    expect(bad(() => parseCreateAccount({ type: "nope" }))).toBeTruthy();
    expect(bad(() => parseCreateAccount(null))).toBeTruthy();
  });
  it("validates updates for the account's own type", () => {
    expect(parseUpdateAccount("mobile", { active: false })).toEqual({ active: false });
    expect(parseUpdateAccount("bank", { cardType: null })).toEqual({ cardType: null });
    expect(bad(() => parseUpdateAccount("cash", { active: false }))).toBeTruthy();
    expect(bad(() => parseUpdateAccount("bank", {}))).toBeTruthy();
  });
});

let rs, acct, tx, loans, tr, cats, M;
const A = "user-a";
beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = rs.getUri();
  await (await import("@/lib/db")).connectDB();
  acct = await import("@/lib/services/accounts"); tx = await import("@/lib/services/transactions"); loans = await import("@/lib/services/loans"); tr = await import("@/lib/services/transfers"); cats = await import("@/lib/services/categories");
  M = Object.fromEntries(await Promise.all(["Account", "Operation", "LedgerEntry", "AuditLog", "Category", "Loan", "Repayment"].map(async (n) => [n, (await import(/* @vite-ignore */ `@/lib/models/${n}`)).default])));
});
afterAll(async () => { await mongoose.disconnect(); await rs.stop(); });
beforeEach(async () => { await Promise.all(Object.values(M).map((m) => m.deleteMany({}))); });

describe("account details", () => {
  it("stores bank details, masks the account number, and keeps only the last 4 card digits", async () => {
    const a = await acct.createAccount(A, parseCreateAccount(bank({ branch: "Gulshan", routingNumber: "090261234", cardType: "debit", cardNumber: "5555 4444 3333 2222" })));
    expect(a).toMatchObject({ provider: "Dutch-Bangla Bank PLC", numberLabel: "••••567890", subtype: "saving", branch: "Gulshan", routingNumber: "090261234", cardType: "debit", cardLast4: "2222", cardMasked: "•••• 2222", active: true });
    const raw = await M.Account.findById(a.id).lean(); expect(JSON.stringify(raw)).not.toContain("5555");
    expect(JSON.stringify(a)).not.toContain("1234567890"); expect(JSON.stringify(await M.AuditLog.find({}).lean())).not.toMatch(/1234567890|2222/);
  });
  it("shows the full mobile number for MFS and forces the official provider name", async () => {
    const m = await acct.createAccount(A, parseCreateAccount(mfs()));
    expect(m).toMatchObject({ provider: "bKash", providerCode: "bkash", numberLabel: "01712345678", active: true });
  });
  it("updates card, removes it, and refuses a card type without a number", async () => {
    const a = await acct.createAccount(A, parseCreateAccount(bank()));
    await expect(acct.updateAccount(A, a.id, { cardType: "credit" })).rejects.toMatchObject({ status: 400 });
    expect((await acct.updateAccount(A, a.id, { cardType: "credit", cardNumber: "4111111111119999" })).cardMasked).toBe("•••• 9999");
    const removed = await acct.updateAccount(A, a.id, { cardType: null }); expect([removed.cardType, removed.cardLast4]).toEqual([undefined, undefined]);
    await expect(acct.updateAccount(A, a.id, { active: false })).rejects.toBeTruthy();   // not a bank field
  });
  it("inactive accounts keep their balance but refuse new postings, while old entries can still be reversed", async () => {
    const m = await acct.createAccount(A, parseCreateAccount(mfs())), other = await acct.createAccount(A, parseCreateAccount({ type: "cash", name: "Wallet", ...OPEN }));
    const inc = (await cats.listCategories(A, "income"))[0];
    const t = await tx.createTransaction(A, { kind: "income", amountMinor: 5000, title: "x", categoryId: inc.id, accountId: m.id, date: "2026-03-01" });
    const off = await acct.updateAccount(A, m.id, { active: false });
    expect(off).toMatchObject({ active: false, balanceMinor: 105000 });
    await expect(tx.createTransaction(A, { kind: "income", amountMinor: 1, title: "y", categoryId: inc.id, accountId: m.id, date: "2026-03-02" })).rejects.toMatchObject({ status: 409 });
    await expect(tr.createTransfer(A, { fromAccountId: other.id, toAccountId: m.id, amountMinor: 100, date: "2026-03-02" })).rejects.toMatchObject({ status: 409 });
    await expect(loans.createLoan(A, { direction: "lent", counterparty: "R", principalMinor: 100, accountId: m.id, date: "2026-03-02" })).rejects.toMatchObject({ status: 409 });
    await tx.deleteTransaction(A, t.id);                                           // reversal is allowed
    expect((await acct.getAccount(A, m.id)).balanceMinor).toBe(100000);
    await acct.updateAccount(A, m.id, { active: true });
    await tx.createTransaction(A, { kind: "income", amountMinor: 1, title: "y", categoryId: inc.id, accountId: m.id, date: "2026-03-02" });
  });
  it("includes account details in transfer history for icons", async () => {
    const b = await acct.createAccount(A, parseCreateAccount(bank())), m = await acct.createAccount(A, parseCreateAccount(mfs()));
    await tr.createTransfer(A, { fromAccountId: b.id, toAccountId: m.id, amountMinor: 2500, date: "2026-03-05", note: "top up" });
    const h = (await tr.listTransfers(A)).items[0];
    expect(h.from).toMatchObject({ type: "bank", providerCode: "dbbl" }); expect(h.to).toMatchObject({ type: "mobile", providerCode: "bkash" }); expect(h.note).toBe("top up");
  });
});
