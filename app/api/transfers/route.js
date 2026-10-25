import { route, created } from "@/lib/api";
import { createTransferSchema, listTransfersQuery } from "@/lib/schemas/transfer";
import { createTransfer, listTransfers } from "@/lib/services/transfers";
export const GET = route(({ req, user }) => listTransfers(user.uid, listTransfersQuery.parse(Object.fromEntries(new URL(req.url).searchParams))));
export const POST = route(async ({ req, user }) => created(await createTransfer(user.uid, createTransferSchema.parse(await req.json().catch(() => null)))));
