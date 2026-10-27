import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth";
import { getLoan } from "@/lib/services/loans";
import { listAccounts } from "@/lib/services/accounts";
import LoanDetail from "@/components/LoanDetail";
export const metadata = { title: "Loan" };
export default async function Page({ params }) {
  const user = await requirePageUser(); const { id } = await params;
  try { const [loan, accounts] = await Promise.all([getLoan(user.uid, id), listAccounts(user.uid)]); return <LoanDetail loan={loan} accounts={accounts} />; }
  catch (e) { if (e?.status === 404) notFound(); throw e; }
}
