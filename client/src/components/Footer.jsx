import { ArrowUp, ArrowUpRight, Github, Globe, Linkedin, Twitter } from "lucide-react";
import Brand from "./Brand";
import Magnetic from "./Magnetic";
import Reveal from "./Reveal";
import { scrollToSection } from "../hooks/useSmoothScroll";

const columns = [
  {
    title: "ARCHITECTURE",
    links: [
      { label: "Client Frontend", href: "#features" },
      { label: "Server Logic", href: "#platform" },
      { label: "API Integration", href: "#platform" },
      { label: "Modularity Spec", href: "#features" },
      { label: "Scalability Guide", href: "#metrics" },
    ],
  },
  {
    title: "PRINCIPLES",
    links: [
      { label: "Modularity", href: "#features" },
      { label: "Scalability", href: "#metrics" },
      { label: "Maintainability", href: "#features" },
      { label: "Integration", href: "#platform" },
      { label: "Developer Experience", href: "#platform" },
    ],
  },
  {
    title: "RESOURCES",
    links: [
      { label: "Documentation", href: "#platform" },
      { label: "API Reference", href: "#platform" },
      { label: "Client Guidelines", href: "#features" },
      { label: "Server Specification", href: "#platform" },
      { label: "System Status", href: "#home" },
    ],
  },
  {
    title: "PROJECT",
    links: [
      { label: "Overview", href: "#home" },
      { label: "Vision", href: "#platform" },
      { label: "GitHub Repository", href: "https://github.com/bharatSati/saas-landing" },
      { label: "Changelog", href: "#home" },
    ],
  },
];

const socials = [
  { icon: Twitter, label: "X / Twitter" },
  { icon: Github, label: "GitHub" },
  { icon: Linkedin, label: "LinkedIn" },
  { icon: Globe, label: "Website" },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid-bg" />
      <div className="footer-horizon" aria-hidden="true" />
      <div className="container">
        <div className="footer-top">
          <Reveal className="footer-brand" delay={0.02}>
            <Brand />
            <p>
              The unified software workspace built on a modular client-server architecture.
              <br />
              Reducing fragmentation, engineered to scale.
            </p>
            <a href="#platform" className="hiring-pill" onClick={(e) => { e.preventDefault(); scrollToSection("#platform"); }}>
              <span className="status-pulse" />
              CLIENT &amp; SERVER ARCHITECTURE · V1.0
              <ArrowUpRight size={13} />
            </a>
            <div className="footer-socials">
              {socials.map(({ icon: Icon, label }) => (
                <a href="#home" key={label} aria-label={label} onClick={(e) => e.preventDefault()}>
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </Reveal>

          <div className="footer-columns">
            {columns.map((column, index) => (
              <Reveal className="footer-column" key={column.title} delay={0.04 + index * 0.04}>
                <span className="mono-label">{column.title}</span>
                {column.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToSection(link.href);
                    }}
                  >
                    {link.label}
                  </a>
                ))}
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal className="footer-status" delay={0.05}>
          <span className="footer-status-left">
            <span className="status-pulse" />
            ALL SYSTEMS OPERATIONAL
          </span>
          <span className="footer-status-center mono-label">
            SAN FRANCISCO · LONDON · TOKYO · REMOTE
          </span>
          <span className="footer-status-right mono-label">
            LAT 34.0522° N · LON 118.2437° W
          </span>
        </Reveal>

        <div className="footer-wordmark-wrap">
          <div className="footer-wordmark" data-text="AXON" aria-hidden="true">AXON</div>
          <div className="footer-wordmark-glow" />
        </div>

        <div className="footer-bottom">
          <span>© 2026 Axon Labs, Inc. All rights reserved.</span>
          <span className="footer-crafted mono-label">
            CRAFTED WITH THREE.JS · GSAP · RIVE · LENIS · MOTION
          </span>
          <Magnetic strength={0.24}>
            <button
              type="button"
              className="back-to-top"
              onClick={() => scrollToSection("#home")}
              aria-label="Back to top"
            >
              <ArrowUp size={16} />
            </button>
          </Magnetic>
        </div>
      </div>
    </footer>
  );
}
