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
import CEODashboard from "./components/CEODashboard";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { currentView } = useAuth();
  const [ready, setReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  // Smooth scroll with Lenis active across landing and dashboard
  useSmoothScroll(ready);

  useEffect(() => {
    window.scrollTo(0, 0);
    window.__lenis?.scrollTo(0, { immediate: true });

    if (currentView === "dashboard") {
      setReady(true);
      setShowLoader(false);
      document.documentElement.classList.remove("is-loading");
      document.documentElement.classList.add("dashboard-active");
      document.body.classList.remove("menu-open");
      window.__lenis?.start();
      window.__lenis?.resize();
    } else {
      document.documentElement.classList.remove("dashboard-active");
    }

    return () => {
      document.documentElement.classList.remove("is-loading");
      document.body.classList.remove("menu-open");
    };
  }, [currentView]);

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

      {/* Synchronized Global Visuals: Custom Animated Cursor, Three.js Atmosphere & Noise Texture */}
      <Atmosphere />
      <Cursor />
      <div className="site-noise" aria-hidden="true" />

      {currentView === "dashboard" ? (
        <CEODashboard />
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
