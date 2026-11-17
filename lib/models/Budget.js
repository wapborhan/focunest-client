import mongoose from "mongoose";
/**
 * A budget row means "from this month onward, this category's limit is X", until a later row says otherwise.
 * categoryId null is the overall monthly budget. amountMinor null means "no budget from this month".
 */
const schema = new mongoose.Schema({
  userId: { type: String, required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
  month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
  amountMinor: { type: Number, default: null, min: 1, validate: { validator: (v) => v === null || Number.isInteger(v), message: "must be an integer" } },
}, { timestamps: true });
schema.index({ userId: 1, categoryId: 1, month: 1 }, { unique: true });
export default mongoose.models.Budget || mongoose.model("Budget", schema);
