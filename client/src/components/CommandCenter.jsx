import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Tilt3D from "./Tilt3D";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bot,
  Check,
  CircleCheck,
  Command,
  Cpu,
  Database,
  LayoutDashboard,
  Mail,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: "01",
    title: "Interact through the Client.",
    copy: "Users trigger workflows and navigate tools inside the client frontend, presenting information clearly with zero tool fragmentation.",
  },
  {
    number: "02",
    title: "API-Driven Server Processing.",
    copy: "The server layer receives structured requests, coordinates application logic, interacts with databases, and communicates with external services.",
  },
  {
    number: "03",
    title: "Real-Time Response & State Sync.",
    copy: "The backend returns structured data to the frontend, updating workspace state predictably with clean boundaries and full auditability.",
  },
];

function PromptPanel() {
  return (
    <motion.div
      className="dash-panel dash-panel--prompt"
      initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="prompt-header">
        <span className="prompt-orb">
          <Sparkles size={16} />
        </span>
        <div>
          <span className="mono-label">UNIFIED WORKSPACE CONSOLE</span>
          <h5>Trigger a cross-module workflow</h5>
        </div>
        <span className="shortcut mono-label">⌘ K</span>
      </div>

      <div className="prompt-input">
        <span className="prompt-caret-line">
          Aggregate <mark>workspace telemetry</mark>, process analytics in server
          logic, and synchronize client state across all active modules.
          <i className="typing-caret" />
        </span>
        <div className="prompt-tools">
          <div className="prompt-tool-chips">
            <span><LayoutDashboard size={12} /> client/UI</span>
            <span><Cpu size={12} /> server/API</span>
            <span><Database size={12} /> Data Store</span>
          </div>
          <button type="button" className="prompt-send">
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>

      <div className="prompt-response">
        <span className="response-avatar">λ</span>
        <div>
          <div className="response-meta">
            <strong>Axon Core</strong>
            <span>just now</span>
          </div>
          <p>
            Client dispatched request to <code>/api/workspace/sync</code>. Server
            processed batch and returned state update in <strong>14ms</strong>.
          </p>
          <div className="response-plan">
            <span><Check size={10} /> Client validated</span>
            <span><Check size={10} /> API route resolved</span>
            <span><Check size={10} /> Data synchronized</span>
          </div>
        </div>
      </div>

      <div className="prompt-suggestions">
        <button type="button"><Zap size={12} /> Sync external APIs</button>
        <button type="button"><Workflow size={12} /> Modular workflow run</button>
        <button type="button"><Database size={12} /> Query server health</button>
      </div>

      <div className="prompt-footer">
        <div className="prompt-status">
          <span className="ai-dots"><i /><i /><i /></span>
          <span>Unified communication layer active</span>
        </div>
        <button type="button" className="dash-primary">
          Dispatch workflow <ArrowRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}

function CanvasPanel() {
  const nodes = [
    { id: "client", label: "Client Frontend", type: "Client", icon: LayoutDashboard, x: 5, y: 43, status: "Done" },
    { id: "gateway", label: "API Gateway", type: "Router", icon: Zap, x: 29, y: 18, status: "Running" },
    { id: "server", label: "App Logic", type: "Server", icon: Cpu, x: 29, y: 65, status: "Running" },
    { id: "database", label: "Data Sources", type: "Data", icon: Database, x: 55, y: 41, status: "Running" },
    { id: "external", label: "External APIs", type: "Integration", icon: Mail, x: 79, y: 20, status: "Queued" },
    { id: "docs", label: "Docs & Specs", type: "Docs", icon: Activity, x: 79, y: 67, status: "Queued" },
  ];

  return (
    <motion.div
      className="dash-panel dash-panel--canvas"
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="canvas-toolbar">
        <div className="canvas-title">
          <span className="mono-label">ARCHITECTURE PIPELINE</span>
          <strong>Client-Server Flow v1</strong>
        </div>
        <div className="canvas-actions">
          <span className="run-pill"><span className="status-pulse" /> RUNNING</span>
          <button type="button"><Play size={13} fill="currentColor" /> Run</button>
          <button type="button" className="icon-button"><MoreHorizontal size={16} /></button>
        </div>
      </div>

      <div className="workflow-canvas">
        <span className="workflow-grid" />
        <svg viewBox="0 0 700 370" fill="none" preserveAspectRatio="none" className="workflow-lines">
          <defs>
            <linearGradient id="dashLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#c8ff3d" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#c8ff3d" stopOpacity="0.65" />
            </linearGradient>
          </defs>
          <path d="M135 195 C205 195 175 102 244 102" stroke="url(#dashLine)" strokeWidth="1.5" strokeDasharray="5 6" />
          <path d="M135 195 C205 195 175 274 244 274" stroke="url(#dashLine)" strokeWidth="1.5" strokeDasharray="5 6" />
          <path d="M327 102 C395 102 379 185 438 185" stroke="url(#dashLine)" strokeWidth="1.5" strokeDasharray="5 6" />
          <path d="M327 274 C395 274 379 185 438 185" stroke="url(#dashLine)" strokeWidth="1.5" strokeDasharray="5 6" />
          <path d="M520 185 C584 185 552 108 625 108" stroke="url(#dashLine)" strokeWidth="1.5" strokeDasharray="5 6" />
          <path d="M520 185 C584 185 552 262 625 262" stroke="url(#dashLine)" strokeWidth="1.5" strokeDasharray="5 6" />
        </svg>

        {nodes.map(({ id, label, type, icon: Icon, x, y, status }, index) => (
          <motion.div
            className={`wf-node ${id === "database" ? "is-active" : ""}`}
            key={id}
            style={{ left: `${x}%`, top: `${y}%` }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08 + index * 0.06, duration: 0.4 }}
          >
            <div className="wf-node-head">
              <span className={`wf-icon wf-icon--${type.toLowerCase()}`}>
                <Icon size={13} />
              </span>
              <span className="wf-status-dot" data-status={status} />
            </div>
            <strong>{label}</strong>
            <span className="mono-label">{type}</span>
          </motion.div>
        ))}

        <div className="canvas-run-card">
          <div className="canvas-run-head">
            <span className="mono-label">EXECUTION #8410</span>
            <span>Client &amp; Server · 14ms latency</span>
          </div>
          <div className="canvas-run-bar">
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: "94%" }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <div className="canvas-run-meta">
            <span><span className="status-pulse" /> Decoupled modules active</span>
            <span>94% complete</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ResultsPanel() {
  const days = [52, 68, 62, 85, 78, 92, 98];

  return (
    <motion.div
      className="dash-panel dash-panel--results"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="deploy-banner">
        <span className="deploy-check"><CircleCheck size={22} /></span>
        <div>
          <span className="mono-label">SYSTEM HEALTH</span>
          <h5>Workspace synchronized.</h5>
          <p>Clean client-server boundaries. Zero fragmentation across modules.</p>
        </div>
        <button type="button" className="dash-primary">
          Open monitor <ArrowUpRight size={14} />
        </button>
      </div>

      <div className="result-metrics">
        <div className="result-metric">
          <span className="mono-label">API LATENCY</span>
          <strong>14<span>ms</span></strong>
          <small className="is-positive">p99 optimized</small>
        </div>
        <div className="result-metric">
          <span className="mono-label">MODULAR UPTIME</span>
          <strong>99.99<span>%</span></strong>
          <small className="is-positive">zero failures</small>
        </div>
        <div className="result-metric">
          <span className="mono-label">TOOL FRAGMENTATION</span>
          <strong>0<span>%</span></strong>
          <small className="is-positive">unified in Axon</small>
        </div>
      </div>

      <div className="results-lower">
        <div className="results-chart-card">
          <div className="results-chart-head">
            <div>
              <span className="mono-label">API THROUGHPUT</span>
              <strong>18,520 req/sec</strong>
            </div>
            <span className="chart-legend"><i /> LAST 7 DAYS</span>
          </div>
          <div className="results-bars">
            {days.map((height, index) => (
              <span key={index}>
                <motion.i
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: height / 100, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.15 + index * 0.045, ease: [0.16, 1, 0.3, 1] }}
                />
              </span>
            ))}
          </div>
          <div className="results-days mono-label">
            <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
          </div>
        </div>

        <div className="results-log">
          <div className="results-log-head">
            <span className="mono-label">SYSTEM LOGS</span>
            <span className="live-pill"><span className="status-pulse" /> LIVE</span>
          </div>
          {[
            { icon: Check, title: "Client request dispatches to /api", time: "2s ago", tone: "lime" },
            { icon: Database, title: "Server queries data sources", time: "12s ago", tone: "blue" },
            { icon: Cpu, title: "Business logic processed successfully", time: "38s ago", tone: "white" },
            { icon: ShieldIcon, title: "Client state updated cleanly", time: "1m ago", tone: "lime" },
          ].map(({ icon: Icon, title, time, tone }) => (
            <div className="log-row" key={title}>
              <span className={`log-icon log-icon--${tone}`}><Icon size={12} /></span>
              <span>{title}</span>
              <time>{time}</time>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ShieldIcon({ size = 12 }) {
  return <Check size={size} />;
}

function Dashboard({ step }) {
  return (
    <div className="dashboard-shell">
      <div className="dash-browser">
        <div className="dash-dots">
          <span /><span /><span />
        </div>
        <div className="dash-url">
          <span className="url-lock">◇</span>
          axon.app/command
        </div>
        <span className="dash-browser-meta mono-label">SECURE</span>
      </div>

      <div className="dash-app">
        <aside className="dash-sidebar">
          <span className="dash-logo">
            <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <path d="M6.5 21.5 14 5l7.5 16.5h-4.1L14 13.3l-3.4 8.2H6.5Z" fill="currentColor" />
              <circle cx="21.4" cy="6.3" r="2.1" fill="currentColor" />
            </svg>
          </span>
          <div className="dash-side-icons">
            <span className="is-active"><LayoutDashboard size={15} /></span>
            <span><Workflow size={15} /></span>
            <span><Bot size={15} /></span>
            <span><Database size={15} /></span>
            <span><Users size={15} /></span>
          </div>
          <span className="dash-side-bottom"><Settings size={15} /></span>
        </aside>

        <div className="dash-main">
          <div className="dash-header">
            <div className="dash-workspace">
              <span className="workspace-avatar">A</span>
              <div>
                <span className="mono-label">ATLAS LABS</span>
                <strong>Command center</strong>
              </div>
            </div>
            <div className="dash-header-actions">
              <span className="dash-search"><Search size={13} /> <span>Search</span> <kbd>⌘K</kbd></span>
              <span className="dash-notification"><Bell size={14} /><i /></span>
              <span className="dash-user">AM</span>
            </div>
          </div>

          <div className="dash-content">
            <div className="dash-page-head">
              <div>
                <span className="mono-label">WORKSPACE / AUTOMATIONS</span>
                <h4>
                  {step === 0 && "Create something brilliant."}
                  {step === 1 && "Your agents are in motion."}
                  {step === 2 && "Everything is working."}
                </h4>
              </div>
              <div className="dash-page-actions">
                <span className="live-pill"><span className="status-pulse" /> LIVE</span>
                <button type="button" className="dash-secondary"><Plus size={13} /> New</button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {step === 0 && <PromptPanel key="prompt" />}
              {step === 1 && <CanvasPanel key="canvas" />}
              {step === 2 && <ResultsPanel key="results" />}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const stepProgressRef = useRef(null);
  const railProgressRef = useRef(null);
  const triggerRef = useRef(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const media = gsap.matchMedia();

    media.add("(min-width: 901px)", () => {
      const context = gsap.context(() => {
        gsap.set(stepProgressRef.current, { scaleY: 0 });
        gsap.set(railProgressRef.current, { scaleX: 0 });

        const tween = gsap.to(track, {
          xPercent: -66.6667,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.9,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const value = self.progress;
              const next = value < 0.25 ? 0 : value < 0.75 ? 1 : 2;
              setStep((current) => (current === next ? current : next));
              gsap.set(stepProgressRef.current, { scaleY: value });
              gsap.set(railProgressRef.current, { scaleX: value });
            },
          },
        });

        triggerRef.current = tween.scrollTrigger;
      }, section);

      return () => {
        triggerRef.current = null;
        context.revert();
      };
    });

    media.add("(max-width: 900px)", () => {
      gsap.set(track, { xPercent: 0 });
      gsap.set(stepProgressRef.current, { scaleY: 1 });
      gsap.set(railProgressRef.current, { scaleX: 1 });
    });

    return () => media.revert();
  }, []);

  const goToStep = (index) => {
    const section = sectionRef.current;
    const trigger = triggerRef.current;

    if (window.matchMedia("(max-width: 900px)").matches) {
      setStep(index);
      gsap.set(stepProgressRef.current, { scaleY: (index + 1) / 3 });
      const visual = section?.querySelector(".command-visual");
      const top = visual
        ? window.scrollY + visual.getBoundingClientRect().top - 84
        : section?.offsetTop ?? 0;

      if (window.__lenis) {
        window.__lenis.scrollTo(top, { duration: 1.2 });
      } else {
        window.scrollTo({ top, behavior: "smooth" });
      }
      return;
    }

    if (!trigger && !section) return;
    const top = trigger
      ? trigger.start + (trigger.end - trigger.start) * (index / 2)
      : section.offsetTop + (section.offsetHeight - window.innerHeight) * (index / 2);

    if (window.__lenis) {
      window.__lenis.scrollTo(top, { duration: 1.4 });
    } else {
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <section className="command-section" id="platform" ref={sectionRef}>
      <div className="command-sticky">
        <div className="command-bg" />
        <div className="command-floor" aria-hidden="true" />
        <div className="command-noise" />
        <div className="container command-layout">
          <div className="command-side">
            <div className="section-kicker">
              <span className="section-kicker-dot" />
              <span className="mono-label">HOW IT WORKS</span>
              <span className="section-index mono-label">02 / 04</span>
            </div>

            <h2 className="command-title">
              Client interaction to
              <br />
              <em>backend execution.</em>
            </h2>

            <p className="command-lede">
              Axon organizes responsibilities across independent frontend and backend
              components. Structured API communication keeps workflows predictable,
              modular, and easy to maintain.
            </p>

            <div className="command-steps">
              {steps.map((item, index) => (
                <button
                  type="button"
                  className={`command-step ${step === index ? "is-active" : ""}`}
                  key={item.number}
                  onClick={() => goToStep(index)}
                >
                  <span className="command-step-num mono-label">{item.number}</span>
                  <span className="command-step-copy">
                    <strong>{item.title}</strong>
                    <span>{item.copy}</span>
                  </span>
                  <span className="command-step-indicator">
                    <ArrowUpRight size={14} />
                  </span>
                </button>
              ))}
              <span className="command-progress">
                <span ref={stepProgressRef} />
              </span>
            </div>

            <div className="command-meta">
              <span className="mono-label"><Command size={13} /> MODULAR ARCHITECTURE</span>
              <span className="mono-label">CLIENT · SERVER · API</span>
            </div>
          </div>

          <div className="command-visual">
            <div className="command-visual-glow" />
            <Tilt3D className="command-visual-window" max={5} scale={1.006}>
              <div className="command-track" ref={trackRef}>
                {steps.map((item, index) => (
                  <div
                    className={`command-dashboard-slide ${step === index ? "is-active" : ""}`}
                    key={item.number}
                    aria-hidden={step !== index}
                  >
                    <Dashboard step={index} />
                  </div>
                ))}
              </div>
            </Tilt3D>
            <div className="command-visual-progress">
              <span ref={railProgressRef} />
            </div>
            <div className="visual-caption">
              <span><span className="status-pulse" /> SYSTEM SYNCHRONIZED</span>
              <span className="mono-label">
                {steps[step].number} / 03 · {["CLIENT UI", "API SERVER", "STATE SYNC"][step]}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
