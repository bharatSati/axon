import { useState } from "react";
import { motion } from "motion/react";
import { useRive } from "@rive-app/react-canvas";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Check,
  Code2,
  Fingerprint,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";
import Tilt3D from "./Tilt3D";
import IntegrationScene from "./three/IntegrationScene";

function SpotlightCard({ children, className = "", delay = 0 }) {
  return (
    <motion.div
      className={`tilt-slot ${className}`}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <Tilt3D className="bento-card">{children}</Tilt3D>
    </motion.div>
  );
}

function WorkflowCard() {
  return (
    <SpotlightCard className="bento-card--workflow" delay={0.02}>
      <div className="bento-top">
        <span className="bento-tag mono-label">
          <Workflow size={13} />
          MODULARITY
        </span>
        <span className="bento-arrow" data-cursor>
          <ArrowUpRight size={17} />
        </span>
      </div>

      <div className="bento-copy">
        <h3>Modular components. Clean boundaries.</h3>
        <p>
          Each component maintains independent responsibilities. Extend capabilities,
          add new services, and scale without destabilizing your existing stack.
        </p>
      </div>

      <div className="flow-visual">
        <div className="flow-grid" />
        <svg className="flow-lines" viewBox="0 0 520 290" fill="none" preserveAspectRatio="none">
          <defs>
            <linearGradient id="flowLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#c8ff3d" stopOpacity="0.08" />
              <stop offset="50%" stopColor="#c8ff3d" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#c8ff3d" stopOpacity="0.16" />
            </linearGradient>
          </defs>
          <path d="M 110 145 C 165 145 160 145 206 145" stroke="url(#flowLine)" strokeWidth="1.2" strokeDasharray="5 7" className="flow-path" />
          <path d="M 278 145 C 330 145 323 62 378 62" stroke="url(#flowLine)" strokeWidth="1.2" strokeDasharray="5 7" className="flow-path flow-path--two" />
          <path d="M 278 145 C 330 145 323 145 378 145" stroke="url(#flowLine)" strokeWidth="1.2" strokeDasharray="5 7" className="flow-path flow-path--three" />
          <path d="M 278 145 C 330 145 323 228 378 228" stroke="url(#flowLine)" strokeWidth="1.2" strokeDasharray="5 7" className="flow-path flow-path--four" />
        </svg>

        <div className="flow-node flow-node--trigger">
          <span className="flow-node-icon">
            <Zap size={14} />
          </span>
          <div>
            <span className="flow-node-label mono-label">FRONTEND</span>
            <strong>Client UI</strong>
          </div>
        </div>

        <div className="flow-node flow-node--agent">
          <span className="flow-agent-rings" />
          <span className="flow-node-icon flow-node-icon--agent">
            <Bot size={17} />
          </span>
          <div>
            <span className="flow-node-label mono-label">BACKEND</span>
            <strong>Server Core</strong>
          </div>
          <span className="flow-thinking">
            <i />
            processing
          </span>
        </div>

        <div className="flow-node flow-node--out flow-node--out1">
          <span className="flow-check">
            <Check size={10} strokeWidth={3} />
          </span>
          Data Logic
        </div>
        <div className="flow-node flow-node--out flow-node--out2">
          <span className="flow-check">
            <Check size={10} strokeWidth={3} />
          </span>
          API Endpoints
        </div>
        <div className="flow-node flow-node--out flow-node--out3">
          <span className="flow-check">
            <Check size={10} strokeWidth={3} />
          </span>
          Ext Services
        </div>

        <div className="flow-result">
          <span className="flow-result-dot" />
          <span>Execution complete</span>
          <strong>14ms</strong>
        </div>
      </div>
    </SpotlightCard>
  );
}

function RiveCard() {
  const [ready, setReady] = useState(false);
  const { RiveComponent } = useRive(
    {
      src: "/avatars.riv",
      autoplay: true,
      shouldDisableRiveListeners: true,
      onRiveReady: () => setReady(true),
    },
    { useDevicePixelRatio: true },
  );

  return (
    <SpotlightCard className="bento-card--rive" delay={0.1}>
      <div className="bento-top">
        <span className="bento-tag mono-label">
          <Sparkles size={13} />
          CLIENT EXPERIENCE
        </span>
        <span className="bento-arrow" data-cursor>
          <ArrowUpRight size={17} />
        </span>
      </div>

      <div className="bento-copy">
        <h3>Intuitive, responsive interface.</h3>
        <p>The client layer presents data clearly and delivers a smooth user experience.</p>
      </div>

      <div className={`rive-visual ${ready ? "is-ready" : ""}`}>
        <div className="rive-glow" />
        <div className="rive-grid" />
        <RiveComponent className="rive-canvas" />
        <div className="rive-fallback">
          <span />
          <span />
          <span />
        </div>
        <div className="rive-hud rive-hud--top mono-label">
          <span>PRESENTATION LAYER</span>
          <span className="rive-hud-value">CLIENT / UI</span>
        </div>
        <div className="rive-hud rive-hud--bottom">
          <span className="status-pulse" />
          <span className="mono-label">SMOOTH INTERACTIONS · 60FPS</span>
        </div>
      </div>
    </SpotlightCard>
  );
}

