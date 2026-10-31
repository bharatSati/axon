import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    paymentId: { type: String, default: "", index: true },
    signature: { type: String, default: "" },
    amount: { type: Number, required: true }, // in paise (e.g. 399900 = ₹3,999)
    currency: { type: String, default: "INR" },
    displayAmount: { type: String, default: "" }, // formatted display e.g. "₹3,999" or "$49"
    plan: { type: String, required: true, default: "Team" },
    billingPeriod: { type: String, enum: ["monthly", "annual"], default: "monthly" },
    status: {
      type: String,
      enum: ["created", "captured", "failed", "refunded"],
      default: "created",
      index: true
    },
    customerName: { type: String, default: "" },
    customerEmail: { type: String, default: "" },
    userId: { type: String, default: "" },
    receipt: { type: String, default: "" },
    isTestMode: { type: Boolean, default: true },
    paymentMethod: { type: String, default: "card" },
    errorMessage: { type: String, default: "" },
    notes: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true
  }
);

export const Payment = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
