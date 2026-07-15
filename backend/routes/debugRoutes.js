// routes/debugRoutes.js
import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { WELCOME_CREDITS } from "../constants/credits.js";
import creditService from "../services/creditService.js";

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

    const productType = req.query.wallet || "couple";
    const walletData = await creditService.getWallet(user._id, productType);

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        credits: walletData.credits,
        wallet: walletData.wallet,
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
    const { amount = 101, reason = "Gift", productType } = req.body;
    
    if (!productType) {
      return res.status(400).json({ success: false, error: "Missing required 'productType'" });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid amount. Must be a positive number" 
      });
    }

    const user = req.user;

    const result = await creditService.addCredits(
      user._id,
      amount,
      'bonus',
      `debug_gift_${Date.now()}`,
      { reason },
      productType
    );

    res.json({
      success: true,
      message: `${amount} credits gifted successfully`,
      user: {
        id: user._id,
        email: user.email,
        newCredits: result.wallet.balance,
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
 * 🔧 INITIALIZE CREDITS: Set initial 101 credits for users who have 0
 * THIS IS FOR DEVELOPMENT/TESTING ONLY
 */
router.post("/initialize-welcome-credits", protect, async (req, res) => {
  try {
    const user = req.user;
    const initialCredits = WELCOME_CREDITS;
    const { productType } = req.body;
    
    if (!productType) {
      return res.status(400).json({ success: false, error: "Missing required 'productType'" });
    }

    const walletData = await creditService.getWallet(user._id, productType);

    // Only initialize if user has 0 credits
    if (walletData.credits > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `User already has ${walletData.credits} credits. Cannot initialize.`,
        currentCredits: walletData.credits
      });
    }

    const result = await creditService.addCredits(
      user._id,
      initialCredits,
      'free_plan',
      `welcome_init_${Date.now()}`,
      { initializedAt: new Date().toISOString() },
      productType
    );

    res.json({
      success: true,
      message: `${initialCredits} welcome credits initialized`,
      user: {
        id: user._id,
        email: user.email,
        credits: result.wallet.balance,
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
