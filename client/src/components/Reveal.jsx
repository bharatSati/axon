import { motion } from "motion/react";

export default function Reveal({
  children,
  className = "",
  delay = 0,
  y = 28,
  duration = 0.8,
  once = true,
  amount = 0.2,
  as = "div",
  ...rest
}) {
  const Component = motion[as] || motion.div;
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </Component>
  );
}
