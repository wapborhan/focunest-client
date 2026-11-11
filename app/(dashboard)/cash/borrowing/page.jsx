import LoansPage from "@/components/server/LoansPage";
export const metadata = { title: "Borrowing" };
export default function Page({ searchParams }) { return <LoansPage direction="borrowed" searchParams={searchParams} />; }
