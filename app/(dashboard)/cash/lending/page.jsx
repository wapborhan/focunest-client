import LoansPage from "@/components/server/LoansPage";
export const metadata = { title: "Lending" };
export default function Page({ searchParams }) { return <LoansPage direction="lent" searchParams={searchParams} />; }
