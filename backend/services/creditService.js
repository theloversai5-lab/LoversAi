import User from "../models/User.js";
import CreditTransaction from "../models/CreditTransaction.js";
import { CONSUMPTION_PRIORITY, TRANSACTION_TYPES, TRANSACTION_SOURCES } from "../config/credits.js";

class CreditService {
  
  /**
   * Maps a transaction source to its appropriate wallet bucket
   */
  _getBucketForSource(source) {
    switch (source) {
      case TRANSACTION_SOURCES.FREE_PLAN:
        return "freeCredits";
      case TRANSACTION_SOURCES.SUBSCRIPTION:
        return "subscriptionCredits";
      case TRANSACTION_SOURCES.PURCHASED:
        return "purchasedCredits";
      case TRANSACTION_SOURCES.BONUS:
      case TRANSACTION_SOURCES.REFERRAL:
        return "bonusCredits";
      case TRANSACTION_SOURCES.PROMOTIONAL:
        return "promotionalCredits";
      default:
        return "bonusCredits"; // Default fallback bucket
    }
  }

  /**
   * Retrieves a user's wallet and current balance.
   */
  async getWallet(userId) {
    const user = await User.findById(userId).select("credits wallet plan");
    if (!user) throw new Error("User not found");
    return {
      credits: user.credits,
      wallet: user.wallet,
      plan: user.plan
    };
  }

  /**
   * Adds credits to a user's wallet atomically.
   */
  async addCredits(userId, amount, source, reference, metadata = {}) {
    if (amount <= 0) throw new Error("Amount must be positive");
    
    const bucket = this._getBucketForSource(source);
    
    const updateQuery = {
      $inc: {
        credits: amount,
        [`wallet.${bucket}`]: amount,
        "wallet.lifetimeAdded": amount,
      },
      $set: {
        "wallet.lastUpdated": new Date(),
      }
    };

    const user = await User.findByIdAndUpdate(userId, updateQuery, { new: true });
    if (!user) throw new Error("User not found");

    await CreditTransaction.create({
      userId,
      type: TRANSACTION_TYPES.CREDIT,
      amount,
      source,
      bucketAffected: bucket,
      reference,
      balanceAfter: user.credits,
      metadata,
    });

    return { credits: user.credits, wallet: user.wallet };
  }

  /**
   * Deducts credits safely using Optimistic Concurrency Control (CAS).
   * Prevents race conditions from multiple tabs or rapid clicks.
   */
  async deductCredits(userId, amount, source, reference, metadata = {}) {
    if (amount <= 0) throw new Error("Amount must be positive");
    
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const user = await User.findById(userId).select("credits wallet");
      if (!user) throw new Error("User not found");
      
      if (user.credits < amount) {
        const error = new Error("Insufficient credits");
        error.code = "INSUFFICIENT_CREDITS";
        throw error;
      }

      // Calculate new buckets based on consumption priority
      let remainingToDeduct = amount;
      const updateBuckets = {};
      
      for (const bucket of CONSUMPTION_PRIORITY) {
        if (remainingToDeduct <= 0) break;
        
        const bucketBalance = user.wallet[bucket] || 0;
        if (bucketBalance > 0) {
          const deductFromBucket = Math.min(bucketBalance, remainingToDeduct);
          updateBuckets[`wallet.${bucket}`] = bucketBalance - deductFromBucket;
          remainingToDeduct -= deductFromBucket;
        }
      }

      // Prepare the update
      updateBuckets.credits = user.credits - amount;
      updateBuckets["wallet.lifetimeUsed"] = (user.wallet.lifetimeUsed || 0) + amount;
      updateBuckets["wallet.lastUpdated"] = new Date();
      updateBuckets.totalCreditsUsed = (user.totalCreditsUsed || 0) + amount;

      // Atomic Compare-And-Swap (CAS) update
      const result = await User.findOneAndUpdate(
        { _id: userId, credits: user.credits }, // Condition: credits must exactly match our fetched value
        { $set: updateBuckets },
        { new: true }
      );

      if (result) {
        // Success! Transaction recorded.
        await CreditTransaction.create({
          userId,
          type: TRANSACTION_TYPES.DEBIT,
          amount,
          source,
          bucketAffected: "mixed", // Reflects that it may span multiple buckets
          reference,
          balanceAfter: result.credits,
          metadata,
        });
        
        return { credits: result.credits, wallet: result.wallet };
      }
      
      // If result is null, a concurrent request modified the balance.
      // Loop retries the fetch and deduction logic.
    }
    
    throw new Error("Service is currently busy due to concurrent requests. Please try again.");
  }

  /**
   * Refunds credits for failed generations or administrative actions.
   */
  async refundCredits(userId, amount, originalReference, metadata = {}) {
    if (amount <= 0) return;
    
    // Refunds go back into the bonus bucket by default to ensure they are used first next time
    const bucket = "bonusCredits";
    
    const updateQuery = {
      $inc: {
        credits: amount,
        [`wallet.${bucket}`]: amount,
      },
      $set: {
        "wallet.lastUpdated": new Date(),
      }
    };

    const user = await User.findByIdAndUpdate(userId, updateQuery, { new: true });
    if (!user) throw new Error("User not found");

    await CreditTransaction.create({
      userId,
      type: TRANSACTION_TYPES.CREDIT,
      amount,
      source: TRANSACTION_SOURCES.REFUND,
      bucketAffected: bucket,
      reference: `refund_${originalReference}`,
      balanceAfter: user.credits,
      metadata: { originalReference, ...metadata },
    });

    return { credits: user.credits, wallet: user.wallet };
  }

  /**
   * Gets paginated transaction history for a user
   */
  async getTransactionHistory(userId, { page = 1, limit = 20, type = null, source = null } = {}) {
    const query = { userId };
    if (type) query.type = type;
    if (source) query.source = source;

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      CreditTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CreditTransaction.countDocuments(query)
    ]);

    return {
      transactions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    };
  }
}

export default new CreditService();
