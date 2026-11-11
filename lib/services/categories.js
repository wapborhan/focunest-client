import mongoose from "mongoose";
import { connectDB } from "../db";
import { conflict, notFound } from "../errors";
import Category from "../models/Category";
import Operation from "../models/Operation";
import AuditLog from "../models/AuditLog";
const DEFAULTS = {
  income: [["Salary", "বেতন"], ["Business", "ব্যবসা"], ["Freelance", "ফ্রিল্যান্স"], ["Investment", "বিনিয়োগ"], ["Gift", "উপহার"], ["Rental income", "ভাড়া আয়"], ["Other", "অন্যান্য"]],
  expense: [["Food", "খাবার"], ["Transportation", "যাতায়াত"], ["Housing", "বাসা ভাড়া"], ["Utilities", "বিল"], ["Shopping", "কেনাকাটা"], ["Healthcare", "চিকিৎসা"], ["Education", "শিক্ষা"], ["Family", "পরিবার"], ["Charity", "দান"], ["Other", "অন্যান্য"]],
};
const dto = (c, used) => ({ id: String(c._id), kind: c.kind, nameEn: c.nameEn, nameBn: c.nameBn, isDefault: c.isDefault, archived: !!c.archived, ...(used === undefined ? {} : { used }) });

/** Seeds defaults on first use. The unique index makes concurrent seeding safe. */
async function ensureSeeded(userId, kind) {
  if (await Category.exists({ userId, kind })) return;
  await Category.insertMany(DEFAULTS[kind].map(([nameEn, nameBn]) => ({ userId, kind, nameEn, nameBn, isDefault: true })), { ordered: false }).catch((e) => { if (e.code !== 11000 && !e.writeErrors) throw e; });
}
/** Active categories, for the pickers in the transaction forms. */
export async function listCategories(userId, kind) {
  await connectDB(); await ensureSeeded(userId, kind);
  return (await Category.find({ userId, kind, archived: false }).sort({ isDefault: -1, nameEn: 1 }).lean()).map((c) => dto(c));
}
/** Every category including archived ones, with how many posted transactions use each. For the management page. */
export async function listCategoriesForManagement(userId, kind) {
  await connectDB(); await ensureSeeded(userId, kind);
  const rows = await Category.find({ userId, kind }).sort({ archived: 1, isDefault: -1, nameEn: 1 }).lean();
  const counts = await Operation.aggregate([{ $match: { userId, kind, status: "posted", categoryId: { $in: rows.map((r) => r._id) } } }, { $group: { _id: "$categoryId", n: { $sum: 1 } } }]);
  const used = new Map(counts.map((c) => [String(c._id), c.n]));
  return rows.map((c) => dto(c, used.get(String(c._id)) ?? 0));
}
export async function createCategory(userId, input) {
  await connectDB();
  try { return dto(await Category.create({ userId, ...input })); }
  catch (e) { if (e.code === 11000) throw conflict("You already have a category with that name."); throw e; }
}
/** Rename or archive. Categories are never deleted, because past transactions still point at them. */
export async function updateCategory(userId, id, patch) {
  await connectDB();
  if (!mongoose.isValidObjectId(id)) throw notFound("Category");
  const c = await Category.findOne({ _id: id, userId });
  if (!c) throw notFound("Category");
  if (patch.archived === true && !c.archived && (await Category.countDocuments({ userId, kind: c.kind, archived: false, _id: { $ne: c._id } })) === 0)
    throw conflict("Keep at least one active category so you can still record transactions.");
  const before = { nameEn: c.nameEn, nameBn: c.nameBn, archived: c.archived };
  if (patch.nameEn !== undefined) c.nameEn = patch.nameEn;
  if (patch.nameBn !== undefined) c.nameBn = patch.nameBn ?? undefined;
  if (patch.archived !== undefined) c.archived = patch.archived;
  try { await c.save(); } catch (e) { if (e.code === 11000) throw conflict("You already have a category with that name."); throw e; }
  await AuditLog.create([{ userId, action: patch.archived === undefined ? "category.update" : patch.archived ? "category.archive" : "category.restore", entity: "Category", entityId: c._id, before, after: { nameEn: c.nameEn, nameBn: c.nameBn, archived: c.archived } }]);
  return dto(c);
}
