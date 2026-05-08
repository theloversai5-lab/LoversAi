import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import { protect } from "../../middleware/auth.js";
import User from "../../models/User.js";
import Subscription from "../../models/Subscription.js";

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

// FLUX API functions
async function callFluxAPIFixed(
  imageBuffer,
  prompt,
  negativePrompt,
  modelType = "flux-kontext-pro",
  imageCount = 1,
) {
  try {
    if (!LEGACY_FLUX_ENABLED) {
      throw new Error(
        "Legacy FLUX API is disabled. Set LEGACY_FLUX_ENABLED=true to enable legacy Flux or migrate to Gemini API.",
      );
    }

    console.log(
      `🚀 Starting FLUX API call with model: ${modelType}, imageCount: ${imageCount}`,
    );

    const imageBase64 = imageBuffer.toString("base64");

    // If multiple images requested, generate them sequentially
    if (imageCount > 1) {
      const results = [];

      for (let i = 0; i < imageCount; i++) {
        const singleResult = await callFluxAPIFixed(
          imageBuffer,
          prompt,
          negativePrompt,
          modelType,
          1,
        );
        results.push(singleResult);

        // Small delay between requests
        if (i < imageCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      return results[0];
    }

    // Base request parameters for single image
    let requestBody = {
      prompt: prompt.trim().substring(0, 500),
      width: 1024,
      height: 1024,
      safety_tolerance: 2,
    };

    // Add negative prompt if provided
    if (negativePrompt && negativePrompt.trim()) {
      requestBody.negative_prompt = negativePrompt.trim().substring(0, 100);
    }

    // Model-specific parameters
    if (modelType === "flux-kontext-pro" || modelType === "flux-kontext-max") {
      requestBody.input_image = imageBase64;
    } else if (modelType === "flux-pro-1.1") {
      // FLUX Pro 1.1: Pure generation mode
    } else {
      requestBody.input_image = imageBase64;
    }

    // Make API call
    const baseUrl = process.env.FLUX_API_BASE_URL || "https://api.bfl.ai";
    if (!process.env.BFL_API_KEY)
      throw new Error("BFL API key missing for legacy Flux calls");
    const response = await fetch(`${baseUrl}/v1/${modelType}`, {
      method: "POST",
      headers: {
        "x-key": process.env.BFL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ FLUX API Error ${response.status}:`,
        errorText.substring(0, 200),
      );

      // Try fallback model if primary fails
      if (response.status === 403 || response.status === 422) {
        const fallbackModel =
          modelType === "flux-kontext-pro"
            ? "flux-kontext-max"
            : "flux-kontext-pro";
        console.log(`🔄 Trying fallback model: ${fallbackModel}`);

        return await callFluxAPIFixed(
          imageBuffer,
          prompt,
          negativePrompt,
          fallbackModel,
        );
      }

      throw new Error(
        `FLUX API error: ${response.status} - ${errorText.substring(0, 100)}`,
      );
    }

    const result = await response.json();

    // Handle async response (task ID)
    if (result.id) {
      console.log(`📨 Task submitted (ID: ${result.id}), polling...`);
      return await pollForResult(result.id, result.polling_url);
    }

    // Handle direct response
    return {
      url: result.result?.sample || result.url,
      seed:
        result.result?.seed ||
        result.seed ||
        Math.floor(Math.random() * 1000000),
      generationId: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  } catch (error) {
    console.error("❌ FLUX API Error:", error.message);
    throw error;
  }
}

async function pollForResult(taskId, customPollingUrl = null) {
  const maxAttempts = parseInt(process.env.MAX_POLL_ATTEMPTS) || 30;
  const pollInterval = parseInt(process.env.POLL_INTERVAL) || 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(
        `⏳ Polling attempt ${attempt + 1}/${maxAttempts} for task ${taskId}`,
      );

      const pollingUrl =
        customPollingUrl ||
        `${process.env.FLUX_POLLING_ENDPOINT || "https://api.bfl.ai/v1/get_result"}?id=${taskId}`;
      if (!process.env.BFL_API_KEY)
        throw new Error("BFL API key missing for legacy Flux polling");
      const response = await fetch(pollingUrl, {
        headers: {
          "x-key": process.env.BFL_API_KEY,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(
          `⚠️ Poll attempt ${attempt + 1} - Status: ${response.status}`,
        );
        continue; // Try again instead of throwing
      }

      const result = await response.json();

      if (result.status === "Ready") {
        console.log(`✅ Generation complete for task ${taskId}`);
        return {
          url: result.result.sample,
          seed: result.result.seed || Math.floor(Math.random() * 1000000),
          generationId: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
      }

      if (result.status === "Error") {
        const errorDetails =
          result.details || result.error || "API processing error";
        console.log(`❌ Generation failed with error: ${errorDetails}`);
        throw new Error(`Generation failed: ${errorDetails}`);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.error(`❌ Poll attempt ${attempt + 1} failed:`, error.message);

      // If this is the last attempt, throw the error
      if (attempt === maxAttempts - 1) {
        throw new Error("Generation timeout - please try again");
      }
    }
  }

  throw new Error("Generation timeout - please try again");
}

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
    gemini_api_key: process.env.GEMINI_API_KEY
      ? "configured"
      : "not configured",
    legacy_flux_enabled: LEGACY_FLUX_ENABLED ? "enabled" : "disabled",
    credit_costs: {
      standard_generation: "10 credits per image",
      premium_generation: "15 credits per image",
      angle_change: "15 credits per transformation",
    },
    message: isAIEnabled()
      ? creditSystemEnabled
        ? "Service is ready (credit-based)"
        : "Service is ready (no credits required)"
      : "Set GEMINI_API_KEY in environment variables to enable AI features (or enable legacy Flux with LEGACY_FLUX_ENABLED=true)",
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

// Main generation endpoint - SIMPLIFIED VERSION
router.post("/generate", protect, upload.single("image"), async (req, res) => {
  try {
    // Check if AI is enabled
    if (!isAIEnabled()) {
      return res.status(503).json({
        success: false,
        error:
          "AI service is not configured. Please set BFL_API_KEY in environment variables.",
        instruction:
          "Get your API key from https://api.bfl.ai and add it to your .env file as BFL_API_KEY=your_key_here",
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
      // Call FLUX API
      const result = await callFluxAPIFixed(
        req.file.buffer,
        finalPrompt,
        negativePrompt,
        modelType,
        validImageCount,
      );

      if (result && result.url) {
        console.log(`✅ Generation successful`);

        const responseData = {
          success: true,
          url: result.url,
          seed: result.seed,
          generationId: result.generationId,
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
        throw new Error("Invalid response from FLUX API");
      }
    } catch (apiError) {
      console.error("❌ FLUX API Error in generation:", apiError);
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

    // Validate that URL is from allowed domains (FLUX/BFL)
    if (!imageUrl.includes("bfldelivery") && !imageUrl.includes("cdn")) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid image source" });
    }

    // Fetch image from external server
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "LoversAI/1.0",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status}`);
      return res
        .status(response.status)
        .json({ success: false, error: "Failed to fetch image" });
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
