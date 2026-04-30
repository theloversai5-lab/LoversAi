// routes/auth.js
import express from "express";
import admin from "../firebaseAdmin.js";
import User from "../models/User.js";

const router = express.Router();

/**
 * 🔐 FIREBASE LOGIN/SIGNUP
 */
router.post("/firebase-login", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: "No token provided" 
      });
    }
    
    const decoded = await admin.auth().verifyIdToken(token);
    
    // Find or create user
    let user = await User.findOne({ firebaseUid: decoded.uid });
    
    if (!user) {
      user = await User.create({
        firebaseUid: decoded.uid,
        email: decoded.email,
        fullName: decoded.name || "",
        profileCompleted: false,
        credits: 30, // 🎁 Assign 30 welcome credits to new users
      });
      console.log(`✅ New user created with 30 welcome credits: ${decoded.email}`);
    }
    
    // Return user data
    res.json({
      success: true,
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        fullName: user.fullName,
        profileCompleted: user.profileCompleted,
        plan: user.plan,
        isPro: user.isPro,
        credits: user.credits,
        subscriptionStatus: user.subscriptionStatus,
      }
    });
    
  } catch (err) {
    console.error("Firebase login error:", err);
    
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        success: false, 
        error: "Token expired" 
      });
    }
    
    res.status(401).json({ 
      success: false, 
      error: "Invalid token" 
    });
  }
});

export default router;