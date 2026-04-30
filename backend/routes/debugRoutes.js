// routes/debugRoutes.js
import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

/**
 * 🔍 DEBUG: Get current user's credit info
 */
router.get("/user-credits", protect, async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firebaseUid: user.firebaseUid,
        credits: user.credits,
        creditTransactions: user.creditTransactions,
        subscriptionStatus: user.subscriptionStatus,
        isPro: user.isPro,
        plan: user.plan,
      }
    });
  } catch (err) {
    console.error("Debug credits error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get user credits" 
    });
  }
});

/**
 * 🎁 GIFT CREDITS: Initialize/add credits for a user
 * THIS IS FOR DEVELOPMENT/TESTING ONLY
 * Remove in production or add proper authorization
 */
router.post("/gift-credits", protect, async (req, res) => {
  try {
    const { amount = 30, reason = "Gift" } = req.body;

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid amount. Must be a positive number" 
      });
    }

    const user = req.user;

    const oldCredits = user.credits;
    user.credits = Math.max(0, user.credits + amount);

    // Record transaction
    user.creditTransactions.push({
      type: 'credit',
      amount: amount,
      description: reason,
      remainingBalance: user.credits,
      reference: 'gift',
      metadata: {
        giftedAt: new Date().toISOString()
      }
    });

    await user.save();

    res.json({
      success: true,
      message: `${amount} credits gifted successfully`,
      user: {
        id: user._id,
        email: user.email,
        oldCredits: oldCredits,
        newCredits: user.credits,
        creditsAdded: amount,
        reason: reason,
      }
    });
  } catch (err) {
    console.error("Gift credits error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to gift credits" 
    });
  }
});

/**
 * 🔧 INITIALIZE CREDITS: Set initial 30 credits for users who have 0
 * THIS IS FOR DEVELOPMENT/TESTING ONLY
 */
router.post("/initialize-welcome-credits", protect, async (req, res) => {
  try {
    const user = req.user;

    // Only initialize if user has 0 credits
    if (user.credits > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `User already has ${user.credits} credits. Cannot initialize.`,
        currentCredits: user.credits
      });
    }

    user.credits = 30;
    
    user.creditTransactions.push({
      type: 'credit',
      amount: 30,
      description: 'Welcome credits initialization',
      remainingBalance: user.credits,
      reference: 'welcome',
      metadata: {
        initializedAt: new Date().toISOString()
      }
    });

    await user.save();

    res.json({
      success: true,
      message: '30 welcome credits initialized',
      user: {
        id: user._id,
        email: user.email,
        credits: user.credits,
      }
    });
  } catch (err) {
    console.error("Initialize credits error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to initialize credits" 
    });
  }
});

export default router;
