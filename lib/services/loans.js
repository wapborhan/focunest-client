import mongoose from "mongoose";
import { connectDB } from "../db";
import { withTx } from "../tx";
import { ApiError, notFound, conflict } from "../errors";
import { dhakaDateToUTC, dhakaToday, addDays } from "../dates";
import { lockAccounts, balances, guard } from "./transactions";
import Account from "../models/Account";
import Operation from "../models/Operation";
import LedgerEntry from "../models/LedgerEntry";
import AuditLog from "../models/AuditLog";
import Loan from "../models/Loan";
import Repayment from "../models/Repayment";

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const oid = (id) => new mongoose.Types.ObjectId(String(id));
const statusOf = (principal, repaid) => (repaid >= principal ? "repaid" : repaid > 0 ? "partial" : "outstanding");
const startOfToday = () => dhakaDateToUTC(dhakaToday());
export const dto = (l) => {
  const outstandingMinor = l.principalMinor - l.repaidMinor;
  return { id: String(l._id), direction: l.direction, counterparty: l.counterparty, phone: l.phone, principalMinor: l.principalMinor, repaidMinor: l.repaidMinor, outstandingMinor,
    status: l.status, overdue: !!l.dueDate && l.status !== "repaid" && l.dueDate < startOfToday(), date: l.date.toISOString(), dueDate: l.dueDate?.toISOString(), notes: l.notes, accountId: String(l.accountId) };
};
const snap = (l) => ({ counterparty: l.counterparty, phone: l.phone, dueDate: l.dueDate, notes: l.notes, repaidMinor: l.repaidMinor, status: l.status });
const loadLoan = (userId, id, session) => {
  if (!mongoose.isValidObjectId(id)) throw notFound("Loan");
  return Loan.findOne({ _id: id, userId }).session(session ?? null).then((l) => { if (!l) throw notFound("Loan"); return l; });
};

export async function createLoan(userId, input) {
  await connectDB();
  if (input.idempotencyKey) {
    const dup = await Operation.findOne({ userId, idempotencyKey: input.idempotencyKey });
    if (dup) return getLoan(userId, String(dup.loanId));
  }
  const lent = input.direction === "lent";
  const id = await withTx(async (session) => {
    const accts = await lockAccounts(userId, [input.accountId], session);
    if (accts.get(String(input.accountId)).status !== "active") throw conflict("This account is archived.");
    const prior = await balances(userId, accts, session);
    const date = dhakaDateToUTC(input.date);
    const loan = new Loan({ userId, direction: input.direction, counterparty: input.counterparty, phone: input.phone, principalMinor: input.principalMinor, accountId: input.accountId, date, dueDate: input.dueDate && dhakaDateToUTC(input.dueDate), notes: input.notes });
    const [op] = await Operation.create([{ userId, kind: lent ? "loan_out" : "borrow_in", title: input.counterparty, amountMinor: input.principalMinor, accountId: input.accountId, loanId: loan._id, date, note: input.notes, idempotencyKey: input.idempotencyKey }], { session, ordered: true });
    loan.operationId = op._id; await loan.save({ session });
    await LedgerEntry.create([{ userId, operationId: op._id, accountId: input.accountId, amountMinor: lent ? -input.principalMinor : input.principalMinor, date }], { session, ordered: true });
    await guard(userId, accts, prior, session);
    await AuditLog.create([{ userId, action: `loan.${input.direction}`, entity: "Loan", entityId: loan._id, after: { ...snap(loan), principalMinor: loan.principalMinor } }], { session, ordered: true });
    return loan._id;
  });
  return getLoan(userId, String(id));
}

/** A repayment can't exceed what is still owed. The loan row is locked so two repayments can't both pass the check. */
export async function addRepayment(userId, loanId, input) {
  await connectDB();
  if (input.idempotencyKey) {
    const dup = await Operation.findOne({ userId, idempotencyKey: input.idempotencyKey });
    if (dup) return getLoan(userId, String(dup.loanId));
  }
  await withTx(async (session) => {
    if (!mongoose.isValidObjectId(loanId)) throw notFound("Loan");
    const loan = await Loan.findOneAndUpdate({ _id: loanId, userId }, { $inc: { version: 1 } }, { new: true, session });
    if (!loan) throw notFound("Loan");
    const outstanding = loan.principalMinor - loan.repaidMinor;
    if (outstanding <= 0) throw conflict("This loan is already fully repaid.");
    if (input.amountMinor > outstanding) throw conflict(`Repayment is more than the outstanding ${(outstanding / 100).toFixed(2)} BDT.`);
    const date = dhakaDateToUTC(input.date);
    if (date < loan.date) throw new ApiError(400, "invalid_date", "A repayment can't be dated before the loan.");
    const accts = await lockAccounts(userId, [input.accountId], session);
    if (accts.get(String(input.accountId)).status !== "active") throw conflict("This account is archived.");
    const prior = await balances(userId, accts, session);
    const lent = loan.direction === "lent";   // lent: money comes back in. borrowed: money goes out.
    const [op] = await Operation.create([{ userId, kind: lent ? "repay_in" : "repay_out", title: loan.counterparty, amountMinor: input.amountMinor, accountId: input.accountId, loanId: loan._id, date, note: input.note, idempotencyKey: input.idempotencyKey }], { session, ordered: true });
    await Repayment.create([{ userId, loanId: loan._id, operationId: op._id, accountId: input.accountId, amountMinor: input.amountMinor, date, note: input.note }], { session, ordered: true });
    await LedgerEntry.create([{ userId, operationId: op._id, accountId: input.accountId, amountMinor: lent ? input.amountMinor : -input.amountMinor, date }], { session, ordered: true });
    const before = snap(loan);
    loan.repaidMinor += input.amountMinor; loan.status = statusOf(loan.principalMinor, loan.repaidMinor);
    await loan.save({ session });
    await guard(userId, accts, prior, session);
    await AuditLog.create([{ userId, action: "loan.repayment", entity: "Loan", entityId: loan._id, before, after: { ...snap(loan), repayment: input.amountMinor } }], { session, ordered: true });
  });
  return getLoan(userId, loanId);
}

