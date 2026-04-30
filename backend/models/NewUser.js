import mongoose from "mongoose";

const newUserSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      default: "footer",
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Number of times this phone was submitted
    submissions: {
      type: Number,
      default: 1,
      min: 1,
    },
    // Last time the phone was submitted
    lastSubmittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("NewUser", newUserSchema);
