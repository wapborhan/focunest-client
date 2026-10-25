import mongoose from "mongoose";
/** One logical financial event. Its balance effects live in LedgerEntry rows. */
const schema = new mongoose.Schema({
  userId: { type: String, required: true },
  kind: { type: String, enum: ["income", "expense", "transfer", "loan_out", "borrow_in", "repay_in", "repay_out"], required: true },
  title: { type: String, trim: true, maxlength: 120 },          // income source or expense title
  amountMinor: { type: Number, validate: Number.isInteger },    // positive; sign comes from the ledger entry
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },       // source account for transfers
  toAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },     // transfers only
  loanId: { type: mongoose.Schema.Types.ObjectId, ref: "Loan" },             // loan principal and repayments
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  paymentMethod: { type: String, enum: ["cash", "bank_transfer", "card", "mobile_banking", "cheque", "other"] },
  note: { type: String, trim: true, maxlength: 500 },
  reference: { type: String, trim: true, maxlength: 60 },
  date: { type: Date, required: true },
  status: { type: String, enum: ["posted", "voided"], default: "posted" },
  idempotencyKey: { type: String, maxlength: 80 },
}, { timestamps: true });
schema.index({ userId: 1, kind: 1, status: 1, date: -1 });
schema.index({ userId: 1, kind: 1, accountId: 1, date: -1 });
schema.index({ userId: 1, kind: 1, categoryId: 1, date: -1 });
schema.index({ userId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } });
export default mongoose.models.Operation || mongoose.model("Operation", schema);
