import { useEffect, useState } from "react";
import { useSmoothScroll } from "./hooks/useSmoothScroll";
import Preloader from "./components/Preloader";
import Cursor from "./components/Cursor";
import ScrollProgress from "./components/ScrollProgress";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Marquee from "./components/Marquee";
import Bento from "./components/Bento";
import CommandCenter from "./components/CommandCenter";
import Metrics from "./components/Metrics";
import Testimonials from "./components/Testimonials";
import Pricing from "./components/Pricing";
import CTA from "./components/CTA";
import Footer from "./components/Footer";
import ScrollEffects from "./components/ScrollEffects";
import Atmosphere from "./components/three/Atmosphere";
import GitHubAuthModal from "./components/GitHubAuthModal";
import AcceptInviteModal from "./components/AcceptInviteModal";
import CEODashboard from "./components/CEODashboard";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { currentView } = useAuth();
  const [ready, setReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  // Lenis is reserved for the cinematic landing page. The authenticated
  // workspace uses native scrolling so every studio panel, modal, code viewer
  // and nested list keeps its own scroll context intact.
  useSmoothScroll(ready && currentView !== "dashboard");

  useEffect(() => {
    window.scrollTo(0, 0);
    window.__lenis?.scrollTo(0, { immediate: true });

    if (currentView === "dashboard") {
      setReady(true);
      setShowLoader(false);
      document.documentElement.classList.remove("is-loading");
      document.documentElement.classList.add("dashboard-active");
      document.body.classList.remove("menu-open");
      window.__lenis?.stop();
      window.__lenis?.resize();
    } else {
      document.documentElement.classList.remove("dashboard-active");
    }

    return () => {
      document.documentElement.classList.remove("is-loading");
      document.body.classList.remove("menu-open");
    };
  }, [currentView]);

  // Keep the landing page locked while the preloader is running.
  useEffect(() => {
    if (currentView === "dashboard") return;
    document.documentElement.classList.toggle("is-loading", !ready);
  }, [currentView, ready]);

  const finishLoading = () => {
    setShowLoader(false);
    window.scrollTo(0, 0);
  };

  const revealSite = () => {
    setReady(true);
    document.documentElement.classList.remove("is-loading");
    window.scrollTo(0, 0);
  };

  return (
    <>
      <GitHubAuthModal />
      <AcceptInviteModal />

      {/* Synchronized Global Visuals: Custom Animated Cursor, Three.js Atmosphere & Noise Texture */}
      <Atmosphere />
      <Cursor />
      <div className="site-noise" aria-hidden="true" />

      {currentView === "dashboard" ? (
        <ErrorBoundary>
          <CEODashboard />
        </ErrorBoundary>
      ) : (
        <>
          {showLoader && <Preloader onReveal={revealSite} onComplete={finishLoading} />}
          <ScrollProgress />
          <Navbar ready={ready} />
          <ScrollEffects ready={ready} />

          <main>
            <Hero ready={ready} />
            <Marquee />
            <Bento />
            <CommandCenter />
            <Metrics />
            <Testimonials />
            <Pricing />
            <CTA />
          </main>

          <Footer />
        </>
      )}
    </>
  );
}
