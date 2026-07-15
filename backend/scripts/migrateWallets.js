import mongoose from "mongoose";
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

async function migrateWallets() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected successfully.\n");

    const users = await User.find({}).select("_id credits wallet");
    console.log(`Found ${users.length} users to migrate.\n`);

    let coupleMigrated = 0;
    let plannerMigrated = 0;

    for (const user of users) {
      // 1. Migrate Couple Wallet (if it doesn't exist)
      let coupleWallet = await Wallet.findOne({ userId: user._id, productType: "couple" });
      if (!coupleWallet) {
        await Wallet.create({
          userId: user._id,
          productType: "couple",
          balance: user.credits || 0,
          freeCredits: user.wallet?.freeCredits || 0,
          subscriptionCredits: user.wallet?.subscriptionCredits || 0,
          purchasedCredits: user.wallet?.purchasedCredits || 0,
          bonusCredits: user.wallet?.bonusCredits || 0,
          promotionalCredits: user.wallet?.promotionalCredits || 0,
          lifetimeAdded: user.wallet?.lifetimeAdded || 0,
          lifetimeUsed: user.wallet?.lifetimeUsed || 0,
        });
        coupleMigrated++;
      }

      // 2. Migrate Planner Wallet (1 Free Credit for everyone without an active plan)
      // Note: Even if they have a plan, the instruction says "Every user (existing and new) receives exactly 1 free Planner credit one time."
      // So we just create it with 1 free credit for EVERYONE if they don't have a planner wallet yet.
      let plannerWallet = await Wallet.findOne({ userId: user._id, productType: "planner" });
      if (!plannerWallet) {
        await Wallet.create({
          userId: user._id,
          productType: "planner",
          balance: 1,
          freeCredits: 1,
          lifetimeAdded: 1,
        });
        plannerMigrated++;
      }
    }

    console.log(`Migration Complete!`);
    console.log(`Couples Wallets Migrated: ${coupleMigrated}`);
    console.log(`Planner Wallets Migrated: ${plannerMigrated}`);

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

migrateWallets();
