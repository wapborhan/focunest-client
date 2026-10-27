import "server-only";
import mongoose from "mongoose";
const g = globalThis;

/** Connects once and refuses to run on a standalone server, since ledger writes need transactions.
 *  A failed attempt is not cached, so fixing MongoDB and retrying works without restarting the app. */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  g._mongo ??= mongoose.connect(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 }).then(async (m) => {
    const hello = await m.connection.db.admin().command({ hello: 1 });
    if (!hello.setName && !hello.msg) {
      await mongoose.disconnect();
      throw new Error("MongoDB is running but is not a replica set. Start it with --replSet rs0 and add ?replicaSet=rs0 to MONGODB_URI.");
    }
    return m;
  }).catch((e) => {
    g._mongo = undefined;
    if (e?.name === "MongooseServerSelectionError") console.error("[db] Could not reach MongoDB. Check that mongod is running, use 127.0.0.1 instead of localhost, and include ?replicaSet=rs0 in MONGODB_URI.");
    throw e;
  });
  return g._mongo;
}
