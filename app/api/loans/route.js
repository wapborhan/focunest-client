import { route, created } from "@/lib/api";
import { createLoanSchema, listLoansQuery } from "@/lib/schemas/loan";
import { createLoan, listLoans } from "@/lib/services/loans";
export const GET = route(({ req, user }) => listLoans(user.uid, listLoansQuery.parse(Object.fromEntries(new URL(req.url).searchParams))));
export const POST = route(async ({ req, user }) => created(await createLoan(user.uid, createLoanSchema.parse(await req.json().catch(() => null)))));
