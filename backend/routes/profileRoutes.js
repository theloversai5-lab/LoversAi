import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { ensureUserExists, updateUserProfile, getSanitizedProfile } from "../utils/userUtils.js";

const router = express.Router();

/**
 * 🔍 CHECK PROFILE COMPLETION
 * NOTE: Duplicate endpoint exists at /api/users/check-profile
 * Consider removing userRoutes.js and consolidating all profile routes here
 */
  // profile route
router.get("/check-profile", protect, async (req, res) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      exists: user.profileCompleted,
      profileCompleted: user.profileCompleted,
      profile: {
        fullName: user.fullName,
        email: user.email,
        location: user.location,
        age: user.age,
        budget: user.budget,
        position: user.position,
        interest: user.interest,
        phone: user.phone,
        company_name: user.company_name,
      },
    });
  } catch (err) {
    console.error("Check profile error:", err);
    res.status(500).json({ success: false, error: "Failed to check profile" });
  }
});

/**
 * 💾 SAVE / UPDATE PROFILE
 * NOTE: Duplicate endpoint exists at /api/users/save-form
 */
router.post("/save-form", protect, async (req, res) => {
  try {
    // Update profile
    const user = await updateUserProfile(req.user._id, req.body); // Need to patch updateUserProfile to take _id instead of uid if we care, but using userUtils might fail.
    // Actually just update the user directly
    const updatedUser = Object.assign(req.user, req.body);
    updatedUser.profileCompleted = true;
    await updatedUser.save();

    res.json({
      success: true,
      message: "Profile saved successfully",
      user: {
        id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        profileCompleted: updatedUser.profileCompleted,
        plan: updatedUser.plan,
        credits: updatedUser.credits,
      },
    });
  } catch (err) {
    console.error("Save profile error:", err);
    res.status(500).json({ success: false, error: "Failed to save profile" });
  }
});

/**
 * 👤 GET FULL PROFILE
 */
router.get("/me", protect, async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ 
      success: true, 
      user: getSanitizedProfile(user) 
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ success: false, error: "Failed to get profile" });
  }
});

/**
 * 👤 GET USER PROFILE (alternative endpoint for compatibility)
 */
router.get("/profile", protect, async (req, res) => {
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
      user: getSanitizedProfile(user),
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to get profile" 
    });
  }
});

export default router;
