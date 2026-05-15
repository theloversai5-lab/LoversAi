// routes/quoteRoutes.js - Wedding Quote/Bid CRUD routes
import express from "express";
import Quote from "../models/Quote.js";
import User from "../models/User.js";
import ChatRoom from "../models/ChatRoom.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

const DEMO_PLANNERS = [
  {
    email: "demo.planner1@loversai.local",
    fullName: "Ruchi Ratogi",
    company_name: "Ruchi Wedding Atelier",
    location: "Greater Noida",
  },
  {
    email: "demo.planner2@loversai.local",
    fullName: "Aarav Mehta",
    company_name: "Golden Aisle Events",
    location: "Delhi NCR",
  },
];

const parseBudgetValue = (budget) => {
  if (!budget) return 0;
  if (typeof budget === "number") return budget;

  const raw = String(budget).trim().toLowerCase();
  const numeric = parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric)) return 0;

  if (raw.includes("cr")) return Math.round(numeric * 10000000);
  if (raw.includes("l")) return Math.round(numeric * 100000);
  if (raw.includes("k")) return Math.round(numeric * 1000);
  return Math.round(numeric);
};

const buildDemoResponse = (plannerId, index, eventDetails = {}) => {
  const baseBudget = parseBudgetValue(eventDetails.budget);
  const quotedPrice =
    baseBudget > 0
      ? Math.max(50000, Math.round(baseBudget * (0.72 + index * 0.08)))
      : 250000 + index * 75000;

  const city = eventDetails.city || "your city";
  const guestCount = eventDetails.guestCount || 200;
  const tradition = eventDetails.tradition || "wedding";
  const templates = [
    `We can design a warm ${tradition} celebration in ${city} for around ${guestCount} guests with decor, planning support, and guest flow management.`,
    `Our team can handle planning, styling, and venue coordination for ${city}. This estimate keeps the experience premium while staying practical.`,
  ];

  return {
    planner: plannerId,
    quotedPrice,
    quotedMessage: templates[index % templates.length],
    status: "pending",
  };
};

const ensureDemoPlanners = async () => {
  const planners = [];

  for (const [index, plannerData] of DEMO_PLANNERS.entries()) {
    let planner = await User.findOne({ email: plannerData.email });

    if (!planner) {
      planner = await User.create({
        ...plannerData,
        password: `DemoPlanner@${index + 1}`,
        role: "planner",
        profileCompleted: true,
        credits: 999,
      });
    }

    planners.push(planner);
  }

  return planners;
};

const ensureAcceptedQuoteChatRoom = async (quoteId, coupleId, plannerId) => {
  const participants = [coupleId.toString(), plannerId.toString()].sort();

  let room = await ChatRoom.findOne({
    participants: { $all: participants, $size: 2 },
    relatedQuote: quoteId,
    isActive: true,
  });

  if (!room) {
    room = await ChatRoom.create({
      participants,
      relatedQuote: quoteId,
    });
  }

  return room;
};

router.post("/", protect, authorize("couple"), async (req, res) => {
  try {
    const { images, eventDetails } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one image is required in the quote request",
      });
    }

    const validImages = images.filter((img) => img.url);
    if (validImages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid image data - each image must have a URL",
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

    // Seed demo responses only when explicitly enabled via environment flag
    if (
      process.env.ENABLE_DEMO_RESPONSES === "true" ||
      process.env.NODE_ENV === "development"
    ) {
      const demoPlanners = await ensureDemoPlanners();
      if (demoPlanners.length > 0) {
        quote.responses = demoPlanners.map((planner, index) =>
          buildDemoResponse(planner._id, index, quote.eventDetails),
        );
        quote.status = "quoted";
        await quote.save();
      }
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("new_bid", { quoteId: quote._id, quote });
    }

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

router.get("/:id", protect, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate("couple", "fullName email weddingProfile avatar")
      .populate("hiredPlanner", "fullName email company_name avatar")
      .populate("responses.planner", "fullName email company_name avatar profile");

    if (!quote) {
      return res.status(404).json({ success: false, error: "Quote not found" });
    }

    const isCouple = quote.couple._id.toString() === req.user._id.toString();
    const isPlannerParticipant =
      quote.hiredPlanner?._id?.toString() === req.user._id.toString() ||
      quote.responses.some((response) => response.planner._id.toString() === req.user._id.toString());
    const isPlannerViewingAvailableLead =
      req.user.role === "planner" &&
      !quote.hiredPlanner &&
      ["pending", "viewed", "quoted"].includes(quote.status) &&
      (!quote.expiresAt || new Date(quote.expiresAt) > new Date());
    const isAdmin = req.user.role === "admin";

    if (!isCouple && !isPlannerParticipant && !isPlannerViewingAvailableLead && !isAdmin) {
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

router.patch("/:id/respond", protect, authorize("planner"), async (req, res) => {
  try {
    const { quotedPrice, quotedMessage } = req.body;
    const QUOTE_COST = 5;

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

    const alreadyResponded = quote.responses.some((response) => response.planner.toString() === req.user._id.toString());
    if (alreadyResponded) {
      return res.status(400).json({ success: false, error: "You have already responded to this request." });
    }

    if (quote.moodboardExpiresAt && new Date() > quote.moodboardExpiresAt) {
      quote.status = "expired";
      await quote.save();
      return res.status(400).json({
        success: false,
        error: "This moodboard has expired. The couple needs to regenerate it.",
      });
    }

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

    planner.deductCredits(QUOTE_COST, "Quote submitted for bid", "quote_submission", {
      quoteId: quote._id,
    });
    await planner.save();

    quote.responses.push({
      planner: req.user._id,
      quotedPrice,
      quotedMessage: quotedMessage || "",
      status: "pending",
    });

    if (quote.status === "pending" || quote.status === "viewed") {
      quote.status = "quoted";
    }

    await quote.save();

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

    const responseIndex = quote.responses.findIndex((response) => response.planner.toString() === plannerId);
    if (responseIndex === -1) {
      return res.status(404).json({ success: false, error: "Planner did not submit a bid on this quote." });
    }

    quote.hiredPlanner = plannerId;
    quote.status = "accepted";
    quote.responses = quote.responses.map((response) => ({
      ...response.toObject(),
      status: response.planner.toString() === plannerId ? "accepted" : "rejected",
    }));
    quote.respondedAt = new Date();
    await quote.save();

    const room = await ensureAcceptedQuoteChatRoom(
      quote._id,
      quote.couple,
      plannerId,
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${plannerId}`).emit("quote_update", {
        quoteId: quote._id,
        status: "accepted",
        roomId: room._id,
      });
      io.to(`user_${quote.couple}`).emit("quote_update", {
        quoteId: quote._id,
        status: "accepted",
        roomId: room._id,
      });
    }

    res.json({ success: true, message: "Quote accepted!", quote, roomId: room._id });
  } catch (err) {
    console.error("Accept quote error:", err);
    res.status(500).json({ success: false, error: "Failed to accept" });
  }
});

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

    const responseIndex = quote.responses.findIndex((response) => response.planner.toString() === plannerId);
    if (responseIndex === -1) {
      return res.status(404).json({ success: false, error: "Planner did not submit a bid on this quote." });
    }

    quote.responses[responseIndex].status = "rejected";
    await quote.save();

    res.json({ success: true, message: "Proposal rejected", quote });
  } catch (err) {
    console.error("Reject quote error:", err);
    res.status(500).json({ success: false, error: "Failed to reject" });
  }
});

export default router;
