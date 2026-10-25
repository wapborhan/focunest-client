import { connectDB } from "../db";
import { dhakaToday, dhakaDateToUTC, addDays, addMonths, monthStart } from "../dates";
import Operation from "../models/Operation";
import Account from "../models/Account";
import Loan from "../models/Loan";
import { cashFlow, accountBalances } from "./reports";
import { dto as loanDto } from "./loans";

const FLOW = { income: "in", repay_in: "in", borrow_in: "in", expense: "out", loan_out: "out", repay_out: "out", transfer: "neutral" };
async function recent(userId, limit = 8) {
  const ops = await Operation.find({ userId, status: "posted" }).sort({ date: -1, _id: -1 }).limit(limit).lean();
  const accs = await Account.find({ userId, _id: { $in: ops.map((o) => o.accountId).filter(Boolean) } }).select("name").lean();
  const n = new Map(accs.map((a) => [String(a._id), a.name]));
  return ops.map((o) => ({ id: String(o._id), kind: o.kind, flow: FLOW[o.kind], title: o.title, amountMinor: o.amountMinor, date: o.date.toISOString(), accountName: n.get(String(o.accountId)) }));
}
/** Unpaid loans that are overdue or due within 30 days, soonest first. */
async function upcoming(userId, limit = 8) {
  const horizon = dhakaDateToUTC(addDays(dhakaToday(), 31));
  const rows = await Loan.find({ userId, status: { $ne: "repaid" }, dueDate: { $lt: horizon } }).sort({ dueDate: 1 }).limit(limit).lean();
  return rows.map(loanDto);
}
export async function getDashboard(userId, query) {
  await connectDB();
  const today = dhakaToday(), m0 = addMonths(monthStart(today), -11);
  const [flow, monthly, bal, recentOps, due] = await Promise.all([
    cashFlow(userId, query), cashFlow(userId, { from: m0, to: today, group: "month" }), accountBalances(userId), recent(userId), upcoming(userId),
  ]);
  return { range: { from: flow.from, to: flow.to, group: flow.group }, totals: flow.totals, cashFlow: flow.series, monthly: monthly.series, ...bal, recent: recentOps, upcoming: due };
}
