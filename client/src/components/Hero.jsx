import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Move3D,
  Play,
  ScanLine,
  Star,
} from "lucide-react";
import gsap from "gsap";
import HeroCoreScene from "./HeroCoreScene";
import Magnetic from "./Magnetic";
import { scrollToSection } from "../hooks/useSmoothScroll";

const avatars = [
  { initials: "AM", from: "#c8ff3d", to: "#4d7b00" },
  { initials: "SK", from: "#9aabff", to: "#333a84" },
  { initials: "JL", from: "#ff9d77", to: "#7d2f17" },
  { initials: "NO", from: "#7fffe0", to: "#065f4b" },
];

export default function Hero({ ready }) {
  const root = useRef(null);

  useEffect(() => {
    const hero = root.current;
    if (!hero) return;

    const onPointerMove = (event) => {
      const rect = hero.getBoundingClientRect();
      hero.style.setProperty("--pointer-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
      hero.style.setProperty("--pointer-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
    };

    hero.addEventListener("pointermove", onPointerMove);
    return () => hero.removeEventListener("pointermove", onPointerMove);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const context = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power4.out" },
        delay: 0.08,
      });

      tl.fromTo(
        ".hero-title .hero-line > span",
        { yPercent: 112, rotate: 5 },
        { yPercent: 0, rotate: 0, duration: 1.2, stagger: 0.12 },
        0,
      )
        .fromTo(
          ".hero-announcement",
          { y: 18, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.8 },
          0.15,
        )
        .fromTo(
          ".hero-heading-meta",
          { y: 14, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.7 },
          0.42,
        )
        .fromTo(
          ".hero-sub",
          { y: 24, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.9 },
          0.5,
        )
        .fromTo(
          ".hero-actions",
          { y: 24, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.9 },
          0.62,
        )
        .fromTo(
          ".hero-command",
          { y: 16, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.8 },
          0.7,
        )
        .fromTo(
          ".hero-proof",
          { y: 20, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.9 },
          0.82,
        )
        .fromTo(
          ".hero-visual-inner",
          { scale: 0.88, autoAlpha: 0 },
          { scale: 1, autoAlpha: 1, duration: 1.5, ease: "power3.out" },
          0.2,
        )
        .fromTo(
          ".hero-chip",
          { scale: 0.8, autoAlpha: 0 },
          { scale: 1, autoAlpha: 1, duration: 0.7, stagger: 0.1, ease: "back.out(1.8)" },
          0.9,
        )
        .fromTo(
          ".hero-bottom > *",
          { y: 18, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.08 },
          1,
        );
    }, root);

    return () => context.revert();
  }, [ready]);

  return (
    <section className="hero" id="home" ref={root}>
      <div className="hero-ambient" />
      <div className="hero-grid" />
      <div className="hero-spotlight" />
      <div className="hero-scanlines" />
      <div className="hero-noise" />

      <div className="hero-rail hero-rail--left" aria-hidden="true">
        <span>AXON // UNIFIED WORKSPACE</span>
        <i />
        <span>MODULAR SYSTEM</span>
      </div>
      <div className="hero-rail hero-rail--right" aria-hidden="true">
        <span>CLIENT · SERVER · DOCS</span>
        <i />
        <span>V1.0 STABLE</span>
      </div>

      <div className="hero-main container-wide">
        <div className="hero-copy">
          <div className="hero-announcement">
            <span className="announcement-badge">ARCHITECTURE</span>
            <span>Unified workspace with modular client-server design</span>
            <span className="announcement-live"><i /> LIVE</span>
            <ArrowRight size={14} />
          </div>

          <h1 className="hero-title">
            <span className="hero-line">
              <span>One unified workspace.</span>
            </span>
            <span className="hero-line">
              <span>
                Zero <em>fragmentation.</em>
              </span>
            </span>
          </h1>

          <div className="hero-heading-meta mono-label">
            <span><i /> MODULAR CLIENT-SERVER</span>
            <span>CLIENT → API → SERVER → SERVICES</span>
            <span>01 / 05</span>
          </div>

          <p className="hero-sub">
            Axon simplifies complex workflows by unifying essential tools and
            capabilities into one structured application environment. Eliminate
            scattered toolchains through a clean, decoupled architecture built for
            scale.
          </p>

          <div className="hero-actions">
            <Magnetic strength={0.2}>
              <a
                href="#cta"
                className="button button--lime button--large"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSection("#cta");
                }}
              >
                Launch Workspace
                <span className="button-icon">
                  <ArrowUpRight size={17} />
                </span>
              </a>
            </Magnetic>

            <Magnetic strength={0.14}>
              <a
                href="#platform"
                className="button button--ghost button--large"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSection("#platform");
                }}
              >
                <span className="play-icon">
                  <Play size={11} fill="currentColor" />
                </span>
                Explore Architecture
              </a>
            </Magnetic>
          </div>

          <div className="hero-command">
            <span className="hero-command-prompt">&gt;_</span>
            <span className="hero-command-text">axon start --client :5173 --server :4000 --modular true</span>
            <span className="hero-command-caret" />
            <span className="hero-command-state"><i /> SYNCED</span>
          </div>

          <div className="hero-proof">
            <div className="avatar-stack">
              {avatars.map((avatar) => (
                <span
                  className="avatar"
                  key={avatar.initials}
                  style={{
                    background: `linear-gradient(135deg, ${avatar.from}, ${avatar.to})`,
                  }}
                >
                  {avatar.initials}
                </span>
              ))}
            </div>
            <div className="proof-copy">
              <div className="proof-stars">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} size={11} fill="currentColor" strokeWidth={0} />
                ))}
                <span>4.9/5</span>
              </div>
              <p>Trusted by engineering teams eliminating workflow fragmentation</p>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-visual-inner">
            <div className="hero-visual-meta mono-label">
              <span>SYSTEM / CLIENT-SERVER CORE</span>
              <span className="hero-visual-meta-live"><i /> LIVE RENDER</span>
            </div>

            <div className="orb-stage" data-cursor data-cursor-label="DRAG">
              <div className="orb-aura orb-aura--one" />
              <div className="orb-aura orb-aura--two" />
              <div className="orb-glow" />
              <HeroCoreScene />

              <div className="orb-reticle" aria-hidden="true">
                <span className="reticle-corner reticle-corner--tl" />
                <span className="reticle-corner reticle-corner--tr" />
                <span className="reticle-corner reticle-corner--bl" />
                <span className="reticle-corner reticle-corner--br" />
                <span className="reticle-axis reticle-axis--x" />
                <span className="reticle-axis reticle-axis--y" />
                <span className="reticle-dot" />
              </div>

              <div className="orb-readout orb-readout--nw mono-label">
                <span>CORE</span><strong>AX-MODULAR</strong>
              </div>
              <div className="orb-readout orb-readout--se mono-label">
                <span>STATE</span><strong>CONNECTED</strong>
              </div>
            </div>

            <div className="hero-hud-frame" aria-hidden="true">
              <span /><span /><span /><span />
            </div>

            <motion.div
              className="hero-chip hero-chip--status"
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="chip-pulse" />
              <div>
                <span className="chip-label">SYSTEM BOUNDARY</span>
                <strong>Client &amp; Server Synced</strong>
              </div>
              <span className="chip-live">LIVE</span>
            </motion.div>

            <motion.div
              className="hero-chip hero-chip--metrics"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
            >
              <span className="chip-label">API THROUGHPUT</span>
              <div className="chip-metric">
                <strong>18.5K</strong>
                <span>req/sec</span>
              </div>
              <div className="micro-bars">
                {[34, 60, 42, 78, 58, 92, 74, 100].map((height, index) => (
                  <i key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
            </motion.div>

            <motion.div
              className="hero-chip hero-chip--model"
              animate={{ x: [0, 5, 0], y: [0, -5, 0] }}
              transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
            >
              <span className="model-icon">λ</span>
              <div>
                <span className="chip-label">ARCHITECTURE</span>
                <strong>Modular · Scalable</strong>
              </div>
            </motion.div>

            <motion.div
              className="hero-chip hero-chip--latency"
              animate={{ x: [0, -5, 0], y: [0, 5, 0] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 1.6 }}
            >
              <span className="latency-wave">
                {[4, 7, 5, 9, 6, 10, 7, 4, 8, 5].map((height, index) => (
                  <i key={index} style={{ height: `${height}px` }} />
                ))}
              </span>
              <div>
                <span className="chip-label">API LATENCY</span>
                <strong>&lt; 14ms</strong>
              </div>
            </motion.div>

            <div className="orb-instruction mono-label">
              <Move3D size={13} />
              <span>DRAG TO ORBIT</span>
              <i />
              <ScanLine size={12} />
              <span>CLICK TO PULSE</span>
              <Activity size={12} />
              <span>MOVE TO DEFORM</span>
            </div>

            <div className="hero-orbit-label mono-label">
              <span>UNIFIED MESH</span>
              <i />
              <span>AXON PLATFORM</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-bottom container-wide">
        <div className="hero-stat">
          <strong>100<span>%</span></strong>
          <span>Modular architecture</span>
        </div>
        <div className="hero-stat">
          <strong>2<span>-Tier</span></strong>
          <span>Decoupled client &amp; server</span>
        </div>
        <div className="hero-stat">
          <strong>99.99<span>%</span></strong>
          <span>High availability &amp; uptime</span>
        </div>
        <button
          type="button"
          className="scroll-cue"
          onClick={() => scrollToSection("#features")}
          aria-label="Scroll to features"
        >
          <span className="scroll-cue-track">
            <span className="scroll-cue-dot" />
          </span>
          <span className="mono-label">SCROLL TO EXPLORE</span>
        </button>
      </div>
    </section>
  );
}
