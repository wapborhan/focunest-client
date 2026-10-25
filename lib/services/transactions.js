import mongoose from "mongoose";
import { connectDB } from "../db";
import { withTx } from "../tx";
import { ApiError, notFound, conflict } from "../errors";
import { dhakaDateToUTC, dhakaToday, addDays, addMonths } from "../dates";
import Account from "../models/Account";
import Operation from "../models/Operation";
import LedgerEntry from "../models/LedgerEntry";
import AuditLog from "../models/AuditLog";
import Category from "../models/Category";

const SIGN = { income: 1, expense: -1 };
const oid = (id) => new mongoose.Types.ObjectId(String(id));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const snap = (o) => ({ title: o.title, amountMinor: o.amountMinor, accountId: o.accountId, categoryId: o.categoryId, date: o.date, paymentMethod: o.paymentMethod, note: o.note, reference: o.reference, status: o.status });

/** Locks accounts by bumping their version, so concurrent postings conflict and retry instead of racing. */
export async function lockAccounts(userId, ids, session) {
  const map = new Map();
  for (const id of [...new Set(ids.map(String))].sort()) {
    const a = await Account.findOneAndUpdate({ _id: id, userId }, { $inc: { version: 1 } }, { new: true, session });
    if (!a) throw notFound("Account");
    map.set(id, a);
  }
  return map;
}
export async function balances(userId, accounts, session) {
  const rows = await LedgerEntry.aggregate([{ $match: { userId, accountId: { $in: [...accounts.keys()].map(oid) } } }, { $group: { _id: "$accountId", t: { $sum: "$amountMinor" } } }]).session(session);
  const sums = new Map(rows.map((r) => [String(r._id), r.t]));
  return new Map([...accounts].map(([id, a]) => [id, a.openingBalanceMinor + (sums.get(id) ?? 0)]));
}
/** Rejects any change that pushes an account below zero (unless the account allows it). */
export async function guard(userId, accounts, before, session) {
  const after = await balances(userId, accounts, session);
  for (const [id, a] of accounts) if (!a.allowNegative && after.get(id) < 0 && after.get(id) < before.get(id)) throw conflict(`${a.name} doesn't have enough balance for this change.`);
}
async function assertCategory(userId, kind, categoryId, session) {
  if (!(await Category.exists({ _id: categoryId, userId, kind, archived: false }).session(session))) throw new ApiError(400, "invalid_category", "Choose a valid category.");
}
export const openEntries = async (userId, operationId, session) => {
  const all = await LedgerEntry.find({ userId, operationId }).session(session);
  const reversed = new Set(all.filter((e) => e.reversalOf).map((e) => String(e.reversalOf)));
  return all.filter((e) => !e.reversalOf && !reversed.has(String(e._id)));
};
export const reverse = (userId, entries, session) => entries.length
  ? LedgerEntry.create(entries.map((e) => ({ userId, operationId: e.operationId, accountId: e.accountId, amountMinor: -e.amountMinor, date: e.date, reversalOf: e._id })), { session, ordered: true }) : null;
async function loadOp(userId, id, session) {
  if (!mongoose.isValidObjectId(id)) throw notFound("Transaction");
  const op = await Operation.findOne({ _id: id, userId, status: "posted", kind: { $in: ["income", "expense"] } }).session(session ?? null);
  if (!op) throw notFound("Transaction");
  return op;
}
async function hydrate(userId, ops) {
  const [accs, cats] = await Promise.all([
    Account.find({ userId, _id: { $in: ops.map((o) => o.accountId) } }).select("name").lean(),
    Category.find({ userId, _id: { $in: ops.map((o) => o.categoryId) } }).select("nameEn nameBn").lean(),
  ]);
  const A = new Map(accs.map((a) => [String(a._id), a.name])), C = new Map(cats.map((c) => [String(c._id), c]));
  return ops.map((o) => ({
    id: String(o._id), kind: o.kind, title: o.title, amountMinor: o.amountMinor, date: o.date.toISOString(),
    accountId: String(o.accountId), accountName: A.get(String(o.accountId)), categoryId: String(o.categoryId),
    categoryName: C.get(String(o.categoryId))?.nameEn, categoryNameBn: C.get(String(o.categoryId))?.nameBn,
    paymentMethod: o.paymentMethod, note: o.note, reference: o.reference,
  }));
}
const one = async (userId, op) => (await hydrate(userId, [op]))[0];

export async function createTransaction(userId, input) {
  await connectDB();
  if (input.idempotencyKey) {
    const dup = await Operation.findOne({ userId, idempotencyKey: input.idempotencyKey });
    if (dup) return one(userId, dup);   // replay of a request we already processed
  }
  const op = await withTx(async (session) => {
    await assertCategory(userId, input.kind, input.categoryId, session);
    const accts = await lockAccounts(userId, [input.accountId], session);
    if (accts.get(String(input.accountId)).status !== "active") throw conflict("This account is archived.");
    const prior = await balances(userId, accts, session);
    const date = dhakaDateToUTC(input.date);
    const { date: _d, ...rest } = input;
    const [o] = await Operation.create([{ userId, ...rest, date }], { session });
    await LedgerEntry.create([{ userId, operationId: o._id, accountId: o.accountId, amountMinor: SIGN[o.kind] * o.amountMinor, date }], { session });
    await guard(userId, accts, prior, session);
    await AuditLog.create([{ userId, action: `${o.kind}.create`, entity: "Operation", entityId: o._id, after: snap(o) }], { session });
    return o;
  });
  return one(userId, op);
}

