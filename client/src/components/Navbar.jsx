import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Github, LayoutDashboard, Menu, X, Sparkles } from "lucide-react";
import Brand from "./Brand";
import Magnetic from "./Magnetic";
import { scrollToSection } from "../hooks/useSmoothScroll";
import { useAuth } from "../context/AuthContext";

const links = [
  { label: "Workspace", href: "#features" },
  { label: "Apollo AI", href: "https://apollo-bnok-theta.vercel.app/", isExternal: true },
  { label: "Architecture", href: "#architecture" },
  { label: "How It Works", href: "#platform" },
  { label: "Principles", href: "#metrics" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar({ ready }) {
  const { user, setIsAuthModalOpen, setCurrentView } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = links
      .map((link) => document.querySelector(link.href))
      .filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        });
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (open) {
      window.__lenis?.stop();
      document.body.classList.add("menu-open");
    } else {
      window.__lenis?.start();
      document.body.classList.remove("menu-open");
    }
    return () => {
      window.__lenis?.start();
      document.body.classList.remove("menu-open");
    };
  }, [open]);

  const go = (event, href) => {
    event.preventDefault();
    setOpen(false);
    scrollToSection(href);
  };

  return (
    <>
      <motion.header
        className={`navbar ${scrolled ? "is-scrolled" : ""}`}
        initial={{ y: -28, opacity: 0 }}
        animate={ready ? { y: 0, opacity: 1 } : { y: -28, opacity: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      >
        <div className="navbar-inner container-wide">
          <Brand />

          <nav className="nav-links" aria-label="Main navigation">
            {links.map((link) => {
              if (link.isExternal) {
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nav-link-apollo"
                    title="Launch Apollo Deep Research Meta-Agent"
                  >
                    <span>{link.label}</span>
                    <ArrowUpRight size={13} />
                  </a>
                );
              }
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={active === link.href ? "is-active" : ""}
                  onClick={(event) => go(event, link.href)}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          <div className="nav-actions">
            <a
              href="https://apollo-bnok-theta.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-apollo-pill"
              title="Launch Apollo Deep Research Meta-Agent"
            >
              <Sparkles size={12} color="#c8ff3d" />
              <span>Apollo Research</span>
              <ArrowUpRight size={12} />
            </a>
            {user ? (
              <>
                <button
                  type="button"
                  className="nav-signin"
                  style={{ display: "inline-flex", alignItems: "center", gap: "7px", cursor: "pointer" }}
                  onClick={() => setCurrentView("dashboard")}
                >
                  <img
                    src={user.avatar || (user.username ? `https://avatars.githubusercontent.com/${user.username}` : "https://avatars.githubusercontent.com/ghost")}
                    alt={user.name || user.username || "User"}
                    style={{ width: "20px", height: "20px", borderRadius: "50%", border: "1px solid #c8ff3d" }}
                  />
                  <span>CEO Console</span>
                </button>
                <Magnetic strength={0.18}>
                  <button
                    type="button"
                    className="button button--small button--lime"
                    onClick={() => setCurrentView("dashboard")}
                  >
                    <LayoutDashboard size={14} />
                    <span>Dashboard</span>
                  </button>
                </Magnetic>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="nav-signin"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
                  onClick={() => setIsAuthModalOpen(true)}
                >
                  <Github size={14} />
                  <span>Sign in with GitHub</span>
                </button>
                <Magnetic strength={0.18}>
                  <button
                    type="button"
                    className="button button--small button--lime"
                    onClick={() => setIsAuthModalOpen(true)}
                  >
                    <span>Launch Workspace</span>
                    <ArrowUpRight size={15} strokeWidth={2} />
                  </button>
                </Magnetic>
              </>
            )}
            <button
              type="button"
              className="menu-toggle"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={19} />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="mobile-menu"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="mobile-menu-glow" />
            <div className="mobile-menu-top">
              <Brand onClick={() => setOpen(false)} />
              <button
                type="button"
                className="menu-close"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <X size={22} />
              </button>
            </div>

            <nav className="mobile-links" aria-label="Mobile navigation">
              {links.map((link, index) => {
                if (link.isExternal) {
                  return (
                    <motion.a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ y: 42, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.16 + index * 0.06, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                      style={{ color: "#c8ff3d" }}
                    >
                      <span className="mobile-link-index">0{index + 1}</span>
                      {link.label}
                      <ArrowUpRight size={24} />
                    </motion.a>
                  );
                }
                return (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    onClick={(event) => go(event, link.href)}
                    initial={{ y: 42, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.16 + index * 0.06, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className="mobile-link-index">0{index + 1}</span>
                    {link.label}
                    <ArrowUpRight size={24} />
                  </motion.a>
                );
              })}
            </nav>

            <div className="mobile-menu-footer">
              {user ? (
                <button
                  type="button"
                  className="button button--lime button--wide"
                  onClick={() => { setOpen(false); setCurrentView("dashboard"); }}
                >
                  <LayoutDashboard size={18} />
                  Open CEO Dashboard
                </button>
              ) : (
                <button
                  type="button"
                  className="button button--lime button--wide"
                  onClick={() => { setOpen(false); setIsAuthModalOpen(true); }}
                >
                  <Github size={18} />
                  Sign in with GitHub
                </button>
              )}
              <div className="mobile-socials mono-label">
                <span>X / TWITTER</span>
                <span>LINKEDIN</span>
                <span>GITHUB</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
