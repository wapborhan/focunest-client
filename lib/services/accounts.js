import mongoose from "mongoose";
import { connectDB } from "../db";
import { withTx } from "../tx";
import { notFound, conflict } from "../errors";
import { dhakaDateToUTC } from "../dates";
import Account from "../models/Account";
import LedgerEntry from "../models/LedgerEntry";
import Operation from "../models/Operation";
import AuditLog from "../models/AuditLog";

const mask = (v) => (v ? `••••${v.slice(-4)}` : undefined);
const toDTO = (a, sum = { total: 0, count: 0 }) => ({
  id: String(a._id), name: a.name, type: a.type, provider: a.provider, identifierMasked: mask(a.identifier),
  openingBalanceMinor: a.openingBalanceMinor, openingDate: a.openingDate.toISOString(), notes: a.notes,
  status: a.status, allowNegative: a.allowNegative, entryCount: sum.count,
  balanceMinor: a.openingBalanceMinor + sum.total,   // balance = opening + sum of all ledger entries
});
const snapshot = (a) => ({ name: a.name, provider: a.provider, openingBalanceMinor: a.openingBalanceMinor, openingDate: a.openingDate, notes: a.notes, status: a.status, allowNegative: a.allowNegative });

/** Sum and count of ledger entries per account. Reversals are entries too, so they net out. */
async function sums(userId, ids, session) {
  const rows = await LedgerEntry.aggregate([{ $match: { userId, accountId: { $in: ids } } }, { $group: { _id: "$accountId", total: { $sum: "$amountMinor" }, count: { $sum: 1 } } }]).session(session ?? null);
  return new Map(rows.map((r) => [String(r._id), r]));
}
const parseId = (id) => { if (!mongoose.isValidObjectId(id)) throw notFound("Account"); return id; };
async function load(userId, id, session) {
  const a = await Account.findOne({ _id: parseId(id), userId }).session(session ?? null);
  if (!a) throw notFound("Account");
  return a;
}

export async function listAccounts(userId, { type, status = "active" } = {}) {
  await connectDB();
  const accounts = await Account.find({ userId, ...(type && { type }), ...(status && { status }) }).sort({ createdAt: 1 }).lean();
  const m = await sums(userId, accounts.map((a) => a._id));
  return accounts.map((a) => toDTO(a, m.get(String(a._id))));
}
export async function getAccount(userId, id) {
  await connectDB();
  const a = await load(userId, id);
  return toDTO(a, (await sums(userId, [a._id])).get(String(a._id)));
}
export async function createAccount(userId, input) {
  await connectDB();
  const doc = { userId, ...input, openingDate: dhakaDateToUTC(input.openingDate) };
  return withTx(async (session) => {
    const [a] = await Account.create([doc], { session });
    await AuditLog.create([{ userId, action: "account.create", entity: "Account", entityId: a._id, after: snapshot(a) }], { session });
    return toDTO(a);
  });
}
export async function updateAccount(userId, id, patch) {
  await connectDB();
  return withTx(async (session) => {
    const a = await load(userId, id, session);
    const s = (await sums(userId, [a._id], session)).get(String(a._id)) ?? { total: 0, count: 0 };
    if ((patch.openingBalanceMinor !== undefined || patch.openingDate !== undefined) && s.count > 0)
      throw conflict("Opening balance and date can't change once the account has transactions.");
    if (patch.status === "archived" && a.openingBalanceMinor + s.total !== 0)
      throw conflict("Move the remaining balance to another account before archiving.");
    const before = snapshot(a);
    const { openingDate, ...rest } = patch;
    a.set(rest);
    if (openingDate) a.openingDate = dhakaDateToUTC(openingDate);
    await a.save({ session });
    await AuditLog.create([{ userId, action: patch.status ? `account.${patch.status}` : "account.update", entity: "Account", entityId: a._id, before, after: snapshot(a) }], { session });
    return toDTO(a, s);
  });
}
/** Paged ledger history plus totals by operation kind. */
export async function getAccountHistory(userId, id, { page = 1, limit = 20 } = {}) {
  await connectDB();
  const a = await load(userId, id);
  const match = { userId, accountId: a._id };
  const [entries, total, kinds] = await Promise.all([
    LedgerEntry.find(match).sort({ date: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    LedgerEntry.countDocuments(match),
    LedgerEntry.aggregate([{ $match: match }, { $lookup: { from: Operation.collection.name, localField: "operationId", foreignField: "_id", as: "op" } }, { $unwind: "$op" }, { $group: { _id: "$op.kind", total: { $sum: "$amountMinor" } } }]),
  ]);
  const ops = new Map((await Operation.find({ _id: { $in: entries.map((e) => e.operationId) }, userId }).select("kind title").lean()).map((o) => [String(o._id), o]));
  return {
    items: entries.map((e) => ({ id: String(e._id), date: e.date.toISOString(), amountMinor: e.amountMinor, kind: ops.get(String(e.operationId))?.kind, title: ops.get(String(e.operationId))?.title, isReversal: !!e.reversalOf })),
    page, limit, total, byKind: Object.fromEntries(kinds.map((k) => [k._id, k.total])),
  };
}
