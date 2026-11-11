import LoanDetailPage from "@/components/server/LoanDetailPage";
export const metadata = { title: "Borrowing" };
export default function Page({ params }) { return <LoanDetailPage direction="borrowed" params={params} />; }
