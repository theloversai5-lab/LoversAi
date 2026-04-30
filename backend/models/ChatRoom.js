// models/ChatRoom.js — Chat room model linking participants
import mongoose from "mongoose";

const chatRoomSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    // Links a chat room to a specific bid/quote for context
    relatedQuote: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quote",
      default: null,
    },
    relatedBid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bid",
      default: null,
    },
    lastMessage: {
      content: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: { type: Date, default: Date.now },
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ relatedQuote: 1 });
chatRoomSchema.index({ updatedAt: -1 });

export default mongoose.model("ChatRoom", chatRoomSchema);
