import mongoose from "mongoose";

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    adminName: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    previousPlan: {
      type: String,
      default: null,
    },
    newPlan: {
      type: String,
      default: null,
    },
    previousCredits: {
      type: Number,
      default: null,
    },
    newCredits: {
      type: Number,
      default: null,
    },
    reason: {
      type: String,
      required: true,
    },
    subscriptionSource: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("AdminAuditLog", adminAuditLogSchema);
