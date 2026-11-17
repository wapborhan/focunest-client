import { z } from "zod";
import { oid } from "./transaction";
export const monthSchema = z.string().regex(/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/, "Use a month like 2026-11");
export const budgetQuery = z.object({ month: monthSchema.optional() });
/** categoryId null sets the overall monthly budget. */
export const setBudgetSchema = z.object({ categoryId: oid.nullable(), month: monthSchema, amountMinor: z.number().int().min(1).max(1e13) }).strict();
export const stopBudgetQuery = z.object({ month: monthSchema, categoryId: oid.optional() });
