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
  Building,
  Check,
  RefreshCw,
  QrCode,
  Smartphone,
  Landmark,
  Zap,
  Lock,
  ChevronRight
} from "lucide-react";
import { API_BASE } from "../config/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function PaymentModal({
  isOpen,
  onClose,
  initialPlan = "Team",
  initialAnnual = false
}) {
  const { user, setCurrentView } = useAuth();

  // Modal navigation & state
  const [step, setStep] = useState("gateway"); // gateway | otp | success | failure
  const [plan, setPlan] = useState(initialPlan);
  const [annual, setAnnual] = useState(initialAnnual);
  const [selectedMethod, setSelectedMethod] = useState("card"); // card | upi | netbanking | instant

  // Customer & order info
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [activeOrder, setActiveOrder] = useState(null);
  const [verifiedPayment, setVerifiedPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Card form state
  const [cardNumber, setCardNumber] = useState("4111 1111 1111 1111");
  const [cardExpiry, setCardExpiry] = useState("12/32");
  const [cardCvv, setCardCvv] = useState("123");
  const [cardHolder, setCardHolder] = useState("Axon Engineer");

  // UPI form state
  const [upiId, setUpiId] = useState("success@razorpay");

  // Netbanking bank
  const [selectedBank, setSelectedBank] = useState("HDFC");

  // OTP state
  const [otpDigits, setOtpDigits] = useState(["1", "2", "3", "4", "5", "6"]);
  const [otpTimer, setOtpTimer] = useState(24);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPlan(initialPlan);
      setAnnual(initialAnnual);
      setStep("gateway");
      setSelectedMethod("card");
      setErrorMessage("");
      setVerifiedPayment(null);
      setOtpTimer(24);

      if (user) {
        setCustomerName(user.name || user.username || "Bharat Sati");
        setCustomerEmail(user.email || `${user.username || "bharat"}@axon.sh`);
        setCardHolder(user.name || "Bharat Sati");
      } else {
        setCustomerName("Axon Engineer");
        setCustomerEmail("engineer@axon.sh");
        setCardHolder("Axon Engineer");
      }
    }
  }, [isOpen, initialPlan, initialAnnual, user]);

  // OTP countdown timer
  useEffect(() => {
    if (step === "otp" && otpTimer > 0) {
      const interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [step, otpTimer]);

  if (!isOpen) return null;

  const isDeveloper = plan === "Developer";
  const isEnterprise = plan === "Enterprise";

  const priceAmount = annual ? 38388 : 3999;
  const priceDisplay = annual ? "₹38,388" : "₹3,999";
  const periodDisplay = annual ? "/ year (20% off)" : "/ month";

  // Initiate Order and Proceed to OTP
  const handleProceedToOtp = async () => {
    if (isDeveloper) {
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
      }, 600);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
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
        throw new Error(data.error || "Failed to create Razorpay test order");
      }

      setActiveOrder(data.order);
      setLoading(false);

      if (selectedMethod === "instant") {
        // Fast-track 1-click test checkout
        await executePaymentCapture(data.order.id, "razorpay_instant_test");
      } else {
        // Show authentic Bank OTP screen
        setOtpTimer(24);
        setStep("otp");
      }
    } catch (err) {
      console.error("Order initiation error:", err);
      setLoading(false);
      setErrorMessage(err.message || "Failed to contact Razorpay service");
      setStep("failure");
    }
  };

  // Submit Bank OTP & Capture in Backend
  const handleVerifyOtp = async () => {
    if (!activeOrder) return;
    await executePaymentCapture(activeOrder.id, `razorpay_${selectedMethod}`);
  };

  // Execute verification & capture on server
  const executePaymentCapture = async (orderId, method) => {
    setLoading(true);
    try {
      const paymentId = `pay_test_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      const signature = `rzp_test_sig_${Date.now()}`;

      const res = await fetch(`${API_BASE}/payment/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          planName: plan,
          customerEmail,
          customerName,
          paymentMethod: method
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

  // Copy Receipt to Clipboard
  const handleCopyReceipt = () => {
    if (!verifiedPayment) return;
    const text = `--- AXON SECURE PAYMENT RECEIPT ---
Plan: ${verifiedPayment.plan} Edition
Amount: ${verifiedPayment.displayAmount || priceDisplay}
Order ID: ${verifiedPayment.orderId}
Payment ID: ${verifiedPayment.paymentId}
Gateway: Razorpay Test API (Captured)
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
          className="auth-modal-dialog razorpay-checkout-dialog"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 18 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
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

          {/* ============================================================== */}
          {/* VIEW 1: AUTHENTIC RAZORPAY CHECKOUT INTERFACE                  */}
          {/* ============================================================== */}
          {step === "gateway" && (
            <div className="rzp-checkout-shell">
              {/* Razorpay Top Header Bar */}
              <div className="rzp-brand-header">
                <div className="rzp-merchant-info">
                  <div className="rzp-brand-logo">
                    <span className="rzp-lightning">⚡</span>
                  </div>
                  <div>
                    <h4>Axon Unified Workspace</h4>
                    <span className="rzp-subline">
                      <Lock size={10} /> Razorpay Trusted Business
                    </span>
                  </div>
                </div>

                <div className="rzp-price-tag">
                  <span className="rzp-amount">{priceDisplay}</span>
                  <span className="rzp-period">{periodDisplay}</span>
                  <span className="rzp-testmode-badge">TEST MODE</span>
                </div>
              </div>

              {/* Plan Switcher Pills */}
              <div className="rzp-plan-selector">
                {["Developer", "Team", "Enterprise"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`rzp-plan-tab ${plan === p ? "is-active" : ""}`}
                    onClick={() => setPlan(p)}
                  >
                    {p}
                    {p === "Team" && <span className="rzp-popular-dot">★ POPULAR</span>}
                  </button>
                ))}
              </div>

              {/* Main Gateway Split View */}
              <div className="rzp-methods-container">
                {/* Method Navigation Sidebar */}
                <div className="rzp-methods-nav">
                  <button
                    type="button"
                    className={`rzp-method-btn ${selectedMethod === "card" ? "is-active" : ""}`}
                    onClick={() => setSelectedMethod("card")}
                  >
                    <CreditCard size={15} />
                    <span>Cards (Test)</span>
                    <ChevronRight size={12} className="method-arrow" />
                  </button>

                  <button
                    type="button"
                    className={`rzp-method-btn ${selectedMethod === "upi" ? "is-active" : ""}`}
                    onClick={() => setSelectedMethod("upi")}
                  >
                    <QrCode size={15} />
                    <span>UPI / QR</span>
                    <ChevronRight size={12} className="method-arrow" />
                  </button>

                  <button
                    type="button"
                    className={`rzp-method-btn ${selectedMethod === "netbanking" ? "is-active" : ""}`}
                    onClick={() => setSelectedMethod("netbanking")}
                  >
                    <Landmark size={15} />
                    <span>Netbanking</span>
                    <ChevronRight size={12} className="method-arrow" />
                  </button>

                  <button
                    type="button"
                    className={`rzp-method-btn ${selectedMethod === "instant" ? "is-active" : ""}`}
                    onClick={() => setSelectedMethod("instant")}
                  >
                    <Zap size={15} />
                    <span>1-Click Test Pay</span>
                    <ChevronRight size={12} className="method-arrow" />
                  </button>
                </div>

                {/* Method Content Panel */}
                <div className="rzp-method-content">
                  {/* TAB 1: CARD PAYMENT */}
                  {selectedMethod === "card" && (
                    <div className="rzp-card-view">
                      <div className="rzp-virtual-card">
                        <div className="card-top">
                          <span className="card-chip" />
                          <span className="card-brand">VISA TEST</span>
                        </div>
                        <div className="card-digits">{cardNumber}</div>
                        <div className="card-bottom">
                          <div>
                            <small>CARD HOLDER</small>
                            <span>{cardHolder}</span>
                          </div>
                          <div>
                            <small>EXPIRES</small>
                            <span>{cardExpiry}</span>
                          </div>
                          <div>
                            <small>CVV</small>
                            <span>•••</span>
                          </div>
                        </div>
                      </div>

                      <div className="rzp-fields-row">
                        <div className="rzp-field">
                          <label>Card Number</label>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            placeholder="4111 1111 1111 1111"
                          />
                        </div>
                      </div>

                      <div className="rzp-fields-row two-col">
                        <div className="rzp-field">
                          <label>Expiry (MM/YY)</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="12/32"
                          />
                        </div>
                        <div className="rzp-field">
                          <label>CVV / CVC</label>
                          <input
                            type="password"
                            maxLength={4}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="123"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: UPI / QR CODE */}
                  {selectedMethod === "upi" && (
                    <div className="rzp-upi-view">
                      <div className="rzp-qr-wrapper">
                        {/* Authentic Interactive QR Code Graphic */}
                        <svg className="rzp-qr-code" viewBox="0 0 100 100">
                          <rect width="100" height="100" fill="#090b08" />
                          {/* Corner Squares */}
                          <rect x="10" y="10" width="24" height="24" fill="#c8ff3d" rx="2" />
                          <rect x="14" y="14" width="16" height="16" fill="#090b08" />
                          <rect x="18" y="18" width="8" height="8" fill="#c8ff3d" />

                          <rect x="66" y="10" width="24" height="24" fill="#c8ff3d" rx="2" />
                          <rect x="70" y="14" width="16" height="16" fill="#090b08" />
                          <rect x="74" y="18" width="8" height="8" fill="#c8ff3d" />

                          <rect x="10" y="66" width="24" height="24" fill="#c8ff3d" rx="2" />
                          <rect x="14" y="70" width="16" height="16" fill="#090b08" />
                          <rect x="18" y="74" width="8" height="8" fill="#c8ff3d" />

                          {/* Matrix Pattern Dots */}
                          <rect x="42" y="12" width="6" height="6" fill="#c8ff3d" />
                          <rect x="52" y="18" width="6" height="6" fill="#c8ff3d" />
                          <rect x="44" y="28" width="6" height="6" fill="#c8ff3d" />
                          <rect x="14" y="44" width="6" height="6" fill="#c8ff3d" />
                          <rect x="24" y="52" width="6" height="6" fill="#c8ff3d" />
                          <rect x="40" y="44" width="18" height="18" fill="#090b08" />
                          <circle cx="49" cy="53" r="6" fill="#c8ff3d" />
                          <rect x="68" y="46" width="6" height="6" fill="#c8ff3d" />
                          <rect x="80" y="54" width="6" height="6" fill="#c8ff3d" />
                          <rect x="42" y="72" width="6" height="6" fill="#c8ff3d" />
                          <rect x="54" y="80" width="6" height="6" fill="#c8ff3d" />
                          <rect x="72" y="74" width="6" height="6" fill="#c8ff3d" />
                          <rect x="82" y="82" width="6" height="6" fill="#c8ff3d" />
                        </svg>

                        <div className="rzp-qr-caption">
                          <span>Scan with any UPI App</span>
                          <small>GPay • PhonePe • Paytm • CRED</small>
                        </div>
                      </div>

                      <div className="rzp-field">
                        <label>Or Pay with Test UPI ID</label>
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="success@razorpay"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 3: NETBANKING */}
                  {selectedMethod === "netbanking" && (
                    <div className="rzp-netbanking-view">
                      <label className="rzp-field-label">SELECT POPULAR BANK</label>
                      <div className="rzp-banks-grid">
                        {[
                          { id: "HDFC", name: "HDFC Bank" },
                          { id: "ICICI", name: "ICICI Bank" },
                          { id: "SBI", name: "State Bank of India" },
                          { id: "AXIS", name: "Axis Bank" },
                          { id: "KOTAK", name: "Kotak Mahindra" }
                        ].map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            className={`rzp-bank-card ${selectedBank === b.id ? "is-active" : ""}`}
                            onClick={() => setSelectedBank(b.id)}
                          >
                            <Landmark size={18} />
                            <span>{b.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: 1-CLICK INSTANT PAY */}
                  {selectedMethod === "instant" && (
                    <div className="rzp-instant-view">
                      <div className="rzp-instant-card">
                        <Zap size={28} className="instant-icon" />
                        <h4>One-Click Sandbox Authorization</h4>
                        <p>
                          Instantly authorize and capture <strong>{priceDisplay}</strong> in
                          Razorpay test mode without entering credentials or waiting for OTP.
                        </p>
                        <span className="instant-badge">✓ Real-time MongoDB Verification</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Contact Bar */}
              <div className="rzp-customer-strip">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your Name"
                  title="Cardholder Name"
                />
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="name@company.com"
                  title="Receipt Email"
                />
              </div>

              {/* Pay Now Button */}
              <div className="rzp-pay-footer">
                <button
                  type="button"
                  className="button button--lime rzp-submit-button"
                  onClick={handleProceedToOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="spin-icon" /> Contacting Gateway...
                    </>
                  ) : (
                    <>
                      <Lock size={14} /> Pay {priceDisplay} Securely <ArrowRight size={15} />
                    </>
                  )}
                </button>

                <div className="rzp-footer-trust">
                  <span>Secured by 256-bit SSL</span>
                  <span>•</span>
                  <span>Razorpay Test Sandbox Active</span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW 2: AUTHENTIC RAZORPAY BANK OTP SCREEN                     */}
          {/* ============================================================== */}
          {step === "otp" && (
            <div className="rzp-otp-shell">
              <div className="otp-bank-header">
                <div className="otp-bank-logo">
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <h4>Verified by VISA / Razorpay</h4>
                  <span>State Bank of India 3D Secure Portal</span>
                </div>
              </div>

              <div className="otp-prompt-box">
                <p>
                  A 6-digit One Time Password (OTP) has been dispatched to your registered mobile
                  number ending in <strong>••••9876</strong>.
                </p>
                <div className="otp-amount-note">
                  <span>Merchant: <strong>Axon Workspace Inc.</strong></span>
                  <span>Amount: <strong>{priceDisplay}</strong></span>
                </div>
              </div>

              {/* 6-Digit OTP Input Boxes */}
              <div className="otp-boxes-row">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    className="otp-digit-box"
                    value={digit}
                    onChange={(e) => {
                      const newDigits = [...otpDigits];
                      newDigits[idx] = e.target.value;
                      setOtpDigits(newDigits);
                    }}
                  />
                ))}
              </div>

              <div className="otp-timer-row">
                <span>
                  Resend OTP in <strong>0:{otpTimer < 10 ? `0${otpTimer}` : otpTimer}</strong>
                </span>
                <button
                  type="button"
                  className="resend-btn"
                  onClick={() => setOtpTimer(30)}
                  disabled={otpTimer > 0}
                >
                  Resend
                </button>
              </div>

              {/* Actions */}
              <div className="otp-actions-row">
                <button
                  type="button"
                  className="button button--lime otp-submit-btn"
                  onClick={handleVerifyOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="spin-icon" /> Capturing Payment...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Authenticate &amp; Pay {priceDisplay}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="button button--outline"
                  onClick={() => setStep("gateway")}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW 3: SUCCESSFUL RECEIPT & WORKSPACE ACTIVATION              */}
          {/* ============================================================== */}
          {step === "success" && verifiedPayment && (
            <div className="rzp-receipt-shell">
              <div className="receipt-success-badge">
                <CheckCircle2 size={42} />
              </div>

              <div className="receipt-tag-mono">PAYMENT CAPTURED &amp; VERIFIED</div>
              <h3>Welcome to {verifiedPayment.plan}!</h3>
              <p className="receipt-sub">
                Your transaction was approved and your Axon privileges are now live.
              </p>

              <div className="receipt-sheet">
                <div className="receipt-row">
                  <span>Order ID</span>
                  <span className="mono-code">{verifiedPayment.orderId}</span>
                </div>
                <div className="receipt-row">
                  <span>Payment ID</span>
                  <span className="mono-code">{verifiedPayment.paymentId}</span>
                </div>
                <div className="receipt-row">
                  <span>Subscribed Plan</span>
                  <span className="plan-name">{verifiedPayment.plan} Edition</span>
                </div>
                <div className="receipt-row">
                  <span>Amount Paid</span>
                  <span className="amount-highlight">
                    {verifiedPayment.displayAmount || priceDisplay}
                  </span>
                </div>
                <div className="receipt-row">
                  <span>Billing Account</span>
                  <span className="mono-code">{verifiedPayment.customerEmail}</span>
                </div>
                <div className="receipt-row">
                  <span>Gateway Status</span>
                  <span className="rzp-captured-pill">CAPTURED • RAZORPAY TEST</span>
                </div>
              </div>

              <div className="receipt-actions">
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

          {/* ============================================================== */}
          {/* VIEW 4: ERROR / DECLINED STATE                                 */}
          {/* ============================================================== */}
          {step === "failure" && (
            <div className="rzp-receipt-shell failure">
              <div className="receipt-failed-badge">
                <AlertCircle size={40} />
              </div>
              <div className="receipt-tag-mono failed">PAYMENT DECLINED</div>
              <h3>Transaction Incomplete</h3>
              <p className="receipt-sub">
                {errorMessage || "The transaction could not be authorized by the payment gateway."}
              </p>

              <div className="receipt-actions">
                <button
                  type="button"
                  className="button button--lime"
                  onClick={() => setStep("gateway")}
                >
                  <RefreshCw size={16} /> Try Again
                </button>
                <button
                  type="button"
                  className="button button--outline"
                  onClick={onClose}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
