import mongoose from "mongoose";
/** Runs fn(session) in a transaction. Retries transient errors automatically. */
export async function withTx(fn) {
  const session = await mongoose.startSession();
  try { let out; await session.withTransaction(async () => { out = await fn(session); }); return out; }
  finally { await session.endSession(); }
}
