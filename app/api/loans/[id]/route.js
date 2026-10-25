import { route } from "@/lib/api";
import { updateLoanSchema } from "@/lib/schemas/loan";
import { getLoan, updateLoan } from "@/lib/services/loans";
export const GET = route(({ user, params }) => getLoan(user.uid, params.id));
export const PATCH = route(async ({ req, user, params }) => updateLoan(user.uid, params.id, updateLoanSchema.parse(await req.json().catch(() => null))));
