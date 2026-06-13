import mongoose from "mongoose";

const plannerUserSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    fullName: {
      type: String,
      trim: true,
      default: "",
    },

    companyName: {
      type: String,
      trim: true,
      default: "",
    },

    role: {
      type: String,
      enum: ["planner"],
      default: "planner",
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    firstSeenAt: {
      type: Date,
      default: Date.now,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
    },

    signupCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    signInCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    authEventCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastAuthAction: {
      type: String,
      enum: ["signup", "signin"],
      default: "signup",
    },
  },
  {
    timestamps: true,
    collection: "planner_users",
  },
);

plannerUserSchema.index({ role: 1, lastSeenAt: -1 });

export default mongoose.model("PlannerUser", plannerUserSchema);
