import mongoose from "mongoose";
const schema = new mongoose.Schema({
  userId: { type: String, required: true },
  kind: { type: String, enum: ["income", "expense"], required: true },
  nameEn: { type: String, required: true, trim: true, maxlength: 40 },
  nameBn: { type: String, trim: true, maxlength: 40 },
  isDefault: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },
}, { timestamps: true });
schema.index({ userId: 1, kind: 1, nameEn: 1 }, { unique: true });
export default mongoose.models.Category || mongoose.model("Category", schema);
