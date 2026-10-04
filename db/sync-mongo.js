require("dotenv").config();
const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}
const { db } = require("../db");

const { connectMongo, syncSqliteToMongo, isMongoConnected } = require("./mongo");

async function runSync() {
  console.log("=================================================");
  console.log(" Wayfarer: SQLite -> MongoDB Synchronization Tool");
  console.log("=================================================");

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/wayfarer";
  console.log(`Target MongoDB URI: ${uri}`);

  const connected = await connectMongo(null);
  if (!connected) {
    console.error("\n[Error] Unable to connect to MongoDB. Please check:");
    console.error("  1. Is MongoDB running locally? (mongod)");
    console.error("  2. If using MongoDB Atlas, is your connection string correct in .env?");
    console.error("  3. Does your IP have access in MongoDB Atlas Network Access?");
    process.exit(1);
  }

  console.log("\nStarting data migration from SQLite to MongoDB collections...");
  const result = await syncSqliteToMongo(db);

  if (result.success) {
    console.log("\n[Success] Migration completed successfully!");
    console.log("Synced items count:");
    console.table(result.results);
    process.exit(0);
  } else {
    console.error("\n[Error] Migration encountered an issue:", result.error);
    process.exit(1);
  }
}

runSync().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
