import { route } from "@/lib/api";
import { updateCategorySchema } from "@/lib/schemas/transaction";
import { updateCategory } from "@/lib/services/categories";
export const PATCH = route(async ({ req, user, params }) => updateCategory(user.uid, params.id, updateCategorySchema.parse(await req.json().catch(() => null))));
