import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import Replicate from "replicate";
import { protect } from "../../middleware/auth.js";
import User from "../../models/User.js";
import Subscription from "../../models/Subscription.js";

const router = express.Router();

const REPLICATE_MODEL = "black-forest-labs/flux-kontext-pro";
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || undefined,
});
const GEMINI_API_BASE_URL =
  process.env.GEMINI_API_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const GEMINI_IMAGE_MODEL_FALLBACKS = [
  "gemini-2.5-flash-image",
  "gemini-3-pro-image-preview",
];
const LEGACY_FLUX_ENABLED = process.env.LEGACY_FLUX_ENABLED === "true";

const generatedImageCache = new Map();
const GENERATED_IMAGE_CACHE_TTL_MS =
  Number(process.env.GENERATED_IMAGE_CACHE_TTL_MS) || 60 * 60 * 1000;
const GENERATED_IMAGE_CACHE_PREFIX = "/api/ai/cache";

const isGeminiConfigured = () =>
  !!(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== "your_gemini_api_key_here"
  );

const isLegacyFluxConfigured = () =>
  !!(
    process.env.REPLICATE_API_TOKEN &&
    process.env.REPLICATE_API_TOKEN !== "your_replicate_api_token_here"
  );

const isAIEnabled = () =>
  isGeminiConfigured() || (LEGACY_FLUX_ENABLED && isLegacyFluxConfigured());

// Configure multer for file uploads - INCREASED FILE SIZE LIMIT
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB instead of 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Enhanced Wedding themes configuration
const WEDDING_THEMES = {
  haldi: {
    name: "Haldi Ceremony",
    creditCost: 10,
    prompt:
      "Transform this venue into a vibrant traditional Haldi ceremony with cascading bright yellow and orange marigold flower arrangements, golden yellow fabric draping with intricate borders, traditional brass kalash and vessels filled with turmeric, scattered turmeric powder creating beautiful patterns, warm yellow lighting with traditional lanterns, colorful silk cushions and low seating arrangements, decorative rangoli patterns on the floor, festive yellow umbrellas and canopies, traditional Indian music setup area, and abundant fresh flower garlands creating a joyous celebratory atmosphere",
    negativePrompt:
      "dark colors, dull lighting, western decorations, modern furniture, minimal setup, cold colors, formal chairs, contemporary style",
  },
  mehendi: {
    name: "Mehendi Ceremony",
    creditCost: 10,
    prompt:
      "Transform this venue into an enchanting Mehendi ceremony with intricate henna-inspired decorative patterns adorning walls and drapes, lush green and vibrant orange color palette, traditional low seating with ornate cushions and bolsters, cascading marigold and jasmine flower arrangements, decorative henna cones and traditional mehndi supplies as centerpieces, warm fairy lights intertwined with green foliage, colorful Rajasthani umbrellas and canopies, traditional brass artifacts and vessels, beautiful rangoli designs, peacock feather decorations, and cozy intimate lighting creating a feminine and festive atmosphere",
    negativePrompt:
      "formal setup, dark colors, western style, minimal decorations, modern furniture, harsh lighting, masculine colors",
  },
  sangeet: {
    name: "Sangeet Ceremony",
    creditCost: 10,
    prompt:
      "Transform this venue into an electrifying Sangeet night celebration with dramatic stage lighting in red, gold, and purple hues, professional dance floor with spotlights, vibrant fabric draping with sequins and mirrors, musical instruments as decorative elements, colorful LED lighting effects, traditional and modern seating areas, energetic party decorations with streamers and balloons, sound system and DJ setup area, disco balls and party lights, festive banners, and dynamic entertainment space setup creating a high-energy celebration atmosphere",
    negativePrompt:
      "minimal lighting, quiet setup, formal arrangements, dull colors, static decorations, poor acoustics",
  },
  wedding: {
    name: "Wedding Ceremony",
    creditCost: 10,
    prompt:
      "Transform this venue into a magnificent traditional Indian wedding ceremony with an ornate wooden mandap decorated with fresh jasmine, rose, and marigold garlands, rich red and gold fabric draping with intricate embroidery, traditional brass diyas and oil lamps creating warm lighting, sacred fire pit (havan kund) at the center, decorative kalash with coconuts and mango leaves, elaborate floral arrangements in traditional brass urns, red carpet aisle with rose petals, traditional wedding props like bamboo decorations, golden throne-like seating for the couple, priest seating area with ceremonial items, and divine spiritual ambiance with incense and traditional elements",
    negativePrompt:
      "simple setup, modern style, minimal decorations, western wedding elements, contemporary furniture, non-traditional colors",
  },
  reception: {
    name: "Reception Party",
    creditCost: 10,
    prompt:
      "Transform this venue into a luxurious wedding reception with elegant crystal chandeliers and warm ambient lighting, sophisticated round tables with pristine white linens and gold accents, elaborate floral centerpieces with roses, lilies, and greenery, professional stage setup for speeches and entertainment, dance floor with elegant lighting, champagne and cocktail service areas, beautiful backdrop for photography with floral arrangements, refined place settings with gold chargers and crystal glasses, elegant draping in cream and gold tones, and upscale celebratory atmosphere perfect for dining and dancing",
    negativePrompt:
      "casual setup, minimal decorations, poor lighting, basic furniture, informal arrangements, dull atmosphere",
  },
  engagement: {
    name: "Engagement Ceremony",
    creditCost: 10,
    prompt:
      "Transform this venue into a romantic engagement celebration with soft pink and gold color scheme, elegant floral arrangements with roses and peonies, fairy lights creating magical ambiance, decorative engagement ring displays, romantic candle arrangements, beautiful backdrop for ring ceremony photos, elegant seating areas for intimate gathering, champagne service setup, romantic music corner, delicate fabric draping, and intimate romantic atmosphere perfect for the special moment",
    negativePrompt:
      "overly formal, dark colors, minimal romance, harsh lighting, impersonal setup",
  },
};

