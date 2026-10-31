import { motion } from "motion/react";

export default function SectionHeading({
  eyebrow,
  index = "01",
  title,
  description,
  align = "left",
  className = "",
}) {
  return (
    <div className={`section-heading section-heading--${align} ${className}`}>
      <motion.div
        className="section-kicker"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="section-kicker-dot" />
        <span className="mono-label">{eyebrow}</span>
        <span className="section-index mono-label">{index} / 04</span>
      </motion.div>

      <motion.h2
        className="section-title"
        initial={{ opacity: 0, y: 34 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.95, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      >
        {title}
      </motion.h2>

      {description && (
        <motion.p
          className="section-description"
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          {description}
        </motion.p>
      )}
    </div>
  );
}
