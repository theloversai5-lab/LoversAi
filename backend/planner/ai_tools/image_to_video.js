import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import { protect } from "../../middleware/auth.js";
import User from "../../models/User.js";
import Subscription from "../../models/Subscription.js";
import {
  isCloudinaryConfigured,
  uploadRemoteToCloudinary,
} from "../../utils/cloudinary.js";

const router = express.Router();

// AI configuration: prefer Gemini, optionally allow legacy FLUX when explicitly enabled
const LEGACY_FLUX_ENABLED = process.env.LEGACY_FLUX_ENABLED === "true";
const isAIEnabled = () => {
  return !!(
    (process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== "your_gemini_api_key_here") ||
    (process.env.BFL_API_KEY &&
      process.env.BFL_API_KEY !== "your_bfl_api_key_here" &&
      LEGACY_FLUX_ENABLED)
  );
};

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Video generation prompt templates
const VIDEO_STYLES = {
  "slow-pan": {
    name: "Slow Pan",
    description: "Smooth panning camera movement across the venue",
    prompt:
      "Create a smooth slow-panning video movement across this venue, showing all details and decorations from different angles in a cinematic style",
  },
  "zoom-in": {
    name: "Zoom In",
    description: "Camera zooms in on venue details",
    prompt:
      "Create a video with a smooth zoom-in effect on this venue, highlighting key decorative details and ambiance",
  },
  "zoom-out": {
    name: "Zoom Out",
    description: "Camera zooms out to reveal full venue",
    prompt:
      "Create a video with a smooth zoom-out effect revealing the full venue layout and overall aesthetic",
  },
  "360-rotate": {
    name: "360 Rotation",
    description: "Full 360 degree venue rotation",
    prompt:
      "Create a 360 degree rotating video around this venue showing all angles and details in smooth rotation",
  },
  cinematic: {
    name: "Cinematic",
    description: "Professional cinematic movement",
    prompt:
      "Create a cinematic video with dynamic camera movements, smooth transitions, and professional color grading showing this venue in the best light",
  },
};