function TelemetryCard() {
  return (
    <SpotlightCard className="bento-card--telemetry" delay={0.04}>
      <div className="bento-top">
        <span className="bento-tag mono-label">
          <Activity size={13} />
          OBSERVABILITY
        </span>
        <span className="live-pill">
          <span className="status-pulse" />
          LIVE
        </span>
      </div>
      <div className="bento-copy">
        <h3>Every API transaction, visible.</h3>
        <p>Track request lifecycles, latency, and data health in real time.</p>
      </div>

      <div className="telemetry-visual">
        <div className="telemetry-number">
          <strong>18.5K</strong>
          <span>requests / sec</span>
          <span className="telemetry-delta">+24.1%</span>
        </div>
        <svg viewBox="0 0 360 150" fill="none" preserveAspectRatio="none" className="telemetry-chart">
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c8ff3d" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#c8ff3d" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="chartLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#c8ff3d" stopOpacity="0.1" />
              <stop offset="55%" stopColor="#c8ff3d" />
              <stop offset="100%" stopColor="#eaffb3" />
            </linearGradient>
          </defs>
          <path d="M0 130H360M0 90H360M0 50H360" stroke="#ffffff" strokeOpacity="0.055" strokeDasharray="2 5" />
          <motion.path
            d="M0 126 C24 122 28 104 52 108 S78 120 98 94 S124 82 142 87 S168 108 188 72 S226 48 246 60 S278 62 300 38 S330 30 360 14 L360 150 L0 150Z"
            fill="url(#chartFill)"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.4 }}
          />
          <motion.path
            d="M0 126 C24 122 28 104 52 108 S78 120 98 94 S124 82 142 87 S168 108 188 72 S226 48 246 60 S278 62 300 38 S330 30 360 14"
            stroke="url(#chartLine)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          />
          <circle cx="360" cy="14" r="4" fill="#c8ff3d" />
          <circle cx="360" cy="14" r="9" fill="#c8ff3d" fillOpacity="0.12" />
        </svg>
        <div className="telemetry-legend mono-label">
          <span>P50 LATENCY</span>
          <strong>14ms</strong>
        </div>
      </div>
    </SpotlightCard>
  );
}

function IntegrationsCard() {
  return (
    <SpotlightCard className="bento-card--integrations" delay={0.08}>
      <div className="bento-top">
        <span className="bento-tag mono-label">
          <Code2 size={13} />
          INTEGRATION
        </span>
        <span className="bento-arrow" data-cursor>
          <ArrowUpRight size={17} />
        </span>
      </div>
      <div className="bento-copy">
        <h3>Connects with your entire stack.</h3>
        <p>API-based communication links external services and tools seamlessly.</p>
      </div>

      <div className="integration-visual">
        <IntegrationScene />
        <span className="integration-count mono-label">+200 CONNECTORS</span>
      </div>
    </SpotlightCard>
  );
}

function SecurityCard() {
  return (
    <SpotlightCard className="bento-card--security" delay={0.12}>
      <div className="bento-top">
        <span className="bento-tag mono-label">
          <ShieldCheck size={13} />
          MAINTAINABILITY
        </span>
        <span className="security-badge mono-label">ENTERPRISE</span>
      </div>
      <div className="bento-copy">
        <h3>Engineered for longevity.</h3>
        <p>Organized client and server components simplify debugging, updates, and testing.</p>
      </div>

      <div className="security-visual">
        <span className="security-ring security-ring--one" />
        <span className="security-ring security-ring--two" />
        <span className="security-ring security-ring--three" />
        <div className="security-core">
          <Fingerprint size={29} strokeWidth={1.2} />
        </div>
        <div className="security-list">
          <span>
            <Check size={11} strokeWidth={3} /> Decoupled layers
          </span>
          <span>
            <Check size={11} strokeWidth={3} /> Clear API contracts
          </span>
          <span>
            <Check size={11} strokeWidth={3} /> Dedicated docs
          </span>
        </div>
      </div>
    </SpotlightCard>
  );
}

export default function Bento() {
  return (
    <section className="section features-section" id="features">
      <div className="container">
        <SectionHeading
          eyebrow="ENGINEERING PRINCIPLES"
          index="01"
          title={
            <>
              Unified architecture.
              <br />
              <em>Zero fragmentation.</em>
            </>
          }
          description="Modern applications suffer from disconnected tools and fragmented data. Axon establishes a structured environment where client, server, and external modules work together seamlessly."
        />

        <div className="bento-grid">
          <WorkflowCard />
          <RiveCard />
          <TelemetryCard />
          <IntegrationsCard />
          <SecurityCard />
        </div>

        <Reveal className="features-footer">
          <span className="features-footer-line" />
          <span className="mono-label">STRUCTURED ARCHITECTURE · INDEPENDENT MODULES · CONTINUOUS EXPANSION</span>
          <a href="#platform" className="text-link" data-cursor>
            Explore the architecture <ArrowUpRight size={15} />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
