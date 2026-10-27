import { requirePageUser } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";
export const metadata = { robots: { index: false, follow: false } };   // private pages stay out of search results
export default async function Layout({ children }) {
  const u = await requirePageUser();
  return <DashboardShell user={{ name: u.name, email: u.email, picture: u.picture }}>{children}</DashboardShell>;
}
