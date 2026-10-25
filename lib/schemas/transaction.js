import { z } from "zod";
export const oid = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
export const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((s) => { const d = new Date(`${s}T00:00:00Z`); return !isNaN(d) && d.toISOString().slice(0, 10) === s; }, "Not a real date");
export const METHODS = ["cash", "bank_transfer", "card", "mobile_banking", "cheque", "other"];
const fields = {
  amountMinor: z.number().int().min(1).max(1e13),
  title: z.string().trim().min(1).max(120),
  categoryId: oid, accountId: oid, date: ymd,
  paymentMethod: z.enum(METHODS).optional(),
  note: z.string().trim().max(500).optional(),
  reference: z.string().trim().max(60).optional(),
};
export const createTransactionSchema = z.object({ kind: z.enum(["income", "expense"]), ...fields, idempotencyKey: z.string().min(8).max(80).optional() }).strict();
export const updateTransactionSchema = z.object(fields).partial().strict().refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });
export const listTransactionsQuery = z.object({
  kind: z.enum(["income", "expense"]), from: ymd.optional(), to: ymd.optional(),
  categoryId: oid.optional(), accountId: oid.optional(), source: z.string().trim().max(120).optional(), q: z.string().trim().max(60).optional(),
  sort: z.enum(["date", "amount"]).default("date"), dir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const totalsQuery = z.object({ kind: z.enum(["income", "expense"]) });
export const categoriesQuery = z.object({ kind: z.enum(["income", "expense"]) });
export const createCategorySchema = z.object({ kind: z.enum(["income", "expense"]), nameEn: z.string().trim().min(1).max(40), nameBn: z.string().trim().max(40).optional() }).strict();
