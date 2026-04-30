import express from "express";
import NewUser from "../models/NewUser.js";

const router = express.Router();

// POST /api/newusers
router.post("/", async (req, res, next) => {
  try {
    const { phone, source, meta } = req.body || {};

    if (!phone || typeof phone !== "string" || phone.trim().length < 6) {
      return res.status(400).json({ success: false, error: "Invalid phone number" });
    }

    const normalized = phone.trim();

    // Check for existing entry to avoid duplicates
    const existing = await NewUser.findOne({ phone: normalized });
    if (existing) {
      // Increment submissions and update lastSubmittedAt
      existing.submissions = (existing.submissions || 1) + 1;
      existing.lastSubmittedAt = new Date();
      if (meta && typeof meta === 'object') existing.meta = { ...existing.meta, ...meta };
      if (source) existing.source = source;
      await existing.save();

      return res.status(200).json({
        success: true,
        data: { id: existing._id, phone: existing.phone, submissions: existing.submissions, lastSubmittedAt: existing.lastSubmittedAt },
        message: "Already exists",
      });
    }

    const doc = await NewUser.create({ phone: normalized, source: source || "footer", meta: meta || {} });

    return res.status(201).json({ success: true, data: { id: doc._id, phone: doc.phone }, message: "Saved" });
  } catch (err) {
    next(err);
  }
});

export default router;
