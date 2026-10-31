import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";
import Tilt3D from "./Tilt3D";
import Magnetic from "./Magnetic";
import { scrollToSection } from "../hooks/useSmoothScroll";

const plans = [
  {
    name: "Developer",
    tagline: "For individual engineers and modular development.",
    monthly: 0,
    annual: 0,
    cta: "Start building free",
    features: [
      "Modular client + server stack",
      "Full docs & architecture guides",
      "Local development environment",
      "Standard REST endpoints",
      "Community support",
    ],
    note: "Free forever. No card required.",
  },
  {
    name: "Team",
    tagline: "For teams unifying workflows and data pipelines.",
    monthly: 49,
    annual: 39,
    cta: "Start 14-day trial",
    popular: true,
    features: [
      "Unified workspace portal",
      "Unlimited API routes & modules",
      "External service integrations",
      "Real-time telemetry & logs",
      "Shared workspace synchronization",
      "Priority engineering support",
    ],
    note: "Everything in Developer, plus team scale.",
  },
  {
    name: "Enterprise",
    tagline: "For organizations requiring custom scale and dedicated VPC.",
    monthly: null,
    annual: null,
    cta: "Contact architecture team",
    features: [
      "Custom microservices & adapters",
      "Dedicated VPC / on-premise deployment",
      "SSO, RBAC & compliance audit logs",
      "Custom external connectors",
      "Dedicated solutions architect",
      "99.99% enterprise uptime SLA",
    ],
    note: "Engineered around your security posture.",
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section className="section pricing-section" id="pricing">
      <div className="pricing-glow" />
      <div className="container">
        <SectionHeading
          eyebrow="PRICING"
          index="05"
          align="center"
          title={
            <>
              Priced for <em>momentum.</em>
            </>
          }
          description="Start building modularly, upgrade to team collaboration, or deploy enterprise-grade infrastructure. Transparent and predictable."
        />

        <Reveal className="pricing-toggle-wrap" delay={0.15}>
          <div className="pricing-toggle" role="group" aria-label="Billing period">
            <button
              type="button"
              className={!annual ? "is-active" : ""}
              onClick={() => setAnnual(false)}
              aria-pressed={!annual}
            >
              {!annual && <motion.span className="toggle-bg" layoutId="billing-pill" />}
              <span>Monthly</span>
            </button>
            <button
              type="button"
              className={annual ? "is-active" : ""}
              onClick={() => setAnnual(true)}
              aria-pressed={annual}
            >
              {annual && <motion.span className="toggle-bg" layoutId="billing-pill" />}
              <span>Annual</span>
              <em>−20%</em>
            </button>
          </div>
        </Reveal>

        <div className="pricing-grid">
          {plans.map((plan, index) => {
            const price = annual ? plan.annual : plan.monthly;
            return (
              <motion.article
                className="tilt-slot pricing-slot"
                key={plan.name}
                initial={{ opacity: 0, y: 38 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.85, delay: index * 0.09, ease: [0.16, 1, 0.3, 1] }}
              >
                <Tilt3D
                  className={`pricing-card ${plan.popular ? "pricing-card--popular" : ""}`}
                  max={8}
                >
                  {plan.popular && (
                    <div className="popular-badge">
                      <Sparkles size={12} />
                      MOST POPULAR
                    </div>
                  )}

                  <div className="pricing-head">
                    <div>
                      <h3>{plan.name}</h3>
                      <p>{plan.tagline}</p>
                    </div>
                    <span className="plan-index mono-label">0{index + 1}</span>
                  </div>

                  <div className="plan-price">
                    {price === null ? (
                      <span className="plan-custom">Custom</span>
                    ) : (
                      <>
                        <span className="plan-currency">$</span>
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={`${plan.name}-${price}-${annual}`}
                            className="plan-amount"
                            initial={{ y: 18, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -18, opacity: 0 }}
                            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                          >
                            {price}
                          </motion.span>
                        </AnimatePresence>
                        <span className="plan-period">
                          / user / mo
                          {annual && price > 0 && <small>billed annually</small>}
                        </span>
                      </>
                    )}
                  </div>

                  <Magnetic strength={0.12}>
                    <button
                      type="button"
                      className={`button button--wide ${plan.popular ? "button--lime" : "button--outline"}`}
                      onClick={() => scrollToSection("#cta")}
                    >
                      {plan.cta}
                      <ArrowUpRight size={16} />
                    </button>
                  </Magnetic>

                  <div className="pricing-divider" />

                  <span className="pricing-features-label mono-label">WHAT&apos;S INCLUDED</span>
                  <ul className="pricing-features">
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <span><Check size={10} strokeWidth={3} /></span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <p className="pricing-note">{plan.note}</p>
                </Tilt3D>
              </motion.article>
            );
          })}
        </div>

        <Reveal className="pricing-bottom" delay={0.1}>
          <span className="mono-label">ALL PLANS INCLUDE</span>
          <div className="pricing-perks">
            <span>14-day free trial</span>
            <span>No credit card</span>
            <span>Cancel anytime</span>
            <span>SOC 2 Type II</span>
            <span>99.99% uptime</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
