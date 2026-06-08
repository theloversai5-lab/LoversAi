import express from "express";
import Moodboard from "../models/Moodboard.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

/* ================================================================
   GET /api/moodboard — Get all moodboards for the current user
================================================================ */
router.get("/", protect, async (req, res) => {
  try {
    const moodboards = await Moodboard.find({ userId: req.user._id });
    res.json({ success: true, moodboards });
  } catch (err) {
    console.error("Fetch moodboards error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch moodboards" });
  }
});

/* ================================================================
   POST /api/moodboard — Save/Update a moodboard (upsert by boardId)
================================================================ */
router.post("/", protect, async (req, res) => {
  try {
    const {
      boardId,
      theme,
      title,
      style,
      functionType,
      prompt,
      images,
      details,
    } = req.body;

    if (!boardId || !theme) {
      return res.status(400).json({ success: false, error: "boardId and theme are required" });
    }

    const moodboard = await Moodboard.findOneAndUpdate(
      { userId: req.user._id, boardId },
      {
        theme,
        title,
        style,
        functionType,
        prompt,
        images: images || [],
        details,
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, moodboard });
  } catch (err) {
    console.error("Save moodboard error:", err);
    res.status(500).json({ success: false, error: "Failed to save moodboard" });
  }
});

/* ================================================================
   DELETE /api/moodboard/:boardId — Delete a moodboard
================================================================ */
router.delete("/:boardId", protect, async (req, res) => {
  try {
    const { boardId } = req.params;
    await Moodboard.findOneAndDelete({ userId: req.user._id, boardId });
    res.json({ success: true, message: "Moodboard deleted successfully" });
  } catch (err) {
    console.error("Delete moodboard error:", err);
    res.status(500).json({ success: false, error: "Failed to delete moodboard" });
  }
});

export default router;
