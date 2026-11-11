import { requirePageUser } from "@/lib/auth";
import { flat } from "@/lib/search-params";
import { listCategoriesForManagement } from "@/lib/services/categories";
import CategoriesView from "@/components/CategoriesView";
export const metadata = { title: "Cash settings · Categories" };
export default async function Page({ searchParams }) {
  const user = await requirePageUser(); const { kind } = flat(await searchParams);
  const [income, expense] = await Promise.all([listCategoriesForManagement(user.uid, "income"), listCategoriesForManagement(user.uid, "expense")]);
  return <CategoriesView categories={{ income, expense }} initialKind={kind === "expense" ? "expense" : "income"} />;
}
