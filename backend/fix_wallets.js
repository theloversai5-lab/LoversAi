import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Wallet from "./models/Wallet.js";
import CreditTransaction from "./models/CreditTransaction.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");

  const email = "sharma.piyush2024@nst.rishihood.edu.in";
  const user = await User.findOne({ email });
  if (!user) {
    console.log("User not found!");
    process.exit(0);
  }

  // Update the planner wallet
  const result = await Wallet.findOneAndUpdate(
    { userId: user._id, productType: "planner" },
    {
      $set: {
        balance: 20,
        lifetimeAdded: 21,
        lifetimeUsed: 1,
        promotionalCredits: 20,
        freeCredits: 0,
        subscriptionCredits: 0,
        purchasedCredits: 0,
        bonusCredits: 0
      }
    },
    { new: true }
  );

  console.log("Wallet updated successfully:", result);

  // Sync user cache
  await User.updateOne({ _id: user._id }, { $set: { credits: 20 } });
  console.log("User model cache synced.");

  process.exit(0);
}

run().catch(console.error);
