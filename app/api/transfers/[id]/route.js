import { route } from "@/lib/api";
import { deleteTransfer } from "@/lib/services/transfers";
export const DELETE = route(({ user, params }) => deleteTransfer(user.uid, params.id));
