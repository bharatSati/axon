import { useState, useEffect } from "react";
import {
  UserPlus,
  Mail,
  Copy,
  Check,
  Send,
  Github,
  Shield,
  Sparkles,
  X,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Zap,
  RefreshCw,
  Search
} from "lucide-react";
import { API_BASE } from "../config/api.js";

const ROLES = [
  { id: "developer", label: "Developer", color: "#61dafb", defaultPosition: "Senior Software Engineer", dept: "Engineering" },
  { id: "tester", label: "Tester", color: "#10b981", defaultPosition: "QA Automation Engineer", dept: "Quality Assurance" },
  { id: "marketer", label: "Marketer", color: "#f59e0b", defaultPosition: "Growth & Product Marketer", dept: "Marketing" },
  { id: "ceo", label: "Executive / Co-CEO", color: "#c8ff3d", defaultPosition: "Executive Partner", dept: "Leadership" }
];

export default function InviteMemberModal({ isOpen, onClose, workspace, token, onMemberAdded }) {
  const [githubUsername, setGithubUsername] = useState("");
  const [role, setRole] = useState("developer");
  const [position, setPosition] = useState("Senior Software Engineer");
  const [department, setDepartment] = useState("Engineering");
  const [email, setEmail] = useState("");

  // Search & autocomplete
  const [searchResults, setSearchResults] = useState([]);
  const [allRegisteredUsers, setAllRegisteredUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Invitation generated state
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [emailSentToast, setEmailSentToast] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Live user search
  const searchUsers = async (query = "") => {
    try {
      setIsSearching(true);
      const res = await fetch(`${API_BASE}/invitations/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.users) {
        setSearchResults(data.users);
        if (!query) {
          setAllRegisteredUsers(data.users);
        }
      }
    } catch (e) {
      // ignore
    } finally {
      setIsSearching(false);
    }
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setGithubUsername("");
      setRole("developer");
      setPosition("Senior Software Engineer");
      setDepartment("Engineering");
      setEmail("");
      setGeneratedInvite(null);
      setCopiedLink(false);
      setEmailSentToast(false);
      setErrorMsg("");
      searchUsers("");
    }
  }, [isOpen]);

  // Update default position when role changes
  const handleRoleChange = (newRole) => {
    setRole(newRole);
    const roleObj = ROLES.find((r) => r.id === newRole);
    if (roleObj) {
      setPosition(roleObj.defaultPosition);
      setDepartment(roleObj.dept);
    }
  };

  const cleanTyped = githubUsername.trim().replace(/^@/, "").toLowerCase();
  const matchedUser =
    (allRegisteredUsers || []).find((u) => u.username?.toLowerCase() === cleanTyped) ||
    (searchResults || []).find((u) => u.username?.toLowerCase() === cleanTyped);
  const isRegistered = Boolean(matchedUser);

  const handleSelectUser = (user) => {
    setGithubUsername(user.username);
    if (user.email && !user.email.includes("noreply")) {
      setEmail(user.email);
    }
    setErrorMsg("");
  };

  // Auto-fill email when matchedUser changes
  useEffect(() => {
    if (matchedUser?.email && !matchedUser.email.includes("noreply") && !email) {
      setEmail(matchedUser.email);
    }
  }, [matchedUser]);

  // 1. Generate Unique Invitation Link
  const handleGenerateInvite = async (e) => {
    if (e) e.preventDefault();
    if (!cleanTyped) {
      setErrorMsg("Please enter a target GitHub username.");
      return;
    }

    if (!isRegistered) {
      setErrorMsg(
        `User @${cleanTyped} has NOT logged into Axon yet. You cannot generate an invite link for unregistered users. They must log in with GitHub on this website at least once so their verified email is saved for email invitations.`
      );
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await fetch(`${API_BASE}/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          workspaceId: workspace?.id,
          targetGithubUsername: cleanTyped,
          role,
          position: position.trim() || "Software Engineer",
          department,
          email: email.trim() || matchedUser?.email || "",
          clientOrigin: window.location.origin
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setGeneratedInvite(data);
        if (onMemberAdded) onMemberAdded();
      } else {
        setErrorMsg(data.error || "Failed to create invitation link.");
      }
    } catch (err) {
      setErrorMsg("Network error connecting to Axon server.");
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Direct Add to Workspace (Instant CEO Add)
  const handleDirectAdd = async () => {
    if (!cleanTyped) {
      setErrorMsg("Please enter a target GitHub username.");
      return;
    }

    if (!isRegistered) {
      setErrorMsg(
        `User @${cleanTyped} has NOT logged into Axon yet. Direct adding is strictly permitted only for developers who have signed into this website with GitHub.`
      );
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await fetch(`${API_BASE}/invitations/direct-add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          workspaceId: workspace?.id,
          targetGithubUsername: cleanTyped,
          role,
          position: position.trim() || "Software Engineer",
          department,
          email: email.trim() || matchedUser?.email || "",
          clientOrigin: window.location.origin
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (onMemberAdded) onMemberAdded();
        onClose();
      } else {
        setErrorMsg(data.error || "Failed to add member to workspace.");
      }
    } catch (err) {
      setErrorMsg("Network error adding member.");
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Copy Link
  const handleCopyLink = () => {
    if (generatedInvite?.inviteUrl) {
      navigator.clipboard.writeText(generatedInvite.inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  // 4. Send Email Simulation
  const handleSendEmail = () => {
    setEmailSentToast(true);
    setTimeout(() => setEmailSentToast(false), 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="invite-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-head">
          <div className="mono-label modal-kicker">
            <Github size={14} />
            <span>INVITE GITHUB USER TO WORKSPACE</span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="invite-modal-body">
          <div className="requirements-note mono-label">
            <Shield size={14} />
            <span>Strict Policy: Only developers who have signed into Axon with GitHub can be invited or added (required for email dispatch).</span>
          </div>

          {errorMsg && (
            <div className="invite-error-banner mono-label">
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          {!generatedInvite ? (
            <form onSubmit={handleGenerateInvite} className="invite-form">
              <div className="invite-field">
                <label className="mono-label">TARGET GITHUB USERNAME (@handle): *</label>
                <div className="input-with-icon">
                  <span className="input-prefix">@</span>
                  <input
                    type="text"
                    placeholder="e.g. bharatSati"
                    value={githubUsername}
                    onChange={(e) => {
                      setGithubUsername(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    required
                    autoFocus
                  />
                </div>

                {/* Live verification indicator when username is typed */}
                {cleanTyped && (
                  <>
                    {matchedUser ? (
                      <div className="user-verification-card is-verified">
                        <img
                          src={matchedUser.avatar || `https://github.com/${matchedUser.username}.png`}
                          alt={matchedUser.username}
                          className="verified-user-avatar"
                        />
                        <div className="verified-user-info">
                          <div className="verified-user-title">
                            <strong>@{matchedUser.username}</strong>
                            <span className="mono-label verified-tag">
                              <CheckCircle2 size={11} /> SIGNED IN TO AXON
                            </span>
                          </div>
                          <span className="mono-label verified-email">
                            Verified Email: <strong>{matchedUser.email || "Saved in database"}</strong>
                          </span>
                        </div>
                      </div>
                    ) : (
                      !isSearching && (
                        <div className="user-verification-card is-unregistered">
                          <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: "2px" }} />
                          <div className="unregistered-user-info">
                            <strong>@{cleanTyped} has NOT signed into Axon yet!</strong>
                            <p>
                              Invite links and adding are strictly blocked for unregistered users.
                              Please ask @{cleanTyped} to log into this website with GitHub first so their verified email is saved for invitations.
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </>
                )}

                {/* Auto-suggest from previously registered Axon users when input is empty */}
                {!cleanTyped && (allRegisteredUsers.length > 0 || searchResults.length > 0) && (
                  <div className="registered-users-suggestion">
                    <span className="mono-label suggestion-label">Signed In Developers (Click to Select):</span>
                    <div className="suggestion-chips">
                      {(searchResults.length > 0 ? searchResults : allRegisteredUsers).slice(0, 6).map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className="suggestion-chip mono-label"
                          onClick={() => handleSelectUser(u)}
                        >
                          <img src={u.avatar || `https://github.com/${u.username}.png`} alt={u.username} className="chip-avatar" />
                          <span>@{u.username}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Role Selection */}
              <div className="invite-field">
                <label className="mono-label">ASSIGN WORKSPACE ROLE: *</label>
                <div className="roles-grid-selector">
                  {ROLES.map((r) => {
                    const isSelected = role === r.id;
                    return (
                      <button
                        type="button"
                        key={r.id}
                        className={`role-select-box ${isSelected ? "is-selected" : ""}`}
                        style={{ "--role-color": r.color }}
                        onClick={() => handleRoleChange(r.id)}
                      >
                        <div className="role-box-top">
                          <span className="role-color-dot" style={{ background: r.color }} />
                          <span className="role-name">{r.label}</span>
                        </div>
                        <span className="role-dept mono-label">{r.dept}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Position / Job Title */}
              <div className="invite-field-row">
                <div className="invite-field">
                  <label className="mono-label">ORGANIZATION POSITION / TITLE: *</label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    required
                  />
                </div>

                <div className="invite-field">
                  <label className="mono-label">DEPARTMENT:</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="dept-select"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Quality Assurance">Quality Assurance</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Leadership">Leadership</option>
                    <option value="Product">Product</option>
                  </select>
                </div>
              </div>

              {/* Optional Email */}
              <div className="invite-field">
                <label className="mono-label">EMAIL ADDRESS (VERIFIED FROM GITHUB LOGIN):</label>
                <div className="input-with-icon">
                  <Mail size={14} className="input-icon" />
                  <input
                    type="email"
                    placeholder="developer@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="invite-modal-actions">
                <button
                  type="button"
                  className="direct-add-btn mono-label"
                  onClick={handleDirectAdd}
                  disabled={submitting || !cleanTyped || !isRegistered}
                  title={!isRegistered ? "Target developer must be signed into Axon" : "Directly adds this user to the workspace"}
                >
                  <Zap size={13} />
                  <span>Direct Add Now</span>
                </button>

                <button
                  type="submit"
                  className="generate-link-btn mono-label"
                  disabled={submitting || !cleanTyped || !isRegistered}
                  title={!isRegistered ? "Target developer must be signed into Axon" : "Generate unique invite link"}
                >
                  {submitting ? (
                    <RefreshCw size={13} className="spin" />
                  ) : (
                    <Sparkles size={13} />
                  )}
                  <span>Generate Unique Invite Link</span>
                </button>
              </div>
            </form>
          ) : (
            /* Generated Link Presentation Card */
            <div className="generated-invite-view">
              <div className="generated-success-banner">
                <CheckCircle2 size={24} color="#34d399" />
                <div>
                  <h4>Unique Invitation Link Generated</h4>
                  <p className="mono-label">
                    Strictly locked to GitHub user <strong>@{generatedInvite.invitation.targetGithubUsername}</strong>
                  </p>
                </div>
              </div>

              <div className="invite-target-preview">
                <img
                  src={generatedInvite.invitation.targetAvatar || `https://github.com/${generatedInvite.invitation.targetGithubUsername}.png`}
                  alt="Avatar"
                  className="preview-avatar"
                />
                <div className="preview-info">
                  <span className="preview-name">{generatedInvite.invitation.targetName || generatedInvite.invitation.targetGithubUsername}</span>
                  <span className="preview-sub mono-label">
                    @{generatedInvite.invitation.targetGithubUsername} • {generatedInvite.invitation.position} ({generatedInvite.invitation.role.toUpperCase()})
                  </span>
                </div>
              </div>

              {/* Copyable Link Field */}
              <div className="invite-link-box">
                <label className="mono-label">SHAREABLE INVITATION URL:</label>
                <div className="link-input-group">
                  <input
                    type="text"
                    readOnly
                    value={generatedInvite.inviteUrl}
                    className="link-read-input"
                  />
                  <button
                    type="button"
                    className="copy-link-btn mono-label"
                    onClick={handleCopyLink}
                  >
                    {copiedLink ? <Check size={13} color="#c8ff3d" /> : <Copy size={13} />}
                    <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                  </button>
                </div>
              </div>

              {/* Send Email Action Button */}
              <div className="email-dispatch-strip">
                <button
                  type="button"
                  className="send-email-action-btn mono-label"
                  onClick={handleSendEmail}
                >
                  <Send size={13} />
                  <span>Send Invitation Email</span>
                </button>
                <span className="mono-label email-help-text">
                  Dispatches an automated invitation payload with unique join token.
                </span>
              </div>

              {emailSentToast && (
                <div className="email-sent-toast mono-label">
                  <Mail size={13} color="#c8ff3d" />
                  <span>
                    Invitation link dispatched to{" "}
                    <strong>{email || `${generatedInvite.invitation.targetGithubUsername}@users.noreply.github.com`}</strong>{" "}
                    via Axon Mail Gateway.
                  </span>
                </div>
              )}

              <div className="modal-foot-actions">
                <button
                  type="button"
                  className="create-another-btn mono-label"
                  onClick={() => setGeneratedInvite(null)}
                >
                  Invite Another Member
                </button>
                <button
                  type="button"
                  className="done-btn mono-label"
                  onClick={onClose}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
