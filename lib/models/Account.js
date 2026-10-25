import mongoose from "mongoose";
const schema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  type: { type: String, enum: ["cash", "bank", "mobile"], required: true },
  provider: { type: String, trim: true, maxlength: 60 },
  identifier: { type: String, trim: true, maxlength: 40 },
  openingBalanceMinor: { type: Number, required: true, default: 0, validate: Number.isInteger },
  openingDate: { type: Date, required: true },
  notes: { type: String, trim: true, maxlength: 500 },
  status: { type: String, enum: ["active", "archived"], default: "active" },
  allowNegative: { type: Boolean, default: false },
  version: { type: Number, default: 0 }, // bumped on every posting so concurrent postings serialize
}, { timestamps: true });
schema.index({ userId: 1, type: 1, status: 1 });
export default mongoose.models.Account || mongoose.model("Account", schema);
