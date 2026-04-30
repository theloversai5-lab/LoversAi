// routes/lemonRoutes.js
import express from "express";
import { 
  lemonWebhook, 
  createCheckout 
} from "../controllers/lemonSqueezyController.js";

const router = express.Router();

// 🪝 WEBHOOK ENDPOINT (uses raw body from server.js middleware)
router.post("/webhook", lemonWebhook);

// 🛒 CREATE CHECKOUT (protected route - moved to paymentRoutes)
// This endpoint is now in paymentRoutes.js
// router.post("/create-checkout", verifyFirebaseToken, createCheckout);

/**
 * 🧪 TEST WEBHOOK ENDPOINT
 */
router.get("/test-webhook", (req, res) => {
  res.json({
    message: "Lemon Squeezy webhook endpoint is ready",
    url: "/api/lemon/webhook",
    method: "POST",
    requiredHeaders: ["x-signature"],
    note: "This endpoint requires raw JSON body processing"
  });
});

export default router;