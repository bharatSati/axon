import { scrollToSection } from "../hooks/useSmoothScroll";

export default function Brand({ className = "", onClick }) {
  return (
    <a
      href="#home"
      className={`brand ${className}`}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
        scrollToSection("#home");
      }}
      aria-label="Axon home"
    >
      <span className="brand-mark">
        <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path d="M6.5 21.5 14 5l7.5 16.5h-4.1L14 13.3l-3.4 8.2H6.5Z" fill="currentColor" />
          <circle cx="21.4" cy="6.3" r="2.1" fill="currentColor" />
        </svg>
      </span>
      <span className="brand-name">AXON</span>
    </a>
  );
}
