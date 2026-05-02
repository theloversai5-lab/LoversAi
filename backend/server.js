// server.js
import dotenv from "dotenv";
dotenv.config(); // ✅ Load .env BEFORE any other imports

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import http from "http";
import net from "net";
import { Server as SocketIOServer } from "socket.io";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";

// Import Core Routes
import userRoutes from "./routes/users.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import authRoutes from "./routes/authRoutes.js"; // ✅ New JWT auth routes
import debugRoutes from "./routes/debugRoutes.js";
import adminRoutes from "./admin/adminRoutes.js";
import quoteRoutes from "./routes/quoteRoutes.js"; // ✅ Quote/Bid routes
import vendorRoutes from "./routes/vendorRoutes.js"; // ✅ Vendor System
import bidRoutes from "./routes/bidRoutes.js"; // ✅ Bid System
import chatRoutes from "./routes/chatRoutes.js"; // ✅ Real-time Chat
import uploadRoutes from "./routes/uploadRoutes.js"; // ✅ Cloudinary Uploads
import cartRoutes from "./routes/cartRoutes.js"; // ✅ Wedding Cart

dotenv.config();

// Load fallback .env.production if .env does not define MONGO_URI
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, ".env");
const envProdPath = path.join(__dirname, ".env.production");

if (!process.env.MONGO_URI) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}
if (!process.env.MONGO_URI && fs.existsSync(envProdPath)) {
  console.log("🔁 No MONGO_URI in .env; loading .env.production fallback");
  dotenv.config({ path: envProdPath });
}

if (!process.env.MONGO_URI) {
  console.error("❌ Missing MONGO_URI. Set it in .env or .env.production before running.");
  process.exit(1);
}

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 5000;

function isPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const tester = net.createServer();

    tester.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        resolve(false);
        return;
      }

      reject(error);
    });

    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port);
  });
}

async function findAvailablePort(preferredPort, attempts = 10) {
  for (let offset = 0; offset <= attempts; offset += 1) {
    const port = preferredPort + offset;
    if (await isPortAvailable(port)) {
      if (port !== preferredPort) {
        console.warn(`Port ${preferredPort} is already in use. Using ${port} instead.`);
      }
      return port;
    }
  }

  throw new Error(
    `No available port found from ${preferredPort} to ${preferredPort + attempts}.`,
  );
}

async function listenOnAvailablePort(httpServer, preferredPort) {
  const availablePort = await findAvailablePort(preferredPort);
  return new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(availablePort, () => {
      httpServer.off("error", reject);
      resolve(availablePort);
    });
  });
}

// CORS origins list (used by both express-cors and socket.io)
const corsOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL
].filter(Boolean);

