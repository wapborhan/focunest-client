import { route, created } from "@/lib/api";
import { createAccountSchema, listAccountsQuery } from "@/lib/schemas/account";
import { listAccounts, createAccount } from "@/lib/services/accounts";
export const GET = route(async ({ req, user }) => {
  const q = listAccountsQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  return { items: await listAccounts(user.uid, q) };
});
export const POST = route(async ({ req, user }) => {
  const input = createAccountSchema.parse(await req.json().catch(() => null));
  return created(await createAccount(user.uid, input));
});
