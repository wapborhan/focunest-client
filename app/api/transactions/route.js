import { route, created } from "@/lib/api";
import { createTransactionSchema, listTransactionsQuery } from "@/lib/schemas/transaction";
import { createTransaction, listTransactions } from "@/lib/services/transactions";
export const GET = route(async ({ req, user }) => listTransactions(user.uid, listTransactionsQuery.parse(Object.fromEntries(new URL(req.url).searchParams))));
export const POST = route(async ({ req, user }) => created(await createTransaction(user.uid, createTransactionSchema.parse(await req.json().catch(() => null)))));
