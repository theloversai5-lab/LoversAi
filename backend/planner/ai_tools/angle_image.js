import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import { protect } from "../../middleware/auth.js";
import User from "../../models/User.js";
import Subscription from "../../models/Subscription.js";

const router = express.Router();

/* -------------------- HELPERS -------------------- */
const isAIEnabled = () =>
  process.env.BFL_API_KEY &&
  process.env.BFL_API_KEY !== "your_bfl_api_key_here";

/* -------------------- MULTER -------------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"), false);
  },
});

/* -------------------- ANGLE PROMPTS (ENHANCED) -------------------- */
const ANGLE_VIEWS = {
  front: {
    name: "Front View",
    description: "Show the venue from the front entrance perspective",
    prompt: "Transform this venue to show from front view perspective, main entrance facade, straight-on architectural view, centered composition. Preserve all architectural details, structure, and design elements. Only change the camera angle and perspective to frontal elevation view.",
    negativePrompt: "blurry, low quality, distorted, different building, new architecture, changing structure, people, crowd, person, human"
  },
  left: {
    name: "Left Side View",
    description: "View from the left side (45 degrees)",
    prompt: "Transform this venue to show from left side perspective, 45-degree angle from left, three-quarter left view, architectural side elevation. Preserve all structural details, architecture, and design elements. Only change the camera angle to show left-side composition.",
    negativePrompt: "blurry, low quality, distorted, different building, new architecture, changing structure, people, crowd, person, human, front view, right side"
  },
  right: {
    name: "Right Side View",
    description: "View from the right side (45 degrees)",
    prompt: "Transform this venue to show from right side perspective, 45-degree angle from right, three-quarter right view, architectural side elevation. Preserve all structural details, architecture, and design elements. Only change the camera angle to show right-side composition.",
    negativePrompt: "blurry, low quality, distorted, different building, new architecture, changing structure, people, crowd, person, human, front view, left side"
  },
  back: {
    name: "Back View",
    description: "View from the rear of the venue",
    prompt: "Transform this venue to show from back view perspective, rear facade, opposite side from entrance, back architectural view. Preserve all architectural details, structure, and design elements. Only change the camera angle to show rear elevation view.",
    negativePrompt: "blurry, low quality, distorted, different building, new architecture, changing structure, people, crowd, person, human, front view, entrance"
  },
  top: {
    name: "Top View",
    description: "Aerial/bird's eye view from above",
    prompt: "Transform this venue to show from aerial bird's eye view, top-down perspective from above, overhead architectural layout. Preserve all building features, structure, and design elements. Only change the camera angle to show complete venue overview from above.",
    negativePrompt: "blurry, low quality, distorted, different building, new architecture, changing structure, people, crowd, person, human, ground view"
  },
  aerial: {
    name: "Aerial View",
    description: "Aerial view from an angle",
    prompt: "Transform this venue to show from aerial perspective, 45-degree overhead view, angled bird's eye view, showing both roof and sides. Preserve all building features, structure, and design elements. Only change the camera angle to show aerial composition.",
    negativePrompt: "blurry, low quality, distorted, different building, new architecture, changing structure, people, crowd, person, human, ground-level"
  },
  side: {
    name: "Side View",
    description: "Side profile view of the venue",
    prompt: "Transform this venue to show from side profile view, lateral perspective, architectural side elevation, 90-degree side angle. Preserve all structural details, architecture, and design elements. Only change the camera angle to show profile composition.",
    negativePrompt: "blurry, low quality, distorted, different building, new architecture, changing structure, people, crowd, person, human, front view, diagonal"
  },
  corner: {
    name: "Corner View",
    description: "Diagonal corner perspective",
    prompt: "Transform this venue to show from corner diagonal view, three-quarter perspective, 45-degree angle view, architectural corner composition. Preserve all building features, structure, and design elements. Only change the camera angle to diagonal viewpoint.",
    negativePrompt: "blurry, low quality, distorted, different building, new architecture, changing structure, people, crowd, person, human, straight-on view"
  },
  interior: {
    name: "Interior View",
    description: "Inside view of the venue",
    prompt: "Transform this venue to show from interior inside view, indoor perspective, internal architectural space, room interior layout. Preserve all structural elements, architecture, and design features. Only change the camera angle to show inside venue view.",
    negativePrompt: "blurry, low quality, distorted, different building, new architecture, changing structure, people, crowd, person, human, exterior view"
  }
};

