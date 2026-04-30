import User from "../models/User.js";

export const getAdminProfile = async (req, res) => {
  const user = req.adminUser || (await User.findOne({ firebaseUid: req.user.uid }));

  if (!user) {
    return res.status(404).json({ success: false, error: "Admin user not found" });
  }

  return res.json({
    success: true,
    admin: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      isAdmin: user.isAdmin,
      plan: user.plan,
      credits: user.credits,
      subscriptionStatus: user.subscriptionStatus,
    }
  });
};

export const getUserList = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 }).limit(500);
    const sanitized = users.map((user) => ({
      id: user._id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      fullName: user.fullName,
      plan: user.plan,
      isPro: user.isPro,
      isAdmin: user.isAdmin,
      isBlocked: user.isBlocked,
      credits: user.credits,
      subscriptionStatus: user.subscriptionStatus,
      lastPaymentStatus: user.lastPaymentStatus,
      totalSpent: user.totalSpent,
      createdAt: user.createdAt,
    }));

    res.json({ success: true, users: sanitized });
  } catch (err) {
    console.error("getUserList error:", err);
    res.status(500).json({ success: false, error: "Failed to retrieve users" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    res.json({
      success: true,
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        fullName: user.fullName,
        plan: user.plan,
        isPro: user.isPro,
        isAdmin: user.isAdmin,
        isBlocked: user.isBlocked,
        blockedAt: user.blockedAt,
        blockedReason: user.blockedReason,
        credits: user.credits,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionRenewsAt: user.subscriptionRenewsAt,
        lastPaymentStatus: user.lastPaymentStatus,
        lastPaymentAt: user.lastPaymentAt,
        totalCreditsUsed: user.totalCreditsUsed,
        totalPayments: user.totalPayments,
        totalSpent: user.totalSpent,
        creditTransactions: user.creditTransactions,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    });
  } catch (err) {
    console.error("getUserById error:", err);
    res.status(500).json({ success: false, error: "Failed to retrieve user" });
  }
};

export const updateUserById = async (req, res) => {
  const allowed = ["plan", "isPro", "credits", "isAdmin", "subscriptionStatus", "fullName", "isBlocked", "blockedReason"];
  const updates = Object.keys(req.body).reduce((acc, key) => {
    if (allowed.includes(key)) acc[key] = req.body[key];
    return acc;
  }, {});

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    Object.assign(user, updates);
    if (typeof updates.credits !== "undefined" && Number.isFinite(Number(updates.credits))) {
      user.credits = Number(updates.credits);
    }

    // Handle blocking/unblocking
    if (updates.isBlocked !== undefined) {
      if (updates.isBlocked) {
        user.blockedAt = new Date();
        user.blockedReason = updates.blockedReason || "Blocked by admin";
      } else {
        user.blockedAt = null;
        user.blockedReason = null;
      }
    }

    await user.save();

    res.json({ success: true, message: "User updated", user });
  } catch (err) {
    console.error("updateUserById error:", err);
    res.status(500).json({ success: false, error: "Failed to update user" });
  }
};

export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProUsers = await User.countDocuments({ isPro: true });
    const totalBlockedUsers = await User.countDocuments({ isBlocked: true });
    const totalCredits = await User.aggregate([{ $group: { _id: null, total: { $sum: "$credits" } } }]);
    const totalRevenue = await User.aggregate([{ $group: { _id: null, total: { $sum: "$totalSpent" } } }]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalProUsers,
        totalBlockedUsers,
        totalCredits: totalCredits?.[0]?.total || 0,
        totalRevenue: totalRevenue?.[0]?.total || 0,
      }
    });
  } catch (err) {
    console.error("getAdminStats error:", err);
    res.status(500).json({ success: false, error: "Failed to retrieve admin stats" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    // Prevent deleting admin users
    if (user.isAdmin) {
      return res.status(403).json({ success: false, error: "Cannot delete admin users" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    if (user.isAdmin) {
      return res.status(403).json({ success: false, error: "Cannot block admin users" });
    }

    user.isBlocked = true;
    user.blockedAt = new Date();
    user.blockedReason = reason || "Blocked by admin";
    await user.save();

    res.json({ success: true, message: "User blocked successfully", user });
  } catch (err) {
    console.error("blockUser error:", err);
    res.status(500).json({ success: false, error: "Failed to block user" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    user.isBlocked = false;
    user.blockedAt = null;
    user.blockedReason = null;
    await user.save();

    res.json({ success: true, message: "User unblocked successfully", user });
  } catch (err) {
    console.error("unblockUser error:", err);
    res.status(500).json({ success: false, error: "Failed to unblock user" });
  }
};

export const adjustCredits = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const creditAmount = parseInt(amount);
    if (isNaN(creditAmount)) {
      return res.status(400).json({ success: false, error: "Invalid credit amount" });
    }

    const oldCredits = user.credits;
    user.credits = Math.max(0, user.credits + creditAmount);

    // Add transaction record
    user.creditTransactions.push({
      type: creditAmount > 0 ? 'credit' : 'debit',
      amount: Math.abs(creditAmount),
      description: reason || `Admin credit adjustment: ${creditAmount > 0 ? '+' : ''}${creditAmount}`,
      reference: 'admin_adjustment',
      remainingBalance: user.credits,
      metadata: { adminAction: true, oldBalance: oldCredits }
    });

    await user.save();

    res.json({
      success: true,
      message: `Credits ${creditAmount > 0 ? 'added' : 'deducted'} successfully`,
      user: { id: user._id, credits: user.credits, oldCredits }
    });
  } catch (err) {
    console.error("adjustCredits error:", err);
    res.status(500).json({ success: false, error: "Failed to adjust credits" });
  }
};

export const verifyVendor = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    if (user.role !== 'vendor') return res.status(400).json({ success: false, error: "User is not a vendor" });

    user.vendorVerificationStatus = 'approved';
    user.vendorVerifiedAt = new Date();
    await user.save();

    res.json({ success: true, message: "Vendor verified successfully", user });
  } catch (err) {
    console.error("verifyVendor error:", err);
    res.status(500).json({ success: false, error: "Failed to verify vendor" });
  }
};

export const rejectVendor = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    if (user.role !== 'vendor') return res.status(400).json({ success: false, error: "User is not a vendor" });

    user.vendorVerificationStatus = 'rejected';
    user.blockedReason = reason || "Vendor verification rejected by admin";
    await user.save();

    res.json({ success: true, message: "Vendor verification rejected", user });
  } catch (err) {
    console.error("rejectVendor error:", err);
    res.status(500).json({ success: false, error: "Failed to reject vendor" });
  }
};