/** Edits never rewrite history: changed amount/account/date reverse the old entry and post a new one. */
export async function updateTransaction(userId, id, patch) {
  await connectDB();
  const op = await withTx(async (session) => {
    const o = await loadOp(userId, id, session);
    const before = snap(o);
    if (patch.categoryId) await assertCategory(userId, o.kind, patch.categoryId, session);
    const next = { amountMinor: patch.amountMinor ?? o.amountMinor, accountId: String(patch.accountId ?? o.accountId), date: patch.date ? dhakaDateToUTC(patch.date) : o.date };
    if (next.amountMinor !== o.amountMinor || next.accountId !== String(o.accountId) || +next.date !== +o.date) {
      const open = await openEntries(userId, o._id, session);
      const accts = await lockAccounts(userId, [...open.map((e) => e.accountId), next.accountId], session);
      if (next.accountId !== String(o.accountId) && accts.get(next.accountId).status !== "active") throw conflict("This account is archived.");
      const prior = await balances(userId, accts, session);
      await reverse(userId, open, session);
      await LedgerEntry.create([{ userId, operationId: o._id, accountId: next.accountId, amountMinor: SIGN[o.kind] * next.amountMinor, date: next.date }], { session });
      await guard(userId, accts, prior, session);
    }
    const { date: _d, ...rest } = patch;
    o.set(rest); o.date = next.date;
    await o.save({ session });
    await AuditLog.create([{ userId, action: `${o.kind}.update`, entity: "Operation", entityId: o._id, before, after: snap(o) }], { session });
    return o;
  });
  return one(userId, op);
}
/** Soft delete: reverses the ledger effect and keeps the record for audit. */
export async function deleteTransaction(userId, id) {
  await connectDB();
  await withTx(async (session) => {
    const o = await loadOp(userId, id, session);
    const open = await openEntries(userId, o._id, session);
    const accts = await lockAccounts(userId, open.map((e) => e.accountId), session);
    const prior = await balances(userId, accts, session);
    const before = snap(o);
    await reverse(userId, open, session);
    o.status = "voided"; await o.save({ session });
    await guard(userId, accts, prior, session);
    await AuditLog.create([{ userId, action: `${o.kind}.delete`, entity: "Operation", entityId: o._id, before, after: snap(o) }], { session });
  });
  return { ok: true };
}
export async function getTransaction(userId, id) { await connectDB(); return one(userId, await loadOp(userId, id)); }

function buildFilter(userId, q) {
  const f = { userId, kind: q.kind, status: "posted" };
  if (q.from || q.to) f.date = { ...(q.from && { $gte: dhakaDateToUTC(q.from) }), ...(q.to && { $lt: dhakaDateToUTC(addDays(q.to, 1)) }) };
  if (q.categoryId) f.categoryId = oid(q.categoryId);
  if (q.accountId) f.accountId = oid(q.accountId);
  if (q.source) f.title = q.source;
  if (q.q) { const r = new RegExp(esc(q.q), "i"); f.$or = [{ title: r }, { note: r }, { reference: r }]; }
  return f;
}
const sum = async (f) => (await Operation.aggregate([{ $match: f }, { $group: { _id: null, t: { $sum: "$amountMinor" } } }]))[0]?.t ?? 0;

export async function listTransactions(userId, q, { forExport = false } = {}) {
  await connectDB();
  const f = buildFilter(userId, q);
  const sort = { [q.sort === "amount" ? "amountMinor" : "date"]: q.dir === "asc" ? 1 : -1, _id: -1 };
  const limit = forExport ? 5000 : q.limit, skip = forExport ? 0 : (q.page - 1) * q.limit;
  const [rows, total, totalAmountMinor] = await Promise.all([Operation.find(f).sort(sort).skip(skip).limit(limit).lean(), Operation.countDocuments(f), sum(f)]);
  return { items: await hydrate(userId, rows), page: q.page, limit, total, totalAmountMinor };
}
/** Totals for today, this month and this year, using Dhaka calendar boundaries. */
export async function periodTotals(userId, kind) {
  await connectDB();
  const today = dhakaToday(), month = `${today.slice(0, 7)}-01`, year = `${today.slice(0, 4)}-01-01`;
  const range = (from, toExcl) => sum({ userId, kind, status: "posted", date: { $gte: dhakaDateToUTC(from), $lt: dhakaDateToUTC(toExcl) } });
  const [t, m, y] = await Promise.all([range(today, addDays(today, 1)), range(month, addMonths(month, 1)), range(year, addMonths(year, 12))]);
  return { today: t, month: m, year: y };
}