function resolveReplicateOutputUrl(output) {
  const firstOutput = Array.isArray(output) ? output[0] : output;

  if (!firstOutput) {
    return null;
  }

  if (typeof firstOutput === "string") {
    return firstOutput;
  }

  if (typeof firstOutput.url === "function") {
    return firstOutput.url();
  }

  if (typeof firstOutput.url === "string") {
    return firstOutput.url;
  }

  return null;
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
  modelType = GEMINI_IMAGE_MODEL,
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
  modelType = GEMINI_IMAGE_MODEL,
) {
  if (!isGeminiConfigured()) {
    throw new Error(
      "Gemini API key missing. Set GEMINI_API_KEY in environment variables.",
    );
  }

  const fullPrompt = [prompt.trim(), negativePrompt ? `Avoid: ${negativePrompt.trim()}` : ""]
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

async function generateRetexturedImagePayload(
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
      ...geminiResult,
      provider: "gemini",
    };
  } catch (geminiErr) {
    console.warn(
      "Gemini retexturing failed, falling back to legacy Replicate:",
      geminiErr.message,
    );

    if (!LEGACY_FLUX_ENABLED) {
      throw geminiErr;
    }

    const replicateResult = await callReplicateAPIFixed(
      imageBuffer,
      prompt,
      negativePrompt,
      REPLICATE_MODEL,
      1,
    );

    return {
      url: replicateResult.url,
      seed: replicateResult.seed,
      generationId: replicateResult.generationId,
      provider: "replicate",
      fallbackReason: geminiErr.message,
    };
  }
}

async function callReplicateAPIFixed(
  imageBuffer,
  prompt,
  negativePrompt,
  modelType = REPLICATE_MODEL,
  imageCount = 1,
) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error(
        "Replicate API token missing. Set REPLICATE_API_TOKEN in environment variables.",
      );
    }

    console.log(
      `🚀 Starting Replicate API call with model: ${modelType}, imageCount: ${imageCount}`,
    );

    const input = {
      prompt: prompt.trim().substring(0, 1000),
      input_image: imageBuffer,
      aspect_ratio: "match_input_image",
      output_format: "png",
      safety_tolerance: 2,
      prompt_upsampling: false,
    };

    const output = await replicate.run(modelType, { input });
    const outputUrl = resolveReplicateOutputUrl(output);

    if (!outputUrl) {
      throw new Error("Replicate returned no output image");
    }

    return {
      url: outputUrl,
      seed: Math.floor(Math.random() * 1000000),
      generationId: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    };
  } catch (error) {
    console.error("❌ Replicate API Error:", error.message);
    throw error;
  }
}

setInterval(cleanupGeneratedImageCache, 5 * 60 * 1000).unref?.();

router.get("/cache/:cacheId", (req, res) => {
  cleanupGeneratedImageCache();

  const { cacheId } = req.params;
  const cachedImage = generatedImageCache.get(cacheId);

  if (!cachedImage) {
    return res.status(404).json({
      success: false,
      error: "Cached image not found or expired",
    });
  }

  res.setHeader("Content-Type", cachedImage.contentType || "image/png");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.send(cachedImage.buffer);
});

