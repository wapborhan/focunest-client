import { route } from "@/lib/api";
import { updateTransactionSchema } from "@/lib/schemas/transaction";
import { getTransaction, updateTransaction, deleteTransaction } from "@/lib/services/transactions";
export const GET = route(({ user, params }) => getTransaction(user.uid, params.id));
export const PATCH = route(async ({ req, user, params }) => updateTransaction(user.uid, params.id, updateTransactionSchema.parse(await req.json().catch(() => null))));
export const DELETE = route(({ user, params }) => deleteTransaction(user.uid, params.id));
