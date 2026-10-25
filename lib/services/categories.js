import { connectDB } from "../db";
import { conflict } from "../errors";
import Category from "../models/Category";
const DEFAULTS = {
  income: [["Salary", "বেতন"], ["Business", "ব্যবসা"], ["Freelance", "ফ্রিল্যান্স"], ["Investment", "বিনিয়োগ"], ["Gift", "উপহার"], ["Rental income", "ভাড়া আয়"], ["Other", "অন্যান্য"]],
  expense: [["Food", "খাবার"], ["Transportation", "যাতায়াত"], ["Housing", "বাসা ভাড়া"], ["Utilities", "বিল"], ["Shopping", "কেনাকাটা"], ["Healthcare", "চিকিৎসা"], ["Education", "শিক্ষা"], ["Family", "পরিবার"], ["Charity", "দান"], ["Other", "অন্যান্য"]],
};
const dto = (c) => ({ id: String(c._id), kind: c.kind, nameEn: c.nameEn, nameBn: c.nameBn, isDefault: c.isDefault });
/** Seeds defaults on first use. The unique index makes concurrent seeding safe. */
export async function listCategories(userId, kind) {
  await connectDB();
  if (!(await Category.exists({ userId, kind }))) {
    await Category.insertMany(DEFAULTS[kind].map(([nameEn, nameBn]) => ({ userId, kind, nameEn, nameBn, isDefault: true })), { ordered: false }).catch((e) => { if (e.code !== 11000 && !e.writeErrors) throw e; });
  }
  return (await Category.find({ userId, kind, archived: false }).sort({ isDefault: -1, nameEn: 1 }).lean()).map(dto);
}
export async function createCategory(userId, input) {
  await connectDB();
  try { return dto(await Category.create({ userId, ...input })); }
  catch (e) { if (e.code === 11000) throw conflict("You already have a category with that name."); throw e; }
}
