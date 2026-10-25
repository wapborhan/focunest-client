import mongoose from "mongoose";
/** Append-only repayment history. The money movement itself is the linked Operation's ledger entry. */
const schema = new mongoose.Schema({
  userId: { type: String, required: true },
  loanId: { type: mongoose.Schema.Types.ObjectId, ref: "Loan", required: true },
  operationId: { type: mongoose.Schema.Types.ObjectId, ref: "Operation", required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
  amountMinor: { type: Number, required: true, min: 1, validate: Number.isInteger },
  date: { type: Date, required: true },
  note: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });
schema.index({ userId: 1, loanId: 1, date: -1 });
export default mongoose.models.Repayment || mongoose.model("Repayment", schema);
