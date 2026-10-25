import "server-only";
import mongoose from "mongoose";
const uri = process.env.MONGODB_URI;
const g = globalThis;
/** Connects once and refuses to run on a standalone server, since ledger writes need transactions. */
export async function connectDB() {
    if (!uri)
        throw new Error("MONGODB_URI is not set");
    g._mongo ??= mongoose.connect(uri, { maxPoolSize: 10 }).then(async (m) => {
        const hello = await m.connection.db.admin().command({ hello: 1 });
        if (!hello.setName && !hello.msg) {
            throw new Error("MongoDB must be a replica set (Atlas, or mongod --replSet rs0) for transactions.");
        }
        return m;
    });
    return g._mongo;
}