/* -------------------- FLUX API (UPDATED) -------------------- */
async function callFluxAPI(imageBuffer, prompt, modelType = "flux-kontext-pro", negativePrompt = "") {
  if (!isAIEnabled()) throw new Error("BFL API key not configured");

  const baseUrl = process.env.FLUX_API_BASE_URL || "https://api.bfl.ai";
  const imageBase64 = imageBuffer.toString("base64");

  const requestBody = {
    prompt,
    input_image: imageBase64,
    width: 1024,
    height: 1024,
    safety_tolerance: 2,
    num_images: 1,
    guidance_scale: 3.5,
    steps: 25
  };

  // Add negative prompt if provided
  if (negativePrompt) {
    requestBody.negative_prompt = negativePrompt;
  }

  const response = await fetch(`${baseUrl}/v1/${modelType}`, {
    method: "POST",
    headers: {
      "x-key": process.env.BFL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`FLUX error ${response.status}: ${text}`);
  }

  const result = await response.json();

  // Handle async task polling
  if (result.id) {
    return await pollForResult(result.id, result.polling_url);
  }

  // Handle direct response
  if (result.result?.sample) {
    return {
      url: result.result.sample,
      seed: result.result.seed || Math.floor(Math.random() * 1e9),
    };
  }

  // Handle different response formats
  if (result.result?.[0]?.url) {
    return {
      url: result.result[0].url,
      seed: result.result[0].seed || Math.floor(Math.random() * 1e9),
    };
  }

  if (result.url) {
    return {
      url: result.url,
      seed: result.seed || Math.floor(Math.random() * 1e9),
    };
  }

  throw new Error("Unexpected response format from FLUX API");
}

/* -------------------- POLLING -------------------- */
async function pollForResult(taskId, pollingUrl) {
  const maxAttempts = parseInt(process.env.MAX_POLL_ATTEMPTS) || 30;
  const delay = parseInt(process.env.POLL_INTERVAL) || 5000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(pollingUrl, {
        headers: { "x-key": process.env.BFL_API_KEY },
      });

      if (!res.ok) {
        console.log(`Polling attempt ${i + 1}: ${res.status}`);
        continue;
      }

      const data = await res.json();

      if (data.status === "Ready") {
        return {
          url: data.result?.sample || data.result?.url || data.url,
          seed: data.result?.seed || Math.floor(Math.random() * 1e9),
        };
      }

      if (data.status === "Error") {
        throw new Error(data.error || "FLUX processing failed");
      }

      if (data.status === "Pending") {
        console.log(`Generation pending... (${i + 1}/${maxAttempts})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // If we get a direct result
      if (data.result?.sample || data.result?.url) {
        return {
          url: data.result.sample || data.result.url,
          seed: data.result.seed || Math.floor(Math.random() * 1e9),
        };
      }

      await new Promise((r) => setTimeout(r, delay));
    } catch (error) {
      console.error(`Polling error attempt ${i + 1}:`, error.message);
      if (i === maxAttempts - 1) throw error;
    }
  }

  throw new Error("FLUX generation timeout");
}

/* -------------------- ANGLE CHANGE ROUTE -------------------- */
router.post("/change-angle", protect, upload.single("image"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, error: "Image required" });

    const { angle = "front", imageCount = 1 } = req.body;

    // Validate angle
    if (!ANGLE_VIEWS[angle]) {
      const validAngles = Object.keys(ANGLE_VIEWS).join(", ");
      return res.status(400).json({ 
        success: false, 
        error: `Invalid angle. Valid options: ${validAngles}` 
      });
    }

    // Get angle configuration
    const angleConfig = ANGLE_VIEWS[angle];
    
    console.log(`🔄 Generating ${angle} view with prompt: ${angleConfig.prompt.substring(0, 100)}...`);

    // Compute credits (angle change costs 15 credits per transformation)
    const imageCountNum = parseInt(req.body.imageCount) || 1;
    const creditsNeeded = 15 * imageCountNum;

    // Verify user is already handled by protect middleware
    const user = req.user;

    if (user.credits < creditsNeeded) {
      return res.status(402).json({ success: false, error: 'Insufficient credits', currentCredits: user.credits, requiredCredits: creditsNeeded });
    }

    // Call FLUX API with specific angle prompt
    const result = await callFluxAPI(
      req.file.buffer,
      angleConfig.prompt,
      "flux-kontext-pro",
      angleConfig.negativePrompt
    );

    // Deduct credits after successful generation
    try {
      const oldCredits = user.credits;
      user.deductCredits(creditsNeeded, `Angle change - ${angle}`, 'ai_generation', { angle, imageCount: imageCountNum });
      const subscription = await Subscription.findOne({ userId: user._id }).sort({ createdAt: -1 });
      if (subscription) {
        subscription.creditsUsed = (subscription.creditsUsed || 0) + creditsNeeded;
        await subscription.save();
      }
      await user.save();

      res.json({
        success: true,
        angle: angle,
        angleName: angleConfig.name,
        angleDescription: angleConfig.description,
        url: result.url,
        seed: result.seed,
        promptUsed: angleConfig.prompt.substring(0, 200) + "...",
        timestamp: new Date().toISOString(),
        creditInfo: {
          oldBalance: oldCredits,
          deducted: creditsNeeded,
          newBalance: user.credits
        }
      });
    } catch (err) {
      console.error('Failed to deduct credits for angle change:', err);
      // still return result but with warning
      res.json({
        success: true,
        angle: angle,
        angleName: angleConfig.name,
        angleDescription: angleConfig.description,
        url: result.url,
        seed: result.seed,
        promptUsed: angleConfig.prompt.substring(0, 200) + "...",
        timestamp: new Date().toISOString(),
        creditWarning: 'Generation succeeded but failed to deduct credits. Please contact support.'
      });
    }
  } catch (err) {
    console.error("❌ Angle change error:", err.message);
    res.status(500).json({
      success: false,
      error: "Angle transformation failed",
      details: err.message,
      angle: req.body.angle || "unknown"
    });
  }
});

/* -------------------- GET ANGLES ROUTE -------------------- */
router.get("/available-angles", (req, res) => {
  try {
    const angles = Object.keys(ANGLE_VIEWS).map(key => ({
      id: key,
      name: ANGLE_VIEWS[key].name,
      description: ANGLE_VIEWS[key].description,
      promptPreview: ANGLE_VIEWS[key].prompt.substring(0, 100) + "..."
    }));
    
    res.json({
      success: true,
      angles: angles,
      count: angles.length
    });
  } catch (err) {
    console.error("❌ Error getting available angles:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to get available angles"
    });
  }
});

export default router;