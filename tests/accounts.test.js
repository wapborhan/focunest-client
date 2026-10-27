import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

let rs, svc, LedgerEntry, Operation, Account;
const A = "user-a", B = "user-b";
const base = { type: "bank", name: "DBBL", provider: "Dutch-Bangla", openingBalanceMinor: 100000, openingDate: "2026-01-01" };

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
    expect(a.identifierMasked).toBe("••••7890");
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
});
