import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import Replicate from "replicate";
import { protect } from "../../middleware/auth.js";
import User from "../../models/User.js";
import Subscription from "../../models/Subscription.js";

const router = express.Router();

/* -------------------- HELPERS -------------------- */

const REPLICATE_MODEL = "black-forest-labs/flux-kontext-pro";
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || undefined,
});
const LEGACY_FLUX_ENABLED = process.env.LEGACY_FLUX_ENABLED === "true";

const GENERATED_ANGLE_IMAGE_CACHE_TTL_MS =
  Number(process.env.GENERATED_IMAGE_CACHE_TTL_MS) || 60 * 60 * 1000;
const GENERATED_ANGLE_IMAGE_CACHE_PREFIX = "/api/ai/angle-cache";
const GEMINI_API_BASE_URL =
  process.env.GEMINI_API_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta";
const ANGLE_GEMINI_IMAGE_MODEL =
  process.env.ANGLE_GEMINI_IMAGE_MODEL ||
  process.env.GEMINI_IMAGE_MODEL ||
  "gemini-2.5-flash-image";
const GEMINI_IMAGE_MODEL_FALLBACKS = [
  "gemini-2.5-flash-image",
  "gemini-3-pro-image-preview",
];
const generatedAngleImageCache = new Map();

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
    prompt:
      "Transform this venue to show from front view perspective, main entrance facade, straight-on architectural view, centered composition. Preserve all architectural details, structure, and design elements. Only change the camera angle and perspective to frontal elevation view.",
    negativePrompt:
      "blurry, low quality, distorted, different building, new architecture, changing structure, people, crowd, person, human",
  },
  left: {
    name: "Left Side View",
    description: "View from the left side (45 degrees)",
    prompt:
      "Transform this venue to show from left side perspective, 45-degree angle from left, three-quarter left view, architectural side elevation. Preserve all structural details, architecture, and design elements. Only change the camera angle to show left-side composition.",
    negativePrompt:
      "blurry, low quality, distorted, different building, new architecture, changing structure, people, crowd, person, human, front view, right side",
  },
  right: {
    name: "Right Side View",
    description: "View from the right side (45 degrees)",
    prompt:
      "Transform this venue to show from right side perspective, 45-degree angle from right, three-quarter right view, architectural side elevation. Preserve all structural details, architecture, and design elements. Only change the camera angle to show right-side composition.",
    negativePrompt:
      "blurry, low quality, distorted, different building, new architecture, changing structure, people, crowd, person, human, front view, left side",
  },
  back: {
    name: "Back View",
    description: "View from the rear of the venue",
    prompt:
      "Transform this venue to show from back view perspective, rear facade, opposite side from entrance, back architectural view. Preserve all architectural details, structure, and design elements. Only change the camera angle to show rear elevation view.",
    negativePrompt:
      "blurry, low quality, distorted, different building, new architecture, changing structure, people, crowd, person, human, front view, entrance",
  },
  top: {
    name: "Top View",
    description: "Aerial/bird's eye view from above",
    prompt:
      "Transform this venue to show from aerial bird's eye view, top-down perspective from above, overhead architectural layout. Preserve all building features, structure, and design elements. Only change the camera angle to show complete venue overview from above.",
    negativePrompt:
      "blurry, low quality, distorted, different building, new architecture, changing structure, people, crowd, person, human, ground view",
  },
  aerial: {
    name: "Aerial View",
    description: "Aerial view from an angle",
    prompt:
      "Transform this venue to show from aerial perspective, 45-degree overhead view, angled bird's eye view, showing both roof and sides. Preserve all building features, structure, and design elements. Only change the camera angle to show aerial composition.",
    negativePrompt:
      "blurry, low quality, distorted, different building, new architecture, changing structure, people, crowd, person, human, ground-level",
  },
  side: {
    name: "Side View",
    description: "Side profile view of the venue",
    prompt:
      "Transform this venue to show from side profile view, lateral perspective, architectural side elevation, 90-degree side angle. Preserve all structural details, architecture, and design elements. Only change the camera angle to show profile composition.",
    negativePrompt:
      "blurry, low quality, distorted, different building, new architecture, changing structure, people, crowd, person, human, front view, diagonal",
  },
  corner: {
    name: "Corner View",
    description: "Diagonal corner perspective",
    prompt:
      "Transform this venue to show from corner diagonal view, three-quarter perspective, 45-degree angle view, architectural corner composition. Preserve all building features, structure, and design elements. Only change the camera angle to diagonal viewpoint.",
    negativePrompt:
      "blurry, low quality, distorted, different building, new architecture, changing structure, people, crowd, person, human, straight-on view",
  },
  interior: {
    name: "Interior View",
    description: "Inside view of the venue",
    prompt:
      "Transform this venue to show from interior inside view, indoor perspective, internal architectural space, room interior layout. Preserve all structural elements, architecture, and design features. Only change the camera angle to show inside venue view.",
    negativePrompt:
      "blurry, low quality, distorted, different building, new architecture, changing structure, people, crowd, person, human, exterior view",
  },
};

