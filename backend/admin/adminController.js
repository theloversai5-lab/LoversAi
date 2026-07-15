import User from "../models/User.js";
import creditService from "../services/creditService.js";
import CreditTransaction from "../models/CreditTransaction.js";
import Wallet from "../models/Wallet.js";

export const getAdminProfile = async (req, res) => {
  const user = req.adminUser || (await User.findById(req.user._id));

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
      subscriptionStatus: user.subscriptionStatus,
    }
  });
};

export const getUserList = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 }).limit(500);
    const userIds = users.map((u) => u._id);

    // Fetch wallets for all listed users
    const wallets = await Wallet.find({ userId: { $in: userIds } });

    const sanitized = users.map((user) => {
      const targetProductType = ["couple", "planner", "vendor"].includes(user.role) ? user.role : "couple";
      const wallet = wallets.find((w) => w.userId.equals(user._id) && w.productType === targetProductType);
      
      const balance = wallet ? wallet.balance : 0;
      const lifetimeUsed = wallet ? wallet.lifetimeUsed : 0;
      const lifetimeAdded = wallet ? wallet.lifetimeAdded : 0;
      const creditsGiven = Math.max(lifetimeAdded, balance + lifetimeUsed);

      return {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        fullName: user.fullName,
        role: user.role || "couple",
        plan: user.plan,
        isPro: user.isPro,
        isAdmin: user.isAdmin,
        isBlocked: user.isBlocked,
        credits: balance,
        creditsGiven,
        creditsUsed: lifetimeUsed,
        subscriptionStatus: user.subscriptionStatus,
        lastPaymentStatus: user.lastPaymentStatus,
        totalSpent: user.totalSpent,
        createdAt: user.createdAt,
      };
    });

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

    // Fetch actual credit transactions from the database
    const transactions = await CreditTransaction.find({ userId: user._id }).sort({ createdAt: -1 });

    // Fetch the correct wallet based on user role
    const productType = ["couple", "planner", "vendor"].includes(user.role) ? user.role : "couple";
    const wallet = await Wallet.findOne({ userId: user._id, productType });

    const balance = wallet ? wallet.balance : 0;
    const lifetimeUsed = wallet ? wallet.lifetimeUsed : 0;
    const lifetimeAdded = wallet ? wallet.lifetimeAdded : 0;
    const creditsGiven = Math.max(lifetimeAdded, balance + lifetimeUsed);

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
        subscriptionStatus: user.subscriptionStatus,
        subscriptionRenewsAt: user.subscriptionRenewsAt,
        lastPaymentStatus: user.lastPaymentStatus,
        lastPaymentAt: user.lastPaymentAt,
        totalCreditsUsed: user.totalCreditsUsed,
        totalPayments: user.totalPayments,
        totalSpent: user.totalSpent,
        creditTransactions: transactions,
        credits: balance,
        creditsGiven,
        creditsUsed: lifetimeUsed,
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
  const allowed = ["plan", "isPro", "isAdmin", "subscriptionStatus", "fullName", "isBlocked", "blockedReason"];
  const updates = Object.keys(req.body).reduce((acc, key) => {
    if (allowed.includes(key)) acc[key] = req.body[key];
    return acc;
  }, {});

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    Object.assign(user, updates);

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
    const totalCredits = await Wallet.aggregate([{ $group: { _id: null, total: { $sum: "$balance" } } }]);
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
    
    // Clean up associated wallets and transactions in MongoDB to prevent orphaned data
    await Wallet.deleteMany({ userId: req.params.id });
    await CreditTransaction.deleteMany({ userId: req.params.id });

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
    let { amount, reason, productType } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    if (!productType) {
      // Default to user.role if allowed product type, else fallback to 'couple'
      productType = ["couple", "planner", "vendor"].includes(user.role) ? user.role : "couple";
    }

    const creditAmount = parseInt(amount);
    if (isNaN(creditAmount)) {
      return res.status(400).json({ success: false, error: "Invalid credit amount" });
    }

    let updatedWallet;
    
    if (creditAmount > 0) {
      const result = await creditService.addCredits(
        user._id,
        creditAmount,
        'admin_grant',
        `admin_adj_${Date.now()}`,
        { reason, adminAction: true },
        productType
      );
      updatedWallet = result.wallet;
    } else if (creditAmount < 0) {
      const result = await creditService.deductCredits(
        user._id,
        Math.abs(creditAmount),
        'admin_deduct',
        `admin_adj_${Date.now()}`,
        { reason, adminAction: true },
        productType
      );
      updatedWallet = result.wallet;
    } else {
      return res.status(400).json({ success: false, error: "Amount cannot be zero" });
    }

    res.json({
      success: true,
      message: `Credits ${creditAmount > 0 ? 'added' : 'deducted'} successfully`,
      user: { id: user._id, credits: updatedWallet.balance }
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

export const getAILogs = async (req, res) => {
  try {
    const logs = await CreditTransaction.find({
      type: "debit",
      source: "ai_generation",
    })
      .populate("userId", "email fullName")
      .sort({ createdAt: -1 })
      .limit(1000);

    const sanitizedLogs = logs.map((log) => {
      let toolName = "AI Tool";
      if (log.metadata?.tool) {
        toolName = log.metadata.tool;
      } else if (log.metadata?.functionType) {
        toolName = log.metadata.functionType;
      } else if (log.reference?.startsWith("retexture_")) {
        toolName = "retexturing";
      } else if (log.reference?.startsWith("mb_")) {
        toolName = "couple_moodboard";
      } else if (log.reference?.startsWith("angle_")) {
        toolName = "angle_change";
      } else if (log.reference?.startsWith("video_")) {
        toolName = "image_to_video";
      }

      return {
        id: log._id,
        user: log.userId ? log.userId.email : "Unknown User",
        fullName: log.userId ? log.userId.fullName : "",
        tool: toolName,
        theme: log.metadata?.theme || log.metadata?.style || "N/A",
        cost: log.amount,
        status: log.status === "completed" ? "Success" : "Failed",
        date: log.createdAt,
      };
    });

    // Compute stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTransactions = await CreditTransaction.find({
      type: "debit",
      source: "ai_generation",
      createdAt: { $gte: today },
    });

    const totalCreditsToday = todayTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    const totalLogsCount = logs.length;
    const successLogsCount = logs.filter(log => log.status === "completed").length;
    const successRate = totalLogsCount > 0 ? ((successLogsCount / totalLogsCount) * 100).toFixed(1) : "100.0";

    // Most used tool
    const toolCounts = {};
    sanitizedLogs.forEach((log) => {
      toolCounts[log.tool] = (toolCounts[log.tool] || 0) + 1;
    });
    let mostUsedTool = "N/A";
    let maxCount = 0;
    Object.entries(toolCounts).forEach(([tool, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostUsedTool = tool;
      }
    });

    res.json({
      success: true,
      logs: sanitizedLogs,
      stats: {
        totalCreditsToday,
        successRate: parseFloat(successRate),
        mostUsedTool,
      },
    });
  } catch (err) {
    console.error("getAILogs error:", err);
    res.status(500).json({ success: false, error: "Failed to retrieve AI generation logs" });
  }
};

