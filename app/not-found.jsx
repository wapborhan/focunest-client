import Link from "next/link";
export default function NotFound() {
  return (<main className="grid min-h-screen place-items-center p-6"><div className="text-center"><h1 className="text-2xl font-semibold">Page not found</h1>
    <Link href="/dashboard" className="mt-4 inline-block text-brand underline">Back to the dashboard</Link></div></main>);
}
