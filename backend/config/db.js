import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const connectDB = async () => {
  let mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
  let memoryServer;

  if (!mongoUri) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "⚠️ No MONGO_URI found — starting in-memory MongoDB for development (mongodb-memory-server)",
      );
      try {
        memoryServer = await MongoMemoryServer.create();
        mongoUri = memoryServer.getUri();
        console.log("🧪 In-memory MongoDB started for development");
      } catch (err) {
        console.error("❌ Failed to start in-memory MongoDB:", err.message);
        process.exit(1);
      }
    } else {
      console.error(
        "❌ MongoDB Error: MONGO_URI is not defined in environment variables.",
      );
      process.exit(1);
    }
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("⚠️ Failed to connect to MongoDB Atlas. Falling back to in-memory MongoDB...");
      try {
        memoryServer = await MongoMemoryServer.create();
        mongoUri = memoryServer.getUri();
        await mongoose.connect(mongoUri);
        console.log("🧪 In-memory MongoDB started and connected as fallback");
      } catch (memErr) {
        console.error("❌ Failed to start in-memory MongoDB fallback:", memErr.message);
        process.exit(1);
      }
    } else {
      console.error("❌ MongoDB Error:", err.message);
      process.exit(1);
    }
  }

  // Return memoryServer instance in case caller wants to stop it later
  return memoryServer;
};

export default connectDB;
