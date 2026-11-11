import { notFound, redirect } from "next/navigation";
import { requirePageUser } from "@/lib/auth";
import { getLoan } from "@/lib/services/loans";
import { listAccounts } from "@/lib/services/accounts";
import { loanHref } from "@/lib/loan-routes";
import LoanDetail from "../LoanDetail";
export default async function LoanDetailPage({ direction, params }) {
  const user = await requirePageUser(); const { id } = await params; let loan, accounts;
  try { [loan, accounts] = await Promise.all([getLoan(user.uid, id), listAccounts(user.uid)]); }
  catch (e) { if (e?.status === 404) notFound(); throw e; }
  if (loan.direction !== direction) redirect(loanHref(loan));   // e.g. a borrowing link opened under /cash/lending
  return <LoanDetail loan={loan} accounts={accounts} />;
}
