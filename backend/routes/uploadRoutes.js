// routes/uploadRoutes.js — Secure file upload to Cloudinary
import express from "express";
import { upload } from "../utils/cloudinary.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /api/upload/image
 * Upload a single image to Cloudinary
 * Returns: { success, url, publicId }
 */
router.post("/image", protect, (req, res, next) => {
  // Set folder based on query param
  req.uploadFolder = req.query.folder || "misc";
  next();
}, upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No image file provided" });
    }

    res.json({
      success: true,
      url: req.file.path, // Cloudinary URL
      publicId: req.file.filename,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, error: "Failed to upload image" });
  }
});

/**
 * POST /api/upload/images
 * Upload multiple images (max 10)
 * Returns: { success, files: [{ url, publicId }] }
 */
router.post("/images", protect, (req, res, next) => {
  req.uploadFolder = req.query.folder || "misc";
  next();
}, upload.array("images", 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: "No image files provided" });
    }

    const files = req.files.map((file) => ({
      url: file.path,
      publicId: file.filename,
    }));

    res.json({ success: true, files });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, error: "Failed to upload images" });
  }
});

// Error handler for multer
router.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ success: false, error: "File too large. Maximum size is 10MB." });
  }
  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({ success: false, error: "Too many files. Maximum is 10." });
  }
  if (err.message) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next(err);
});

export default router;
