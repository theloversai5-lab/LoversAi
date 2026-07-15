import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import creditService from "../services/creditService.js";

const router = express.Router();

/**
 * GET /api/credits/wallet
 * Returns the current user's wallet, total balance, and plan info.
 */
router.get("/wallet", protect, async (req, res) => {
  try {
    const productType = req.query.wallet || "couple";
    const walletData = await creditService.getWallet(req.user._id, productType);
    res.json({
      success: true,
      data: walletData,
    });
  } catch (err) {
    console.error("Error fetching wallet:", err);
    res.status(500).json({ success: false, error: "Failed to fetch wallet information." });
  }
});

/**
 * GET /api/credits/history
 * Returns paginated transaction ledger history for the user.
 */
router.get("/history", protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type;
    const source = req.query.source;
    const productType = req.query.wallet || "couple";

    const history = await creditService.getTransactionHistory(req.user._id, {
      page,
      limit,
      type,
      source,
      productType
    });

    res.json({
      success: true,
      data: history.transactions,
      pagination: history.pagination,
    });
  } catch (err) {
    console.error("Error fetching credit history:", err);
    res.status(500).json({ success: false, error: "Failed to fetch transaction history." });
  }
});

// Admin routes can be added here using `authorize('admin')` middleware in the future.

export default router;
