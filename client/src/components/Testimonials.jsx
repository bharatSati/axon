import { motion } from "motion/react";
import { ArrowUpRight, Quote, Star } from "lucide-react";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";
import Tilt3D from "./Tilt3D";

const testimonials = [
  {
    quote:
      "Axon replaced five fragmented tools with a single, structured workspace. Our engineers now ship features without getting bogged down by disconnected glue code.",
    name: "Maya Chen",
    role: "Chief Architect, Helios",
    initials: "MC",
    gradient: "linear-gradient(135deg, #c8ff3d, #527a00)",
    featured: true,
    metric: "70% less",
    metricLabel: "operational overhead",
  },
  {
    quote:
      "The clean separation of frontend and backend makes onboarding frictionless. The client team innovates rapidly while backend services scale independently.",
    name: "Jonas Meyer",
    role: "VP Engineering, Vertex",
    initials: "JM",
    gradient: "linear-gradient(135deg, #a3b1ff, #393f8d)",
  },
  {
    quote:
      "Finally, an intelligent platform that doesn't crumble under its own complexity. Modularity and maintainability were clearly built into the foundation.",
    name: "Priya Nadar",
    role: "Lead Architect, Northwind",
    initials: "PN",
    gradient: "linear-gradient(135deg, #ffb28f, #8b3e1d)",
  },
];

function TestimonialCard({ item, index }) {
  return (
    <motion.article
      className={`tilt-slot testimonial-slot ${item.featured ? "testimonial-slot--featured" : ""}`}
      initial={{ opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.85, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <Tilt3D
        className={`testimonial-card ${item.featured ? "testimonial-card--featured" : ""}`}
        max={7}
      >
        <div className="testimonial-top">
          <span className="quote-icon">
            <Quote size={17} fill="currentColor" strokeWidth={0} />
          </span>
          <div className="testimonial-stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={12} fill="currentColor" strokeWidth={0} />
            ))}
          </div>
        </div>

        <blockquote>
          &ldquo;{item.quote}&rdquo;
        </blockquote>

        {item.featured && (
          <div className="testimonial-metric">
            <span className="mono-label">RESULT</span>
            <strong>{item.metric}</strong>
            <span>{item.metricLabel}</span>
            <span className="metric-line" />
          </div>
        )}

        <div className="testimonial-author">
          <span className="testimonial-avatar" style={{ background: item.gradient }}>
            {item.initials}
          </span>
          <div>
            <strong>{item.name}</strong>
            <span>{item.role}</span>
          </div>
          <span className="testimonial-arrow"><ArrowUpRight size={16} /></span>
        </div>
      </Tilt3D>
    </motion.article>
  );
}

export default function Testimonials() {
  return (
    <section className="section testimonials-section" id="customers">
      <div className="container">
        <SectionHeading
          eyebrow="ENGINEERING TEAMS"
          index="04"
          title={
            <>
              Don&apos;t take our word for it.
              <br />
              <em>Take theirs.</em>
            </>
          }
          description="High-velocity teams rely on Axon to eliminate disconnected toolchains and maintain architectural integrity."
        />

        <div className="testimonial-grid">
          {testimonials.map((item, index) => (
            <TestimonialCard item={item} index={index} key={item.name} />
          ))}
        </div>

        <Reveal className="testimonials-footer" delay={0.1}>
          <span className="mono-label"><span className="status-pulse" /> 4.9 / 5 AVERAGE ACROSS 2,400+ REVIEWS</span>
          <div className="testimonial-mini-avatars">
            {["A", "K", "R", "M", "S"].map((letter, index) => (
              <span key={letter} style={{ zIndex: 5 - index }}>{letter}</span>
            ))}
            <em>+12k</em>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
