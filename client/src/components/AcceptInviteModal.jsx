import { useState, useEffect } from "react";
import {
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  X,
  Github,
  Building,
  UserCheck,
  Shield,
  ArrowRight,
  Sparkles,
  RefreshCw,
  LogOut
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../config/api.js";

export default function AcceptInviteModal() {
  const { user, token, setIsAuthModalOpen, setCurrentView } = useAuth();
  const [inviteToken, setInviteToken] = useState(null);
  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isDismissed, setIsDismissed] = useState(false);

  // 1. Detect ?invite= in URL or sessionStorage on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("invite");
    const storedToken = sessionStorage.getItem("axon_pending_invite");

    const activeToken = tokenFromUrl || storedToken;
    if (activeToken) {
      setInviteToken(activeToken);
      sessionStorage.setItem("axon_pending_invite", activeToken);
      fetchInviteInfo(activeToken);
    }
  }, []);

  // 2. Fetch invitation metadata
  const fetchInviteInfo = async (t) => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await fetch(`${API_BASE}/invitations/token/${t}`);
      const data = await res.json();
      if (res.ok && data.invitation) {
        setInviteData(data.invitation);
      } else {
        setErrorMsg(data.error || "Invitation link is invalid or has expired.");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to Axon server.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Accept Invitation (Requires matching GitHub account)
  const handleAcceptInvite = async () => {
    if (!token || !user) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      setAccepting(true);
      setErrorMsg("");

      const res = await fetch(`${API_BASE}/invitations/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ token: inviteToken })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || `Successfully joined ${inviteData?.workspaceName}!`);
        sessionStorage.removeItem("axon_pending_invite");
        if (data.workspaceId) {
          localStorage.setItem("axon_active_workspace_id", data.workspaceId);
        }

        // Clean query param from URL
        const url = new URL(window.location.href);
        url.searchParams.delete("invite");
        window.history.replaceState({}, document.title, url.pathname);

        setTimeout(() => {
          setCurrentView("dashboard");
          setIsDismissed(true);
          window.location.reload();
        }, 1800);
      } else {
        setErrorMsg(data.error || "Failed to accept invitation.");
      }
    } catch (err) {
      setErrorMsg("Network error accepting invitation.");
    } finally {
      setAccepting(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.removeItem("axon_pending_invite");
    const url = new URL(window.location.href);
    url.searchParams.delete("invite");
    window.history.replaceState({}, document.title, url.pathname);
    setIsDismissed(true);
  };

  if (isDismissed || !inviteToken) return null;

  const currentUsername = user?.username?.toLowerCase() || "";
  const targetUsername = inviteData?.targetGithubUsername?.toLowerCase() || "";
  const isMatch = Boolean(currentUsername && currentUsername === targetUsername);
  const isMismatched = Boolean(currentUsername && currentUsername !== targetUsername);

  return (
    <div className="modal-backdrop">
      <div className="accept-invite-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-head">
          <div className="mono-label modal-kicker">
            <Sparkles size={14} />
            <span>AXON WORKSPACE INVITATION</span>
          </div>
          <button type="button" className="modal-close-btn" onClick={handleDismiss}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="accept-modal-body">
          {loading ? (
            <div className="accept-loading mono-label">
              <RefreshCw size={24} className="spin" color="#c8ff3d" />
              <span>Verifying invitation link with GitHub security...</span>
            </div>
          ) : errorMsg ? (
            <div className="accept-error-state">
              <AlertCircle size={32} color="#f87171" />
              <h4>Invitation Error</h4>
              <p>{errorMsg}</p>
              <button
                type="button"
                className="dismiss-btn mono-label"
                onClick={handleDismiss}
              >
                Dismiss
              </button>
            </div>
          ) : successMsg ? (
            <div className="accept-success-state">
              <CheckCircle2 size={36} color="#34d399" />
              <h4>Welcome to the Team!</h4>
              <p>{successMsg}</p>
              <div className="mono-label loading-redirect">
                <RefreshCw size={14} className="spin" />
                <span>Redirecting to workspace dashboard...</span>
              </div>
            </div>
          ) : inviteData ? (
            <div className="invite-details-box">
              {/* Workspace Badge */}
              <div className="workspace-invite-badge">
                <Building size={20} />
                <div>
                  <span className="mono-label subhead">WORKSPACE</span>
                  <h3 className="ws-name">{inviteData.workspaceName}</h3>
                </div>
              </div>

              {/* Invited Role & Position */}
              <div className="invite-position-card">
                <span className="mono-label kicker">OFFERED POSITION &amp; ROLE:</span>
                <div className="pos-title-wrap">
                  <h4>{inviteData.position}</h4>
                  <span className={`mono-label role-badge role-badge--${inviteData.role}`}>
                    {inviteData.role?.toUpperCase()}
                  </span>
                </div>
                <span className="dept-tag mono-label">Department: {inviteData.department}</span>
              </div>

              {/* Invited By */}
              {inviteData.invitedBy?.username && (
                <div className="inviter-meta mono-label">
                  <span>Invited by: <strong>@{inviteData.invitedBy.username}</strong> ({inviteData.invitedBy.name || "CEO"})</span>
                </div>
              )}

              {/* Strict GitHub Identity Guard Card */}
              <div className={`github-guard-card ${isMismatched ? "is-mismatched" : isMatch ? "is-matched" : ""}`}>
                <div className="guard-head mono-label">
                  <Github size={13} />
                  <span>STRICT GITHUB IDENTITY VERIFICATION</span>
                </div>
                <p>
                  This invitation is strictly reserved for: <strong>@{inviteData.targetGithubUsername}</strong>
                </p>

                {/* Status indicators */}
                {!user ? (
                  <div className="guard-status mono-label status-not-logged">
                    <span>You are not signed in. Please sign in with GitHub as @{inviteData.targetGithubUsername} to accept.</span>
                  </div>
                ) : isMatch ? (
                  <div className="guard-status mono-label status-matched">
                    <CheckCircle2 size={13} color="#34d399" />
                    <span>Verified: You are authenticated as @{user.username}</span>
                  </div>
                ) : (
                  <div className="guard-status mono-label status-mismatched">
                    <AlertCircle size={13} color="#f87171" />
                    <span>
                      Mismatch: You are currently signed in as @{user.username}. Only @{inviteData.targetGithubUsername} can join.
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="accept-actions">
                {!user ? (
                  <button
                    type="button"
                    className="accept-submit-btn mono-label"
                    onClick={() => setIsAuthModalOpen(true)}
                  >
                    <Github size={15} />
                    <span>Sign In with GitHub as @{inviteData.targetGithubUsername}</span>
                  </button>
                ) : isMatch ? (
                  <button
                    type="button"
                    className="accept-submit-btn mono-label is-ready"
                    onClick={handleAcceptInvite}
                    disabled={accepting}
                  >
                    {accepting ? (
                      <RefreshCw size={15} className="spin" />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    <span>{accepting ? "Joining Workspace..." : "Accept Invitation & Join Workspace"}</span>
                  </button>
                ) : (
                  <div className="mismatched-actions">
                    <button
                      type="button"
                      className="switch-acc-btn mono-label"
                      onClick={() => setIsAuthModalOpen(true)}
                    >
                      <LogOut size={13} />
                      <span>Switch GitHub Account</span>
                    </button>
                    <button
                      type="button"
                      className="cancel-btn mono-label"
                      onClick={handleDismiss}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
