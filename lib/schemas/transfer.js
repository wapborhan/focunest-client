import { z } from "zod";
import { oid, ymd } from "./transaction";
export const createTransferSchema = z.object({
  fromAccountId: oid, toAccountId: oid, amountMinor: z.number().int().min(1).max(1e13), date: ymd,
  note: z.string().trim().max(500).optional(), idempotencyKey: z.string().min(8).max(80).optional(),
}).strict().refine((v) => v.fromAccountId !== v.toAccountId, { path: ["toAccountId"], message: "Choose a different account" });
export const listTransfersQuery = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
