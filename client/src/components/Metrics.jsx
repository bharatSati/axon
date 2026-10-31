import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { motion, useInView } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";
import Tilt3D from "./Tilt3D";
import MetricsScene from "./three/MetricsScene";

function Counter({ value, decimals = 0, prefix = "", suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const counter = { value: 0 };
    const animation = animate(counter, {
      value,
      duration: 2200,
      ease: "outExpo",
      onUpdate: () => setDisplay(counter.value),
    });
    return () => animation.pause();
  }, [inView, value]);

  const formatted = decimals
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString("en-US");

  return (
    <span ref={ref} className="counter">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

const stats = [
  {
    value: 100,
    suffix: "%",
    label: "Decoupled architecture",
    note: "Strict separation between client and server responsibilities.",
  },
  {
    value: 3,
    suffix: "×",
    label: "Faster developer velocity",
    note: "Modular components and dedicated documentation simplify onboarding.",
  },
  {
    value: 14,
    suffix: "ms",
    label: "Median API response",
    note: "High-performance data transfer across service boundaries.",
  },
  {
    value: 99.99,
    decimals: 2,
    suffix: "%",
    label: "System reliability",
    note: "Dependable software foundation engineered for continuous scale.",
  },
];

export default function Metrics() {
  return (
    <section className="metrics-section" id="metrics" aria-label="Axon engineering metrics">
      <div className="metrics-orb" />
      <div className="metrics-grid-bg" />
      <MetricsScene />
      <div className="container">
        <SectionHeading
          eyebrow="DESIGN PRINCIPLES & PERFORMANCE"
          index="03"
          align="center"
          title={
            <>
              Architecture, <em>measured.</em>
            </>
          }
          description="Engineered around modularity, scalability, and maintainability. Axon delivers high development velocity with rock-solid architectural stability."
        />

        <div className="metrics-grid">
          {stats.map((stat, index) => (
            <motion.div
              className="tilt-slot metric-slot"
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.8, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <Tilt3D className="metric-card" max={11}>
                <span className="metric-index mono-label">0{index + 1}</span>
                <div className="metric-value">
                  <Counter
                    value={stat.value}
                    decimals={stat.decimals}
                    suffix={stat.suffix}
                  />
                </div>
                <strong>{stat.label}</strong>
                <p>{stat.note}</p>
              </Tilt3D>
            </motion.div>
          ))}
        </div>

        <Reveal className="metrics-footer" delay={0.1}>
          <div className="metrics-footer-copy">
            <span className="status-pulse" />
            <span>Live platform data · updated 12 seconds ago</span>
          </div>
          <a href="#customers" className="text-link" data-cursor>
            Read the customer stories <ArrowUpRight size={15} />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
