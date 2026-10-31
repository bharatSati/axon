import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function ScrollEffects({ ready }) {
  useEffect(() => {
    if (!ready) return;

    const context = gsap.context(() => {
      gsap.to(".hero-visual", {
        yPercent: -9,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: 1.1,
        },
      });

      gsap.to(".hero-copy", {
        yPercent: 7,
        opacity: 0.72,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: 1.1,
        },
      });

      gsap.to(".metrics-orb", {
        yPercent: 22,
        rotate: 18,
        ease: "none",
        scrollTrigger: {
          trigger: ".metrics-section",
          start: "top bottom",
          end: "bottom top",
          scrub: 1.4,
        },
      });

      gsap.fromTo(
        ".footer-wordmark",
        { yPercent: 38, opacity: 0.3 },
        {
          yPercent: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".footer",
            start: "top bottom",
            end: "bottom bottom",
            scrub: 1,
          },
        },
      );

      gsap.to(".cta-orbit--one", {
        rotate: 55,
        scale: 1.08,
        ease: "none",
        scrollTrigger: {
          trigger: ".cta-section",
          start: "top bottom",
          end: "bottom top",
          scrub: 1.5,
        },
      });

      gsap.to(".cta-orbit--two", {
        rotate: -60,
        scale: 0.92,
        ease: "none",
        scrollTrigger: {
          trigger: ".cta-section",
          start: "top bottom",
          end: "bottom top",
          scrub: 1.5,
        },
      });

      gsap.to(".cta-glow", {
        scale: 1.28,
        opacity: 0.9,
        ease: "none",
        scrollTrigger: {
          trigger: ".cta-section",
          start: "top bottom",
          end: "center center",
          scrub: 1.5,
        },
      });

      gsap.utils.toArray(".bento-card").forEach((card) => {
        const visual = card.querySelector(
          ".flow-visual, .rive-visual, .telemetry-visual, .integration-visual, .security-visual",
        );
        if (!visual) return;

        gsap.fromTo(
          visual,
          { yPercent: 2.4, scale: 1.012 },
          {
            yPercent: -2.4,
            scale: 1.035,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.2,
            },
          },
        );
      });

      gsap.to(".cta-grid", {
        backgroundPosition: "0px 180px",
        ease: "none",
        scrollTrigger: {
          trigger: ".cta-section",
          start: "top bottom",
          end: "bottom top",
          scrub: 1.4,
        },
      });

      gsap.to(".metrics-grid-bg", {
        backgroundPosition: "0px 130px",
        ease: "none",
        scrollTrigger: {
          trigger: ".metrics-section",
          start: "top bottom",
          end: "bottom top",
          scrub: 1.6,
        },
      });

      gsap.to(".footer-grid-bg", {
        backgroundPosition: "0px -160px",
        ease: "none",
        scrollTrigger: {
          trigger: ".footer",
          start: "top bottom",
          end: "bottom bottom",
          scrub: 1.5,
        },
      });

      gsap.from(".logo-section-inner", {
        y: 24,
        autoAlpha: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".logo-section",
          start: "top 88%",
          once: true,
        },
      });

      gsap.from(".logo-item", {
        y: 10,
        autoAlpha: 0,
        duration: 0.55,
        stagger: 0.035,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".logo-section",
          start: "top 88%",
          once: true,
        },
      });

      gsap.from(".features-footer-line", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".features-footer",
          start: "top 92%",
          once: true,
        },
      });

      gsap.utils.toArray(".pricing-divider").forEach((line) => {
        gsap.from(line, {
          scaleX: 0,
          transformOrigin: "left center",
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: line,
            start: "top 92%",
            once: true,
          },
        });
      });
    });

    const spotlightSelector = ".metric-card, .testimonial-card, .pricing-card";
    const onSpotlightMove = (event) => {
      const card = event.target.closest?.(spotlightSelector);
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };

    document.addEventListener("pointermove", onSpotlightMove, { passive: true });

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const timeout = window.setTimeout(refresh, 600);

    return () => {
      document.removeEventListener("pointermove", onSpotlightMove);
      context.revert();
      window.removeEventListener("load", refresh);
      window.clearTimeout(timeout);
    };
  }, [ready]);

  return null;
}
