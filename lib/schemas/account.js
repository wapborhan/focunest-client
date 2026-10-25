import { z } from "zod";
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const base = {
  name: z.string().trim().min(1).max(60),
  provider: z.string().trim().max(60).optional(),
  identifier: z.string().trim().max(40).optional(),
  openingBalanceMinor: z.number().int().min(0).max(1e13),
  openingDate: ymd,
  notes: z.string().trim().max(500).optional(),
  allowNegative: z.boolean(),
};
export const createAccountSchema = z.object({ type: z.enum(["cash", "bank", "mobile"]), ...base })
  .partial({ allowNegative: true }).strict()
  .refine((v) => v.type !== "mobile" || !!v.provider, { path: ["provider"], message: "Choose a provider such as bKash" });
export const updateAccountSchema = z.object({ ...base, status: z.enum(["active", "archived"]) }).partial().strict()
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });
export const listAccountsQuery = z.object({ type: z.enum(["cash", "bank", "mobile"]).optional(), status: z.enum(["active", "archived"]).optional() });
export const historyQuery = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
