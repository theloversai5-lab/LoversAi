// routes/chatRoutes.js — Real-time chat API routes
import express from "express";
import ChatRoom from "../models/ChatRoom.js";
import Message from "../models/Message.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/chat/rooms
 * Get all chat rooms for the current user
 */
router.get("/rooms", protect, async (req, res) => {
  try {
    const rooms = await ChatRoom.find({
      participants: req.user._id,
      isActive: true,
    })
      .populate("participants", "fullName email avatar role company_name")
      .populate("relatedQuote", "status eventDetails")
      .populate("lastMessage.sender", "fullName")
      .sort({ updatedAt: -1 });

    res.json({ success: true, rooms });
  } catch (error) {
    console.error("Get chat rooms error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch chat rooms" });
  }
});

/**
 * POST /api/chat/rooms
 * Create or get existing chat room between participants
 * Body: { participantId, quoteId?, bidId? }
 */
router.post("/rooms", protect, async (req, res) => {
  try {
    const { participantId, quoteId, bidId } = req.body;

    if (!participantId) {
      return res.status(400).json({ success: false, error: "participantId is required" });
    }

    // Don't allow chatting with yourself
    if (participantId === req.user._id.toString()) {
      return res.status(400).json({ success: false, error: "Cannot create chat room with yourself" });
    }

    const participantIds = [req.user._id.toString(), participantId].sort();

    // Check for existing room between the same participants
    let room = await ChatRoom.findOne({
      participants: { $all: participantIds, $size: 2 },
      isActive: true,
    });

    if (!room) {
      room = await ChatRoom.create({
        participants: participantIds,
        relatedQuote: quoteId || null,
        relatedBid: bidId || null,
      });
    }

    // Return populated
    room = await ChatRoom.findById(room._id)
      .populate("participants", "fullName email avatar role company_name")
      .populate("relatedQuote", "status eventDetails");

    res.status(201).json({ success: true, room });
  } catch (error) {
    console.error("Create chat room error:", error);
    res.status(500).json({ success: false, error: "Failed to create chat room" });
  }
});

/**
 * GET /api/chat/rooms/:roomId/messages
 * Get paginated messages for a chat room
 * Query: ?page=1&limit=50
 */
router.get("/rooms/:roomId/messages", protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    // Verify user is a participant
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: "Chat room not found" });
    }

    const isParticipant = room.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, error: "Not a participant of this chat" });
    }

    const messages = await Message.find({ chatRoom: roomId })
      .populate("sender", "fullName avatar role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ chatRoom: roomId });

    // Mark messages as read
    await Message.updateMany(
      {
        chatRoom: roomId,
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json({
      success: true,
      messages: messages.reverse(), // Return chronological
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
});

/**
 * POST /api/chat/rooms/:roomId/messages
 * Send a message (also emits via socket if available)
 * Body: { content, type? }
 */
router.post("/rooms/:roomId/messages", protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, type = "text", fileUrl } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: "Message content is required" });
    }

    // Verify user is a participant
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: "Chat room not found" });
    }

    const isParticipant = room.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, error: "Not a participant of this chat" });
    }

    const message = await Message.create({
      chatRoom: roomId,
      sender: req.user._id,
      content: content.trim(),
      type,
      fileUrl: fileUrl || undefined,
      readBy: [req.user._id],
    });

    // Update room's lastMessage
    room.lastMessage = {
      content: content.trim().substring(0, 100),
      sender: req.user._id,
      timestamp: new Date(),
    };
    await room.save();

    // Populate sender info
    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "fullName avatar role"
    );

    // Emit via Socket.io if available
    const io = req.app.get("io");
    if (io) {
      room.participants.forEach((participantId) => {
        if (participantId.toString() !== req.user._id.toString()) {
          io.to(`user_${participantId}`).emit("new_message", {
            roomId,
            message: populatedMessage,
          });
        }
      });
    }

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ success: false, error: "Failed to send message" });
  }
});

/**
 * GET /api/chat/unread
 * Get total unread message count for the current user
 */
router.get("/unread", protect, async (req, res) => {
  try {
    const rooms = await ChatRoom.find({
      participants: req.user._id,
      isActive: true,
    });

    const roomIds = rooms.map((r) => r._id);

    const unreadCount = await Message.countDocuments({
      chatRoom: { $in: roomIds },
      sender: { $ne: req.user._id },
      readBy: { $ne: req.user._id },
    });

    res.json({ success: true, unreadCount });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({ success: false, error: "Failed to get unread count" });
  }
});

export default router;
