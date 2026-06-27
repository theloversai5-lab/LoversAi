// models/User.js — Production-ready User model with custom auth
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/* ─── Sub-schemas ─── */
const creditTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ["credit", "debit"], required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  reference: { type: String, default: "ai_generation" },
  remainingBalance: { type: Number, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
});

const weddingProfileSchema = new mongoose.Schema(
  {
    partnerName1: String,
    partnerName2: String,
    weddingDate: Date,
    budget: String,
    guestCount: Number,
    city: String,
    venue: String,
    tradition: String,
    dreamVenue: String,
    completed: { type: Boolean, default: false },
  },
  { _id: false },
);

const vendorProfileSchema = new mongoose.Schema(
  {
    businessName: String,
    category: String,
    experience: String,
    serviceArea: String,
    gstNumber: String,
    bankAccount: String,
    ifscCode: String,
    about: String,
    rating: { type: Number, default: 0 },
    jobsCompleted: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
    pendingPayout: { type: Number, default: 0 },
    portfolio: [
      {
        title: String,
        category: String,
        image: String,
        views: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: false },
);

/* ─── Main user schema ─── */
const userSchema = new mongoose.Schema(
  {
    // ─── Authentication ───
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },

    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Never return password by default
    },

    fullName: {
      type: String,
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    phone: { type: String, trim: true },

    // ─── OAuth ───
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allow null for non-Google users
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    avatar: String,

    // ─── Legacy Firebase support (for migration) ───
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
    },

    // ─── Role & Access ───
    role: {
      type: String,
      enum: ["couple", "planner", "vendor", "admin"],
      default: "couple",
    },

    isAdmin: { type: Boolean, default: false, index: true },
    isBlocked: { type: Boolean, default: false, index: true },
    blockedAt: Date,

    // Vendor verification
    vendorVerificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    vendorVerifiedAt: Date,
    blockedReason: String,

    // ─── Profile ───
    profileCompleted: { type: Boolean, default: false },
    location: String,
    age: Number,
    budget: String,
    position: String,
    interest: String,
    company_name: String,

    // ─── Couple-specific wedding profile ───
    weddingProfile: weddingProfileSchema,

    // ─── Vendor-specific profile ───
    vendorProfile: vendorProfileSchema,

    // ─── Credits & Payments ───
    credits: { type: Number, default: 0, min: 0 },
    creditTransactions: [creditTransactionSchema],
    lastCreditUpdate: { type: Date, default: Date.now },

    plan: {
      type: String,
      enum: ["free", "basic", "premium"],
      default: "free",
    },
    isPro: { type: Boolean, default: false },

    // ─── Lemon Squeezy Integration ───
    lemonCustomerId: { type: String, index: true, sparse: true },
    subscriptionStatus: {
      type: String,
      enum: ["active", "cancelled", "expired", "past_due", "paused", "pending"],
      default: "pending",
    },
    subscriptionRenewsAt: Date,
    lastPaymentStatus: {
      type: String,
      enum: ["success", "failed", "pending", "refunded", null],
      default: null,
    },
    lastPaymentAt: Date,
    checkoutSessionId: String,
    checkoutPlan: {
      type: String,
      enum: ["basic", "premium", null],
      default: null,
    },

    // ─── Analytics ───
    totalCreditsUsed: { type: Number, default: 0 },
    totalPayments: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },

    // ─── Library Purchased Templates ───
    purchasedTemplates: { type: [String], default: [] },

    // ─── Security ───
    lastLoginAt: Date,
    loginCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/* ─── Indexes ─── */
userSchema.index({ role: 1 });
userSchema.index({ subscriptionStatus: 1, isPro: 1 });
userSchema.index({ credits: -1 });

/* ─── Pre-save: Hash password ─── */
userSchema.pre("save", async function () {
  // Only hash if password field is modified
  if (!this.isModified("password") || !this.password) return;
  try {
    // 10 rounds keeps strong security while reducing auth latency.
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err;
  }
});

/* ─── Instance methods ─── */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.addCredits = function (
  amount,
  description,
  reference = "manual_addition",
  metadata = {},
) {
  this.credits += amount;
  this.lastCreditUpdate = new Date();
  this.creditTransactions.push({
    type: "credit",
    amount,
    description,
    reference,
    remainingBalance: this.credits,
    metadata,
  });
  return this.credits;
};

userSchema.methods.deductCredits = function (
  amount,
  description,
  reference = "ai_generation",
  metadata = {},
) {
  if (this.credits < amount) {
    throw new Error(
      `Insufficient credits. Available: ${this.credits}, Required: ${amount}`,
    );
  }
  this.credits -= amount;
  this.lastCreditUpdate = new Date();
  this.totalCreditsUsed = (this.totalCreditsUsed || 0) + amount;
  this.creditTransactions.push({
    type: "debit",
    amount,
    description,
    reference,
    remainingBalance: this.credits,
    metadata,
  });
  return this.credits;
};

/* ─── Virtuals ─── */
userSchema.virtual("hasActiveSubscription").get(function () {
  return this.subscriptionStatus === "active" && this.isPro === true;
});

userSchema.virtual("subscriptionDaysRemaining").get(function () {
  if (!this.subscriptionRenewsAt) return 0;
  const diffTime = new Date(this.subscriptionRenewsAt) - new Date();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

userSchema.virtual("planName").get(function () {
  return this.plan
    ? this.plan.charAt(0).toUpperCase() + this.plan.slice(1)
    : "Free";
});

export default mongoose.model("User", userSchema);
