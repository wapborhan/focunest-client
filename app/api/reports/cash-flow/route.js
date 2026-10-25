import { route } from "@/lib/api";
import { rangeQuery } from "@/lib/schemas/report";
import { cashFlow } from "@/lib/services/reports";
export const GET = route(({ req, user }) => cashFlow(user.uid, rangeQuery.parse(Object.fromEntries(new URL(req.url).searchParams))));