async function resolveReplicateOutputUrl(output) {
  const firstOutput = Array.isArray(output) ? output[0] : output;

  if (!firstOutput) {
    return null;
  }

  if (typeof firstOutput === "string") {
    return firstOutput;
  }

  if (typeof firstOutput.url === "function") {
    const maybeUrl = firstOutput.url();
    return typeof maybeUrl?.then === "function" ? await maybeUrl : maybeUrl;
  }

  if (typeof firstOutput.url === "string") {
    return firstOutput.url;
  }

  return null;
}

function isGeminiConfigured() {
  return !!(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== "your_gemini_api_key_here"
  );
}

function extractGeminiImageParts(responseData = {}) {
  const parts =
    responseData?.candidates?.flatMap(
      (candidate) => candidate?.content?.parts || [],
    ) || [];

  return parts
    .filter((part) => part?.inlineData?.data || part?.inline_data?.data)
    .map((part, index) => {
      const inlineData = part.inlineData || part.inline_data;
      return {
        buffer: Buffer.from(inlineData.data, "base64"),
        contentType: inlineData.mimeType || inlineData.mime_type || "image/png",
        seed: Date.now() + index,
        generationId: `gem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      };
    });
}

async function callGeminiImageAPI(
  imageBuffer,
  prompt,
  negativePrompt = "",
  mimeType = "image/jpeg",
  modelType = ANGLE_GEMINI_IMAGE_MODEL,
) {
  const candidateModels = [
    ...new Set([modelType, ...GEMINI_IMAGE_MODEL_FALLBACKS]),
  ];

  let lastError = null;

  for (const candidateModel of candidateModels) {
    try {
      return await callGeminiImageAPIWithModel(
        imageBuffer,
        prompt,
        negativePrompt,
        mimeType,
        candidateModel,
      );
    } catch (error) {
      lastError = error;

      if (/GEMINI_AUTH_ERROR/i.test(String(error?.message || ""))) {
        throw error;
      }

      if (!/GEMINI_MODEL_ERROR/i.test(String(error?.message || ""))) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Gemini returned no image output");
}

async function callGeminiImageAPIWithModel(
  imageBuffer,
  prompt,
  negativePrompt = "",
  mimeType = "image/jpeg",
  modelType = ANGLE_GEMINI_IMAGE_MODEL,
) {
  if (!isGeminiConfigured()) {
    throw new Error("Gemini API key missing. Set GEMINI_API_KEY in environment variables.");
  }

  const fullPrompt = [
    prompt.trim(),
    negativePrompt ? `Avoid: ${negativePrompt.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await fetch(
    `${GEMINI_API_BASE_URL}/models/${modelType}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: fullPrompt },
              {
                inline_data: {
                  mime_type: mimeType || "image/jpeg",
                  data: imageBuffer.toString("base64"),
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "GEMINI_AUTH_ERROR: Gemini API authentication failed. Restart the backend after setting GEMINI_API_KEY; if it still fails, the key is invalid or does not have image generation access.",
      );
    }

    if ([400, 404, 422].includes(response.status)) {
      throw new Error(
        `GEMINI_MODEL_ERROR:${response.status}: Gemini model ${modelType} is unavailable or not supported. ${errorText.substring(0, 200)}`,
      );
    }

    throw new Error(
      `Gemini error ${response.status}: ${errorText.substring(0, 300)}`,
    );
  }

  const result = await response.json();
  const imageParts = extractGeminiImageParts(result);

  if (!imageParts.length) {
    const textParts = result?.candidates
      ?.flatMap((candidate) => candidate?.content?.parts || [])
      .filter((part) => part?.text)
      .map((part) => part.text)
      .join(" ")
      .trim();

    throw new Error(
      `Gemini returned no image output.${textParts ? ` ${textParts}` : ""}`,
    );
  }

  return imageParts[0];
}

async function resolveImagePayload(imageSource) {
  if (!imageSource || typeof imageSource !== "string") {
    throw new Error("No generated image URL was returned");
  }

  if (imageSource.startsWith("data:")) {
    const match = /^data:([^;]+);base64,(.+)$/i.exec(imageSource);
    if (!match) {
      throw new Error("Invalid generated image data URL");
    }

    return {
      buffer: Buffer.from(match[2], "base64"),
      contentType: match[1] || "image/png",
    };
  }

  const response = await fetch(imageSource);
  if (!response.ok) {
    throw new Error(`Failed to fetch generated image: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, contentType };
}

function cleanupGeneratedAngleImageCache() {
  const now = Date.now();

  for (const [cacheId, entry] of generatedAngleImageCache.entries()) {
    if (!entry || !Number.isFinite(entry.expiresAt) || entry.expiresAt > now) {
      continue;
    }

    generatedAngleImageCache.delete(cacheId);
  }
}

setInterval(cleanupGeneratedAngleImageCache, 5 * 60 * 1000).unref?.();

/* -------------------- REPLICATE API -------------------- */
async function callReplicateAPI(
  imageBuffer,
  prompt,
  negativePrompt = "",
) {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error(
      "Replicate API token missing. Set REPLICATE_API_TOKEN in environment variables.",
    );
  }

  const input = {
    prompt: prompt.trim().substring(0, 1000),
    input_image: imageBuffer,
    aspect_ratio: "match_input_image",
    output_format: "png",
    safety_tolerance: 2,
    prompt_upsampling: false,
  };

  if (negativePrompt) {
    input.negative_prompt = negativePrompt;
  }

  const output = await replicate.run(REPLICATE_MODEL, { input });
  const outputUrl = await resolveReplicateOutputUrl(output);

  if (!outputUrl) {
    throw new Error("Replicate returned no output image");
  }

  return {
    url: outputUrl,
    seed: Math.floor(Math.random() * 1e9),
  };
}

async function generateAngleImagePayload(
  imageBuffer,
  prompt,
  negativePrompt = "",
  mimeType = "image/jpeg",
) {
  try {
    const geminiResult = await callGeminiImageAPI(
      imageBuffer,
      prompt,
      negativePrompt,
      mimeType,
    );

    return {
      buffer: geminiResult.buffer,
      contentType: geminiResult.contentType,
      seed: geminiResult.seed,
      provider: "gemini",
    };
  } catch (geminiErr) {
    console.warn(
      "Gemini angle generation failed, falling back to legacy Replicate:",
      geminiErr.message,
    );

    if (!LEGACY_FLUX_ENABLED) {
      throw geminiErr;
    }

    const replicateResult = await callReplicateAPI(
      imageBuffer,
      prompt,
      negativePrompt,
    );
    const resolvedPayload = await resolveImagePayload(replicateResult.url);

    return {
      buffer: resolvedPayload.buffer,
      contentType: resolvedPayload.contentType,
      seed: replicateResult.seed,
      provider: "replicate",
      sourceUrl: replicateResult.url,
      fallbackReason: geminiErr.message,
    };
  }
}

async function cacheGeneratedAngleImage(imagePayload, angle) {
  if (!imagePayload?.buffer || !Buffer.isBuffer(imagePayload.buffer)) {
    throw new Error("No generated image bytes were returned");
  }

  const safeAngle =
    String(angle || "angle")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "angle";

  const expiresAt = Date.now() + GENERATED_ANGLE_IMAGE_CACHE_TTL_MS;
  const cacheId = `${safeAngle}-${expiresAt}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  generatedAngleImageCache.set(cacheId, {
    buffer: imagePayload.buffer,
    contentType: imagePayload.contentType || "image/png",
    expiresAt,
    angle: safeAngle,
    createdAt: Date.now(),
  });

  return {
    url: `${GENERATED_ANGLE_IMAGE_CACHE_PREFIX}/${cacheId}`,
    cacheId,
    cloudinaryPublicId: null,
  };
}

router.get("/angle-cache/:cacheId", (req, res) => {
  cleanupGeneratedAngleImageCache();

  const { cacheId } = req.params;
  const cacheEntry = generatedAngleImageCache.get(cacheId);

  if (!cacheEntry) {
    return res.status(404).json({
      success: false,
      error: "Cached image not found or expired",
    });
  }

  if (cacheEntry.expiresAt <= Date.now()) {
    generatedAngleImageCache.delete(cacheId);
    return res.status(404).json({
      success: false,
      error: "Cached image not found or expired",
    });
  }

  res.setHeader("Content-Type", cacheEntry.contentType || "image/png");
  res.setHeader("Cache-Control", "public, max-age=300");
  return res.send(cacheEntry.buffer);
});

/* -------------------- ANGLE CHANGE ROUTE -------------------- */
router.post(
  "/change-angle",
  protect,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file)
        return res
          .status(400)
          .json({ success: false, error: "Image required" });

      const { angle = "front", imageCount = 1 } = req.body;

      // Validate angle
      if (!ANGLE_VIEWS[angle]) {
        const validAngles = Object.keys(ANGLE_VIEWS).join(", ");
        return res.status(400).json({
          success: false,
          error: `Invalid angle. Valid options: ${validAngles}`,
        });
      }

      // Get angle configuration
      const angleConfig = ANGLE_VIEWS[angle];

      console.log(
        `🔄 Generating ${angle} view with prompt: ${angleConfig.prompt.substring(0, 100)}...`,
      );

      // Compute credits (angle change costs 15 credits per transformation)
      const imageCountNum = parseInt(req.body.imageCount) || 1;
      const creditsNeeded = 15 * imageCountNum;

      // Verify user is already handled by protect middleware
      const user = req.user;

      if (user.credits < creditsNeeded) {
        return res.status(402).json({
          success: false,
          error: "Insufficient credits",
          currentCredits: user.credits,
          requiredCredits: creditsNeeded,
        });
      }

      // Generate the transformed image with Gemini first; fall back to legacy Replicate only if enabled
      const generatedImage = await generateAngleImagePayload(
        req.file.buffer,
        angleConfig.prompt,
        angleConfig.negativePrompt,
        req.file.mimetype || "image/jpeg",
      );
      const cachedImage = await cacheGeneratedAngleImage(
        generatedImage,
        angle,
      );
      const cachedImageUrl = `${req.protocol}://${req.get("host")}${cachedImage.url}`;

      // Deduct credits after successful generation
      try {
        const oldCredits = user.credits;
        user.deductCredits(
          creditsNeeded,
          `Angle change - ${angle}`,
          "ai_generation",
          { angle, imageCount: imageCountNum },
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

        res.json({
          success: true,
          angle: angle,
          angleName: angleConfig.name,
          angleDescription: angleConfig.description,
          url: cachedImageUrl,
          cloudinaryPublicId: cachedImage.cloudinaryPublicId,
          cacheId: cachedImage.cacheId || null,
          seed: generatedImage.seed,
          generationProvider: generatedImage.provider,
          generationFallbackReason: generatedImage.fallbackReason || null,
          promptUsed: angleConfig.prompt.substring(0, 200) + "...",
          timestamp: new Date().toISOString(),
          creditInfo: {
            oldBalance: oldCredits,
            deducted: creditsNeeded,
            newBalance: user.credits,
          },
        });
      } catch (err) {
        console.error("Failed to deduct credits for angle change:", err);
        // still return result but with warning
        res.json({
          success: true,
          angle: angle,
          angleName: angleConfig.name,
          angleDescription: angleConfig.description,
          url: cachedImageUrl,
          cloudinaryPublicId: cachedImage.cloudinaryPublicId,
          cacheId: cachedImage.cacheId || null,
          seed: generatedImage.seed,
          generationProvider: generatedImage.provider,
          generationFallbackReason: generatedImage.fallbackReason || null,
          promptUsed: angleConfig.prompt.substring(0, 200) + "...",
          timestamp: new Date().toISOString(),
          creditWarning:
            "Generation succeeded but failed to deduct credits. Please contact support.",
        });
      }
    } catch (err) {
      console.error("❌ Angle change error:", err);
      const isGeminiError = /gemini|GEMINI_AUTH_ERROR/i.test(
        String(err?.message || ""),
      );
      const statusCode =
        err?.response?.status === 402 ||
        String(err?.message || "").includes("402 Payment Required")
          ? 402
          : isGeminiError
            ? 503
          : 500;
      res.status(statusCode).json({
        success: false,
        error:
          statusCode === 402
            ? "Angle transformation failed because image generation credits are unavailable."
            : isGeminiError
              ? "Angle transformation failed because Gemini rejected the request or key."
            : "Angle transformation failed",
        angle: req.body.angle || "unknown",
      });
    }
  },
);

/* -------------------- GET ANGLES ROUTE -------------------- */
router.get("/available-angles", (req, res) => {
  try {
    const angles = Object.keys(ANGLE_VIEWS).map((key) => ({
      id: key,
      name: ANGLE_VIEWS[key].name,
      description: ANGLE_VIEWS[key].description,
      promptPreview: ANGLE_VIEWS[key].prompt.substring(0, 100) + "...",
    }));

    res.json({
      success: true,
      angles: angles,
      count: angles.length,
    });
  } catch (err) {
    console.error("❌ Error getting available angles:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to get available angles",
    });
  }
});

export default router;

