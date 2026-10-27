import { requirePageUser } from "@/lib/auth";
import SettingsView from "@/components/SettingsView";
export const metadata = { title: "Settings" };
export default async function Page() {
  const u = await requirePageUser();
  return <SettingsView user={{ name: u.name, email: u.email, picture: u.picture }} />;
}
