import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Copy,
  Download,
  Building,
  Zap,
  Check,
  RefreshCw
} from "lucide-react";
import { API_BASE } from "../config/api.js";
import { useAuth } from "../context/AuthContext.jsx";

// Helper to load Razorpay official script dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function PaymentModal({ isOpen, onClose, initialPlan = "Team", initialAnnual = false }) {
  const { user, setCurrentView } = useAuth();

  const [plan, setPlan] = useState(initialPlan);
  const [annual, setAnnual] = useState(initialAnnual);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [step, setStep] = useState("checkout"); // checkout | processing | simulator | success | failure
  const [errorMessage, setErrorMessage] = useState("");
  const [gatewayConfig, setGatewayConfig] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [verifiedPayment, setVerifiedPayment] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPlan(initialPlan);
      setAnnual(initialAnnual);
      setStep("checkout");
      setErrorMessage("");
      setVerifiedPayment(null);
      if (user) {
        setCustomerName(user.name || user.username || "");
        setCustomerEmail(user.email || `${user.username || "dev"}@axon.sh`);
      } else {
        setCustomerName("Axon Engineer");
        setCustomerEmail("engineer@company.com");
      }
    }
  }, [isOpen, initialPlan, initialAnnual, user]);

  // Fetch gateway configuration on mount
  useEffect(() => {
    if (!isOpen) return;

    fetch(`${API_BASE}/payment/config`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGatewayConfig(data);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch payment config, using defaults:", err.message);
      });

    // Preload Razorpay Checkout script in background
    loadRazorpayScript();
  }, [isOpen]);

  if (!isOpen) return null;

  // Plan pricing lookup
  const isTeam = plan === "Team";
  const isDeveloper = plan === "Developer";
  const isEnterprise = plan === "Enterprise";

  const priceFormatted = annual ? "₹38,388 / year ($39/mo)" : "₹3,999 / month ($49/mo)";
  const priceAmount = annual ? 38388 : 3999;

  // Initiate Razorpay Order & Checkout
  const handleStartPayment = async () => {
    if (isDeveloper) {
      // Free plan activated
      setStep("success");
      setVerifiedPayment({
        plan: "Developer",
        orderId: "free_dev_tier",
        paymentId: "none_free_tier",
        displayAmount: "₹0 (Free Forever)",
        customerName: customerName || "Axon Developer",
        customerEmail: customerEmail || "developer@axon.sh",
        createdAt: new Date().toISOString()
      });
      return;
    }

    if (isEnterprise) {
      // Enterprise inquiry submission
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setStep("success");
        setVerifiedPayment({
          plan: "Enterprise (Dedicated VPC)",
          orderId: `ent_inq_${Date.now()}`,
          paymentId: "architecture_concierge_assigned",
          displayAmount: "Custom Enterprise SLA",
          customerName,
          customerEmail,
          createdAt: new Date().toISOString()
        });
      }, 700);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      // 1. Create order on Axon Server
      const res = await fetch(`${API_BASE}/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planName: plan,
          billingPeriod: annual ? "annual" : "monthly",
          customerName,
          customerEmail
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to initiate payment order");
      }

      setActiveOrder(data.order);
      setLoading(false);

      const isLiveRazorpay = data.isConfigured && window.Razorpay;

      if (isLiveRazorpay) {
        // Open Official Razorpay Checkout Dialog
        const options = {
          key: data.keyId,
          amount: data.order.amount,
          currency: data.order.currency || "INR",
          name: "Axon Unified Workspace",
          description: `Subscription: ${plan} Plan (${annual ? "Annual" : "Monthly"})`,
          order_id: data.order.id,
          prefill: {
            name: customerName,
            email: customerEmail,
            contact: "9999999999"
          },
          theme: {
            color: "#c8ff3d"
          },
          handler: async function (response) {
            await handleVerifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentMethod: "razorpay_checkout"
            });
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            }
          }
        };

        try {
          const rzp = new window.Razorpay(options);
          rzp.on("payment.failed", function (resp) {
            setErrorMessage(resp.error?.description || "Payment was rejected by gateway");
            setStep("failure");
          });
          rzp.open();
        } catch (sdkErr) {
          console.warn("Razorpay popup launch failed, opening sandbox simulator:", sdkErr);
          setStep("simulator");
        }
      } else {
        // Razorpay API Sandbox Simulation Mode
        setStep("simulator");
      }
    } catch (err) {
      console.error("Payment initiation failed:", err);
      setLoading(false);
      setErrorMessage(err.message || "Failed to reach Axon payment service");
      setStep("failure");
    }
  };

  // Verify Payment on Backend
  const handleVerifyPayment = async ({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    paymentMethod = "card"
  }) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/payment/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          planName: plan,
          customerEmail,
          customerName,
          paymentMethod
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Payment verification failed");
      }

      setVerifiedPayment(data.payment);
      setStep("success");
    } catch (err) {
      setErrorMessage(err.message || "Verification failed");
      setStep("failure");
    } finally {
      setLoading(false);
    }
  };

  // Instant Simulation Triggers
  const handleSimulatedSuccess = () => {
    if (!activeOrder) return;
    handleVerifyPayment({
      razorpay_order_id: activeOrder.id,
      razorpay_payment_id: `pay_test_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      razorpay_signature: `simulated_sig_${Date.now()}`,
      paymentMethod: "razorpay_test_card"
    });
  };

  const handleSimulatedFailure = () => {
    setErrorMessage("Card declined: Test simulation failure trigger requested.");
    setStep("failure");
  };

  // Copy Receipt to Clipboard
  const handleCopyReceipt = () => {
    if (!verifiedPayment) return;
    const text = `--- AXON PAYMENT RECEIPT ---
Plan: ${verifiedPayment.plan}
Amount: ${verifiedPayment.displayAmount}
Order ID: ${verifiedPayment.orderId}
Payment ID: ${verifiedPayment.paymentId}
Customer: ${verifiedPayment.customerName} (${verifiedPayment.customerEmail})
Status: VERIFIED & ACTIVE
Date: ${new Date(verifiedPayment.createdAt).toLocaleString()}
--- Axon Unified Workspace Inc. ---`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="auth-modal-backdrop" onClick={onClose}>
        <motion.div
          className="auth-modal-dialog payment-modal-dialog"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 18 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Close button */}
          <button
            type="button"
            className="auth-modal-close"
            onClick={onClose}
            aria-label="Close payment modal"
          >
            <X size={18} />
          </button>

          {/* STEP 1: CHECKOUT REVIEW */}
          {step === "checkout" && (
            <div className="payment-step-view">
              <div className="payment-modal-header">
                <div className="payment-icon-badge">
                  <CreditCard size={24} />
                </div>
                <div className="mono-label payment-security-tag">
                  <ShieldCheck size={13} />
                  RAZORPAY SECURE • 256-BIT ENCRYPTION
                </div>
                <h3>Upgrade to {plan} Edition</h3>
                <p>
                  Accelerate your engineering workflow with unified real-time telemetry, team workspace,
                  and instant Groq &amp; RAG intelligence.
                </p>
              </div>

              {/* Plan Switcher Pills */}
              <div className="payment-plan-pill-group">
                {["Developer", "Team", "Enterprise"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`payment-plan-pill ${plan === p ? "is-active" : ""}`}
                    onClick={() => setPlan(p)}
                  >
                    {p}
                    {p === "Team" && <span className="pill-star">★ POPULAR</span>}
                  </button>
                ))}
              </div>

              {/* Order Summary Box */}
              <div className="payment-summary-box">
                <div className="summary-row">
                  <span className="summary-label">Selected Tier</span>
                  <span className="summary-val highlight">{plan} Edition</span>
                </div>

                {isTeam && (
                  <>
                    <div className="summary-row">
                      <span className="summary-label">Billing Cycle</span>
                      <div className="billing-cycle-toggle">
                        <button
                          type="button"
                          className={!annual ? "is-active" : ""}
                          onClick={() => setAnnual(false)}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          className={annual ? "is-active" : ""}
                          onClick={() => setAnnual(true)}
                        >
                          Annual (-20%)
                        </button>
                      </div>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Amount Payable (Test)</span>
                      <span className="summary-val price-val">{priceFormatted}</span>
                    </div>
                  </>
                )}

                {isDeveloper && (
                  <div className="summary-row">
                    <span className="summary-label">Cost</span>
                    <span className="summary-val highlight">Free Forever ($0)</span>
                  </div>
                )}

                {isEnterprise && (
                  <div className="summary-row">
                    <span className="summary-label">Deployment</span>
                    <span className="summary-val highlight">Dedicated VPC &amp; Custom SLA</span>
                  </div>
                )}

                <div className="summary-divider" />

                <div className="summary-row features-summary">
                  <span className="summary-label">Key Inclusions</span>
                  <div className="summary-perks-list">
                    {isTeam && (
                      <>
                        <span><Check size={12} /> Unlimited Repos &amp; Workspaces</span>
                        <span><Check size={12} /> Project Brain Local Vector RAG</span>
                        <span><Check size={12} /> Real-time Analytics &amp; Time Machine</span>
                        <span><Check size={12} /> 14-day risk-free trial</span>
                      </>
                    )}
                    {isDeveloper && (
                      <>
                        <span><Check size={12} /> Local Client + Server Stack</span>
                        <span><Check size={12} /> Standard REST Endpoints</span>
                        <span><Check size={12} /> No card required</span>
                      </>
                    )}
                    {isEnterprise && (
                      <>
                        <span><Check size={12} /> Custom Microservices &amp; VPC</span>
                        <span><Check size={12} /> SSO, SAML, RBAC &amp; Audit Logs</span>
                        <span><Check size={12} /> Dedicated Solutions Architect</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Inputs */}
              <div className="payment-inputs-grid">
                <div className="payment-field">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="payment-field">
                  <label>Billing Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Test Mode Badge */}
              <div className="payment-mode-note">
                <span className="badge-pulse" />
                <span>
                  Razorpay Testing API Sandbox Active. Real credit cards will NOT be charged.
                </span>
              </div>

              {/* CTA Button */}
              <div className="payment-action-buttons">
                <button
                  type="button"
                  className="button button--wide button--lime payment-submit-btn"
                  onClick={handleStartPayment}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="spin-icon" />
                      Contacting Gateway...
                    </>
                  ) : isDeveloper ? (
                    <>
                      Activate Free Tier <ArrowRight size={16} />
                    </>
                  ) : isEnterprise ? (
                    <>
                      Request Architecture Demo <Building size={16} />
                    </>
                  ) : (
                    <>
                      Proceed with Razorpay (₹{priceAmount}) <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: RAZORPAY TEST SIMULATOR (If testing directly without live key) */}
          {step === "simulator" && activeOrder && (
            <div className="payment-step-view simulator-step">
              <div className="payment-modal-header">
                <div className="payment-icon-badge simulator-badge">
                  <Zap size={24} />
                </div>
                <div className="mono-label payment-security-tag">
                  <Sparkles size={13} />
                  RAZORPAY TEST ENVIRONMENT SIMULATOR
                </div>
                <h3>Complete Test Payment</h3>
                <p>
                  Order <span className="code-tag">{activeOrder.id}</span> generated for{" "}
                  <strong>{plan} Edition</strong> ({annual ? "₹38,388" : "₹3,999"}).
                </p>
              </div>

              {/* Razorpay Test Credentials Card */}
              <div className="test-credentials-card">
                <div className="test-card-head">
                  <span className="mono-label">RAZORPAY TEST CARD</span>
                  <span className="test-visa-badge">VISA TEST</span>
                </div>
                <div className="test-card-number">4111 •••• •••• 1111</div>
                <div className="test-card-meta">
                  <div>
                    <small>EXPIRY</small>
                    <span>12/32</span>
                  </div>
                  <div>
                    <small>CVV</small>
                    <span>123</span>
                  </div>
                  <div>
                    <small>TEST UPI</small>
                    <span>success@razorpay</span>
                  </div>
                </div>
              </div>

              {/* Simulation Options */}
              <div className="simulation-actions-grid">
                <button
                  type="button"
                  className="button button--lime sim-btn-success"
                  onClick={handleSimulatedSuccess}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="spin-icon" /> Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Simulate 1-Click Success
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="button button--outline sim-btn-failure"
                  onClick={handleSimulatedFailure}
                  disabled={loading}
                >
                  <AlertCircle size={16} /> Simulate Decline / Failure
                </button>
              </div>

              <div className="simulator-tip-box">
                <span className="mono-label">💡 DEVELOPER NOTE</span>
                <p>
                  To switch to Razorpay&apos;s official popup overlay, add your test keys in{" "}
                  <code>server/.env</code>: <code>RAZORPAY_KEY_ID=rzp_test_...</code> &amp;{" "}
                  <code>RAZORPAY_KEY_SECRET=...</code>.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION & RECEIPT */}
          {step === "success" && verifiedPayment && (
            <div className="payment-step-view success-step">
              <div className="payment-success-badge">
                <CheckCircle2 size={42} />
              </div>

              <div className="mono-label success-title-tag">
                TRANSACTION VERIFIED &amp; ACTIVE
              </div>
              <h3>Welcome to {verifiedPayment.plan}!</h3>
              <p className="success-subtitle">
                Your payment was confirmed and your unified workspace privileges are now active.
              </p>

              {/* Receipt Card */}
              <div className="payment-receipt-card">
                <div className="receipt-row">
                  <span>Order ID</span>
                  <span className="mono-val">{verifiedPayment.orderId}</span>
                </div>
                <div className="receipt-row">
                  <span>Payment ID</span>
                  <span className="mono-val">{verifiedPayment.paymentId}</span>
                </div>
                <div className="receipt-row">
                  <span>Plan</span>
                  <span className="highlight-val">{verifiedPayment.plan} Edition</span>
                </div>
                <div className="receipt-row">
                  <span>Amount Paid</span>
                  <span className="price-val">{verifiedPayment.displayAmount || "₹3,999"}</span>
                </div>
                <div className="receipt-row">
                  <span>Billing Account</span>
                  <span className="mono-val">{verifiedPayment.customerEmail}</span>
                </div>
                <div className="receipt-row">
                  <span>Gateway Status</span>
                  <span className="status-badge-captured">CAPTURED (TEST MODE)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="success-actions-row">
                <button
                  type="button"
                  className="button button--outline"
                  onClick={handleCopyReceipt}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied!" : "Copy Receipt"}
                </button>
                <button
                  type="button"
                  className="button button--lime"
                  onClick={() => {
                    onClose();
                    setCurrentView("dashboard");
                  }}
                >
                  Launch Workspace <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: FAILURE STATE */}
          {step === "failure" && (
            <div className="payment-step-view failure-step">
              <div className="payment-failed-badge">
                <AlertCircle size={40} />
              </div>
              <div className="mono-label failure-title-tag">PAYMENT FAILED OR CANCELLED</div>
              <h3>Transaction Incomplete</h3>
              <p className="failure-reason">
                {errorMessage || "The transaction was aborted or rejected by the payment gateway."}
              </p>

              <div className="failure-actions">
                <button
                  type="button"
                  className="button button--lime"
                  onClick={() => setStep("checkout")}
                >
                  <RefreshCw size={16} /> Try Again
                </button>
                <button
                  type="button"
                  className="button button--outline"
                  onClick={onClose}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
