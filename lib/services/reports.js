import { connectDB } from "../db";
import { ApiError } from "../errors";
import { dhakaDateToUTC, dhakaToday, addDays, addMonths, monthStart, TZ } from "../dates";
import Operation from "../models/Operation";
import { listAccounts } from "./accounts";
import { loanSummary } from "./loans";

export function resolveRange({ from, to, group } = {}) {
  const today = dhakaToday();
  from ??= monthStart(today); to ??= addDays(addMonths(monthStart(today), 1), -1);
  const days = Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 864e5) + 1;
  if (days < 1) throw new ApiError(400, "invalid_range", "The start date must be on or before the end date.");
  if (days > 3660) throw new ApiError(400, "invalid_range", "Choose a range of 10 years or less.");
  group ??= days <= 62 ? "day" : "month";
  if (group === "day" && days > 366) throw new ApiError(400, "invalid_range", "Daily grouping supports up to a year. Group by month instead.");
  return { from, to, group };
}
const periods = (from, to, group) => {
  const out = [];
  if (group === "day") for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  else for (let d = monthStart(from); d <= to; d = addMonths(d, 1)) out.push(d.slice(0, 7));
  return out;
};
/** Income and expenses per day or month. Only income/expense operations count: transfers and loans never appear here. */
export async function cashFlow(userId, query) {
  await connectDB();
  const { from, to, group } = resolveRange(query);
  const rows = await Operation.aggregate([
    { $match: { userId, kind: { $in: ["income", "expense"] }, status: "posted", date: { $gte: dhakaDateToUTC(from), $lt: dhakaDateToUTC(addDays(to, 1)) } } },
    { $group: { _id: { p: { $dateToString: { format: group === "day" ? "%Y-%m-%d" : "%Y-%m", date: "$date", timezone: TZ } }, k: "$kind" }, t: { $sum: "$amountMinor" } } },
  ]);
  const m = new Map(rows.map((r) => [`${r._id.p}|${r._id.k}`, r.t]));
  const series = periods(from, to, group).map((period) => {
    const incomeMinor = m.get(`${period}|income`) ?? 0, expenseMinor = m.get(`${period}|expense`) ?? 0;
    return { period, incomeMinor, expenseMinor, netMinor: incomeMinor - expenseMinor };
  });
  const incomeMinor = series.reduce((s, x) => s + x.incomeMinor, 0), expenseMinor = series.reduce((s, x) => s + x.expenseMinor, 0);
  return { from, to, group, series, totals: { incomeMinor, expenseMinor, netMinor: incomeMinor - expenseMinor } };
}
/**
 * Account balances plus loans. Net worth = money in active accounts + owed to you - you owe.
 * Transfers, lending, borrowing and repayments change where value sits, never the net worth.
 */
export async function accountBalances(userId) {
  const [accounts, loans] = await Promise.all([listAccounts(userId, { status: "active" }), loanSummary(userId)]);
  const by = (t) => accounts.filter((a) => a.type === t).reduce((s, a) => s + a.balanceMinor, 0);
  const balances = { cashMinor: by("cash"), bankMinor: by("bank"), mobileMinor: by("mobile") };
  const availableMinor = balances.cashMinor + balances.bankMinor + balances.mobileMinor;
  return { accounts, balances: { ...balances, availableMinor }, loans, netWorthMinor: availableMinor + loans.lentOutstandingMinor - loans.borrowedOutstandingMinor };
}
