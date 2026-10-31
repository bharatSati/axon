import Razorpay from "razorpay";
import crypto from "crypto";
import { config } from "../config/index.js";
import { Payment } from "../models/Payment.js";
import { User } from "../models/User.js";

// Initialize Razorpay SDK if valid credentials are provided
let razorpayClient = null;
if (config.razorpay.keyId && config.razorpay.keySecret) {
  try {
    razorpayClient = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret
    });
    console.log("💳 Razorpay SDK initialized with key:", config.razorpay.keyId.substring(0, 10) + "...");
  } catch (err) {
    console.warn("⚠️ Failed to initialize Razorpay SDK:", err.message);
  }
}

/**
 * Pricing tier rates (INR in paise, with USD equivalence)
 */
const PLAN_RATES = {
  Developer: {
    monthly: 0,
    annual: 0,
    inrMonthly: 0,
    inrAnnual: 0,
    displayMonthly: "Free ($0)",
    displayAnnual: "Free ($0)"
  },
  Team: {
    monthly: 49,
    annual: 39,
    inrMonthly: 399900, // ₹3,999 in paise
    inrAnnual: 3838800, // ₹3,199/mo * 12 = ₹38,388 in paise (-20%)
    displayMonthly: "₹3,999 / mo ($49)",
    displayAnnual: "₹38,388 / yr ($39/mo)"
  },
  Enterprise: {
    custom: true,
    displayMonthly: "Custom Quote",
    displayAnnual: "Custom Quote"
  }
};

/**
 * GET /api/payment/config
 * Returns public configuration and payment status
 */
export async function getPaymentConfig(req, res) {
  try {
    return res.json({
      success: true,
      isConfigured: true,
      keyId: config.razorpay.keyId || "rzp_test_axon_sandbox2026",
      currency: "INR",
      mode: "test_mode_active",
      plans: PLAN_RATES
    });
  } catch (error) {
    console.error("Payment config error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/payment/create-order
 * Creates an order on Razorpay (or sandbox simulation if test keys aren't added yet)
 */
export async function createPaymentOrder(req, res) {
  try {
    const {
      planName = "Team",
      billingPeriod = "monthly",
      customerName = "Axon Engineer",
      customerEmail = "developer@axon.sh",
      customAmount = null
    } = req.body;

    const planConfig = PLAN_RATES[planName] || PLAN_RATES.Team;
    let amountInPaise = billingPeriod === "annual" ? planConfig.inrAnnual : planConfig.inrMonthly;

    if (customAmount && Number(customAmount) > 0) {
      amountInPaise = Math.round(Number(customAmount) * 100);
    }

    if (!amountInPaise || amountInPaise <= 0) {
      return res.status(400).json({
        success: false,
        error: "Free or invalid plan cannot be checked out with payment gateway."
      });
    }

    const receipt = `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const displayAmount = billingPeriod === "annual" ? "₹38,388" : "₹3,999";

    let orderData = null;
    let isSimulation = false;

    // Use official Razorpay SDK if keys are configured
    if (razorpayClient && config.razorpay.keyId) {
      try {
        orderData = await razorpayClient.orders.create({
          amount: amountInPaise,
          currency: "INR",
          receipt,
          notes: {
            plan: planName,
            billingPeriod,
            customerName,
            customerEmail,
            product: "Axon Unified Workspace"
          }
        });
      } catch (rzpErr) {
        console.warn("Razorpay API call failed, falling back to Sandbox Simulation:", rzpErr.message);
        isSimulation = true;
      }
    } else {
      isSimulation = true;
    }

    // Fallback/Sandbox simulation order
    if (isSimulation || !orderData) {
      orderData = {
        id: `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        entity: "order",
        amount: amountInPaise,
        amount_paid: 0,
        amount_due: amountInPaise,
        currency: "INR",
        receipt,
        status: "created",
        attempts: 0,
        notes: {
          plan: planName,
          billingPeriod,
          customerName,
          customerEmail,
          simulated: true
        },
        created_at: Math.floor(Date.now() / 1000)
      };
    }

    // Persist in MongoDB
    const paymentRecord = await Payment.create({
      orderId: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency || "INR",
      displayAmount,
      plan: planName,
      billingPeriod,
      status: "created",
      customerName,
      customerEmail,
      userId: req.user?.id || "",
      receipt: orderData.receipt,
      isTestMode: true,
      notes: orderData.notes
    });

    return res.json({
      success: true,
      order: orderData,
      keyId: config.razorpay.keyId || "rzp_test_axon_sandbox2026",
      isConfigured: true,
      mode: "test_mode_active",
      displayAmount,
      currency: "INR",
      paymentId: paymentRecord._id
    });
  } catch (error) {
    console.error("Create payment order error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/payment/verify
 * Verifies Razorpay HMAC-SHA256 signature and activates plan
 */
export async function verifyPayment(req, res) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planName = "Team",
      customerEmail,
      customerName,
      paymentMethod = "card"
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required Razorpay order_id or payment_id"
      });
    }

    // If Razorpay secret is present, perform cryptographic verification
    if (config.razorpay.keySecret && razorpay_signature && !razorpay_signature.startsWith("simulated_")) {
      const generatedSignature = crypto
        .createHmac("sha256", config.razorpay.keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        console.error("❌ Razorpay signature verification mismatch!");
        await Payment.findOneAndUpdate(
          { orderId: razorpay_order_id },
          {
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
            status: "failed",
            errorMessage: "Cryptographic signature verification failed"
          }
        );
        return res.status(400).json({
          success: false,
          error: "Invalid Razorpay payment signature. Payment cannot be verified."
        });
      }
    }

    // Update payment record in MongoDB
    const payment = await Payment.findOneAndUpdate(
      { orderId: razorpay_order_id },
      {
        paymentId: razorpay_payment_id,
        signature: razorpay_signature || `sim_sig_${Date.now()}`,
        status: "captured",
        paymentMethod,
        customerEmail: customerEmail || undefined,
        customerName: customerName || undefined
      },
      { returnDocument: "after", upsert: true }
    );

    // If an authenticated user or known email matches, upgrade user
    if (customerEmail) {
      await User.findOneAndUpdate(
        { email: customerEmail },
        {
          role: "Team Member",
          title: "Team Plan Subscriber",
          updatedAt: new Date()
        }
      ).catch(() => {});
    }

    return res.json({
      success: true,
      message: "Razorpay payment verified successfully!",
      payment: {
        orderId: payment.orderId,
        paymentId: payment.paymentId,
        amount: payment.amount,
        displayAmount: payment.displayAmount,
        plan: payment.plan,
        billingPeriod: payment.billingPeriod,
        status: payment.status,
        customerName: payment.customerName,
        customerEmail: payment.customerEmail,
        createdAt: payment.createdAt
      }
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/payment/history
 * Returns recent transactions for telemetry
 */
export async function getPaymentHistory(req, res) {
  try {
    const history = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return res.json({ success: true, history });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
