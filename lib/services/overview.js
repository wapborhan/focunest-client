import { connectDB } from "../db";
import { dhakaDateToUTC, addDays } from "../dates";
import Operation from "../models/Operation";
import { accountBalances, resolveRange } from "./reports";
/**
 * The numbers behind the main dashboard's five cards.
 * Income and expenses are totals of income/expense entries dated inside the chosen period (both end dates included),
 * never transfers or loans. Total balance, lent and borrowed are as of now.
 */
export async function getOverview(userId, query = {}) {
  await connectDB();
  const { from, to } = resolveRange(query);
  const [rows, bal] = await Promise.all([
    Operation.aggregate([
      { $match: { userId, kind: { $in: ["income", "expense"] }, status: "posted", date: { $gte: dhakaDateToUTC(from), $lt: dhakaDateToUTC(addDays(to, 1)) } } },
      { $group: { _id: "$kind", t: { $sum: "$amountMinor" } } },
    ]),
    accountBalances(userId),
  ]);
  const by = Object.fromEntries(rows.map((r) => [r._id, r.t]));
  return { range: { from, to }, totals: { incomeMinor: by.income ?? 0, expenseMinor: by.expense ?? 0 }, balances: { availableMinor: bal.balances.availableMinor }, loans: bal.loans };
}