// AI Tools Routes

// Health check endpoint
router.get("/health", (req, res) => {
  const creditSystemEnabled = !!process.env.ENABLE_CREDIT_SYSTEM || true;

  res.json({
    status: isAIEnabled() ? "healthy" : "disabled",
    timestamp: new Date().toISOString(),
    service: "Wedding Venue AI Retexturing",
    themes: Object.keys(WEDDING_THEMES).length,
    credit_system: creditSystemEnabled ? "active" : "disabled",
    provider: isGeminiConfigured()
      ? "gemini"
      : LEGACY_FLUX_ENABLED && isLegacyFluxConfigured()
        ? "legacy-flux"
        : "unavailable",
    gemini_api_key: isGeminiConfigured() ? "configured" : "not configured",
    replicate_api_token: isLegacyFluxConfigured()
      ? "configured"
      : "not configured",
    credit_costs: {
      standard_generation: "10 credits per image",
      premium_generation: "15 credits per image",
      angle_change: "15 credits per transformation",
    },
    message: isAIEnabled()
      ? isGeminiConfigured()
        ? creditSystemEnabled
          ? "Service is ready with Gemini (credit-based)"
          : "Service is ready with Gemini (no credits required)"
        : "Service is ready with legacy Flux"
      : "Set GEMINI_API_KEY in environment variables to enable AI features",
  });
});

// Get available themes with credit costs
router.get("/themes", (req, res) => {
  // Add credit cost information to themes
  const themesWithCredits = {};
  Object.keys(WEDDING_THEMES).forEach((key) => {
    themesWithCredits[key] = {
      ...WEDDING_THEMES[key],
      creditCost: WEDDING_THEMES[key].creditCost || 10,
    };
  });

  res.json({
    success: true,
    themes: themesWithCredits,
    credit_info: {
      per_image: "10 credits",
      per_premium_image: "15 credits",
      note: "Credits will be deducted automatically upon successful generation",
    },
  });
});

// Check credits for generation
router.post("/check-credits", protect, async (req, res) => {
  try {
    const {
      operation = "generate",
      imageCount = 1,
      modelType = "flux-kontext-pro",
      theme,
    } = req.body;

    if (operation !== "generate") {
      return res.status(400).json({
        success: false,
        error: 'Invalid operation. Only "generate" is supported.',
      });
    }

    // Calculate credit cost
    const perImageCost =
      theme && WEDDING_THEMES[theme] && WEDDING_THEMES[theme].creditCost
        ? WEDDING_THEMES[theme].creditCost
        : modelType === "flux-pro-1.1"
          ? 15
          : 10;
    const creditsNeeded = perImageCost * parseInt(imageCount);

    // Get user is handled by protect middleware
    const user = req.user;

    const currentCredits = user.credits || 0;
    const hasEnoughCredits = currentCredits >= creditsNeeded;

    res.json({
      success: true,
      currentCredits,
      requiredCredits: creditsNeeded,
      hasEnoughCredits,
      perImageCost,
      imageCount: parseInt(imageCount),
      modelType,
      theme,
    });
  } catch (err) {
    console.error("Check credits error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to check credits",
    });
  }
});

function cleanupGeneratedImageCache() {
  const now = Date.now();
  for (const [cacheId, entry] of generatedImageCache.entries()) {
    if (!entry || entry.expiresAt <= now) {
      generatedImageCache.delete(cacheId);
    }
  }
}

