import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

let rs, svc, LedgerEntry, Operation, Account;
const A = "user-a", B = "user-b";
const base = { type: "bank", name: "DBBL", provider: "Dutch-Bangla", openingBalanceMinor: 100000, openingDate: "2026-01-01" };
const bank = { type: "bank", name: "Rahim Uddin", provider: "x", providerCode: "dbbl", identifier: "1234567890", subtype: "saving", openingBalanceMinor: 0, openingDate: "2026-01-01" };
const mfs = { type: "mobile", name: "Rahim Uddin", provider: "x", providerCode: "bkash", identifier: "01712345678", openingBalanceMinor: 0, openingDate: "2026-01-01" };

beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = rs.getUri();
  await (await import("@/lib/db")).connectDB();
  svc = await import("@/lib/services/accounts");
  LedgerEntry = (await import("@/lib/models/LedgerEntry")).default;
  Operation = (await import("@/lib/models/Operation")).default;
  Account = (await import("@/lib/models/Account")).default;
});
afterAll(async () => { await mongoose.disconnect(); await rs.stop(); });
beforeEach(async () => { await Promise.all([LedgerEntry, Operation, Account, (await import("@/lib/models/AuditLog")).default].map((m) => m.deleteMany({}))); });

async function post(userId, accountId, amountMinor, kind = "income") {
  const op = await Operation.create({ userId, kind, title: "t", date: new Date() });
  await LedgerEntry.create({ userId, operationId: op._id, accountId, amountMinor, date: new Date() });
  return op;
}

