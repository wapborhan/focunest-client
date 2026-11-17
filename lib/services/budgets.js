import mongoose from "mongoose";
import { connectDB } from "../db";
import { withTx } from "../tx";
import { ApiError, notFound } from "../errors";
import { dhakaDateToUTC, dhakaToday, addMonths, daysInMonth, currentMonth } from "../dates";
import Budget from "../models/Budget";
import Category from "../models/Category";
import Operation from "../models/Operation";
import AuditLog from "../models/AuditLog";
import { listCategories } from "./categories";

const MONTH = /^(20\d{2}|2100)-(0[1-9]|1[0-2])$/;
const checkMonth = (m) => { if (!MONTH.test(m ?? "")) throw new ApiError(400, "invalid_input", "Use a month like 2026-11."); return m; };
/** Under 80% of the limit is fine, 80% up to and including 100% is a warning, anything above 100% is over. */
export const statusOf = (spent, budget) => (spent > budget ? "over" : spent * 100 >= budget * 80 ? "warning" : "ok");
const pct = (spent, budget) => Math.round((spent / budget) * 1000) / 10;
const sum = (xs) => xs.reduce((s, x) => s + x, 0);
/** From rows sorted oldest first, the row in force for each category. A row with no amount means the budget was stopped. */
function inForce(rows) {
  const m = new Map(); for (const r of rows) m.set(r.categoryId ? String(r.categoryId) : "total", r);
  return new Map([...m].filter(([, r]) => r.amountMinor != null));
}
const amountAt = async (userId, categoryId, month, session) => (await Budget.findOne({ userId, categoryId: categoryId || null, month: { $lte: month } }).sort({ month: -1 }).session(session ?? null).lean())?.amountMinor ?? null;

/** Budget against actual spending for one month. Only income-free expense entries count: transfers, loans and repayments never do. */
export async function getBudgetStatus(userId, month = currentMonth()) {
  checkMonth(month); await connectDB();
  await listCategories(userId, "expense");   // makes sure the default categories exist
  const from = `${month}-01`, next = addMonths(from, 1);
  const [cats, spentRows, rows] = await Promise.all([
    Category.find({ userId, kind: "expense" }).lean(),
    Operation.aggregate([{ $match: { userId, kind: "expense", status: "posted", date: { $gte: dhakaDateToUTC(from), $lt: dhakaDateToUTC(next) } } }, { $group: { _id: "$categoryId", t: { $sum: "$amountMinor" }, n: { $sum: 1 } } }]),
    Budget.find({ userId, month: { $lte: month } }).sort({ month: 1 }).lean(),
  ]);
  const spentBy = new Map(spentRows.map((r) => [String(r._id), r])); const totalSpent = sum(spentRows.map((r) => r.t));
  const force = inForce(rows); const totalRow = force.get("total");
  const lines = [];
  for (const c of cats) {
    const id = String(c._id), b = force.get(id), spent = spentBy.get(id)?.t ?? 0;
    if (c.archived && !b && !spent) continue;   // an archived category only shows if it matters this month
    const budget = b?.amountMinor ?? null;
    lines.push({ categoryId: id, nameEn: c.nameEn, nameBn: c.nameBn, archived: !!c.archived, budgetMinor: budget, since: b?.month ?? null, spentMinor: spent, count: spentBy.get(id)?.n ?? 0,
      remainingMinor: budget == null ? null : budget - spent, percent: budget == null ? null : pct(spent, budget), status: budget == null ? "none" : statusOf(spent, budget) });
  }
  lines.sort((a, b) => (b.budgetMinor != null) - (a.budgetMinor != null) || (b.percent ?? 0) - (a.percent ?? 0) || b.spentMinor - a.spentMinor || a.nameEn.localeCompare(b.nameEn));
  const budgeted = lines.filter((l) => l.budgetMinor != null), allocated = sum(budgeted.map((l) => l.budgetMinor)), budgetedSpent = sum(budgeted.map((l) => l.spentMinor));
  const source = totalRow ? "total" : allocated > 0 ? "categories" : null;
  const budget = totalRow ? totalRow.amountMinor : allocated || null, spent = totalRow ? totalSpent : budgetedSpent;
  const today = dhakaToday(), cur = today.slice(0, 7), days = daysInMonth(month), dayNo = Number(today.slice(8));
  const elapsed = month < cur ? 1 : month > cur ? 0 : dayNo / days;
  const overall = source && { source, budgetMinor: budget, spentMinor: spent, remainingMinor: budget - spent, percent: pct(spent, budget), status: statusOf(spent, budget), since: totalRow?.month ?? null, allocatedMinor: allocated,
    projectedMinor: month === cur ? Math.round(spent / elapsed) : null };
  return { month, currentMonth: cur, daysInMonth: days, daysLeft: month === cur ? days - dayNo : month < cur ? 0 : days, elapsed, totalSpentMinor: totalSpent, unbudgetedSpentMinor: totalSpent - budgetedSpent, overall, overCount: budgeted.filter((l) => l.status === "over").length, lines };
}

/** Set a budget from `month` onward. categoryId null is the overall monthly budget. */
export async function setBudget(userId, { categoryId = null, month, amountMinor }) {
  checkMonth(month); await connectDB();
  if (categoryId) {
    if (!mongoose.isValidObjectId(categoryId)) throw notFound("Category");
    if (!(await Category.exists({ _id: categoryId, userId, kind: "expense", archived: false }))) throw new ApiError(400, "invalid_category", "Choose an expense category.");
  }
  return withTx(async (session) => {
    const before = await amountAt(userId, categoryId, month, session), key = { userId, categoryId: categoryId || null, month };
    await Budget.updateOne(key, { $set: { amountMinor } }, { upsert: true, session });
    const row = await Budget.findOne(key).session(session);
    await AuditLog.create([{ userId, action: "budget.set", entity: "Budget", entityId: row._id, before: { categoryId: categoryId || null, month, amountMinor: before }, after: { categoryId: categoryId || null, month, amountMinor } }], { session });
    return { categoryId: categoryId || null, month, amountMinor };
  });
}
/** Stop a budget from `month` onward. Earlier months keep it. Later changes to the same budget are removed too, so it can't come back by surprise. */
export async function stopBudget(userId, { categoryId = null, month }) {
  checkMonth(month); await connectDB();
  if (categoryId && !mongoose.isValidObjectId(categoryId)) throw notFound("Budget");
  const cat = categoryId || null;
  return withTx(async (session) => {
    const before = await amountAt(userId, cat, month, session); if (before == null) throw notFound("Budget");
    const earlier = await Budget.findOne({ userId, categoryId: cat, month: { $lt: month } }).sort({ month: -1 }).session(session).lean();
    await Budget.deleteMany({ userId, categoryId: cat, month: { $gte: month } }, { session });
    if (earlier && earlier.amountMinor != null) await Budget.create([{ userId, categoryId: cat, month, amountMinor: null }], { session });
    await AuditLog.create([{ userId, action: "budget.stop", entity: "Budget", entityId: earlier?._id ?? new mongoose.Types.ObjectId(), before: { categoryId: cat, month, amountMinor: before } }], { session });
    return { ok: true };
  });
}
/** This month's limit and spending per budgeted category, for the "this will put you over" hint on the expense form. */
export const hintsFrom = (s) => Object.fromEntries(s.lines.filter((l) => l.budgetMinor != null).map((l) => [l.categoryId, { name: l.nameEn, budgetMinor: l.budgetMinor, spentMinor: l.spentMinor, month: s.month }]));
export async function getBudgetHints(userId) { return hintsFrom(await getBudgetStatus(userId)); }
