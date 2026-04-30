// routes/quoteRoutes.js — Wedding Quote/Bid CRUD routes
import express from "express";
import Quote from "../models/Quote.js";
import User from "../models/User.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

/* ================================================================
   POST /api/quotes — Submit a new quote request (Couple only)
================================================================ */
router.post("/", protect, authorize("couple"), async (req, res) => {
  try {
    const { images, eventDetails } = req.body;

    // Validation
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one image is required in the quote request",
      });
    }

    // Validate image data
    const validImages = images.filter((img) => img.url);
    if (validImages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid image data — each image must have a URL",
      });
    }

    const quote = await Quote.create({
      couple: req.user._id,
      images: validImages.map((img) => ({
        url: img.url,
        label: img.label || "",
        prompt: img.prompt || "",
      })),
      eventDetails: {
        weddingDate: eventDetails?.weddingDate || null,
        budget: eventDetails?.budget || "",
        guestCount: eventDetails?.guestCount || 0,
        city: eventDetails?.city || "",
        venue: eventDetails?.venue || "",
        tradition: eventDetails?.tradition || "",
        notes: eventDetails?.notes || "",
      },
    });

    console.log(`📋 New quote request from ${req.user.email} — ${validImages.length} images`);

    res.status(201).json({
      success: true,
      message: "Quote request submitted successfully!",
      quote,
    });
  } catch (err) {
    console.error("Create quote error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to submit quote request",
    });
  }
});

/* ================================================================
   GET /api/quotes/my — Get all quotes for the logged-in couple
================================================================ */
router.get("/my", protect, authorize("couple"), async (req, res) => {
  try {
    const quotes = await Quote.find({ couple: req.user._id })
      .populate("hiredPlanner", "fullName email company_name avatar")
      .populate("responses.planner", "fullName email company_name avatar")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: quotes.length,
      quotes,
    });
  } catch (err) {
    console.error("Get my quotes error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch quotes" });
  }
});

/* ================================================================
   GET /api/quotes/available — Get available quotes (Planner only)
================================================================ */
router.get("/available", protect, authorize("planner"), async (req, res) => {
  try {
    const quotes = await Quote.find({
      status: { $in: ["pending", "quoted"] },
      hiredPlanner: null,
      "responses.planner": { $ne: req.user._id },
      expiresAt: { $gt: new Date() },
    })
      .populate("couple", "fullName email weddingProfile avatar")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: quotes.length,
      quotes,
    });
  } catch (err) {
    console.error("Get available quotes error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch quotes" });
  }
});

/* ================================================================
   GET /api/quotes/my-sent — Get quotes the planner has responded to
================================================================ */
router.get("/my-sent", protect, authorize("planner"), async (req, res) => {
  try {
    const quotes = await Quote.find({ "responses.planner": req.user._id })
      .populate("couple", "fullName email weddingProfile avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: quotes.length, quotes });
  } catch (err) {
    console.error("Get my sent quotes error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch sent quotes" });
  }
});

/* ================================================================
   GET /api/quotes/my-deals — Get accepted quotes (planner's deals)
================================================================ */
router.get("/my-deals", protect, authorize("planner"), async (req, res) => {
  try {
    const quotes = await Quote.find({
      hiredPlanner: req.user._id,
      status: "accepted",
    })
      .populate("couple", "fullName email weddingProfile avatar phone")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: quotes.length, deals: quotes });
  } catch (err) {
    console.error("Get my deals error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch deals" });
  }
});

/* ================================================================
   GET /api/quotes/:id — Get a specific quote
================================================================ */
router.get("/:id", protect, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate("couple", "fullName email weddingProfile avatar")
      .populate("hiredPlanner", "fullName email company_name avatar")
      .populate("responses.planner", "fullName email company_name avatar profile");

    if (!quote) {
      return res.status(404).json({ success: false, error: "Quote not found" });
    }

    // Authorization: only the involved couple, planner, or admin can view
    const isCouple = quote.couple._id.toString() === req.user._id.toString();
    const isPlanner = quote.responses.some(r => r.planner._id.toString() === req.user._id.toString());
    const isAdmin = req.user.role === "admin";

    if (!isCouple && !isPlanner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "You don't have permission to view this quote",
      });
    }

    res.json({ success: true, quote });
  } catch (err) {
    console.error("Get quote error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch quote" });
  }
});

