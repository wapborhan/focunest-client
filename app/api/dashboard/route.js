import { route } from "@/lib/api";
import { rangeQuery } from "@/lib/schemas/report";
import { getDashboard } from "@/lib/services/dashboard";
export const GET = route(({ req, user }) => getDashboard(user.uid, rangeQuery.pick({ from: true, to: true }).parse(Object.fromEntries(new URL(req.url).searchParams))));
