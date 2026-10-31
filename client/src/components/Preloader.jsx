import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import PreloaderScene from "./PreloaderScene";

const bootSteps = [
  { threshold: 15, label: "CLIENT INTERFACE", value: "READY" },
  { threshold: 38, label: "API GATEWAY", value: "SYNCED" },
  { threshold: 62, label: "SERVER RUNTIME", value: "ONLINE" },
  { threshold: 85, label: "MODULAR REGISTRY", value: "LINKED" },
  { threshold: 100, label: "AXON WORKSPACE", value: "LIVE" },
];

const DIGIT_PLACES = [2, 1, 0];
const DIGIT_COUNTS = { 2: 12, 1: 22, 0: 112 };

export default function Preloader({ onReveal, onComplete }) {
  const root = useRef(null);
  const scene = useRef(null);
  const flare = useRef(null);
  const bar = useRef(null);
  const head = useRef(null);
  const count = useRef(null);
  const progressRef = useRef({ value: 0 });
  const lastInt = useRef(-1);
  const revealRef = useRef(onReveal);
  const completeRef = useRef(onComplete);

  const [progress, setProgress] = useState(0);

  revealRef.current = onReveal;
  completeRef.current = onComplete;

  useEffect(() => {
    const host = root.current;
    if (!host) return;

    let finished = false;
    let elapsed = 0;
    let hold = 0;
    let phase = "count";
    const DELAY = 300;
    const COUNT_DURATION = 2500;

    const updateDigits = (value) => {
      const tracks = host.querySelectorAll(".odometer-track");
      if (tracks.length < 3) return;

      DIGIT_PLACES.forEach((place, index) => {
        const unit = 10 ** place;
        const stepped = Math.floor(value / unit);
        const within = value % unit;
        const rollSpan = 0.14;
        const raw = Math.min(1, Math.max(0, (within - (unit - rollSpan)) / rollSpan));
        const roll = raw * raw * (3 - 2 * raw);

        tracks[index].style.transform = `translate3d(0, -${stepped + roll}em, 0)`;
      });
    };

    const intro = gsap.timeline({ defaults: { ease: "power4.out" } });

    intro
      .fromTo(
        ".preloader-hero",
        { scale: 0.9, autoAlpha: 0 },
        { scale: 1, autoAlpha: 1, duration: 1.15, ease: "power3.out" },
        0,
      )
      .fromTo(
        ".preloader-letter",
        { yPercent: 120, rotate: 6 },
        { yPercent: 0, rotate: 0, duration: 1, stagger: 0.07 },
        0.12,
      )
      .fromTo(
        ".preloader-top, .preloader-center-label, .loader-track, .loader-meta",
        { y: 12, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.05 },
        0.2,
      )
      .fromTo(
        ".preloader-bottom-left, .preloader-bottom-right, .preloader-coordinates",
        { y: 14, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.06 },
        0.44,
      );

    const launch = () => {
      if (finished) return;
      finished = true;
      host.classList.add("is-launching");
      revealRef.current?.();
      scene.current?.exit();

      const tl = gsap.timeline({
        defaults: { ease: "power3.in" },
        onComplete: () => completeRef.current?.(),
      });

      tl.to(
        ".preloader-status, .preloader-center-label, .loader-meta",
        { autoAlpha: 0, y: -10, duration: 0.35, stagger: 0.03 },
        0,
      )
        .to(
          ".preloader-counter",
          {
            scale: 1.07,
            autoAlpha: 0,
            filter: "blur(10px)",
            duration: 0.55,
            ease: "power2.in",
          },
          0.04,
        )
        .to(
          ".preloader-signature",
          { y: -26, autoAlpha: 0, duration: 0.5 },
          0.1,
        )
        .to(
          ".preloader-hero-rings",
          { scale: 1.4, autoAlpha: 0, duration: 0.8, ease: "power2.in" },
          0,
        )
        .to(
          ".preloader-top, .preloader-bottom, .preloader-frame, .preloader-coordinates, .loader-track",
          { autoAlpha: 0, duration: 0.4 },
          0.16,
        )
        .to(
          flare.current,
          { opacity: 0.9, duration: 0.22, ease: "power1.out" },
          0.28,
        )
        .to(
          flare.current,
          { opacity: 0, duration: 0.7, ease: "power2.in" },
          0.52,
        )
        .to(
          host,
          {
            clipPath: "inset(0 0 100% 0)",
            duration: 1.02,
            ease: "expo.inOut",
          },
          0.4,
        )
        .to(host, { autoAlpha: 0, duration: 0.2 }, 1.3);
    };

    const applyProgress = (value) => {
      progressRef.current.value = value;
      updateDigits(value);

      const ratio = value / 100;
      if (bar.current) bar.current.style.transform = `scaleX(${ratio})`;
      if (head.current) head.current.style.left = `${value}%`;
      if (count.current) {
        const base = Math.floor(value);
        const within = value - base;
        const raw = Math.min(1, Math.max(0, (within - 0.86) / 0.14));
        const shown = base + (raw * raw * (3 - 2 * raw) >= 0.5 ? 1 : 0);
        count.current.textContent = String(shown).padStart(3, "0");
      }
      host.style.setProperty("--boot", ratio.toFixed(4));

      const rounded = Math.round(value);
      if (rounded !== lastInt.current) {
        lastInt.current = rounded;
        setProgress(rounded);
      }
    };

    const counterTick = (time, deltaTime) => {
      const delta = Math.min(deltaTime || 16.7, 50);

      if (phase === "count") {
        elapsed += delta;
        if (elapsed < DELAY) return;

        const t = Math.min(1, (elapsed - DELAY) / COUNT_DURATION);
        const eased = 1 - Math.pow(2, -10 * t);
        applyProgress(eased * 100);

        if (t >= 1) {
          phase = "hold";
          host.classList.add("is-complete");
        }
        return;
      }

      if (phase === "hold") {
        hold += delta;
        if (hold >= 540) {
          phase = "launch";
          gsap.ticker.remove(counterTick);
          launch();
        }
      }
    };

    applyProgress(0);
    lastInt.current = 0;
    gsap.ticker.add(counterTick);

    return () => {
      intro.kill();
      gsap.ticker.remove(counterTick);
      gsap.killTweensOf(host);
      gsap.killTweensOf(".preloader-counter");
      gsap.killTweensOf(".preloader-signature");
      gsap.killTweensOf(".preloader-hero-rings");
      gsap.killTweensOf(flare.current);
      host.classList.remove("is-launching", "is-complete");
      host.style.clipPath = "";
    };
  }, []);

  const activeStep = Math.max(
    0,
    bootSteps.findIndex((step) => progress < step.threshold),
  );
  const phase =
    progress >= 100
      ? "HANDOFF TO PRODUCTION"
      : progress >= 76
        ? "ARMING GUARDRAILS"
        : progress >= 44
          ? "SYNCHRONIZING AGENT MESH"
          : "CALIBRATING NEURAL LATTICE";

  return (
    <div className="preloader" ref={root} aria-hidden="true">
      <PreloaderScene ref={scene} progressRef={progressRef} />

      <div className="preloader-grid" />
      <div className="preloader-glow" />
      <div className="preloader-scan" />
      <div className="preloader-flare" ref={flare} />

      <div className="preloader-frame" aria-hidden="true">
        <span /><span /><span /><span />
      </div>

      <div className="preloader-top">
        <div className="brand brand--loader">
          <span className="brand-mark">
            <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <path d="M6.5 21.5 14 5l7.5 16.5h-4.1L14 13.3l-3.4 8.2H6.5Z" fill="currentColor" />
              <circle cx="21.4" cy="6.3" r="2.1" fill="currentColor" />
            </svg>
          </span>
          <span className="brand-name">AXON</span>
        </div>
        <div className="preloader-top-right">
          <span className="mono-label">AI OPERATING SYSTEM</span>
          <span className="preloader-build mono-label"><i /> BUILD 3.0.1</span>
        </div>
      </div>

      <div className="preloader-center">
        <span className="preloader-center-label mono-label">NEURAL INTERFACE / BOOT SEQUENCE</span>

        <div className="preloader-hero">
          <div className="preloader-hero-rings" aria-hidden="true">
            <span className="ph-ring ph-ring--one" />
            <span className="ph-ring ph-ring--two" />
            <span className="ph-ring ph-ring--three" />
            <span className="ph-ring ph-ring--progress" />
            <span className="ph-ring ph-ring--sweep" />
            <span className="ph-cross ph-cross--x" />
            <span className="ph-cross ph-cross--y" />
            <span className="ph-tick ph-tick--n" />
            <span className="ph-tick ph-tick--e" />
            <span className="ph-tick ph-tick--s" />
            <span className="ph-tick ph-tick--w" />
          </div>

          <div className="preloader-counter">
            <span className="preloader-odometer">
              {DIGIT_PLACES.map((place) => (
                <span className="odometer-digit" key={place}>
                  <span className="odometer-track">
                    {Array.from({ length: DIGIT_COUNTS[place] }).map((_, index) => (
                      <span key={index}>{index % 10}</span>
                    ))}
                  </span>
                </span>
              ))}
            </span>
            <span className="preloader-counter-unit">%</span>
          </div>

          <div className="preloader-signature">
            <div className="preloader-word preloader-word--mini">
              {"AXON".split("").map((letter, index) => (
                <span className="preloader-letter" key={`${letter}-${index}`}>
                  {letter}
                </span>
              ))}
            </div>
            <span className="preloader-signature-sub mono-label">NEURAL OPERATING SYSTEM</span>
          </div>
        </div>

        <div className="loader-track">
          <span className="loader-progress" ref={bar} />
          <span className="loader-head" ref={head} />
        </div>
        <div className="loader-meta mono-label">
          <span>LOAD SEQUENCE / 001</span>
          <span>{progress >= 100 ? "COMPLETE" : "IN PROGRESS"}</span>
        </div>
      </div>

      <div className="preloader-bottom">
        <div className="preloader-bottom-left">
          <div className="preloader-status">
            <span className="status-pulse" />
            {phase}
          </div>

          <div className="preloader-boot">
            {bootSteps.map((step, index) => {
              const done = progress >= step.threshold;
              const active = index === activeStep && progress < 100;

              return (
                <div
                  className={`preloader-boot-row ${done ? "is-done" : ""} ${active ? "is-active" : ""}`}
                  key={step.label}
                >
                  <span className="boot-dot" />
                  <span className="boot-label">{step.label}</span>
                  <span className="boot-line" />
                  <span className="boot-value">{done ? step.value : active ? "···" : "WAIT"}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="preloader-bottom-right">
          <span className="loader-caption mono-label">
            {progress >= 100 ? "WORKSPACE READY" : "WORKSPACE INITIALIZING"}
          </span>
          <div className="loader-count loader-count--compact">
            <span ref={count} />
            <small>%</small>
          </div>
          <div className="loader-ticks" aria-hidden="true">
            {Array.from({ length: 24 }).map((_, index) => (
              <i
                className={progress >= ((index + 1) / 24) * 100 ? "is-on" : ""}
                key={index}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="preloader-coordinates mono-label">
        <span>34.0522° N</span>
        <span>118.2437° W</span>
      </div>
    </div>
  );
}
