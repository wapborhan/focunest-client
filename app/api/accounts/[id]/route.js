import { route } from "@/lib/api";
import { historyQuery } from "@/lib/schemas/account";
import { getAccount, updateAccount, getAccountHistory } from "@/lib/services/accounts";
export const GET = route(async ({ req, user, params }) => {
  const q = historyQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  const [account, history] = await Promise.all([getAccount(user.uid, params.id), getAccountHistory(user.uid, params.id, q)]);
  return { account, history };
});
export const PATCH = route(async ({ req, user, params }) => updateAccount(user.uid, params.id, await req.json().catch(() => null)));
