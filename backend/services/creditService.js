import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import CreditTransaction from "../models/CreditTransaction.js";
import { CONSUMPTION_PRIORITY, TRANSACTION_TYPES, TRANSACTION_SOURCES, PLAN_CREDITS } from "../config/credits.js";

const ALLOWED_PRODUCTS = ["couple", "planner", "vendor", "decor", "catering", "studio"];

class CreditService {
  
  _validateProduct(productType) {
    if (!productType || !ALLOWED_PRODUCTS.includes(productType)) {
      throw new Error(`Invalid product type: ${productType}. Must be one of: ${ALLOWED_PRODUCTS.join(', ')}`);
    }
  }
  
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
  async getWallet(userId, productType) {
    this._validateProduct(productType);
    let wallet = await Wallet.findOne({ userId, productType });
    if (!wallet) {
      // Lazy initialization of the wallet if it doesn't exist
      const defaultData = { userId, productType };
      if (productType === "planner") {
         defaultData.balance = 1;
         defaultData.freeCredits = 1;
         defaultData.lifetimeAdded = 1;
      } else if (productType === "couple") {
         // Fallback to legacy User wallet for backward compatibility or initialize default free credits
         const legacyUser = await User.findById(userId).select("credits wallet");
         if (legacyUser && (legacyUser.credits > 0 || (legacyUser.wallet && legacyUser.wallet.lifetimeAdded > 0))) {
           defaultData.balance = legacyUser.credits || 0;
           if (legacyUser.wallet) {
             defaultData.freeCredits = legacyUser.wallet.freeCredits || 0;
             defaultData.subscriptionCredits = legacyUser.wallet.subscriptionCredits || 0;
             defaultData.purchasedCredits = legacyUser.wallet.purchasedCredits || 0;
             defaultData.bonusCredits = legacyUser.wallet.bonusCredits || 0;
             defaultData.promotionalCredits = legacyUser.wallet.promotionalCredits || 0;
             defaultData.lifetimeAdded = legacyUser.wallet.lifetimeAdded || 0;
             defaultData.lifetimeUsed = legacyUser.wallet.lifetimeUsed || 0;
           }
         } else {
           const freeCredits = PLAN_CREDITS.free || 4;
           defaultData.balance = freeCredits;
           defaultData.freeCredits = freeCredits;
           defaultData.lifetimeAdded = freeCredits;
         }
      }
      wallet = await Wallet.create(defaultData);
      if (productType === "couple") {
        await User.updateOne({ _id: userId }, { $set: { credits: wallet.balance } });
      }
    }
    
    return {
      credits: wallet.balance,
      wallet,
      productType
    };
  }

  /**
   * Adds credits to a user's wallet atomically.
   */
  async addCredits(userId, amount, source, reference, metadata = {}, productType) {
    this._validateProduct(productType);
    if (amount <= 0) throw new Error("Amount must be positive");
    
    const bucket = this._getBucketForSource(source);

    // Validate transaction details first to prevent out-of-sync updates if validation fails (e.g. enum validation)
    const txPlaceholder = new CreditTransaction({
      userId,
      productType,
      type: TRANSACTION_TYPES.CREDIT,
      amount,
      source,
      bucketAffected: bucket,
      reference,
      balanceAfter: 0,
      metadata,
    });
    await txPlaceholder.validate();
    
    // Ensure wallet exists before atomic update
    await this.getWallet(userId, productType);

    const updateQuery = {
      $inc: {
        balance: amount,
        [bucket]: amount,
        lifetimeAdded: amount,
      },
      $set: {
        lastUpdated: new Date(),
      }
    };

    const wallet = await Wallet.findOneAndUpdate({ userId, productType }, updateQuery, { new: true });
    if (!wallet) throw new Error("Wallet not found");

    await CreditTransaction.create({
      userId,
      productType,
      type: TRANSACTION_TYPES.CREDIT,
      amount,
      source,
      bucketAffected: bucket,
      reference,
      balanceAfter: wallet.balance,
      metadata,
    });

    if (productType === "couple") {
      await User.updateOne({ _id: userId }, { $set: { credits: wallet.balance } });
    }

    return { credits: wallet.balance, wallet, productType };
  }

