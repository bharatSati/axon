import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function Cursor() {
  const dot = useRef(null);
  const ring = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled || !dot.current || !ring.current) return;

    gsap.set([dot.current, ring.current], {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      opacity: 1,
    });

    const dotX = gsap.quickTo(dot.current, "x", { duration: 0.08, ease: "none" });
    const dotY = gsap.quickTo(dot.current, "y", { duration: 0.08, ease: "none" });
    const ringX = gsap.quickTo(ring.current, "x", { duration: 0.45, ease: "power3" });
    const ringY = gsap.quickTo(ring.current, "y", { duration: 0.45, ease: "power3" });

    const onMove = (event) => {
      dotX(event.clientX);
      dotY(event.clientY);
      ringX(event.clientX);
      ringY(event.clientY);
    };

    const onOver = (event) => {
      const target = event.target.closest("a, button, [data-cursor]");
      const text = target?.getAttribute("data-cursor-label") || "";
      setLabel(text);
      gsap.to(ring.current, {
        scale: target ? 1.8 : 1,
        borderColor: target ? "rgba(200, 255, 61, 0.95)" : "rgba(200, 255, 61, 0.38)",
        backgroundColor: target ? "rgba(200, 255, 61, 0.08)" : "transparent",
        duration: 0.3,
        ease: "power2.out",
      });
    };

    const onLeave = () => gsap.to([dot.current, ring.current], { opacity: 0, duration: 0.2 });
    const onEnter = () => gsap.to([dot.current, ring.current], { opacity: 1, duration: 0.2 });

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div className="cursor-dot" ref={dot} />
      <div className="cursor-ring" ref={ring}>
        <span className={label ? "is-visible" : ""}>{label}</span>
      </div>
    </>
  );
}
