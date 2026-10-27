import TransactionsPage from "@/components/server/TransactionsPage";
export const metadata = { title: "Expenses" };
export default function Page({ searchParams }) { return <TransactionsPage kind="expense" searchParams={searchParams} />; }
