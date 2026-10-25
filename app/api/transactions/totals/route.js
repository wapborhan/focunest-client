import { route } from "@/lib/api";
import { totalsQuery } from "@/lib/schemas/transaction";
import { periodTotals } from "@/lib/services/transactions";
export const GET = route(({ req, user }) => periodTotals(user.uid, totalsQuery.parse(Object.fromEntries(new URL(req.url).searchParams)).kind));
