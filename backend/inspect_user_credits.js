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

  console.log("\n=== User details ===");
  console.log("ID:", user._id);
  console.log("Email:", user.email);
  console.log("Role:", user.role);
  console.log("IsAdmin:", user.isAdmin);
  console.log("Legacy Credits Field:", user.credits);
  console.log("Legacy TotalCreditsUsed Field:", user.totalCreditsUsed);

  console.log("\n=== Wallets ===");
  const wallets = await Wallet.find({ userId: user._id });
  for (const wallet of wallets) {
    console.log(`Wallet for ${wallet.productType}:`);
    console.log("  Balance:", wallet.balance);
    console.log("  FreeCredits:", wallet.freeCredits);
    console.log("  SubscriptionCredits:", wallet.subscriptionCredits);
    console.log("  PurchasedCredits:", wallet.purchasedCredits);
    console.log("  BonusCredits:", wallet.bonusCredits);
    console.log("  PromotionalCredits:", wallet.promotionalCredits);
    console.log("  LifetimeAdded:", wallet.lifetimeAdded);
    console.log("  LifetimeUsed:", wallet.lifetimeUsed);
  }

  console.log("\n=== Transactions ===");
  const txs = await CreditTransaction.find({ userId: user._id }).sort({ createdAt: 1 });
  console.log(`Found ${txs.length} transactions:`);
  for (const tx of txs) {
    console.log(`- [${tx.createdAt.toISOString()}] Type: ${tx.type}, Amount: ${tx.amount}, Source: ${tx.source}, Reference: ${tx.reference}, BalanceAfter: ${tx.balanceAfter}, Product: ${tx.productType}`);
    if (tx.metadata) {
      console.log("  Metadata:", JSON.stringify(tx.metadata));
    }
  }

  process.exit(0);
}

run().catch(console.error);