describe("accounts", () => {
  it("balance equals opening balance plus ledger entries", async () => {
    const a = await svc.createAccount(A, base);
    expect(a.balanceMinor).toBe(100000);
    await post(A, a.id, 25050); await post(A, a.id, -5000, "expense");
    expect((await svc.getAccount(A, a.id)).balanceMinor).toBe(120050);
  });
  it("a reversal entry nets the original out", async () => {
    const a = await svc.createAccount(A, base);
    const op = await post(A, a.id, 7000);
    await LedgerEntry.create({ userId: A, operationId: op._id, accountId: a.id, amountMinor: -7000, date: new Date(), reversalOf: op._id });
    expect((await svc.getAccount(A, a.id)).balanceMinor).toBe(100000);
  });
  it("isolates users", async () => {
    const a = await svc.createAccount(A, base);
    await expect(svc.getAccount(B, a.id)).rejects.toMatchObject({ status: 404 });
    await expect(svc.updateAccount(B, a.id, { name: "x" })).rejects.toMatchObject({ status: 404 });
    expect(await svc.listAccounts(B)).toHaveLength(0);
  });
  it("locks opening balance once transactions exist", async () => {
    const a = await svc.createAccount(A, base);
    await svc.updateAccount(A, a.id, { openingBalanceMinor: 5000 });
    await post(A, a.id, 100);
    await expect(svc.updateAccount(A, a.id, { openingBalanceMinor: 1 })).rejects.toMatchObject({ status: 409 });
    expect((await svc.updateAccount(A, a.id, { name: "Renamed" })).name).toBe("Renamed");
  });
  it("archives only at zero balance and hides archived accounts", async () => {
    const a = await svc.createAccount(A, base);
    await expect(svc.updateAccount(A, a.id, { status: "archived" })).rejects.toMatchObject({ status: 409 });
    const z = await svc.createAccount(A, { ...base, name: "Empty", openingBalanceMinor: 0 });
    await svc.updateAccount(A, z.id, { status: "archived" });
    expect((await svc.listAccounts(A)).map((x) => x.name)).toEqual(["DBBL"]);
    expect(await svc.listAccounts(A, { status: "archived" })).toHaveLength(1);
  });
  it("masks identifiers and writes audit logs", async () => {
    const a = await svc.createAccount(A, { ...base, identifier: "1234567890" });
    expect(a.numberLabel).toBe("••••567890");
    expect(JSON.stringify(a)).not.toContain("1234567890");
    const AuditLog = (await import("@/lib/models/AuditLog")).default;
    expect(await AuditLog.countDocuments({ userId: A, action: "account.create" })).toBe(1);
  });
  it("pages history and totals by kind", async () => {
    const a = await svc.createAccount(A, base);
    for (let i = 0; i < 3; i++) await post(A, a.id, 1000);
    await post(A, a.id, -400, "expense");
    const h = await svc.getAccountHistory(A, a.id, { page: 1, limit: 2 });
    expect(h.items).toHaveLength(2); expect(h.total).toBe(4);
    expect(h.byKind).toMatchObject({ income: 3000, expense: -400 });
  });
  it("stores bank details and card last 4 only, never the full card number", async () => {
    const a = await svc.createAccount(A, { ...bank, branch: "Gulshan", routingNumber: "090261234", cardType: "debit", cardNumber: "4111111111111111" });
    expect(a).toMatchObject({ provider: "Dutch-Bangla Bank PLC", subtype: "saving", branch: "Gulshan", cardType: "debit", cardLast4: "1111", cardMasked: "•••• 1111", numberLabel: "••••567890", active: true });
    const raw = JSON.stringify(await Account.findById(a.id).lean());
    expect(raw).not.toContain("4111111111111111"); expect(JSON.stringify(a)).not.toContain("1234567890");
    expect(JSON.stringify(await (await import("@/lib/models/AuditLog")).default.find({}).lean())).not.toContain("1234567890");
  });
  it("shows an MFS number in full and can mark the account inactive, then edit and remove the card", async () => {
    const m = await svc.createAccount(A, mfs); expect(m).toMatchObject({ provider: "bKash", numberLabel: "01712345678", active: true });
    expect((await svc.updateAccount(A, m.id, { active: false })).active).toBe(false);
    const b = await svc.createAccount(A, { ...bank, cardType: "credit", cardNumber: "5500 0000 0000 0004" });
    expect((await svc.updateAccount(A, b.id, { cardType: null })).cardMasked).toBeUndefined();
    await expect(svc.updateAccount(A, b.id, { cardType: "debit" })).rejects.toMatchObject({ status: 400 });
    expect((await svc.updateAccount(A, b.id, { cardType: "debit", cardNumber: "9999" })).cardMasked).toBe("•••• 9999");
  });
  it("validates update fields for the account's own type", async () => {
    const c = await svc.createAccount(A, { type: "cash", name: "Wallet", openingBalanceMinor: 0, openingDate: "2026-01-01" });
    await expect(svc.updateAccount(A, c.id, { branch: "x" })).rejects.toThrow();            // cash has no branch
    const m = await svc.createAccount(A, mfs);
    await expect(svc.updateAccount(A, m.id, { identifier: "123" })).rejects.toThrow();     // not a mobile number
  });
});
describe("account input rules", () => {
  it("accepts good bank and MFS input and normalizes mobile numbers", async () => {
    const { parseCreateAccount } = await import("@/lib/schemas/account");
    expect(parseCreateAccount({ ...mfs, identifier: "+880 1712-345678" }).identifier).toBe("01712345678");
    expect(parseCreateAccount({ ...bank, identifier: "1234 5678 90" }).identifier).toBe("1234567890");
    expect(parseCreateAccount({ ...bank, providerCode: "other", provider: "Some Co-op Bank" }).provider).toBe("Some Co-op Bank");
  });
  it("rejects missing or malformed details", async () => {
    const { parseCreateAccount: p } = await import("@/lib/schemas/account");
    const bad = (v) => expect(() => p(v)).toThrow();
    bad({ ...bank, identifier: undefined }); bad({ ...bank, subtype: "fixed" }); bad({ ...bank, routingNumber: "123" }); bad({ ...bank, providerCode: "nosuchbank" });
    bad({ ...bank, cardType: "debit" }); bad({ ...bank, cardNumber: "4111" });                // card type and number go together
    bad({ ...mfs, identifier: "12345" }); bad({ ...mfs, providerCode: "dbbl" });            // a bank is not an MFS provider
    bad({ type: "cash", name: "W", openingBalanceMinor: 0, openingDate: "2026-01-01", provider: "x" }); bad({ ...mfs, openingDate: "2026-02-31" });
  });
});
describe("inactive accounts", () => {
  it("block new postings and transfers, but their history can still be corrected", async () => {
    const { listCategories } = await import("@/lib/services/categories"); const tx = await import("@/lib/services/transactions"); const tr = await import("@/lib/services/transfers"); const loans = await import("@/lib/services/loans");
    const m = await svc.createAccount(A, { ...mfs, openingBalanceMinor: 10000 }); const c = await svc.createAccount(A, { type: "cash", name: "Wallet", openingBalanceMinor: 10000, openingDate: "2026-01-01" });
    const inc = (await listCategories(A, "income"))[0];
    const t = await tx.createTransaction(A, { kind: "income", amountMinor: 500, title: "x", categoryId: inc.id, accountId: m.id, date: "2026-03-01" });
    await svc.updateAccount(A, m.id, { active: false });
    const post = { kind: "income", amountMinor: 500, title: "y", categoryId: inc.id, accountId: m.id, date: "2026-03-02" };
    await expect(tx.createTransaction(A, post)).rejects.toMatchObject({ status: 409 });
    await expect(tr.createTransfer(A, { fromAccountId: c.id, toAccountId: m.id, amountMinor: 100, date: "2026-03-02" })).rejects.toMatchObject({ status: 409 });
    await expect(loans.createLoan(A, { direction: "lent", counterparty: "R", principalMinor: 100, accountId: m.id, date: "2026-03-02" })).rejects.toMatchObject({ status: 409 });
    await tx.deleteTransaction(A, t.id);                                                         // reversal still allowed
    expect((await svc.getAccount(A, m.id)).balanceMinor).toBe(10000);
    expect((await svc.listAccounts(A)).find((x) => x.id === m.id).active).toBe(false);          // still listed, balance still counts
  });
});
describe("bank list and transfer history", () => {
  it("has a clean bank and MFS list", async () => {
    const { BANKS, MFS_PROVIDERS, findBank } = await import("@/lib/banks");
    const codes = [...BANKS, ...MFS_PROVIDERS].map((x) => x.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(BANKS.length).toBeGreaterThan(50); expect(MFS_PROVIDERS.map((m) => m.name)).toEqual(expect.arrayContaining(["bKash", "Nagad", "Rocket", "Upay"]));
    expect(findBank("dbbl").name).toBe("Dutch-Bangla Bank PLC"); expect(BANKS.every((b) => b.name && b.short && b.group)).toBe(true);
  });
  it("includes account details in transfer history so the screen can show icons", async () => {
    const tr = await import("@/lib/services/transfers");
    const b = await svc.createAccount(A, { ...bank, openingBalanceMinor: 9000 }); const m = await svc.createAccount(A, mfs);
    await tr.createTransfer(A, { fromAccountId: b.id, toAccountId: m.id, amountMinor: 2500, date: "2026-03-05", note: "top up" });
    expect((await tr.listTransfers(A)).items[0]).toMatchObject({ amountMinor: 2500, note: "top up", from: { type: "bank", providerCode: "dbbl" }, to: { type: "mobile", providerCode: "bkash" } });
  });
});
