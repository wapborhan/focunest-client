import { z } from "zod";
import { oid, ymd } from "./transaction";
const phone = z.string().trim().regex(/^\+?[\d\s-]{6,19}$/, "Enter a valid phone number");
const amount = z.number().int().min(1).max(1e13);
export const createLoanSchema = z.object({
  direction: z.enum(["lent", "borrowed"]), counterparty: z.string().trim().min(1).max(80), phone: phone.optional(),
  principalMinor: amount, accountId: oid, date: ymd, dueDate: ymd.optional(), notes: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().min(8).max(80).optional(),
}).strict().refine((v) => !v.dueDate || v.dueDate >= v.date, { path: ["dueDate"], message: "Due date can't be before the loan date" });
export const updateLoanSchema = z.object({
  counterparty: z.string().trim().min(1).max(80), phone: phone.nullable(), dueDate: ymd.nullable(), notes: z.string().trim().max(500).nullable(),
}).partial().strict().refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });
export const repaymentSchema = z.object({ amountMinor: amount, accountId: oid, date: ymd, note: z.string().trim().max(500).optional(), idempotencyKey: z.string().min(8).max(80).optional() }).strict();
export const listLoansQuery = z.object({
  direction: z.enum(["lent", "borrowed"]).optional(), status: z.enum(["outstanding", "partial", "repaid"]).optional(),
  q: z.string().trim().max(60).optional(), dueFrom: ymd.optional(), dueTo: ymd.optional(), overdue: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20),
});
