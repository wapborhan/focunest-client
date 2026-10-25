import { route, created } from "@/lib/api";
import { repaymentSchema } from "@/lib/schemas/loan";
import { addRepayment } from "@/lib/services/loans";
export const POST = route(async ({ req, user, params }) => created(await addRepayment(user.uid, params.id, repaymentSchema.parse(await req.json().catch(() => null)))));
