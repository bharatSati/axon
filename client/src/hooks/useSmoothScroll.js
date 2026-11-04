import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const LENIS_CLASSES = ["lenis", "lenis-smooth", "lenis-scrolling", "lenis-stopped"];

/**
 * Smooth scrolling is a landing-page-only enhancement.
 *
 * Pass `enabled = false` for the authenticated dashboard: Lenis is destroyed
 * outright (not merely stopped) so it cannot leave `lenis-stopped` on <html>,
 * which would apply `overflow: clip` and kill native/nested scrolling.
 */
export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) {
      if (window.__lenis) {
        window.__lenis.destroy();
        delete window.__lenis;
      }
      document.documentElement.classList.remove(...LENIS_CLASSES);
      ScrollTrigger.refresh();
      return undefined;
    }

    const lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      autoResize: true,
    });

    const update = () => ScrollTrigger.update();
    const tick = (time) => lenis.raf(time * 1000);

    lenis.on("scroll", update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;

    // Continuously sync scroll limits with dynamic React view transitions & loaded data
    const ro = new ResizeObserver(() => {
      lenis.resize();
      ScrollTrigger.refresh();
    });
    if (document.body) {
      ro.observe(document.body);
    }

    lenis.start();
    lenis.resize();
    document.documentElement.classList.remove("is-loading");
    ScrollTrigger.refresh();

    return () => {
      ro.disconnect();
      lenis.destroy();
      gsap.ticker.remove(tick);
      if (window.__lenis === lenis) delete window.__lenis;
      document.documentElement.classList.remove(...LENIS_CLASSES);
    };
  }, [enabled]);
}

export function scrollToSection(id) {
  const target = typeof id === "string" ? document.querySelector(id) : id;
  if (!target) return;

  if (window.__lenis) {
    window.__lenis.scrollTo(target, { offset: -90, duration: 1.5 });
  } else {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