export async function getLoan(userId, id) {
  await connectDB();
  const loan = await loadLoan(userId, id);
  const reps = await Repayment.find({ userId, loanId: loan._id }).sort({ date: -1, _id: -1 }).lean();
  const accs = await Account.find({ userId, _id: { $in: [loan.accountId, ...reps.map((r) => r.accountId)] } }).select("name").lean();
  const name = new Map(accs.map((a) => [String(a._id), a.name]));
  return { ...dto(loan), accountName: name.get(String(loan.accountId)),
    repayments: reps.map((r) => ({ id: String(r._id), amountMinor: r.amountMinor, date: r.date.toISOString(), accountName: name.get(String(r.accountId)), note: r.note })) };
}

/** Only descriptive fields can change. Money changes happen through repayments. */
export async function updateLoan(userId, id, patch) {
  await connectDB();
  await withTx(async (session) => {
    const loan = await loadLoan(userId, id, session);
    if (patch.dueDate && patch.dueDate < loan.date.toISOString().slice(0, 10)) throw new ApiError(400, "invalid_date", "Due date can't be before the loan date.");
    const before = snap(loan);
    const { dueDate, phone, notes, ...rest } = patch;
    loan.set(rest);
    if (dueDate !== undefined) loan.dueDate = dueDate ? dhakaDateToUTC(dueDate) : undefined;
    if (phone !== undefined) loan.phone = phone ?? undefined;
    if (notes !== undefined) loan.notes = notes ?? undefined;
    await loan.save({ session });
    await AuditLog.create([{ userId, action: "loan.update", entity: "Loan", entityId: loan._id, before, after: snap(loan) }], { session, ordered: true });
  });
  return getLoan(userId, id);
}

export async function listLoans(userId, q) {
  await connectDB();
  const and = [{ userId }], today = startOfToday();
  if (q.direction) and.push({ direction: q.direction });
  if (q.status) and.push({ status: q.status });
  if (q.q) and.push({ counterparty: new RegExp(esc(q.q), "i") });
  if (q.dueFrom) and.push({ dueDate: { $gte: dhakaDateToUTC(q.dueFrom) } });
  if (q.dueTo) and.push({ dueDate: { $lt: dhakaDateToUTC(addDays(q.dueTo, 1)) } });
  if (q.overdue === "true") and.push({ dueDate: { $lt: today }, status: { $ne: "repaid" } });
  const f = { $and: and };
  const [rows, total] = await Promise.all([Loan.find(f).sort({ date: -1, _id: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), Loan.countDocuments(f)]);
  return { items: rows.map(dto), page: q.page, limit: q.limit, total, summary: await loanSummary(userId) };
}
/** Outstanding amounts by direction plus overdue counts. Principal and repayments never count as income or expense. */
export async function loanSummary(userId) {
  await connectDB();
  const rows = await Loan.aggregate([{ $match: { userId, status: { $ne: "repaid" } } }, { $group: { _id: "$direction",
    outstandingMinor: { $sum: { $subtract: ["$principalMinor", "$repaidMinor"] } },
    overdueCount: { $sum: { $cond: [{ $and: [{ $gt: ["$dueDate", null] }, { $lt: ["$dueDate", startOfToday()] }] }, 1, 0] } } } }]);
  const by = Object.fromEntries(rows.map((r) => [r._id, r]));
  return { lentOutstandingMinor: by.lent?.outstandingMinor ?? 0, borrowedOutstandingMinor: by.borrowed?.outstandingMinor ?? 0, overdueCount: (by.lent?.overdueCount ?? 0) + (by.borrowed?.overdueCount ?? 0) };
}
