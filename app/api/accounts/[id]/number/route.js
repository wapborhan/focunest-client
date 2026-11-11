import { route } from "@/lib/api";
import { getAccountNumber } from "@/lib/services/accounts";
/** Reveal the full bank account number on request. Never cached. */
export const GET = route(async ({ user, params }) => Response.json(await getAccountNumber(user.uid, params.id), { headers: { "Cache-Control": "no-store" } }));