async function persistGeneratedImage(imageSource) {
  let buffer = null;
  let contentType = "image/png";

  if (Buffer.isBuffer(imageSource?.buffer)) {
    buffer = imageSource.buffer;
    contentType = imageSource.contentType || contentType;
  } else {
    const imageUrl =
      typeof imageSource === "string"
        ? imageSource
        : imageSource?.url || null;

    if (!imageUrl) {
      throw new Error("No generated image URL was returned");
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch generated image: ${response.status}`);
    }

    contentType = response.headers.get("content-type") || contentType;
    buffer = Buffer.from(await response.arrayBuffer());
  }

  const cacheId = `ret_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  generatedImageCache.set(cacheId, {
    buffer,
    contentType,
    createdAt: Date.now(),
    expiresAt: Date.now() + GENERATED_IMAGE_CACHE_TTL_MS,
  });

  return {
    url: `${GENERATED_IMAGE_CACHE_PREFIX}/${cacheId}`,
    cacheId,
  };
}

// Main generation endpoint - SIMPLIFIED VERSION
router.post("/generate", protect, upload.single("image"), async (req, res) => {
  try {
    // Check if AI is enabled
    if (!isAIEnabled()) {
      return res.status(503).json({
        success: false,
        error:
          "Gemini is not configured. Please set GEMINI_API_KEY in environment variables.",
        instruction:
          "Get your API key from Google AI Studio and add it to your .env file as GEMINI_API_KEY=your_token_here",
        required_env: "GEMINI_API_KEY",
        configured: false,
      });
    }

    console.log("🎨 AI Generation Request received");

    // Log request info for debugging
    console.log("Request body keys:", Object.keys(req.body));
    console.log("Request body:", req.body);
    console.log(
      "File info:",
      req.file
        ? {
            size: req.file.size,
            mimetype: req.file.mimetype,
            originalname: req.file.originalname,
          }
        : "No file",
    );

    const {
      theme,
      customPrompt = "",
      modelType = "flux-kontext-pro",
      imageCount = 1,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }
    // Validate image count
    const validImageCount = [1, 4].includes(parseInt(imageCount))
      ? parseInt(imageCount)
      : 1;

    // Calculate credit cost
    const perImageCost =
      theme && WEDDING_THEMES[theme] && WEDDING_THEMES[theme].creditCost
        ? WEDDING_THEMES[theme].creditCost
        : modelType === "flux-pro-1.1"
          ? 15
          : 10;
    const creditsNeeded = perImageCost * validImageCount;

    // Ensure authenticated user (middleware provides req.user)
    const user = req.user;

    if (user.credits < creditsNeeded) {
      return res
        .status(402)
        .json({
          success: false,
          error: "Insufficient credits",
          currentCredits: user.credits,
          requiredCredits: creditsNeeded,
        });
    }

    // Build enhanced prompt
    let finalPrompt = "";
    let negativePrompt =
      "blurry, low quality, distorted, ugly, bad anatomy, dark lighting, poor composition, cluttered space, messy arrangement";

    if (theme && WEDDING_THEMES[theme]) {
      const themeData = WEDDING_THEMES[theme];
      finalPrompt = themeData.prompt;
      negativePrompt = `${negativePrompt}, ${themeData.negativePrompt}`;

      if (customPrompt.trim()) {
        finalPrompt += `. Additional specific details and requirements: ${customPrompt.trim()}. Ensure all elements blend harmoniously with the ${themeData.name} aesthetic`;
      }
    } else if (customPrompt.trim()) {
      finalPrompt = `Transform this venue into a beautifully decorated space with the following specifications: ${customPrompt.trim()}. Create an elegant, well-lit, professionally decorated venue with attention to detail, beautiful color coordination, proper lighting, and festive atmosphere. Include appropriate seating arrangements, decorative elements, and ambiance suitable for the described event`;
    } else {
      return res.status(400).json({
        success: false,
        error: "Please select a theme or provide a custom prompt",
      });
    }

    // Add universal enhancement prompts for better results
    finalPrompt +=
      ". Ensure professional photography quality, excellent lighting, vibrant colors, clean and organized layout, beautiful symmetry, and stunning visual appeal";

    console.log(`🎨 AI Generation Request Details:`, {
      model: modelType,
      theme: theme || "Custom",
      images: validImageCount,
      promptLength: finalPrompt.length,
      fileSize: req.file.size,
    });

    try {
      // Call Gemini API first, with optional legacy fallback
      const result = await generateRetexturedImagePayload(
        req.file.buffer,
        finalPrompt,
        negativePrompt,
        req.file.mimetype || "image/jpeg",
      );

      if (result && (result.buffer || result.url)) {
        const persistedImage = await persistGeneratedImage(result);
        result.url = `${req.protocol}://${req.get("host")}${persistedImage.url}`;
        result.cacheId = persistedImage.cacheId;

        console.log(`✅ Generation successful via ${result.provider || "gemini"}`);

        const responseData = {
          success: true,
          url: result.url,
          cacheId: result.cacheId || null,
          seed: result.seed,
          generationId: result.generationId,
          generationProvider: result.provider || "gemini",
          generationFallbackReason: result.fallbackReason || null,
          promptUsed: finalPrompt,
          transformation: {
            theme: theme ? WEDDING_THEMES[theme].name : null,
            customPrompt: customPrompt.trim() || null,
            modelType,
            imageCount: validImageCount,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            imageSize: req.file.size,
            mimeType: req.file.mimetype,
            fileName: req.file.originalname,
          },
        };
        // Deduct credits now that generation succeeded
        try {
          const oldCredits = user.credits;
          user.deductCredits(
            creditsNeeded,
            `AI generation - ${theme || "custom"}`,
            "ai_generation",
            {
              theme: theme || "custom",
              modelType,
              imageCount: validImageCount,
              generationId: result.generationId,
            },
          );

          // Update subscription usage if exists
          const subscription = await Subscription.findOne({
            userId: user._id,
          }).sort({ createdAt: -1 });
          if (subscription) {
            subscription.creditsUsed =
              (subscription.creditsUsed || 0) + creditsNeeded;
            await subscription.save();
          }

          await user.save();

          responseData.creditInfo = {
            deducted: creditsNeeded,
            oldBalance: oldCredits,
            newBalance: user.credits,
          };
        } catch (deductErr) {
          console.error(
            "Failed to deduct credits after generation:",
            deductErr,
          );
          responseData.creditWarning =
            "Generation succeeded but failed to deduct credits. Please contact support.";
        }

        res.json(responseData);
      } else {
        throw new Error("Invalid response from image generation API");
      }
    } catch (apiError) {
      console.error("❌ Image generation API Error in generation:", apiError);
      throw apiError;
    }
  } catch (error) {
    console.error("❌ Generation error:", error);

    let errorMessage = "Generation failed. Please try again.";
    let statusCode = 500;

    if (error.message.includes("timeout")) {
      errorMessage = "Generation timed out. Please try again.";
    } else if (
      error.message.includes("rate") ||
      error.message.includes("busy")
    ) {
      errorMessage = "Service is busy. Please wait and try again.";
      statusCode = 429;
    } else if (error.message.includes("API processing error")) {
      errorMessage =
        "AI service encountered an issue. Please try with a different image or simpler prompt.";
    } else if (error.message.includes("not configured")) {
      errorMessage =
        "AI service is not configured. Please contact administrator.";
      statusCode = 503;
    } else if (error.message.toLowerCase().includes("gemini")) {
      errorMessage = error.message;
      statusCode = 503;
    } else if (error.message.toLowerCase().includes("replicate")) {
      errorMessage = error.message;
      statusCode = 503;
    } else if (
      error.message.includes("Insufficient credits") ||
      error.message.includes("credits")
    ) {
      errorMessage = error.message;
      statusCode = 402;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      code: error.message.includes("credits")
        ? "INSUFFICIENT_CREDITS"
        : "GENERATION_ERROR",
    });
  }
});

// Feedback endpoint
router.post("/feedback", async (req, res) => {
  try {
    const {
      feedback,
      resultUrl,
      theme,
      customPrompt,
      modelType,
      creditCost,
      userId,
    } = req.body;

    console.log("📝 Feedback received:", {
      feedback,
      resultUrl: resultUrl?.substring(0, 100),
      theme,
      customPrompt: customPrompt?.substring(0, 100),
      modelType,
      creditCost,
      userId,
    });

    res.json({
      success: true,
      message: "Feedback received",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Feedback error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process feedback",
    });
  }
});

// Download/proxy image endpoint - avoid CORS issues by fetching server-side
router.post("/download-image", async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== "string") {
      return res
        .status(400)
        .json({ success: false, error: "Invalid image URL" });
    }

    const resolvedUrl = new URL(
      imageUrl,
      `${req.protocol}://${req.get("host")}`,
    );

    if (
      resolvedUrl.pathname.startsWith("/api/ai/cache/") ||
      resolvedUrl.pathname.startsWith("/api/ai/angle-cache/")
    ) {
      const response = await fetch(resolvedUrl.toString(), {
        headers: {
          "User-Agent": "LoversAI/1.0",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: "Cached image not found",
        });
      }

      const contentType = response.headers.get("content-type") || "image/png";
      const buffer = await response.buffer();

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("Cache-Control", "public, max-age=300");
      return res.send(buffer);
    }

    const isAllowedExternalImage =
      imageUrl.includes("bfldelivery") || imageUrl.includes("cdn");

    if (!isAllowedExternalImage) {
      return res.status(400).json({
        success: false,
        error: "Invalid image source",
      });
    }

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "LoversAI/1.0",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status}`);
      return res.status(response.status).json({
        success: false,
        error: "Failed to fetch image",
      });
    }

    // Get content type and stream the blob
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.buffer();

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(buffer);
  } catch (error) {
    console.error("❌ Image download proxy error:", error);
    res.status(500).json({ success: false, error: "Failed to download image" });
  }
});

export default router;
