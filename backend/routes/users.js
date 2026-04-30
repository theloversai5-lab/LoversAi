import express from "express";
import User from "../models/User.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

/* ================================================================
   GET /api/users/check-profile
================================================================ */
router.get("/check-profile", protect, async (req, res) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      exists: user.profileCompleted !== false,
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
        role: user.role,
        weddingProfile: user.weddingProfile,
      },
    });
  } catch (err) {
    console.error("Check profile error:", err);
    res.status(500).json({ success: false, error: "Failed to check profile" });
  }
});

/* ================================================================
   POST /api/users/save-form — Save general profile
================================================================ */
router.post("/save-form", protect, async (req, res) => {
  try {
    const {
      fullName, location, age, budget,
      position, interest, phone, company_name,
    } = req.body;

    const updateData = {};
    if (fullName) updateData.fullName = fullName.trim();
    if (location) updateData.location = location;
    if (age) updateData.age = parseInt(age) || undefined;
    if (budget) updateData.budget = budget;
    if (position) updateData.position = position;
    if (interest) updateData.interest = interest;
    if (phone) updateData.phone = phone;
    if (company_name) updateData.company_name = company_name;

    // Determine if profile is now completed
    updateData.profileCompleted = Boolean(
      (fullName || req.user.fullName) &&
      (location || req.user.location) &&
      (age || req.user.age) &&
      (budget || req.user.budget) &&
      (position || req.user.position) &&
      (interest || req.user.interest)
    );

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Profile saved successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        profileCompleted: user.profileCompleted,
        role: user.role,
        plan: user.plan,
        credits: user.credits,
      },
    });
  } catch (err) {
    console.error("Save form error:", err);
    res.status(500).json({ success: false, error: "Failed to save profile" });
  }
});

/* ================================================================
   POST /api/users/save-wedding-profile — Save couple wedding details
================================================================ */
router.post("/save-wedding-profile", protect, authorize("couple"), async (req, res) => {
  try {
    const {
      partnerName1, partnerName2, weddingDate,
      budget, guestCount, city, venue, tradition, dreamVenue,
    } = req.body;

    // Basic validation
    if (!partnerName1 && !partnerName2) {
      return res.status(400).json({
        success: false,
        error: "At least one partner name is required",
      });
    }

    const parsedWeddingDate = weddingDate ? new Date(weddingDate) : undefined;
    const safeWeddingDate =
      parsedWeddingDate && !Number.isNaN(parsedWeddingDate.getTime())
        ? parsedWeddingDate
        : undefined;

    const weddingProfile = {
      partnerName1: partnerName1?.trim() || req.user.fullName,
      partnerName2: partnerName2?.trim() || "",
      weddingDate: safeWeddingDate,
      budget: budget || "",
      guestCount: guestCount ? parseInt(guestCount) : undefined,
      city: city?.trim() || "",
      venue: venue?.trim() || "",
      tradition: tradition?.trim() || "",
      dreamVenue: dreamVenue?.trim() || "",
      completed: true,
    };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        weddingProfile,
        profileCompleted: true,
      },
      { new: true, runValidators: true }
    );

    console.log(`💍 Wedding profile saved for ${user.email}`);

    res.json({
      success: true,
      message: "Wedding profile saved!",
      weddingProfile: user.weddingProfile,
    });
  } catch (err) {
    console.error("Save wedding profile error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to save wedding profile",
    });
  }
});

/* ================================================================
   GET /api/users/profile — Get full profile
================================================================ */
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        authProvider: user.authProvider,
        location: user.location,
        age: user.age,
        budget: user.budget,
        position: user.position,
        interest: user.interest,
        company_name: user.company_name,
        profileCompleted: user.profileCompleted,
        weddingProfile: user.weddingProfile,
        plan: user.plan,
        isPro: user.isPro,
        credits: user.credits,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionRenewsAt: user.subscriptionRenewsAt,
        lastPaymentStatus: user.lastPaymentStatus,
        lastPaymentAt: user.lastPaymentAt,
        lemonCustomerId: user.lemonCustomerId,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ success: false, error: "Failed to get profile" });
  }
});

/* ================================================================
   PUT /api/users/update-credits
================================================================ */
router.put("/update-credits", protect, async (req, res) => {
  try {
    const { credits, action } = req.body;

    if (typeof credits !== "number") {
      return res.status(400).json({ success: false, error: "Credits must be a number" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    let newCredits = user.credits;

    if (action === "add") {
      newCredits += credits;
    } else if (action === "subtract") {
      if (user.credits < credits) {
        return res.status(400).json({ success: false, error: "Insufficient credits" });
      }
      newCredits = Math.max(0, newCredits - credits);
    } else if (action === "set") {
      newCredits = credits;
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid action. Use 'add', 'subtract', or 'set'",
      });
    }

    user.credits = newCredits;
    await user.save();

    res.json({
      success: true,
      message: `Credits ${action}ed successfully`,
      credits: user.credits,
    });
  } catch (err) {
    console.error("Update credits error:", err);
    res.status(500).json({ success: false, error: "Failed to update credits" });
  }
});

/* ================================================================
   GET /api/users/stats
================================================================ */
router.get("/stats", protect, async (req, res) => {
  try {
    const user = req.user;
    const totalUsers = await User.countDocuments();

    res.json({
      success: true,
      stats: {
        user: {
          plan: user.plan,
          isPro: user.isPro,
          credits: user.credits,
          profileCompleted: user.profileCompleted,
          joined: user.createdAt,
        },
        system: { totalUsers },
      },
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ success: false, error: "Failed to get stats" });
  }
});

export default router;
