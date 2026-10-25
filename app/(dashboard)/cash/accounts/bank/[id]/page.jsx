import AccountDetail from "@/components/AccountDetail";
export default async function Page({ params }) { const { id } = await params; return <AccountDetail id={id} type="bank" />; }
