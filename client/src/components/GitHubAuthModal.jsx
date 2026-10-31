import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Github, ShieldCheck, ArrowRight, Sparkles, Terminal } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function GitHubAuthModal() {
  const { isAuthModalOpen, setIsAuthModalOpen, loginWithGitHub, devLogin, authError } = useAuth();
  const [customUser, setCustomUser] = useState("bharatSati");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleDevSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await devLogin(customUser, customUser === "bharatSati" ? "Bharat Sati" : customUser);
    setIsSubmitting(false);
  };

  return (
    <AnimatePresence>
      <div className="auth-modal-backdrop" onClick={() => setIsAuthModalOpen(false)}>
        <motion.div
          className="auth-modal-dialog"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <button
            type="button"
            className="auth-modal-close"
            onClick={() => setIsAuthModalOpen(false)}
            aria-label="Close authentication modal"
          >
            <X size={18} />
          </button>

          <div className="auth-modal-header">
            <div className="auth-github-icon-badge">
              <Github size={28} />
            </div>
            <div className="mono-label auth-badge">
              <ShieldCheck size={13} />
              STRICT GITHUB AUTHENTICATION
            </div>
            <h3>Sign in to Axon Workspace</h3>
            <p>
              Access the CEO Management Console strictly using your verified GitHub account.
            </p>
          </div>

          {authError && (
            <div className="auth-error-banner">
              <span>{authError}</span>
              <small>Configure GITHUB_CLIENT_ID &amp; GITHUB_CLIENT_SECRET in server/.env for production OAuth.</small>
            </div>
          )}

          <div className="auth-modal-actions">
            <button
              type="button"
              className="button button--large button--github"
              onClick={loginWithGitHub}
            >
              <Github size={19} />
              <span>Continue with GitHub</span>
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="auth-divider">
            <span>OR TEST AS CEO LOCALLY</span>
          </div>

          <div className="auth-dev-section">
            <button
              type="button"
              className="button button--lime button--large dev-ceo-btn"
              onClick={() => devLogin("bharatSati", "Bharat Sati")}
              disabled={isSubmitting}
            >
              <Sparkles size={16} />
              <span>Sign in as CEO (@bharatSati)</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              className="toggle-custom-btn"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Terminal size={12} />
              {showAdvanced ? "Hide custom username" : "Use custom GitHub username"}
            </button>

            {showAdvanced && (
              <form onSubmit={handleDevSubmit} className="auth-custom-form">
                <input
                  type="text"
                  value={customUser}
                  onChange={(e) => setCustomUser(e.target.value)}
                  placeholder="Enter GitHub handle"
                  required
                />
                <button type="submit" className="button button--small button--ghost">
                  Login
                </button>
              </form>
            )}
          </div>

          <div className="auth-modal-footer mono-label">
            <span>ROLE: CEO &amp; WORKSPACE OWNER</span>
            <span>DATA ENCRYPTED</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
