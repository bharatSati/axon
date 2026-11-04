import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { X } from "lucide-react";

/**
 * Cinematic focus stage.
 *
 * Flow: a card / prompt box / response box is captured as the origin, then the
 * panel zooms from that exact rectangle to a centred, maximised stage while the
 * rest of the workspace blurs out behind it.
 */
export default function FocusOverlay({
  open = false,
  onClose,
  originRef,
  kicker = "AXON · FOCUS STAGE",
  title = "Focus",
  badge,
  icon: Icon,
  accent = "#c8ff3d",
  className = "",
  children,
  footer,
  closeOnBackdrop = true
}) {
  const [mounted, setMounted] = useState(open);
  const veilRef = useRef(null);
  const panelRef = useRef(null);
  const bodyRef = useRef(null);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) {
      closingRef.current = false;
      setMounted(true);
    }
  }, [open]);

  // Lock document scrolling while the stage is alive.
  useEffect(() => {
    if (!mounted) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mounted]);

  // Open choreography: FLIP from the source rectangle, settle, then blur the world.
  useEffect(() => {
    if (!mounted || !open) return undefined;
    const panel = panelRef.current;
    const veil = veilRef.current;
    if (!panel || !veil) return undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const origin = originRef?.current?.getBoundingClientRect();
    const target = panel.getBoundingClientRect();

    gsap.killTweensOf([panel, veil]);

    if (reduced || !origin || !target.width || !target.height) {
      gsap.fromTo(veil, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" });
      gsap.fromTo(
        panel,
        { opacity: 0, scale: 0.94, y: 18 },
        { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: "power3.out" }
      );
      return undefined;
    }

    const dx = origin.left - target.left;
    const dy = origin.top - target.top;
    const sx = Math.max(0.06, origin.width / target.width);
    const sy = Math.max(0.06, origin.height / target.height);

    gsap.set(panel, {
      x: dx,
      y: dy,
      scaleX: sx,
      scaleY: sy,
      opacity: 0.55,
      transformOrigin: "top left",
      filter: "brightness(1.35)"
    });
    gsap.set(veil, { opacity: 0, backdropFilter: "blur(0px)", webkitBackdropFilter: "blur(0px)" });

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to(veil, {
      opacity: 1,
      backdropFilter: "blur(18px)",
      webkitBackdropFilter: "blur(18px)",
      duration: 0.7
    }, 0);
    tl.to(panel, {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      filter: "brightness(1)",
      duration: 0.82,
      ease: "expo.out"
    }, 0.04);
    if (bodyRef.current) {
      tl.fromTo(
        bodyRef.current.children,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.04, ease: "power2.out" },
        0.34
      );
    }

    return () => tl.kill();
  }, [mounted, open, originRef]);

  // Exit choreography.
  useEffect(() => {
    if (!mounted || open) return undefined;
    const panel = panelRef.current;
    const veil = veilRef.current;
    if (!panel || !veil || closingRef.current) return undefined;
    closingRef.current = true;

    const tl = gsap.timeline({
      onComplete: () => {
        setMounted(false);
        closingRef.current = false;
      }
    });
    tl.to(panel, { opacity: 0, scale: 0.965, y: 12, duration: 0.26, ease: "power2.in" }, 0);
    tl.to(veil, { opacity: 0, duration: 0.3, ease: "power2.in" }, 0);
    return () => tl.kill();
  }, [mounted, open]);

  useEffect(() => {
    if (!mounted) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className={`focus-overlay ${className}`} style={{ "--focus-accent": accent }}>
      <div
        ref={veilRef}
        className="focus-overlay__veil"
        onClick={(event) => {
          if (closeOnBackdrop) {
            event.stopPropagation();
            onClose?.();
          }
        }}
      />

      <div className="focus-stage" ref={panelRef} role="dialog" aria-modal="true" aria-label={title}>
        <span className="focus-stage__glow" aria-hidden="true" />
        <span className="focus-stage__scan" aria-hidden="true" />

        <header className="focus-stage__head">
          <div className="focus-stage__identity">
            {Icon && (
              <span className="focus-stage__icon">
                <Icon size={16} />
              </span>
            )}
            <div className="focus-stage__copy">
              <span className="focus-stage__kicker">{kicker}</span>
              <h2>{title}</h2>
            </div>
          </div>

          <div className="focus-stage__head-actions">
            {badge && <span className="focus-stage__badge">{badge}</span>}
            <button
              type="button"
              className="focus-stage__close"
              onClick={() => onClose?.()}
              title="Close focus stage (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="focus-stage__body" ref={bodyRef} data-lenis-prevent>
          {children}
        </div>

        {footer && <footer className="focus-stage__footer">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}