export const getRazorpayLedger = async (req, res) => {
  try {
    const transactions = await CreditTransaction.find({
      source: "purchased",
    })
      .populate("userId", "email fullName")
      .sort({ createdAt: -1 })
      .limit(1000);

    const PLANS_PRICING = {
      basic: { name: 'Basic Plan (Planner)', price: 329.99, plan: 'Basic (Planner)' },
      premium: { name: 'Premium Plan (Planner)', price: 639.99, plan: 'Premium (Planner)' },
      pro: { name: 'Pro Plan (Planner)', price: 999.99, plan: 'Pro (Planner)' },
      enterprise: { name: 'Enterprise', price: 0, plan: 'Enterprise' },
      planner_basic: { name: 'Basic Plan (Planner)', price: 329.99, plan: 'Basic (Planner)' },
      planner_premium: { name: 'Premium Plan (Planner)', price: 639.99, plan: 'Premium (Planner)' },
      planner_pro: { name: 'Pro Plan (Planner)', price: 999.99, plan: 'Pro (Planner)' },
      planner_enterprise: { name: 'Enterprise (Planner)', price: 0, plan: 'Enterprise (Planner)' },
      couple_basic: { name: 'Basic Plan (Couple)', price: 49.99, plan: 'Basic (Couple)' },
      couple_premium: { name: 'Premium Plan (Couple)', price: 134.99, plan: 'Premium (Couple)' },
      couple_pro: { name: 'Pro Plan (Couple)', price: 269.99, plan: 'Pro (Couple)' },
      couple_elite: { name: 'Pro Plan (Couple)', price: 269.99, plan: 'Pro (Couple)' }
    };

    const sanitizedPayments = transactions.map((tx) => {
      const planId = tx.metadata?.planId || "basic";
      const planInfo = PLANS_PRICING[planId] || { name: "Custom Purchase", price: 0, plan: "Custom" };
      
      const referenceId = tx.reference || "";
      const orderId = tx.metadata?.razorpay_order_id || "N/A";

      return {
        id: referenceId.startsWith("rzp_") ? referenceId.replace("rzp_", "pay_") : referenceId,
        orderId,
        user: tx.userId ? tx.userId.email : "Unknown User",
        fullName: tx.userId ? tx.userId.fullName : "",
        plan: planInfo.plan,
        amount: `₹ ${(planInfo.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        price: planInfo.price,
        status: tx.status === "completed" ? "Captured" : "Failed",
        date: tx.createdAt,
      };
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const mtdPayments = sanitizedPayments.filter(pay => new Date(pay.date) >= startOfMonth && pay.status === "Captured");
    const mtdRevenue = mtdPayments.reduce((sum, pay) => sum + pay.price, 0);

    const activeSubs = await User.countDocuments({ isPro: true });

    const totalCount = sanitizedPayments.length;
    const failedCount = sanitizedPayments.filter(pay => pay.status === "Failed").length;
    const failedRate = totalCount > 0 ? ((failedCount / totalCount) * 100).toFixed(1) : "0.0";

    res.json({
      success: true,
      payments: sanitizedPayments,
      stats: {
        mtdRevenue: `₹ ${mtdRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        activeSubs,
        failedRate: parseFloat(failedRate),
      }
    });
  } catch (err) {
    console.error("getRazorpayLedger error:", err);
    res.status(500).json({ success: false, error: "Failed to retrieve Razorpay ledger data" });
  }
};
