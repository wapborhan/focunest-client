import { route } from "@/lib/api";
import { accountBalances } from "@/lib/services/reports";
export const GET = route(({ user }) => accountBalances(user.uid));
