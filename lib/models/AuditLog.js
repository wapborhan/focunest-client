import mongoose from "mongoose";
const schema = new mongoose.Schema({
  userId: { type: String, required: true },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  before: mongoose.Schema.Types.Mixed,
  after: mongoose.Schema.Types.Mixed,
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ userId: 1, entity: 1, entityId: 1, createdAt: -1 });
export default mongoose.models.AuditLog || mongoose.model("AuditLog", schema);
