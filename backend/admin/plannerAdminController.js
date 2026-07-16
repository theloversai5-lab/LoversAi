import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import Subscription from "../models/Subscription.js";
import CreditTransaction from "../models/CreditTransaction.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import creditService from "../services/creditService.js";
import { PLAN_CREDITS } from "../config/credits.js";
import mongoose from "mongoose";

// In-memory lock to prevent duplicate concurrent requests
const actionLocks = new Set();

const lockAction = (adminId, targetUserId, actionType) => {
  const lockKey = `${adminId}:${targetUserId}:${actionType}`;
  if (actionLocks.has(lockKey)) {
    return false; // Already locked
  }
  actionLocks.add(lockKey);
  // Auto-release after 10 seconds just in case
  setTimeout(() => actionLocks.delete(lockKey), 10000);
  return lockKey;
};

const releaseAction = (lockKey) => {
  actionLocks.delete(lockKey);
};

// Helper: Log Admin Action
const logAdminAction = async ({
  admin,
  targetUser,
  action,
  previousPlan = null,
  newPlan = null,
  previousCredits = null,
  newCredits = null,
  reason,
  subscriptionSource = null,
}) => {
  await AdminAuditLog.create({
    adminId: admin._id,
    adminName: admin.fullName || admin.email,
    userId: targetUser._id,
    userEmail: targetUser.email,
    action,
    previousPlan,
    newPlan,
    previousCredits,
    newCredits,
    reason,
    subscriptionSource,
  });
};

/* ================================================================
   GET /api/admin/planner/users
================================================================ */
export const getPlannerUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { search, plan, status } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
      ];
      // If search is a valid ObjectId, search by ID
      if (mongoose.Types.ObjectId.isValid(search)) {
        query.$or.push({ _id: search });
      }
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("email fullName createdAt");

    const total = await User.countDocuments(query);

    // Fetch wallets and subscriptions for these users
    const userIds = users.map((u) => u._id);
    const wallets = await Wallet.find({ userId: { $in: userIds }, productType: "planner" });
    const subscriptions = await Subscription.find({
      userId: { $in: userIds },
      plan: { $in: ["free", "planner_basic", "planner_premium", "planner_pro"] },
      status: "active",
    }).sort({ createdAt: -1 });

    const enrichedUsers = users.map((user) => {
      const wallet = wallets.find((w) => w.userId.equals(user._id));
      const sub = subscriptions.find((s) => s.userId.equals(user._id));

      const isMatchPlan = !plan || (sub && sub.plan === plan) || (!sub && plan === "free");
      const subStatus = sub ? sub.status : "expired";
      const isMatchStatus = !status || (status === "active" && sub) || (status === "expired" && !sub);

      return {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        createdAt: user.createdAt,
        plannerPlan: sub ? sub.plan : "free",
        plannerStatus: subStatus,
        plannerCredits: wallet ? wallet.balance : 0,
        plannerCreditsUsed: sub ? sub.creditsUsed : 0,
        subscriptionSource: sub ? sub.source : null,
        subscriptionExpiry: sub ? sub.endsAt : null,
        isMatch: isMatchPlan && isMatchStatus,
      };
    });

    const filteredUsers = enrichedUsers.filter((u) => u.isMatch);

    res.json({
      success: true,
      users: filteredUsers,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("getPlannerUsers error:", err);
    res.status(500).json({ success: false, error: "Failed to retrieve planner users" });
  }
};

/* ================================================================
   GET /api/admin/planner/users/:id
================================================================ */
export const getPlannerUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const wallet = await creditService.getWallet(user._id, "planner");
    const activeSubscription = await Subscription.findOne({
      userId: user._id,
      plan: { $in: ["planner_basic", "planner_premium", "planner_pro"] },
      status: "active",
    }).sort({ createdAt: -1 });

    const allSubscriptions = await Subscription.find({
      userId: user._id,
      plan: { $regex: "^planner_" },
    }).sort({ createdAt: -1 });

    const transactions = await CreditTransaction.find({
      userId: user._id,
      productType: "planner",
    }).sort({ createdAt: -1 }).limit(100);

    const auditLogs = await AdminAuditLog.find({
      userId: user._id,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        createdAt: user.createdAt,
      },
      wallet,
      activeSubscription,
      allSubscriptions,
      transactions,
      auditLogs,
    });
  } catch (err) {
    console.error("getPlannerUserDetails error:", err);
    res.status(500).json({ success: false, error: "Failed to retrieve planner user details" });
  }
};