/* ================================================================
   PATCH /api/quotes/:id/respond — Planner responds with a price
================================================================ */
router.patch("/:id/respond", protect, authorize("planner"), async (req, res) => {
  try {
    const { quotedPrice, quotedMessage } = req.body;
    const QUOTE_COST = 5; // Credits required to submit a quote

    if (!quotedPrice || quotedPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: "A valid quoted price is required",
      });
    }

    const quote = await Quote.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({ success: false, error: "Quote not found" });
    }

    if (quote.status === "accepted" || quote.status === "rejected" || quote.status === "expired") {
      return res.status(400).json({
        success: false,
        error: `Cannot respond to a quote with status '${quote.status}'`,
      });
    }

    // Check if planner already responded
    const alreadyResponded = quote.responses.some(r => r.planner.toString() === req.user._id.toString());
    if (alreadyResponded) {
      return res.status(400).json({ success: false, error: "You have already responded to this request." });
    }

    // Check moodboard expiry
    if (quote.moodboardExpiresAt && new Date() > quote.moodboardExpiresAt) {
      quote.status = "expired";
      await quote.save();
      return res.status(400).json({
        success: false,
        error: "This moodboard has expired. The couple needs to regenerate it.",
      });
    }

    // Deduct credits from planner
    const planner = await User.findById(req.user._id);
    if (!planner) {
      return res.status(404).json({ success: false, error: "Planner not found" });
    }

    if (planner.credits < QUOTE_COST) {
      return res.status(402).json({
        success: false,
        error: `Insufficient credits. You need ${QUOTE_COST} credits to submit a quote. Current balance: ${planner.credits}`,
        creditsRequired: QUOTE_COST,
        currentCredits: planner.credits,
      });
    }

    planner.deductCredits(QUOTE_COST, `Quote submitted for bid`, "quote_submission", {
      quoteId: quote._id,
    });
    await planner.save();

    // Append to responses
    quote.responses.push({
      planner: req.user._id,
      quotedPrice,
      quotedMessage: quotedMessage || "",
      status: "pending"
    });

    if (quote.status === "pending" || quote.status === "viewed") {
      quote.status = "quoted";
    }
    
    await quote.save();

    // Notify couple via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${quote.couple}`).emit("quote_update", {
        quoteId: quote._id,
        status: "quoted",
        plannerName: planner.fullName || planner.company_name || "A Planner",
      });
    }

    res.json({
      success: true,
      message: "Quote response submitted",
      quote,
      creditsDeducted: QUOTE_COST,
      remainingCredits: planner.credits,
    });
  } catch (err) {
    if (err.message?.includes("Insufficient credits")) {
      return res.status(402).json({ success: false, error: err.message });
    }
    console.error("Respond to quote error:", err);
    res.status(500).json({ success: false, error: "Failed to respond" });
  }
});

/* ================================================================
   PATCH /api/quotes/:id/accept — Couple accepts a planner's quote
================================================================ */
router.patch("/:id/accept", protect, authorize("couple"), async (req, res) => {
  try {
    const { plannerId } = req.body;
    
    if (!plannerId) {
      return res.status(400).json({ success: false, error: "Planner ID is required to accept a proposal" });
    }

    const quote = await Quote.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({ success: false, error: "Quote not found" });
    }

    if (quote.couple.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: "Not your quote" });
    }

    if (quote.status === "accepted") {
      return res.status(400).json({ success: false, error: "Already accepted a planner for this quote." });
    }

    const responseIndex = quote.responses.findIndex(r => r.planner.toString() === plannerId);
    if (responseIndex === -1) {
      return res.status(404).json({ success: false, error: "Planner did not submit a bid on this quote." });
    }

    quote.hiredPlanner = plannerId;
    quote.status = "accepted";
    quote.responses[responseIndex].status = "accepted";
    quote.respondedAt = new Date();
    await quote.save();

    res.json({ success: true, message: "Quote accepted!", quote });
  } catch (err) {
    console.error("Accept quote error:", err);
    res.status(500).json({ success: false, error: "Failed to accept" });
  }
});

/* ================================================================
   PATCH /api/quotes/:id/reject — Couple rejects a planner's quote
================================================================ */
router.patch("/:id/reject", protect, authorize("couple"), async (req, res) => {
  try {
    const { plannerId } = req.body;

    if (!plannerId) {
      return res.status(400).json({ success: false, error: "Planner ID is required to reject a proposal" });
    }

    const quote = await Quote.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({ success: false, error: "Quote not found" });
    }

    if (quote.couple.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: "Not your quote" });
    }

    const responseIndex = quote.responses.findIndex(r => r.planner.toString() === plannerId);
    if (responseIndex === -1) {
      return res.status(404).json({ success: false, error: "Planner did not submit a bid on this quote." });
    }

    quote.responses[responseIndex].status = "rejected";
    
    // If all bids are rejected, maybe set main status to rejected?
    const allRejected = quote.responses.every(r => r.status === "rejected");
    if (allRejected) {
      // Actually we just leave it open if they want other planners to bid
    }

    await quote.save();

    res.json({ success: true, message: "Proposal rejected", quote });
  } catch (err) {
    console.error("Reject quote error:", err);
    res.status(500).json({ success: false, error: "Failed to reject" });
  }
});

export default router;
