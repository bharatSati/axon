import { useRef } from "react";
import gsap from "gsap";

export default function Magnetic({ children, strength = 0.28, className = "" }) {
  const ref = useRef(null);

  const onMove = (event) => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) * strength;
    const y = (event.clientY - rect.top - rect.height / 2) * strength;
    gsap.to(ref.current, {
      x,
      y,
      duration: 0.45,
      ease: "power3.out",
    });
  };

  const onLeave = () => {
    gsap.to(ref.current, {
      x: 0,
      y: 0,
      duration: 0.9,
      ease: "elastic.out(1, 0.35)",
    });
  };

  return (
    <div
      ref={ref}
      className={`magnetic ${className}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  );
}
