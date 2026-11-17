import { route } from "@/lib/api";
import { budgetQuery, setBudgetSchema, stopBudgetQuery } from "@/lib/schemas/budget";
import { getBudgetStatus, setBudget, stopBudget } from "@/lib/services/budgets";
const params = (req) => Object.fromEntries(new URL(req.url).searchParams);
export const GET = route(({ req, user }) => getBudgetStatus(user.uid, budgetQuery.parse(params(req)).month));
export const PUT = route(async ({ req, user }) => setBudget(user.uid, setBudgetSchema.parse(await req.json().catch(() => null))));
export const DELETE = route(({ req, user }) => { const p = stopBudgetQuery.parse(params(req)); return stopBudget(user.uid, { categoryId: p.categoryId ?? null, month: p.month }); });