/* ============================================================
   Socket.io Initialization
============================================================ */
const io = new SocketIOServer(server, {
  cors: {
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Make io accessible to routes
app.set("io", io);

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log(`⚡ Socket connected: ${socket.id}`);

  // User joins their personal room for targeted messages
  socket.on("join", (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} joined room user_${userId}`);
    }
  });

  // Join a specific chat room
  socket.on("join_chat", (roomId) => {
    if (roomId) {
      socket.join(`chat_${roomId}`);
      console.log(`💬 Socket ${socket.id} joined chat_${roomId}`);
    }
  });

  // Leave a chat room
  socket.on("leave_chat", (roomId) => {
    if (roomId) {
      socket.leave(`chat_${roomId}`);
    }
  });

  // Typing indicators
  socket.on("typing", ({ roomId, userId, fullName }) => {
    socket.to(`chat_${roomId}`).emit("user_typing", { userId, fullName });
  });

  socket.on("stop_typing", ({ roomId, userId }) => {
    socket.to(`chat_${roomId}`).emit("user_stop_typing", { userId });
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

/* ============================================================
   CORS Configuration
============================================================ */
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-signature", "x-api-key"],
  })
);

// Security headers (relaxed for dev)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 300 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later." },
  skip: (req) => {
    const isLocalhost =
      req.ip === "::1" ||
      req.ip === "127.0.0.1" ||
      req.ip === "::ffff:127.0.0.1";
    if (isLocalhost) return true;
    if (req.method === "GET" && req.path === "/api/cart") return true;
    return false;
  },
});
app.use("/api/", apiLimiter);



// Request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

/* ============================================================
   Special middleware for Lemon webhook
============================================================ */
app.use("/api/lemon/webhook", express.raw({ type: "application/json" }));

/* ============================================================
   Body parsers for all other routes
============================================================ */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* ============================================================
   Static files
============================================================ */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/public", express.static(path.join(__dirname, "public")));

/* ============================================================
   AI Routes Loading - IMPORTANT: Load these BEFORE other routes
============================================================ */
async function loadAIRoutes() {
  console.log("\n🤖 Loading AI Tools Routes...");
  
  try {
    // Load Retexturing AI Tool
    const retexturingModule = await import("./planner/ai_tools/retexturing.js");
    if (retexturingModule.default) {
      app.use("/api/ai", retexturingModule.default);
      console.log("✅ Retexturing routes loaded at /api/ai");
      
      // Log available endpoints
      const router = retexturingModule.default;
      router.stack?.forEach((layer) => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods).join(", ").toUpperCase();
          const path = layer.route.path;
          console.log(`   ${methods.padEnd(7)} /api/ai${path}`);
        }
      });
    }
  } catch (e) {
    console.error("❌ Failed to load Retexturing module:", e.message);
    console.error("   Please check if the file exists at: ./planner/ai_tools/retexturing.js");
  }

  try {
    // Load Angle Change AI Tool - FIXED PATH
    // Note: Make sure you have the file at ./planner/ai_tools/angle_image.js
    const angleChangeModule = await import("./planner/ai_tools/angle_image.js");
    if (angleChangeModule.default) {
      app.use("/api/ai", angleChangeModule.default);
      console.log("✅ Angle change routes loaded at /api/ai");
      
      // Log available endpoints
      const router = angleChangeModule.default;
      router.stack?.forEach((layer) => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods).join(", ").toUpperCase();
          const path = layer.route.path;
          console.log(`   ${methods.padEnd(7)} /api/ai${path}`);
        }
      });
    }
  } catch (e) {
    console.error("❌ Failed to load Angle Change module:", e.message);
    console.error("   Please check if the file exists at: ./planner/ai_tools/angle_image.js");
    
    // Try alternative filename
    console.log("🔄 Trying alternative filename: Image_angle.js");
    try {
      const altAngleChangeModule = await import("./planner/ai_tools/Image_angle.js");
      if (altAngleChangeModule.default) {
        app.use("/api/ai", altAngleChangeModule.default);
        console.log("✅ Angle change routes loaded from Image_angle.js");
      }
    } catch (altError) {
      console.error("❌ Failed to load Image_angle.js:", altError.message);
    }
  }

  try {
    // Load Image to Video AI Tool
    const videoModule = await import("./planner/ai_tools/image_to_video.js");
    if (videoModule.default) {
      app.use("/api/ai", videoModule.default);
      console.log("✅ Image to video routes loaded at /api/ai");
      
      // Log available endpoints
      const router = videoModule.default;
      router.stack?.forEach((layer) => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods).join(", ").toUpperCase();
          const path = layer.route.path;
          console.log(`   ${methods.padEnd(7)} /api/ai${path}`);
        }
      });
    }
  } catch (e) {
    console.error("❌ Failed to load Image to Video module:", e.message);
    console.error("   Please check if the file exists at: ./planner/ai_tools/image_to_video.js");
  }

  try {
    // Load Couple Moodboard AI Tool
    const coupleMoodboardModule = await import("./planner/ai_tools/couple_moodboard.js");
    if (coupleMoodboardModule.default) {
      app.use("/api/ai", coupleMoodboardModule.default);
      console.log("✅ Couple moodboard routes loaded at /api/ai");
      
      // Log available endpoints
      const router = coupleMoodboardModule.default;
      router.stack?.forEach((layer) => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods).join(", ").toUpperCase();
          const path = layer.route.path;
          console.log(`   ${methods.padEnd(7)} /api/ai${path}`);
        }
      });
    }
  } catch (e) {
    console.error("❌ Failed to load Couple Moodboard module:", e.message);
    console.error("   Please check if the file exists at: ./planner/ai_tools/couple_moodboard.js");
  }

  console.log("🤖 AI Tools loading complete!\n");
}

/* ============================================================
   Start Server with AI Routes Loaded First
============================================================ */
async function startServer() {
  try {
    // Load AI routes FIRST before any other routes
    await loadAIRoutes();
    
    /* ============================================================
       Core Application Routes (loaded AFTER AI routes)
    ============================================================ */
    app.use("/api/auth", authRoutes);      // ✅ JWT Auth (register, login, google, me)
    app.use("/api/users", userRoutes);      // ✅ User profile & management (consolidated)
    app.use("/api/quotes", quoteRoutes);    // ✅ Quote/Bid management
    app.use("/api/payment", paymentRoutes);
    app.use("/api/vendor", vendorRoutes); // 🏢 Vendor endpoints
    app.use("/api/bids", bidRoutes); // 🔨 Bid endpoints
    app.use("/api/chat", chatRoutes); // 💬 Real-time Chat
    app.use("/api/upload", uploadRoutes); // 📤 Cloudinary Uploads
    app.use("/api/cart", cartRoutes); // 🛒 Wedding Cart
    app.use("/api/debug", debugRoutes); // 🔍 Debug endpoints - REMOVE IN PRODUCTION
    app.use("/api/admin", adminRoutes); // 🔒 Admin panel backend APIs

    // Public vendor listing (no auth required)
    const vendorPublicRoutes = (await import("./routes/vendorRoutes.js")).default;
    // We'll add a specific public-facing endpoint below
    app.get("/api/vendors/public", async (req, res) => {
      try {
        const { default: User } = await import("./models/User.js");
        const { category, city, search } = req.query;
        const filter = { role: "vendor", vendorVerificationStatus: { $in: ["approved", "pending"] } };
        if (category) filter["vendorProfile.category"] = category;
        if (city) filter["vendorProfile.serviceArea"] = { $regex: city, $options: "i" };
        if (search) {
          filter.$or = [
            { "vendorProfile.businessName": { $regex: search, $options: "i" } },
            { "vendorProfile.category": { $regex: search, $options: "i" } },
          ];
        }
        const vendors = await User.find(filter)
          .select("fullName vendorProfile avatar vendorVerificationStatus")
          .sort({ "vendorProfile.rating": -1 })
          .limit(50);
        res.json({ success: true, vendors });
      } catch (err) {
        console.error("Public vendor list error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch vendors" });
      }
    });
    // New users endpoint (phone capture)
    try {
      const newUserRoutes = await import("./routes/newUserRoutes.js");
      app.use("/api/newusers", newUserRoutes.default);
      console.log("✅ NewUser routes loaded at /api/newusers");
    } catch (e) {
      console.error("❌ Failed to load newUserRoutes:", e.message);
    }

    /* ============================================================
       Health Check & Info Endpoints
    ============================================================ */
    // Root endpoint
    app.get("/", (req, res) => {
      res.json({
        success: true,
        message: "🚀 Wedding AI API Server is running",
        version: "2.0.0",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        ai_enabled: !!(process.env.BFL_API_KEY && process.env.BFL_API_KEY !== "your_bfl_api_key_here"),
        endpoints: {
          auth: "/api/auth",
          users: "/api/users",
          payment: "/api/payment",
          lemon: "/api/lemon",
          profile: "/api/profile",
          ai: {
            base: "/api/ai",
            health: "/api/ai/health",
            themes: "/api/ai/themes",
            generate: "/api/ai/generate (POST)",
            "change-angle": "/api/ai/change-angle (POST)",
            "available-angles": "/api/ai/available-angles",
            feedback: "/api/ai/feedback (POST)"
          }
        }
      });
    });

    // Container/platform health check endpoint
    app.get("/health", (req, res) => {
      res.status(200).json({
        success: true,
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    });

    // AI health endpoint (for React component) - This should come AFTER AI routes
    app.get("/api/ai/health", (req, res) => {
      const isAIEnabled = !!(process.env.BFL_API_KEY && process.env.BFL_API_KEY !== "your_bfl_api_key_here");
      
      // Check if angle change endpoint exists
      let angleChangeAvailable = false;
      try {
        // Check if route exists
        app._router.stack.forEach(layer => {
          if (layer.route && layer.route.path === '/api/ai/change-angle') {
            angleChangeAvailable = true;
          }
        });
      } catch (e) {
        console.error("Error checking routes:", e);
      }
      
      res.json({
        success: true,
        service: "AI Tools API",
        status: isAIEnabled ? "healthy" : "disabled",
        timestamp: new Date().toISOString(),
        tools: ["retexturing", angleChangeAvailable ? "angle-change" : null].filter(Boolean),
        angle_change_available: angleChangeAvailable,
        ai_configuration: isAIEnabled ? "configured" : "not configured",
        message: isAIEnabled 
          ? "AI tools are ready to use" 
          : "Set BFL_API_KEY in environment variables to enable AI features",
        endpoints: {
          "GET /api/ai/themes": "Get available wedding themes",
          "GET /api/ai/available-angles": "Get available angle options",
          "POST /api/ai/generate": "Generate venue transformation (requires image)",
          "POST /api/ai/change-angle": angleChangeAvailable ? "Change image perspective/angle (requires image)" : "Endpoint not loaded",
          "POST /api/ai/feedback": "Submit feedback for AI generations"
        }
      });
    });

    // API test endpoint
    app.get("/api/test", (req, res) => {
      res.json({
        success: true,
        message: "✅ API is working correctly",
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString(),
        node_version: process.version,
        platform: process.platform
      });
    });

    // Themes endpoint for React component (fallback if AI routes fail)
    app.get("/api/ai/themes", (req, res) => {
      const themes = {
        'haldi': {
          name: 'Haldi Ceremony',
          description: 'Vibrant yellow traditional ceremony',
          promptPreview: 'Transform this venue into a vibrant traditional Haldi ceremony...'
        },
        'mehendi': {
          name: 'Mehendi Ceremony',
          description: 'Henna-inspired festive ceremony',
          promptPreview: 'Transform this venue into an enchanting Mehendi ceremony...'
        },
        'sangeet': {
          name: 'Sangeet Ceremony',
          description: 'Musical night celebration',
          promptPreview: 'Transform this venue into an electrifying Sangeet night...'
        },
        'wedding': {
          name: 'Wedding Ceremony',
          description: 'Traditional Indian wedding setup',
          promptPreview: 'Transform this venue into a magnificent traditional Indian wedding...'
        },
        'reception': {
          name: 'Reception Party',
          description: 'Luxurious wedding reception',
          promptPreview: 'Transform this venue into a luxurious wedding reception...'
        },
        'engagement': {
          name: 'Engagement Ceremony',
          description: 'Romantic engagement celebration',
          promptPreview: 'Transform this venue into a romantic engagement celebration...'
        }
      };
      
      res.json({
        success: true,
        themes: themes,
        count: Object.keys(themes).length,
        note: "These are wedding venue transformation themes for AI generation"
      });
    });

    /* ============================================================
       Development Helpers
    ============================================================ */
    if (process.env.NODE_ENV !== "production") {
      // Debug routes endpoint
      app.get("/api/debug/routes", (req, res) => {
        const routes = [];
        
        function processMiddleware(layer, prefix = '') {
          if (layer.route) {
            // Regular route
            const path = prefix + layer.route.path;
            const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
            routes.push({ path, methods });
          } else if (layer.name === 'router' && layer.handle.stack) {
            // Router middleware
            const routerPath = layer.regexp.source
              .replace('\\/?(?=\\/|$)', '')
              .replace('^\\', '')
              .replace('\\/?(?=\\/|$)', '')
              .replace(/^\^/, '')
              .replace(/\$/, '');
            
            layer.handle.stack.forEach(sublayer => {
              processMiddleware(sublayer, prefix + routerPath);
            });
          }
        }
        
        app._router.stack.forEach(layer => {
          processMiddleware(layer);
        });
        
        res.json({
          success: true,
          total_routes: routes.length,
          routes: routes.sort((a, b) => a.path.localeCompare(b.path))
        });
      });

      // Test AI configuration endpoint
      app.get("/api/test-ai-config", (req, res) => {
        const isAIEnabled = !!(process.env.BFL_API_KEY && process.env.BFL_API_KEY !== "your_bfl_api_key_here");
        
        res.json({
          success: true,
          ai_enabled: isAIEnabled,
          bfl_api_key_configured: !!process.env.BFL_API_KEY,
          bfl_api_key_value: process.env.BFL_API_KEY 
            ? (process.env.BFL_API_KEY === "your_bfl_api_key_here" 
              ? "NOT_CONFIGURED (using placeholder)" 
              : `${process.env.BFL_API_KEY.substring(0, 8)}...${process.env.BFL_API_KEY.substring(process.env.BFL_API_KEY.length - 4)}`)
            : "NOT_SET",
          flux_api_base_url: process.env.FLUX_API_BASE_URL || "https://api.bfl.ai (default)",
          max_file_size: process.env.MAX_FILE_SIZE || "10485760 (10MB default)",
          environment: process.env.NODE_ENV || "development"
        });
      });

      // Simple test generation endpoint (fallback)
      app.post("/api/ai/generate-test", (req, res) => {
        console.log("🧪 Test generation endpoint called");
        
        // Return mock response
        res.json({
          success: true,
          test_mode: true,
          message: "This is a test endpoint. AI routes should be loaded separately.",
          note: "Check if ./planner/ai_tools/retexturing.js exists and exports a router",
          timestamp: new Date().toISOString()
        });
      });
    }

    /* ============================================================
       Error Handlers (MUST BE LAST)
    ============================================================ */
    // 404 Handler - This should be the LAST route defined
    app.use((req, res) => {
      const availableEndpoints = [
        "GET    /",
        "GET    /api/test",
        "GET    /api/ai/health",
        "GET    /api/ai/themes",
        "GET    /api/ai/available-angles",
        "POST   /api/ai/generate",
        "POST   /api/ai/change-angle",
        "POST   /api/ai/feedback",
        "POST   /api/auth/firebase-login",
        "GET    /api/users/check-profile",
        "POST   /api/users/save-form",
        "GET    /api/users/profile",
        "POST   /api/payment/create-checkout",
        "GET    /api/payment/payment-status",
        "GET    /api/payment/subscription",
        "GET    /api/payment/credits",
        "GET    /api/payment/plans",
        "POST   /api/lemon/webhook",
        "GET    /api/profile/check-profile",
        "POST   /api/profile/save-form",
      ];
      
      // Add test endpoints in development
      if (process.env.NODE_ENV !== "production") {
        availableEndpoints.push("GET    /api/debug/routes");
        availableEndpoints.push("GET    /api/test-ai-config");
        availableEndpoints.push("POST   /api/ai/generate-test");
      }
      
      res.status(404).json({
        success: false,
        error: "Route not found",
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString(),
        availableEndpoints: availableEndpoints.sort()
      });
    });

    // Global error handler
    app.use((err, req, res, next) => {
      console.error("❌ Server Error:", err);
      
      const statusCode = err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      res.status(statusCode).json({
        success: false,
        error: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        timestamp: new Date().toISOString()
      });
    });

    /* ============================================================
       Start Server
    ============================================================ */
    const activePort = await listenOnAvailablePort(server, PORT);
    {
      console.log(`
✨ ===========================================
✨  WEDDING AI SERVER STARTED SUCCESSFULLY
✨ ===========================================
✅ Server URL: http://localhost:${activePort}
⏰ Started at: ${new Date().toLocaleString()}
📊 Environment: ${process.env.NODE_ENV || 'development'}
🤖 AI Status: ${process.env.BFL_API_KEY && process.env.BFL_API_KEY !== 'your_bfl_api_key_here' ? 'Ready ✅' : 'Not configured ❌'}
💳 Payment System: ${process.env.LEMON_WEBHOOK_SECRET ? 'Enabled ✅' : 'Disabled ❌'}
🗄️  Database: ${process.env.MONGO_URI ? 'Connected ✅' : 'Not configured ❌'}
      `);
      
      // Display AI endpoints
      console.log("\n🤖 AI Endpoints:");
      console.log("   GET    /api/ai/health             - Check AI service status");
      console.log("   GET    /api/ai/themes             - Get wedding themes");
      console.log("   GET    /api/ai/available-angles   - Get available angle options");
      console.log("   POST   /api/ai/generate           - Generate venue transformation");
      console.log("   POST   /api/ai/change-angle       - Change image perspective");
      console.log("   POST   /api/ai/feedback           - Submit feedback");
      
      console.log("\n👤 User & Auth Endpoints:");
      console.log("   POST   /api/auth/firebase-login   - Firebase authentication");
      console.log("   GET    /api/users/check-profile   - Check user profile");
      console.log("   POST   /api/users/save-form       - Save user form");
      console.log("   GET    /api/users/profile         - Get user profile");
      console.log("   GET    /api/profile/check-profile - Check profile status");
      console.log("   POST   /api/profile/save-form     - Save profile form");
      
      console.log("\n💳 Payment Endpoints:");
      console.log("   POST   /api/payment/create-checkout - Create payment checkout");
      console.log("   GET    /api/payment/payment-status  - Check payment status");
      console.log("   GET    /api/payment/subscription    - Get subscription info");
      console.log("   GET    /api/payment/credits         - Get user credits");
      console.log("   GET    /api/payment/plans           - Get available plans");
      console.log("   POST   /api/lemon/webhook          - Lemon webhook endpoint");
      
      console.log("\n🔧 Utility Endpoints:");
      console.log("   GET    /                           - Server status");
      console.log("   GET    /api/test                   - API test");
      
      // Development-only endpoints
      if (process.env.NODE_ENV !== "production") {
        console.log("\n🧪 Development Test Endpoints:");
        console.log("   GET    /api/debug/routes           - List all routes");
        console.log("   GET    /api/test-ai-config         - Test AI configuration");
        console.log("   POST   /api/ai/generate-test       - Test generation endpoint");
      }
      
      console.log("\n⚠️  Important Notes:");
      if (!process.env.BFL_API_KEY || process.env.BFL_API_KEY === 'your_bfl_api_key_here') {
        console.log("   ❌ AI features require BFL_API_KEY environment variable");
        console.log("   🔑 Get API key from: https://api.bfl.ai");
        console.log("   📝 Set in .env: BFL_API_KEY=your_actual_key_here");
      }
      
      console.log("\n✅ Server is ready! Access at:");
      console.log(`   🌐 ${process.env.FRONTEND_URL || 'https://theloversai.co.in'}`);
      console.log(`   📡 API proxied via nginx /api → backend:${activePort}`);
      console.log("\n");
    }
    
  } catch (err) {
    console.error("❌ Fatal server error:", err);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🔥 Uncaught Exception:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer();