  /**
   * Deducts credits safely using Optimistic Concurrency Control (CAS).
   * Prevents race conditions from multiple tabs or rapid clicks.
   */
  async deductCredits(userId, amount, source, reference, metadata = {}, productType) {
    this._validateProduct(productType);
    if (amount <= 0) throw new Error("Amount must be positive");
    
    // Validate transaction details first to prevent out-of-sync updates if validation fails (e.g. enum validation)
    const txPlaceholder = new CreditTransaction({
      userId,
      productType,
      type: TRANSACTION_TYPES.DEBIT,
      amount,
      source,
      bucketAffected: "mixed",
      reference,
      balanceAfter: 0,
      metadata,
    });
    await txPlaceholder.validate();

    // Ensure wallet exists
    await this.getWallet(userId, productType);

    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const wallet = await Wallet.findOne({ userId, productType });
      if (!wallet) throw new Error("Wallet not found");
      
      if (wallet.balance < amount) {
        const error = new Error("Insufficient credits");
        error.code = "INSUFFICIENT_CREDITS";
        throw error;
      }

      // Calculate new buckets based on consumption priority
      let remainingToDeduct = amount;
      const updateBuckets = {};
      
      for (const bucket of CONSUMPTION_PRIORITY) {
        if (remainingToDeduct <= 0) break;
        
        const bucketBalance = wallet[bucket] || 0;
        if (bucketBalance > 0) {
          const deductFromBucket = Math.min(bucketBalance, remainingToDeduct);
          updateBuckets[bucket] = bucketBalance - deductFromBucket;
          remainingToDeduct -= deductFromBucket;
        }
      }

      // Prepare the update
      updateBuckets.balance = wallet.balance - amount;
      updateBuckets.lifetimeUsed = (wallet.lifetimeUsed || 0) + amount;
      updateBuckets.lastUpdated = new Date();

      // Atomic Compare-And-Swap (CAS) update
      const result = await Wallet.findOneAndUpdate(
        { _id: wallet._id, balance: wallet.balance }, // CAS condition
        { $set: updateBuckets },
        { new: true }
      );

      if (result) {
        // Success! Transaction recorded.
        await CreditTransaction.create({
          userId,
          productType,
          type: TRANSACTION_TYPES.DEBIT,
          amount,
          source,
          bucketAffected: "mixed", // Reflects that it may span multiple buckets
          reference,
          balanceAfter: result.balance,
          metadata,
        });
        
        // Also update legacy User totalCreditsUsed and credits for backwards compatibility if couple
        if (productType === "couple") {
           await User.updateOne({ _id: userId }, { $inc: { totalCreditsUsed: amount }, $set: { credits: result.balance } });
        }
        
        return { credits: result.balance, wallet: result, productType };
      }
      
      // If result is null, a concurrent request modified the balance.
      // Loop retries the fetch and deduction logic.
    }
    
    throw new Error("Service is currently busy due to concurrent requests. Please try again.");
  }

  /**
   * Refunds credits for failed generations or administrative actions.
   */
  async refundCredits(userId, amount, originalReference, metadata = {}, productType) {
    this._validateProduct(productType);
    if (amount <= 0) return;
    
    // Refunds go back into the bonus bucket by default to ensure they are used first next time
    const bucket = "bonusCredits";
    
    // Ensure wallet exists
    await this.getWallet(userId, productType);

    // Validate transaction details first to prevent out-of-sync updates if validation fails (e.g. enum validation)
    const txPlaceholder = new CreditTransaction({
      userId,
      productType,
      type: TRANSACTION_TYPES.CREDIT,
      amount,
      source: TRANSACTION_SOURCES.REFUND,
      bucketAffected: bucket,
      reference: `refund_${originalReference}`,
      balanceAfter: 0,
      metadata: { originalReference, ...metadata },
    });
    await txPlaceholder.validate();

    const updateQuery = {
      $inc: {
        balance: amount,
        [bucket]: amount,
        lifetimeUsed: -amount, // Decrement lifetimeUsed on refund!
      },
      $set: {
        lastUpdated: new Date(),
      }
    };

    const wallet = await Wallet.findOneAndUpdate({ userId, productType }, updateQuery, { new: true });
    if (!wallet) throw new Error("Wallet not found");

    await CreditTransaction.create({
      userId,
      productType,
      type: TRANSACTION_TYPES.CREDIT,
      amount,
      source: TRANSACTION_SOURCES.REFUND,
      bucketAffected: bucket,
      reference: `refund_${originalReference}`,
      balanceAfter: wallet.balance,
      metadata: { originalReference, ...metadata },
    });

    if (productType === "couple") {
      await User.updateOne({ _id: userId }, { $set: { credits: wallet.balance } });
    }

    return { credits: wallet.balance, wallet, productType };
  }

  /**
   * Gets paginated transaction history for a user
   */
  async getTransactionHistory(userId, { page = 1, limit = 20, type = null, source = null, productType } = {}) {
    this._validateProduct(productType);
    const query = { userId, productType };
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