// FLUX API video generation
async function callFluxVideoAPI(imageBuffer, prompt, style = "slow-pan") {
  if (!LEGACY_FLUX_ENABLED) {
    throw new Error(
      "Legacy FLUX video API is disabled. Set LEGACY_FLUX_ENABLED=true to enable legacy Flux or migrate to Gemini API.",
    );
  }
  if (!process.env.BFL_API_KEY) {
    throw new Error("BFL API key missing for legacy Flux video calls");
  }

  const baseUrl = process.env.FLUX_API_BASE_URL || "https://api.bfl.ai";
  const imageBase64 = imageBuffer.toString("base64");

  const requestBody = {
    prompt,
    input_image: imageBase64,
    width: 1024,
    height: 1024,
    duration: 5, // 5 second video
    num_frames: 25,
    safety_tolerance: 2,
  };

  try {
    const response = await fetch(`${baseUrl}/v1/flux-video`, {
      method: "POST",
      headers: {
        "x-key": process.env.BFL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`FLUX video API error ${response.status}: ${text}`);
    }

    const result = await response.json();

    // Handle async task polling
    if (result.id) {
      return await pollForVideoResult(result.id, result.polling_url);
    }

    return {
      url: result.result?.video_url || result.url,
      format: "mp4",
      duration: 5,
    };
  } catch (error) {
    console.error("FLUX Video API Error:", error.message);
    throw error;
  }
}

// Poll for video generation result
async function pollForVideoResult(taskId, pollingUrl) {
  const maxAttempts = 60; // 5 minutes with 5 second intervals
  const delay = 5000; // 5 seconds

  for (let i = 0; i < maxAttempts; i++) {
    try {
      if (!process.env.BFL_API_KEY)
        throw new Error("BFL API key missing for legacy Flux polling");
      const res = await fetch(pollingUrl, {
        headers: { "x-key": process.env.BFL_API_KEY },
      });

      if (!res.ok) {
        console.log(`Video polling attempt ${i + 1}: ${res.status}`);
        continue;
      }

      const data = await res.json();

      if (data.status === "Ready") {
        return {
          url: data.result?.video_url || data.result?.url || data.url,
          format: "mp4",
          duration: 5,
        };
      }

      if (data.status === "Error") {
        throw new Error(data.error || "Video generation failed");
      }

      await new Promise((r) => setTimeout(r, delay));
    } catch (error) {
      console.error(`Video polling error attempt ${i + 1}:`, error.message);
      if (i === maxAttempts - 1) throw error;
    }
  }

  throw new Error("Video generation timeout");
}

async function persistGeneratedVideo(videoUrl, style) {
  if (
    !videoUrl ||
    !(typeof isCloudinaryConfigured === "function"
      ? isCloudinaryConfigured()
      : isCloudinaryConfigured)
  ) {
    return {
      url: videoUrl,
      cloudinaryPublicId: null,
    };
  }

  const safeStyle =
    String(style || "video")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "video";

  try {
    const uploadResult = await uploadRemoteToCloudinary(videoUrl, {
      folder: `loversai/generated-videos/${safeStyle}`,
      resource_type: "video",
      public_id: `${Date.now()}-${safeStyle}`,
    });

    return {
      url: uploadResult?.secure_url || videoUrl,
      cloudinaryPublicId: uploadResult?.public_id || null,
    };
  } catch (uploadErr) {
    console.error("⚠️ [Video] uploadRemoteToCloudinary failed:", uploadErr);
    return {
      url: videoUrl,
      cloudinaryPublicId: null,
    };
  }
}

/* -------------------- VIDEO GENERATION ROUTE -------------------- */
router.post(
  "/generate-video",
  protect,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "Image required" });
      }

      if (!isCloudinaryConfigured) {
        return res.status(503).json({
          success: false,
          error:
            "Cloudinary is not configured. Generated videos must be stored in Cloudinary.",
        });
      }

      const { style = "slow-pan" } = req.body;

      // Validate style
      if (!VIDEO_STYLES[style]) {
        const validStyles = Object.keys(VIDEO_STYLES).join(", ");
        return res.status(400).json({
          success: false,
          error: `Invalid style. Valid options: ${validStyles}`,
        });
      }

      // Video generation costs 25 credits
      const creditsNeeded = 25;

      // Verify user is handled by protect middleware
      const user = req.user;

      if (user.credits < creditsNeeded) {
        return res.status(402).json({
          success: false,
          error: "Insufficient credits",
          currentCredits: user.credits,
          requiredCredits: creditsNeeded,
        });
      }

      const styleConfig = VIDEO_STYLES[style];

      console.log(
        `🎬 Generating ${style} video with prompt: ${styleConfig.prompt.substring(0, 100)}...`,
      );

      // Call FLUX API for video generation
      const result = await callFluxVideoAPI(
        req.file.buffer,
        styleConfig.prompt,
        style,
      );
      const persistedVideo = await persistGeneratedVideo(result.url, style);
      result.url = persistedVideo.url;
      result.cloudinaryPublicId = persistedVideo.cloudinaryPublicId;

      // Deduct credits after successful generation
      try {
        const oldCredits = user.credits;
        user.deductCredits(
          creditsNeeded,
          `Video generation - ${style}`,
          "video_generation",
          {
            style,
            videoUrl: result.url,
          },
        );

        const subscription = await Subscription.findOne({
          userId: user._id,
        }).sort({ createdAt: -1 });
        if (subscription) {
          subscription.creditsUsed =
            (subscription.creditsUsed || 0) + creditsNeeded;
          await subscription.save();
        }

        await user.save();

        return res.json({
          success: true,
          style: style,
          styleName: styleConfig.name,
          styleDescription: styleConfig.description,
          videoUrl: result.url,
          cloudinaryPublicId: result.cloudinaryPublicId,
          format: result.format,
          duration: result.duration,
          timestamp: new Date().toISOString(),
          creditInfo: {
            oldBalance: oldCredits,
            deducted: creditsNeeded,
            newBalance: user.credits,
          },
        });
      } catch (deductErr) {
        console.error(
          "Failed to deduct credits for video generation:",
          deductErr,
        );
        return res.json({
          success: true,
          style: style,
          styleName: styleConfig.name,
          styleDescription: styleConfig.description,
          videoUrl: result.url,
          cloudinaryPublicId: result.cloudinaryPublicId,
          format: result.format,
          duration: result.duration,
          timestamp: new Date().toISOString(),
          creditWarning:
            "Video generated but failed to deduct credits. Please contact support.",
        });
      }
    } catch (err) {
      console.error("❌ Video generation error:", err);
      res.status(500).json({
        success: false,
        error: "Video generation failed",
      });
    }
  },
);

/* -------------------- GET VIDEO STYLES ROUTE -------------------- */
router.get("/video-styles", (req, res) => {
  try {
    const styles = Object.keys(VIDEO_STYLES).map((key) => ({
      id: key,
      name: VIDEO_STYLES[key].name,
      description: VIDEO_STYLES[key].description,
      creditCost: 25,
    }));

    res.json({
      success: true,
      styles: styles,
      count: styles.length,
    });
  } catch (err) {
    console.error("❌ Error getting video styles:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to get video styles",
    });
  }
});

export default router;