/* ================================================================
   POST /api/admin/planner/users/:id/subscription
================================================================ */
export const grantPlannerSubscription = async (req, res) => {
  const admin = req.adminUser || req.user;
  const targetUserId = req.params.id;
  const { plan, duration, source, reason } = req.body;

  if (!reason) return res.status(400).json({ success: false, error: "Reason is required" });
  if (!plan || !PLAN_CREDITS[plan]) return res.status(400).json({ success: false, error: "Invalid plan" });
  
  const lockKey = lockAction(admin._id, targetUserId, "GRANT_SUB");
  if (!lockKey) return res.status(409).json({ success: false, error: "Duplicate action in progress" });

  try {
    const user = await User.findById(targetUserId);
    if (!user) {
      releaseAction(lockKey);
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const activeSubscription = await Subscription.findOne({
      userId: user._id,
      plan: { $in: ["planner_basic", "planner_premium", "planner_pro"] },
      status: "active",
    });

    if (activeSubscription) {
      releaseAction(lockKey);
      return res.status(400).json({ success: false, error: "User already has an active planner subscription" });
    }

    // Calculate duration
    let endsAt = null;
    if (duration === "7") endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    else if (duration === "30") endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    else if (duration === "90") endsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    else if (duration === "365") endsAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    else if (duration === "never") endsAt = null;
    else if (new Date(duration) > new Date()) endsAt = new Date(duration);
    else {
      releaseAction(lockKey);
      return res.status(400).json({ success: false, error: "Invalid duration or expiry date" });
    }

    const creditsToGrant = PLAN_CREDITS[plan];

    const newSub = await Subscription.create({
      userId: user._id,
      plan,
      status: "active",
      creditsGranted: creditsToGrant,
      source: source || "Admin Granted",
      startsAt: new Date(),
      endsAt,
    });

    const oldWallet = await creditService.getWallet(user._id, "planner");
    const previousCredits = oldWallet.credits;

    const result = await creditService.addCredits(
      user._id,
      creditsToGrant,
      "subscription", // Assuming 'subscription' source is appropriate
      `admin_sub_${newSub._id}`,
      { adminAction: true, reason, subscriptionId: newSub._id },
      "planner"
    );

    await logAdminAction({
      admin,
      targetUser: user,
      action: "GRANT_SUBSCRIPTION",
      previousPlan: "free",
      newPlan: plan,
      previousCredits,
      newCredits: result.wallet.balance,
      reason,
      subscriptionSource: newSub.source,
    });

    releaseAction(lockKey);
    res.json({ success: true, message: "Subscription granted successfully", subscription: newSub });
  } catch (err) {
    releaseAction(lockKey);
    console.error("grantPlannerSubscription error:", err);
    res.status(500).json({ success: false, error: "Failed to grant subscription" });
  }
};

/* ================================================================
   PUT /api/admin/planner/users/:id/subscription (Modify)
================================================================ */
export const modifyPlannerSubscription = async (req, res) => {
  const admin = req.adminUser || req.user;
  const targetUserId = req.params.id;
  const { action, plan, duration, reason } = req.body;

  if (!reason) return res.status(400).json({ success: false, error: "Reason is required" });
  
  const lockKey = lockAction(admin._id, targetUserId, "MODIFY_SUB");
  if (!lockKey) return res.status(409).json({ success: false, error: "Duplicate action in progress" });

  try {
    const user = await User.findById(targetUserId);
    if (!user) {
      releaseAction(lockKey);
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const activeSub = await Subscription.findOne({
      userId: user._id,
      plan: { $in: ["planner_basic", "planner_premium", "planner_pro"] },
      status: "active",
    });

    const oldWallet = await creditService.getWallet(user._id, "planner");
    const previousCredits = oldWallet.credits;

    if (action === "remove") {
      if (!activeSub) {
        releaseAction(lockKey);
        return res.status(400).json({ success: false, error: "No active subscription to remove" });
      }

      activeSub.status = "cancelled";
      activeSub.cancelled = true;
      activeSub.cancelledAt = new Date();
      await activeSub.save();

      // Reset credits to 0
      if (previousCredits > 0) {
        await creditService.deductCredits(
          user._id,
          previousCredits,
          "admin_deduct",
          `admin_remove_sub_${activeSub._id}`,
          { reason, adminAction: true, subscriptionId: activeSub._id },
          "planner"
        );
      }

      await logAdminAction({
        admin,
        targetUser: user,
        action: "REMOVE_SUBSCRIPTION",
        previousPlan: activeSub.plan,
        newPlan: "free",
        previousCredits,
        newCredits: 0,
        reason,
        subscriptionSource: activeSub.source,
      });

      releaseAction(lockKey);
      return res.json({ success: true, message: "Subscription removed and credits reset to 0" });
    }

    if (action === "extend") {
      if (!activeSub) {
        releaseAction(lockKey);
        return res.status(400).json({ success: false, error: "No active subscription to extend" });
      }

      if (duration === "7") activeSub.endsAt = new Date(activeSub.endsAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      else if (duration === "30") activeSub.endsAt = new Date(activeSub.endsAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      else if (duration === "90") activeSub.endsAt = new Date(activeSub.endsAt.getTime() + 90 * 24 * 60 * 60 * 1000);
      else if (duration === "365") activeSub.endsAt = new Date(activeSub.endsAt.getTime() + 365 * 24 * 60 * 60 * 1000);
      else if (duration === "never") activeSub.endsAt = null;
      else if (new Date(duration) > new Date()) activeSub.endsAt = new Date(duration);
      else {
        releaseAction(lockKey);
        return res.status(400).json({ success: false, error: "Invalid extension duration" });
      }

      await activeSub.save();

      await logAdminAction({
        admin,
        targetUser: user,
        action: "EXTEND_SUBSCRIPTION",
        previousPlan: activeSub.plan,
        newPlan: activeSub.plan,
        previousCredits,
        newCredits: previousCredits,
        reason,
        subscriptionSource: activeSub.source,
      });

      releaseAction(lockKey);
      return res.json({ success: true, message: "Subscription extended successfully", subscription: activeSub });
    }

    if (action === "upgrade" || action === "downgrade") {
      if (!activeSub) {
        releaseAction(lockKey);
        return res.status(400).json({ success: false, error: "No active subscription to change" });
      }
      if (!plan || !PLAN_CREDITS[plan]) {
        releaseAction(lockKey);
        return res.status(400).json({ success: false, error: "Invalid plan" });
      }

      const previousPlan = activeSub.plan;
      const creditDifference = PLAN_CREDITS[plan] - PLAN_CREDITS[previousPlan];

      activeSub.plan = plan;
      activeSub.creditsGranted = PLAN_CREDITS[plan];
      await activeSub.save();

      let newCredits = previousCredits;
      if (creditDifference > 0) {
        const result = await creditService.addCredits(
          user._id,
          creditDifference,
          "admin_adjustment",
          `admin_upgrade_sub_${activeSub._id}`,
          { reason, adminAction: true, subscriptionId: activeSub._id },
          "planner"
        );
        newCredits = result.wallet.balance;
      } else if (creditDifference < 0) {
        // Prevent negative credits
        const amountToDeduct = Math.min(Math.abs(creditDifference), previousCredits);
        if (amountToDeduct > 0) {
          const result = await creditService.deductCredits(
            user._id,
            amountToDeduct,
            "admin_adjustment",
            `admin_downgrade_sub_${activeSub._id}`,
            { reason, adminAction: true, subscriptionId: activeSub._id },
            "planner"
          );
          newCredits = result.wallet.balance;
        }
      }

      await logAdminAction({
        admin,
        targetUser: user,
        action: action === "upgrade" ? "UPGRADE_SUBSCRIPTION" : "DOWNGRADE_SUBSCRIPTION",
        previousPlan,
        newPlan: plan,
        previousCredits,
        newCredits,
        reason,
        subscriptionSource: activeSub.source,
      });

      releaseAction(lockKey);
      return res.json({ success: true, message: `Subscription ${action}d successfully`, subscription: activeSub });
    }

    releaseAction(lockKey);
    res.status(400).json({ success: false, error: "Invalid action" });
  } catch (err) {
    releaseAction(lockKey);
    console.error("modifyPlannerSubscription error:", err);
    res.status(500).json({ success: false, error: "Failed to modify subscription" });
  }
};

/* ================================================================
   POST /api/admin/planner/users/:id/credits
================================================================ */
export const managePlannerCredits = async (req, res) => {
  const admin = req.adminUser || req.user;
  const targetUserId = req.params.id;
  const { action, amount, reason } = req.body;

  if (!reason) return res.status(400).json({ success: false, error: "Reason is required" });
  
  const lockKey = lockAction(admin._id, targetUserId, "MANAGE_CREDITS");
  if (!lockKey) return res.status(409).json({ success: false, error: "Duplicate action in progress" });

  try {
    const user = await User.findById(targetUserId);
    if (!user) {
      releaseAction(lockKey);
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const creditAmount = parseInt(amount);
    if (action !== "reset" && (isNaN(creditAmount) || creditAmount <= 0)) {
      releaseAction(lockKey);
      return res.status(400).json({ success: false, error: "Amount must be a positive number" });
    }

    const oldWallet = await creditService.getWallet(user._id, "planner");
    const previousCredits = oldWallet.credits;
    let newCredits = previousCredits;

    const activeSub = await Subscription.findOne({
      userId: user._id,
      plan: { $in: ["planner_basic", "planner_premium", "planner_pro"] },
      status: "active",
    });

    if (action === "add") {
      const result = await creditService.addCredits(
        user._id,
        creditAmount,
        "admin_adjustment",
        `admin_add_credits_${Date.now()}`,
        { reason, adminAction: true, subscriptionId: activeSub?._id },
        "planner"
      );
      newCredits = result.wallet.balance;
    } else if (action === "remove") {
      if (previousCredits < creditAmount) {
        releaseAction(lockKey);
        return res.status(400).json({ success: false, error: "Cannot remove more credits than available (prevents negative credits)" });
      }
      const result = await creditService.deductCredits(
        user._id,
        creditAmount,
        "admin_adjustment",
        `admin_remove_credits_${Date.now()}`,
        { reason, adminAction: true, subscriptionId: activeSub?._id },
        "planner"
      );
      newCredits = result.wallet.balance;
    } else if (action === "reset") {
      if (previousCredits > 0) {
        const result = await creditService.deductCredits(
          user._id,
          previousCredits,
          "admin_adjustment",
          `admin_reset_credits_${Date.now()}`,
          { reason, adminAction: true, subscriptionId: activeSub?._id },
          "planner"
        );
        newCredits = result.wallet.balance;
      }
    } else if (action === "refund") {
      const result = await creditService.refundCredits(
        user._id,
        creditAmount,
        "admin_grant",
        { reason, adminAction: true, subscriptionId: activeSub?._id },
        "planner"
      );
      newCredits = result.wallet.balance;
    } else {
      releaseAction(lockKey);
      return res.status(400).json({ success: false, error: "Invalid action" });
    }

    await logAdminAction({
      admin,
      targetUser: user,
      action: `CREDITS_${action.toUpperCase()}`,
      previousPlan: activeSub ? activeSub.plan : "free",
      newPlan: activeSub ? activeSub.plan : "free",
      previousCredits,
      newCredits,
      reason,
      subscriptionSource: activeSub ? activeSub.source : null,
    });

    releaseAction(lockKey);
    res.json({ success: true, message: `Credits ${action}ed successfully`, credits: newCredits });
  } catch (err) {
    releaseAction(lockKey);
    console.error("managePlannerCredits error:", err);
    res.status(500).json({ success: false, error: "Failed to manage credits" });
  }
};
