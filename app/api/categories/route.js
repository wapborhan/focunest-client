import { route, created } from "@/lib/api";
import { categoriesQuery, createCategorySchema } from "@/lib/schemas/transaction";
import { listCategories, createCategory } from "@/lib/services/categories";
export const GET = route(async ({ req, user }) => {
  const { kind } = categoriesQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  return { items: await listCategories(user.uid, kind) };
});
export const POST = route(async ({ req, user }) => created(await createCategory(user.uid, createCategorySchema.parse(await req.json().catch(() => null)))));
