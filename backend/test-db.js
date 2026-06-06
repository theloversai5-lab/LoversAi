import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

console.log("Connecting to:", process.env.MONGO_URI);

try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log("SUCCESS: MongoDB is connected!");
  process.exit(0);
} catch (err) {
  console.error("ERROR: Failed to connect to MongoDB:", err.message);
  process.exit(1);
}
