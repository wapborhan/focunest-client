import mongoose from "mongoose";
/** A signed effect on one account. Entries are append-only; corrections are new reversing entries. */
const schema = new mongoose.Schema({
  userId: { type: String, required: true },
  operationId: { type: mongoose.Schema.Types.ObjectId, ref: "Operation", required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
  amountMinor: { type: Number, required: true, validate: [Number.isInteger, "must be an integer"] },
  date: { type: Date, required: true },
  reversalOf: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });
schema.index({ userId: 1, accountId: 1, date: -1 });
schema.index({ userId: 1, operationId: 1 });
export default mongoose.models.LedgerEntry || mongoose.model("LedgerEntry", schema);
