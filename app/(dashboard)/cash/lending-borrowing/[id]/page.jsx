import { notFound, redirect } from "next/navigation";
import { requirePageUser } from "@/lib/auth";
import { getLoan } from "@/lib/services/loans";
import { loanHref } from "@/lib/loan-routes";
/** Old bookmarks: send each loan to its section (Lending or Borrowing). */
export default async function Page({ params }) {
  const user = await requirePageUser(); const { id } = await params; let loan;
  try { loan = await getLoan(user.uid, id); } catch (e) { if (e?.status === 404) notFound(); throw e; }
  redirect(loanHref(loan));
}
