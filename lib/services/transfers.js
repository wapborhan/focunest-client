import mongoose from "mongoose";
import { connectDB } from "../db";
import { withTx } from "../tx";
import { ApiError, notFound, conflict } from "../errors";
import { dhakaDateToUTC } from "../dates";
import { lockAccounts, balances, guard, openEntries, reverse } from "./transactions";
import Account from "../models/Account";
import Operation from "../models/Operation";
import LedgerEntry from "../models/LedgerEntry";
import AuditLog from "../models/AuditLog";

async function hydrate(userId, ops) {
  const accs = await Account.find({ userId, _id: { $in: ops.flatMap((o) => [o.accountId, o.toAccountId]) } }).select("name").lean();
  const n = new Map(accs.map((a) => [String(a._id), a.name]));
  return ops.map((o) => ({ id: String(o._id), fromAccountId: String(o.accountId), fromAccountName: n.get(String(o.accountId)), toAccountId: String(o.toAccountId), toAccountName: n.get(String(o.toAccountId)), amountMinor: o.amountMinor, date: o.date.toISOString(), note: o.note }));
}
/** One operation, two ledger entries (-X and +X) written together. Never counted as income or expense. */
export async function createTransfer(userId, input) {
  await connectDB();
  if (input.fromAccountId === input.toAccountId) throw new ApiError(400, "invalid_transfer", "Choose two different accounts.");
  if (input.idempotencyKey) {
    const dup = await Operation.findOne({ userId, idempotencyKey: input.idempotencyKey });
    if (dup) return (await hydrate(userId, [dup]))[0];
  }
  const op = await withTx(async (session) => {
    const accts = await lockAccounts(userId, [input.fromAccountId, input.toAccountId], session);
    const from = accts.get(String(input.fromAccountId)), to = accts.get(String(input.toAccountId));
    if (from.status !== "active" || to.status !== "active") throw conflict("An archived account can't be part of a transfer.");
    const prior = await balances(userId, accts, session);
    const date = dhakaDateToUTC(input.date);
    const [o] = await Operation.create([{ userId, kind: "transfer", title: `${from.name} to ${to.name}`, amountMinor: input.amountMinor, accountId: from._id, toAccountId: to._id, date, note: input.note, idempotencyKey: input.idempotencyKey }], { session, ordered: true });
    await LedgerEntry.create([
      { userId, operationId: o._id, accountId: from._id, amountMinor: -input.amountMinor, date },
      { userId, operationId: o._id, accountId: to._id, amountMinor: input.amountMinor, date },
    ], { session, ordered: true });
    await guard(userId, accts, prior, session);
    await AuditLog.create([{ userId, action: "transfer.create", entity: "Operation", entityId: o._id, after: { from: from.name, to: to.name, amountMinor: input.amountMinor, date } }], { session, ordered: true });
    return o;
  });
  return (await hydrate(userId, [op]))[0];
}
export async function listTransfers(userId, { page = 1, limit = 20 } = {}) {
  await connectDB();
  const f = { userId, kind: "transfer", status: "posted" };
  const [rows, total] = await Promise.all([Operation.find(f).sort({ date: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(), Operation.countDocuments(f)]);
  return { items: await hydrate(userId, rows), page, limit, total };
}
export async function deleteTransfer(userId, id) {
  await connectDB();
  await withTx(async (session) => {
    if (!mongoose.isValidObjectId(id)) throw notFound("Transfer");
    const o = await Operation.findOne({ _id: id, userId, kind: "transfer", status: "posted" }).session(session);
    if (!o) throw notFound("Transfer");
    const open = await openEntries(userId, o._id, session);
    const accts = await lockAccounts(userId, open.map((e) => e.accountId), session);
    const prior = await balances(userId, accts, session);
    await reverse(userId, open, session);
    o.status = "voided"; await o.save({ session });
    await guard(userId, accts, prior, session);
    await AuditLog.create([{ userId, action: "transfer.delete", entity: "Operation", entityId: o._id, before: { amountMinor: o.amountMinor } }], { session, ordered: true });
  });
  return { ok: true };
}
