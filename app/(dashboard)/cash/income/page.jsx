import TransactionsPage from "@/components/server/TransactionsPage";
export const metadata = { title: "Income" };
export default function Page({ searchParams }) { return <TransactionsPage kind="income" searchParams={searchParams} />; }
