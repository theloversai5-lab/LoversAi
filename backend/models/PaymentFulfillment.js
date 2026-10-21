import mongoose from "mongoose";

// One row per Razorpay payment; the unique paymentId makes fulfillment idempotent
// across /verify retries and the payment.captured webhook.
const paymentFulfillmentSchema = new mongoose.Schema(
  {
    paymentId: { type: String, required: true, unique: true },
    orderId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    planId: { type: String, required: true },
    amount: { type: Number, required: true },
    source: { type: String, enum: ["verify", "webhook"], required: true },
  },
  { timestamps: true }
);

export default mongoose.models.PaymentFulfillment ||
  mongoose.model("PaymentFulfillment", paymentFulfillmentSchema);
