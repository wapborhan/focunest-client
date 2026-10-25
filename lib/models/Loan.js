import mongoose from "mongoose";
const schema = new mongoose.Schema({
  userId: { type: String, required: true },
  direction: { type: String, enum: ["lent", "borrowed"], required: true },
  counterparty: { type: String, required: true, trim: true, maxlength: 80 },
  phone: { type: String, trim: true, maxlength: 20 },
  principalMinor: { type: Number, required: true, min: 1, validate: Number.isInteger },
  repaidMinor: { type: Number, default: 0, min: 0, validate: Number.isInteger },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
  operationId: { type: mongoose.Schema.Types.ObjectId, ref: "Operation" },
  date: { type: Date, required: true },
  dueDate: { type: Date },
  notes: { type: String, trim: true, maxlength: 500 },
  status: { type: String, enum: ["outstanding", "partial", "repaid"], default: "outstanding" },
  version: { type: Number, default: 0 },   // bumped per repayment so concurrent repayments serialize
}, { timestamps: true });
schema.index({ userId: 1, direction: 1, status: 1, dueDate: 1 });
schema.index({ userId: 1, counterparty: 1 });
export default mongoose.models.Loan || mongoose.model("Loan", schema);
