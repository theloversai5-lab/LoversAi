// models/Message.js — Chat message model
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },
    fileUrl: String,
    fileName: String,
    mimeType: String,
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

messageSchema.pre("validate", function (next) {
  const hasContent = Boolean(this.content && this.content.trim());
  const hasFile = Boolean(this.fileUrl);

  if (!hasContent && !hasFile) {
    this.invalidate("content", "Message content or attachment is required");
  }

  next();
});

messageSchema.index({ chatRoom: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);
