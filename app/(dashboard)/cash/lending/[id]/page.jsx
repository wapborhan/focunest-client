import LoanDetailPage from "@/components/server/LoanDetailPage";
export const metadata = { title: "Lending" };
export default function Page({ params }) { return <LoanDetailPage direction="lent" params={params} />; }
