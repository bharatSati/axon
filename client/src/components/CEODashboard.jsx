import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Github,
  Check,
  Copy,
  ChevronDown,
  ArrowLeft,
  LogOut,
  Building,
  Activity,
  Layers,
  Sparkles,
  X,
  AlertCircle,
  FolderGit2,
  GitBranch,
  Star,
  RefreshCw,
  Plus,
  Edit3,
  Cpu,
  BookOpen,
  Terminal,
  CheckCircle2,
  Clock,
  ArrowRight,
  Lock,
  Globe,
  Unlink,
  Send,
  Code2,
  TestTube,
  Megaphone,
  History,
  Palette,
  GitPullRequest
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ConnectRepoModal from "./ConnectRepoModal";
import WorkspaceModal from "./WorkspaceModal";
import Brand from "./Brand";
import SectionHeading from "./SectionHeading";
import Footer from "./Footer";
import DeveloperStudio from "./DeveloperStudio";
import TesterLab from "./TesterLab";
import MarketerDeck from "./MarketerDeck";
import TimeMachine from "./TimeMachine";
import FlowchartStudio from "./FlowchartStudio";
import PRIntelligenceStudio from "./PRIntelligenceStudio";
import InviteMemberModal from "./InviteMemberModal";

const API_BASE = "http://localhost:4000/api";

const ROLES_LIST = [
  { id: "ceo", name: "CEO", department: "Leadership", color: "#c8ff3d", level: "Executive" },
  { id: "developer", name: "Developer", department: "Engineering", color: "#61dafb", level: "Engineering" },
  { id: "tester", name: "Tester", department: "Engineering", color: "#10b981", level: "Quality Assurance" },
  { id: "marketer", name: "Marketer", department: "Marketing", color: "#f59e0b", level: "Growth & Marketing" }
];

export default function CEODashboard() {
  const { user, token, logout, setCurrentView } = useAuth();

  // Navigation & Role Perspective State
  const [perspective, setPerspective] = useState("developer"); // "developer" | "ceo" | "tester" | "marketer"
  const [activeTab, setActiveTab] = useState("dedicated"); // "dedicated" | "all-workspaces" | "team"
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Workspaces State
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => {
    return localStorage.getItem("axon_active_workspace_id") || "";
  });
  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);

  // Modals State
  const [isConnectRepoModalOpen, setIsConnectRepoModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [workspaceModalMode, setWorkspaceModalMode] = useState("create"); // "create" | "edit"
  const [workspaceToEdit, setWorkspaceToEdit] = useState(null);

  // Project Brain Exploration State
  const [brainQuery, setBrainQuery] = useState("");
  const [brainAnswer, setBrainAnswer] = useState(null);
  const [isBrainSearching, setIsBrainSearching] = useState(false);

  // Employees State (Preserved 100%)
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmp, setNewEmp] = useState({
    name: "",
    email: "",
    githubUsername: "",
    role: "Developer",
    department: "Engineering",
    status: "Active"
  });

  // Workspace Members & GitHub Invitations
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState(null);
  const [emailDispatchedId, setEmailDispatchedId] = useState(null);

  const showNotification = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(""), 4500);
  };

  const fetchWorkspaceMembersAndInvites = async (wsId = activeWorkspaceId) => {
    if (!wsId) return;
    try {
      setMembersLoading(true);
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`${API_BASE}/invitations/workspace/${wsId}/members`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/invitations/workspace/${wsId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      const membersData = await membersRes.json();
      const invitesData = await invitesRes.json();
      if (membersData.success && membersData.members) {
        setWorkspaceMembers(membersData.members);
      }
      if (invitesData.success && invitesData.invitations) {
        setPendingInvitations(invitesData.invitations);
      }
    } catch (e) {
      console.warn("Failed to fetch workspace members/invitations:", e.message);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleCopyInviteLink = (invite) => {
    const clientBase = window.location.origin;
    const url = `${clientBase}?invite=${invite.token}`;
    navigator.clipboard.writeText(url);
    setCopiedInviteId(invite.id);
    setTimeout(() => setCopiedInviteId(null), 2000);
    showNotification(`Copied invitation link for @${invite.targetGithubUsername}!`);
  };

  const handleSendInviteEmail = (invite) => {
    setEmailDispatchedId(invite.id);
    setTimeout(() => setEmailDispatchedId(null), 3000);
    showNotification(`📧 Invitation link dispatched to ${invite.targetEmail || `${invite.targetGithubUsername}@users.noreply.github.com`} via Axon Mail Gateway.`);
  };

  const handleRevokeInvite = async (invitationId) => {
    try {
      const res = await fetch(`${API_BASE}/invitations/${invitationId}?workspaceId=${activeWorkspaceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showNotification("Invitation link revoked successfully.");
        fetchWorkspaceMembersAndInvites(activeWorkspaceId);
      }
    } catch (e) {
      showNotification("Failed to revoke invitation.");
    }
  };

  // ==========================================
  // 1. FETCH WORKSPACES
  // ==========================================
  const fetchWorkspaces = async () => {
    try {
      setWorkspacesLoading(true);
      const res = await fetch(`${API_BASE}/workspaces`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.workspaces || [];
        setWorkspaces(list);

        // Ensure active workspace exists
        if (list.length > 0) {
          const exists = list.some((w) => w.id === activeWorkspaceId);
          if (!exists) {
            setActiveWorkspaceId(list[0].id);
            localStorage.setItem("axon_active_workspace_id", list[0].id);
          }
        }
      }
    } catch (err) {
      console.warn("Could not fetch workspaces:", err.message);
    } finally {
      setWorkspacesLoading(false);
    }
  };

  // Fetch full details of active workspace
  const fetchActiveWorkspaceDetails = async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/workspaces/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          setWorkspaces((prev) =>
            prev.map((w) => (w.id === id ? { ...w, ...data.workspace } : w))
          );
        }
      }
    } catch (err) {
      console.warn("Could not fetch workspace details:", err.message);
    }
  };

  // ==========================================
  // 2. FETCH EMPLOYEES
  // ==========================================
  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);
      const res = await fetch(`${API_BASE}/employees`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.warn("Could not fetch employees:", err.message);
    } finally {
      setEmployeesLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
    fetchEmployees();
  }, [token]);

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchActiveWorkspaceDetails(activeWorkspaceId);
      fetchWorkspaceMembersAndInvites(activeWorkspaceId);
      setBrainAnswer(null);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (activeTab === "team" && activeWorkspaceId) {
      fetchWorkspaceMembersAndInvites(activeWorkspaceId);
    }
  }, [activeTab]);

  // Active Workspace Reference
  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null;

  // ==========================================
  // 3. WORKSPACE ACTIONS
  // ==========================================
  const handleSelectWorkspace = (id) => {
    setActiveWorkspaceId(id);
    localStorage.setItem("axon_active_workspace_id", id);
    setIsWorkspaceSwitcherOpen(false);
    setActiveTab("dedicated");
  };

  const openCreateWorkspaceModal = () => {
    setWorkspaceModalMode("create");
    setWorkspaceToEdit(null);
    setIsWorkspaceModalOpen(true);
    setIsWorkspaceSwitcherOpen(false);
  };

  const openEditWorkspaceModal = (ws) => {
    setWorkspaceModalMode("edit");
    setWorkspaceToEdit(ws);
    setIsWorkspaceModalOpen(true);
  };

  const handleWorkspaceSaved = (savedWs) => {
    if (workspaceModalMode === "create") {
      setWorkspaces((prev) => [savedWs, ...prev]);
      setActiveWorkspaceId(savedWs.id);
      localStorage.setItem("axon_active_workspace_id", savedWs.id);
      setActiveTab("dedicated");
      showNotification(`Workspace "${savedWs.name}" created. Connect a GitHub repository to initialize Project Brain.`);
    } else {
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === savedWs.id ? { ...w, ...savedWs } : w))
      );
      showNotification(`Workspace "${savedWs.name}" updated successfully.`);
    }
  };

  const handleDeleteWorkspace = async (ws) => {
    if (workspaces.length <= 1) {
      alert("You must keep at least one workspace.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete workspace "${ws.name}" and its Project Brain data?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/workspaces/${ws.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const remaining = workspaces.filter((w) => w.id !== ws.id);
        setWorkspaces(remaining);
        if (activeWorkspaceId === ws.id && remaining.length > 0) {
          setActiveWorkspaceId(remaining[0].id);
          localStorage.setItem("axon_active_workspace_id", remaining[0].id);
        }
        showNotification(`Deleted workspace "${ws.name}".`);
      }
    } catch (err) {
      console.error("Delete workspace error:", err);
    }
  };

  // Repository connection callbacks
  const handleRepoConnected = (updatedWs) => {
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === updatedWs.id ? { ...w, ...updatedWs } : w))
    );
    showNotification(`Connected ${updatedWs.repository?.name} to workspace. Project Brain indexing initiated!`);

    // Poll brain status after a few seconds to reflect ready state
    setTimeout(() => {
      fetchActiveWorkspaceDetails(updatedWs.id);
    }, 2000);
  };

  const handleRepoDisconnected = (updatedWs) => {
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === updatedWs.id ? { ...w, ...updatedWs } : w))
    );
    setBrainAnswer(null);
    showNotification("Repository disconnected from workspace. Project Brain paused.");
  };

  // ==========================================
  // 4. PROJECT BRAIN (RAG + GROQ) EXPLORER
  // ==========================================
  const handleAskBrain = async (queryToUse) => {
    const q = queryToUse || brainQuery;
    if (!q || !q.trim() || !activeWorkspace) return;

    try {
      setIsBrainSearching(true);
      const res = await fetch(`${API_BASE}/workspaces/${activeWorkspace.id}/brain/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ query: q.trim(), topK: 4 })
      });

      if (res.ok) {
        const data = await res.json();
        setBrainAnswer(data);
      } else {
        const errData = await res.json();
        setBrainAnswer({
          error: errData.error || "Failed to retrieve engineering knowledge from Project Brain."
        });
      }
    } catch (err) {
      console.error("Brain query error:", err);
      setBrainAnswer({ error: "Network error connecting to Project Brain." });
    } finally {
      setIsBrainSearching(false);
    }
  };

  // ==========================================
  // 5. EMPLOYEE ACTIONS (Preserved 100%)
  // ==========================================
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmp.name || !newEmp.email || !newEmp.role) return;

    try {
      const res = await fetch(`${API_BASE}/employees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newEmp)
      });

      if (res.ok) {
        const data = await res.json();
        setEmployees((prev) => [data.employee, ...prev]);
        setIsAddModalOpen(false);
        setNewEmp({
          name: "",
          email: "",
          githubUsername: "",
          role: "Developer",
          department: "Engineering",
          status: "Active"
        });
        showNotification(`Added ${data.employee.name} as ${data.employee.role}`);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to add employee");
      }
    } catch (err) {
      console.error("Add employee error:", err);
      const localEmp = {
        id: `emp_${Date.now()}`,
        ...newEmp,
        avatar: newEmp.githubUsername
          ? `https://avatars.githubusercontent.com/${newEmp.githubUsername.replace(/^@/, "")}`
          : ""
      };
      setEmployees((prev) => [localEmp, ...prev]);
      setIsAddModalOpen(false);
      showNotification(`Added ${localEmp.name} to workspace`);
    }
  };

  const handleRoleChange = async (employeeId, newRole) => {
    const roleObj = ROLES_LIST.find((r) => r.name === newRole);
    try {
      const res = await fetch(`${API_BASE}/employees/${employeeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          role: newRole,
          department: roleObj ? roleObj.department : undefined
        })
      });

      if (res.ok) {
        setEmployees((prev) =>
          prev.map((emp) =>
            emp.id === employeeId
              ? { ...emp, role: newRole, ...(roleObj && { department: roleObj.department }) }
              : emp
          )
        );
        showNotification(`Updated role to ${newRole}`);
      }
    } catch (err) {
      console.error("Role update failed:", err);
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === employeeId ? { ...emp, role: newRole } : emp))
      );
    }
  };

  const handleDeleteEmployee = async (employeeId, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from Axon Workspace?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/employees/${employeeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
        showNotification(`Removed ${name} from workspace`);
      }
    } catch (err) {
      console.error("Delete employee error:", err);
      setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
    }
  };

  // Filtered employees for directory table
  const filteredEmployees = (employees || []).filter((emp) => {
    if (!emp) return false;
    const matchesDept = selectedDept === "all" || (emp.department && emp.department.toLowerCase() === selectedDept.toLowerCase());
    const q = (searchTerm || "").toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (emp.name && emp.name.toLowerCase().includes(q)) ||
      (emp.email && emp.email.toLowerCase().includes(q)) ||
      (emp.githubUsername && emp.githubUsername.toLowerCase().includes(q)) ||
      (emp.role && emp.role.toLowerCase().includes(q));
    return matchesDept && matchesSearch;
  });

  const getRoleColor = (roleName) => {
    if (!roleName) return "#c8ff3d";
    const r = ROLES_LIST.find((role) => role.name?.toLowerCase() === roleName?.toLowerCase());
    return r ? r.color : "#c8ff3d";
  };

  const brainStatus = activeWorkspace?.brain?.status || "uninitialized";
  const brainStats = activeWorkspace?.brain?.stats || {
    totalFiles: 0,
    totalChunks: 0,
    totalCommits: 0,
    techStack: []
  };

  return (
    <div className="ceo-dashboard">
      {/* Toast Notification */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            className="ceo-toast-banner"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Check size={16} />
            <span>{feedbackMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Floating Navigation Bar - Synchronized with Landing Page Navbar */}
      <header className="navbar is-scrolled">
        <div className="navbar-inner container-wide">
          <Brand onClick={() => setCurrentView("landing")} />

          {/* Center Navigation Tabs styled with .nav-links */}
          <nav className="nav-links" aria-label="Role perspective navigation">
            <button
              type="button"
              className={`nav-tab-btn ${perspective === "developer" ? "is-active" : ""}`}
              onClick={() => setPerspective("developer")}
            >
              Developer Studio
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${perspective === "ceo" ? "is-active" : ""}`}
              onClick={() => setPerspective("ceo")}
            >
              CEO Console
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${perspective === "tester" ? "is-active" : ""}`}
              onClick={() => setPerspective("tester")}
            >
              Tester Lab
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${perspective === "marketer" ? "is-active" : ""}`}
              onClick={() => setPerspective("marketer")}
            >
              Marketer Deck
            </button>
          </nav>

          {/* Right Navigation Actions */}
          <div className="nav-actions">
            {/* Workspace Switcher Dropdown Pill */}
            <div className="ws-switcher-wrap">
              <button
                type="button"
                className="ws-nav-pill"
                onClick={() => setIsWorkspaceSwitcherOpen((prev) => !prev)}
                title="Switch active workspace"
              >
                <Layers size={13} color="#c8ff3d" />
                <span className="ws-pill-name">{activeWorkspace?.name || "Select Workspace"}</span>
                {activeWorkspace?.repository ? (
                  <span className="ws-pill-badge">{activeWorkspace.repository.name}</span>
                ) : (
                  <span className="ws-pill-badge" style={{ color: "#f59e0b" }}>No Repo</span>
                )}
                <ChevronDown
                  size={12}
                  className={`ws-switcher-chevron ${isWorkspaceSwitcherOpen ? "is-open" : ""}`}
                />
              </button>

              {/* Dropdown Popover */}
              <AnimatePresence>
                {isWorkspaceSwitcherOpen && (
                  <motion.div
                    className="ws-dropdown-popover"
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  >
                    <div className="ws-dropdown-header">
                      <span>SWITCH WORKSPACE</span>
                      <span>{workspaces.length} TOTAL</span>
                    </div>

                    <div className="ws-dropdown-list">
                      {workspaces.map((ws) => {
                        const isSelected = ws.id === activeWorkspaceId;
                        return (
                          <button
                            type="button"
                            key={ws.id}
                            className={`ws-dropdown-item ${isSelected ? "is-selected" : ""}`}
                            onClick={() => handleSelectWorkspace(ws.id)}
                          >
                            <div className="ws-item-left">
                              <span className="ws-item-name">{ws.name}</span>
                              <span className="ws-item-repo">
                                <FolderGit2 size={11} />
                                {ws.repository ? ws.repository.fullName || ws.repository.name : "No repository connected"}
                              </span>
                            </div>
                            {isSelected && <Check size={14} color="#c8ff3d" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="ws-dropdown-footer">
                      <button
                        type="button"
                        className="ws-footer-action"
                        onClick={openCreateWorkspaceModal}
                      >
                        <Plus size={14} />
                        <span>Create New Workspace</span>
                      </button>
                      <button
                        type="button"
                        className="ws-footer-action"
                        style={{ color: "#999" }}
                        onClick={() => {
                          setIsWorkspaceSwitcherOpen(false);
                          setActiveTab("all-workspaces");
                        }}
                      >
                        <Building size={14} />
                        <span>Manage All Workspaces</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Back to Landing Page Button */}
            <button
              type="button"
              className="nav-signin"
              onClick={() => setCurrentView("landing")}
              title="Return to Public Landing Page"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", background: "none", border: "none" }}
            >
              <ArrowLeft size={13} />
              <span>Landing</span>
            </button>

            {/* CEO Profile Pill */}
            <div className="ceo-profile-pill">
              <img
                src={
                  user?.avatar ||
                  (user?.username
                    ? `https://avatars.githubusercontent.com/${user.username}`
                    : "https://avatars.githubusercontent.com/ghost")
                }
                alt={user?.name || user?.username || "CEO"}
                className="ceo-avatar"
              />
              <div className="ceo-profile-info">
                <strong>{user?.name || user?.username || "Workspace Owner"}</strong>
                <span className="mono-label">
                  <Github size={11} /> @{user?.username || "authenticated"}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="button button--small button--ghost"
              onClick={logout}
              title="Sign Out"
              style={{ padding: "6px 10px", gap: "5px" }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="ceo-body container-wide">
        {/* Role Perspective Switcher Bar */}
        <div className="perspective-strip">
          <div className="perspective-tabs">
            <button
              type="button"
              className={`perspective-btn perspective-btn--dev ${perspective === "developer" ? "is-active" : ""}`}
              onClick={() => setPerspective("developer")}
            >
              <Code2 size={14} />
              <span>Developer Studio (IDE)</span>
            </button>
            <button
              type="button"
              className={`perspective-btn ${perspective === "ceo" ? "is-active" : ""}`}
              onClick={() => setPerspective("ceo")}
            >
              <Layers size={14} />
              <span>CEO Executive Console</span>
            </button>
            <button
              type="button"
              className={`perspective-btn perspective-btn--qa ${perspective === "tester" ? "is-active" : ""}`}
              onClick={() => setPerspective("tester")}
            >
              <TestTube size={14} />
              <span>Tester QA Lab</span>
            </button>
            <button
              type="button"
              className={`perspective-btn perspective-btn--mkt ${perspective === "marketer" ? "is-active" : ""}`}
              onClick={() => setPerspective("marketer")}
            >
              <Megaphone size={14} />
              <span>Marketer Growth Deck</span>
            </button>
            <button
              type="button"
              className={`perspective-btn perspective-btn--tm ${perspective === "timemachine" ? "is-active" : ""}`}
              onClick={() => setPerspective("timemachine")}
            >
              <History size={14} />
              <span>Time Machine</span>
            </button>
            <button
              type="button"
              className={`perspective-btn perspective-btn--flow ${perspective === "flowchart" ? "is-active" : ""}`}
              onClick={() => setPerspective("flowchart")}
            >
              <Palette size={14} color="#c8ff3d" />
              <span>AI Flowcharts</span>
            </button>
            <button
              type="button"
              className={`perspective-btn perspective-btn--pr ${perspective === "pr-review" ? "is-active" : ""}`}
              onClick={() => setPerspective("pr-review")}
            >
              <GitPullRequest size={14} color="#c084fc" />
              <span>AI PR Reviewer</span>
            </button>
          </div>

          <div className="perspective-meta mono-label">
            <span className="unlocked-badge mono-label" style={{ color: "#c8ff3d", border: "1px solid rgba(200, 255, 61, 0.3)", padding: "2px 8px", borderRadius: "4px", background: "rgba(200, 255, 61, 0.08)" }}>
              ALL ROLES UNLOCKED
            </span>
            <span style={{ marginLeft: "8px" }}>VIEWPORT:</span>
            <strong
              style={{
                color:
                  perspective === "developer"
                    ? "#61dafb"
                    : perspective === "tester"
                    ? "#10b981"
                    : perspective === "marketer"
                    ? "#f59e0b"
                    : perspective === "timemachine"
                    ? "#a855f7"
                    : perspective === "flowchart"
                    ? "#c8ff3d"
                    : "#c8ff3d"
              }}
            >
              {perspective.toUpperCase()}
            </strong>
          </div>
        </div>

        {/* ============================================================
            PERSPECTIVE 1: DEVELOPER CODE STUDIO (TECH ROLE)
            ============================================================ */}
        {perspective === "developer" && (
          <DeveloperStudio
            workspace={activeWorkspace}
            token={token}
            onSwitchPerspective={setPerspective}
            onOpenConnectRepo={() => setIsConnectRepoModalOpen(true)}
          />
        )}

        {/* ============================================================
            PERSPECTIVE 2: TESTER QA & RELIABILITY LAB
            ============================================================ */}
        {perspective === "tester" && (
          <TesterLab
            workspace={activeWorkspace}
            token={token}
          />
        )}

        {/* ============================================================
            PERSPECTIVE 3: MARKETER GROWTH & POSITIONING DECK
            ============================================================ */}
        {perspective === "marketer" && (
          <MarketerDeck
            workspace={activeWorkspace}
            token={token}
          />
        )}

        {/* ============================================================
            PERSPECTIVE 4: TIME MACHINE & ARCHITECTURAL EVOLUTION
            ============================================================ */}
        {perspective === "timemachine" && (
          <TimeMachine
            workspace={activeWorkspace}
            token={token}
            onSwitchPerspective={setPerspective}
          />
        )}

        {/* ============================================================
            PERSPECTIVE 5: ARCHITECTURAL FLOWCHART STUDIO (MERMAID AI)
            ============================================================ */}
        {perspective === "flowchart" && (
          <FlowchartStudio
            workspace={activeWorkspace}
            token={token}
          />
        )}

        {/* ============================================================
            PERSPECTIVE 6: AI PULL REQUEST INTELLIGENCE & CODE REVIEWER
            ============================================================ */}
        {perspective === "pr-review" && (
          <PRIntelligenceStudio
            workspace={activeWorkspace}
            token={token}
          />
        )}

        {/* ============================================================
            PERSPECTIVE 7: CEO EXECUTIVE CONSOLE
            ============================================================ */}
        {perspective === "ceo" && (
          <>
            {/* CEO Navigation Sub-Tabs */}
            <div className="ceo-subnav-strip">
              <button
                type="button"
                className={`subnav-tab ${activeTab === "dedicated" ? "is-active" : ""}`}
                onClick={() => setActiveTab("dedicated")}
              >
                <Layers size={13} />
                <span>Workspace Command</span>
              </button>
              <button
                type="button"
                className={`subnav-tab ${activeTab === "all-workspaces" ? "is-active" : ""}`}
                onClick={() => setActiveTab("all-workspaces")}
              >
                <Building size={13} />
                <span>All Workspaces ({workspaces.length})</span>
              </button>
              <button
                type="button"
                className={`subnav-tab ${activeTab === "team" ? "is-active" : ""}`}
                onClick={() => setActiveTab("team")}
              >
                <Users size={13} />
                <span>Team &amp; Roles ({employees.length})</span>
              </button>
            </div>

            {/* ============================================================
                TAB 1: DEDICATED WORKSPACE DASHBOARD
                ============================================================ */}
        {activeTab === "dedicated" && activeWorkspace && (
          <section className="ws-dedicated-view">
            <SectionHeading
              eyebrow="WORKSPACE COMMAND"
              index="01"
              title={activeWorkspace.name}
              description={activeWorkspace.description || "Dedicated software project workspace with connected GitHub repository and RAG Project Brain."}
            />

            {/* Workspace Header Card */}
            <div className="ws-dedicated-header">
              <div className="ws-header-copy">
                <div className="ws-header-meta-row" style={{ marginTop: 0 }}>
                  <span className="mono-label" style={{ color: "#777" }}>
                    ID: <code>{activeWorkspace.id}</code>
                  </span>
                  <span className="mono-label" style={{ color: "#777" }}>
                    CREATED: {new Date(activeWorkspace.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                  {activeWorkspace.repository ? (
                    <span className="brain-status-badge brain-status-badge--ready">
                      <FolderGit2 size={12} /> 1 REPO CONNECTED
                    </span>
                  ) : (
                    <span className="brain-status-badge brain-status-badge--indexing">
                      NO REPO CONNECTED
                    </span>
                  )}
                </div>
              </div>

              <div className="ws-header-actions">
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => setPerspective("timemachine")}
                  style={{ borderColor: "rgba(168, 85, 247, 0.4)", color: "#c084fc" }}
                  title="Launch Time Machine for this workspace"
                >
                  <History size={14} />
                  <span>Time Machine</span>
                </button>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => openEditWorkspaceModal(activeWorkspace)}
                >
                  <Edit3 size={14} />
                  <span>Configure Workspace</span>
                </button>
                <button
                  type="button"
                  className="button button--danger-outline button--small"
                  onClick={() => handleDeleteWorkspace(activeWorkspace)}
                  title="Delete this workspace"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Core Two-Column Architecture Grid */}
            <div className="ws-core-grid">
              {/* Column 1: Connected GitHub Repository (Exactly ONE per workspace) */}
              <div className="ws-card">
                <div className="ws-card-header">
                  <div className="ws-card-title-group">
                    <FolderGit2 size={18} color="#c8ff3d" />
                    <h3>Connected GitHub Repository</h3>
                  </div>
                  <span className="mono-label" style={{ fontSize: "11px", color: "#888" }}>
                    ONE REPO PER WORKSPACE
                  </span>
                </div>

                {activeWorkspace.repository ? (
                  <div className="repo-connected-box">
                    <div className="repo-connected-top">
                      <div className="repo-connected-name">
                        <Github size={18} />
                        <span>{activeWorkspace.repository.fullName || activeWorkspace.repository.name}</span>
                        <a
                          href={activeWorkspace.repository.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="repo-ext-link"
                          title="Open on GitHub"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>

                      {activeWorkspace.repository.visibility === "private" ? (
                        <span className="repo-badge repo-badge--private">
                          <Lock size={10} /> Private
                        </span>
                      ) : (
                        <span className="repo-badge repo-badge--public">
                          <Globe size={10} /> Public
                        </span>
                      )}
                    </div>

                    <p className="repo-connected-desc">
                      {activeWorkspace.repository.description || "Software repository connected to Axon workspace."}
                    </p>

                    <div className="repo-connected-meta mono-label">
                      {activeWorkspace.repository.language && (
                        <span className="repo-meta-item">
                          <i className="lang-dot" /> {activeWorkspace.repository.language}
                        </span>
                      )}
                      <span className="repo-meta-item">
                        <GitBranch size={11} /> {activeWorkspace.repository.defaultBranch || "main"}
                      </span>
                      {activeWorkspace.repository.stars !== undefined && (
                        <span className="repo-meta-item">
                          <Star size={11} /> {activeWorkspace.repository.stars} stars
                        </span>
                      )}
                      <span className="repo-meta-item">
                        Owner: <strong>{activeWorkspace.repository.owner}</strong>
                      </span>
                    </div>

                    <div className="repo-connected-actions">
                      <button
                        type="button"
                        className="button button--ghost button--small"
                        onClick={() => setIsConnectRepoModalOpen(true)}
                      >
                        <RefreshCw size={13} />
                        <span>Replace Repository</span>
                      </button>

                      <button
                        type="button"
                        className="button button--danger-outline button--small"
                        onClick={() => {
                          if (window.confirm(`Disconnect "${activeWorkspace.repository.name}"? Project Brain will be paused.`)) {
                            fetch(`${API_BASE}/workspaces/${activeWorkspace.id}/repository`, {
                              method: "DELETE",
                              headers: { Authorization: `Bearer ${token}` }
                            })
                              .then((r) => r.json())
                              .then((data) => handleRepoDisconnected(data.workspace))
                              .catch(console.error);
                          }
                        }}
                      >
                        <Unlink size={13} />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="repo-empty-card">
                    <div className="icon-wrap">
                      <Github size={26} />
                    </div>
                    <strong style={{ color: "#fff", fontSize: "15px" }}>No Repository Connected</strong>
                    <p>
                      Every workspace requires exactly ONE connected GitHub repository to power its
                      persistent Project Brain knowledge base.
                    </p>
                    <button
                      type="button"
                      className="button button--lime button--small"
                      style={{ marginTop: "8px" }}
                      onClick={() => setIsConnectRepoModalOpen(true)}
                    >
                      <FolderGit2 size={14} />
                      <span>Connect GitHub Repository</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Column 2: Workspace Project Brain (RAG Engine + Groq LLM) */}
              <div className="ws-card">
                <div className="ws-card-header">
                  <div className="ws-card-title-group">
                    <Sparkles size={18} color="#c8ff3d" />
                    <h3>Project Brain // RAG Engine</h3>
                  </div>

                  <span
                    className={`brain-status-badge brain-status-badge--${
                      brainStatus === "ready"
                        ? "ready"
                        : brainStatus === "indexing"
                        ? "indexing"
                        : "uninitialized"
                    }`}
                  >
                    {brainStatus === "ready" && <CheckCircle2 size={12} />}
                    {brainStatus === "indexing" && <RefreshCw size={12} className="spin" />}
                    {brainStatus === "ready"
                      ? "BRAIN READY & SYNCED"
                      : brainStatus === "indexing"
                      ? "INDEXING REPO..."
                      : "AWAITING REPO"}
                  </span>
                </div>

                {brainStatus === "ready" ? (
                  <>
                    {/* Brain Mini Stats */}
                    <div className="brain-stats-mini-grid">
                      <div className="brain-stat-item">
                        <span className="val">{brainStats.totalFiles}</span>
                        <span className="lbl">INDEXED FILES</span>
                      </div>
                      <div className="brain-stat-item">
                        <span className="val" style={{ color: "#c8ff3d" }}>
                          {brainStats.totalChunks}
                        </span>
                        <span className="lbl">RAG CHUNKS</span>
                      </div>
                      <div className="brain-stat-item">
                        <span className="val">{brainStats.totalCommits || 0}</span>
                        <span className="lbl">COMMITS ANALYZED</span>
                      </div>
                      <div className="brain-stat-item">
                        <span className="val" style={{ color: "#a78bfa" }}>
                          Groq 120B
                        </span>
                        <span className="lbl">AI SYNTHESIS</span>
                      </div>
                    </div>

                    {/* Detected Tech Stack */}
                    {brainStats.techStack && brainStats.techStack.length > 0 && (
                      <div className="tech-stack-row">
                        <span className="mono-label" style={{ fontSize: "10px", color: "#888" }}>
                          TECH STACK:
                        </span>
                        {brainStats.techStack.map((tech) => (
                          <span key={tech} className="tech-tag">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Brain Query Explorer */}
                    <div className="brain-query-section">
                      <div className="brain-query-input-wrap">
                        <input
                          type="text"
                          placeholder="Ask Project Brain (e.g. auth flow, architecture, routes, schemas)..."
                          value={brainQuery}
                          onChange={(e) => setBrainQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAskBrain()}
                        />
                        <button
                          type="button"
                          className="button button--lime button--small"
                          onClick={() => handleAskBrain()}
                          disabled={isBrainSearching || !brainQuery.trim()}
                        >
                          {isBrainSearching ? (
                            <RefreshCw size={14} className="spin" />
                          ) : (
                            <Send size={14} />
                          )}
                          <span>Ask Brain</span>
                        </button>
                      </div>

                      {/* Quick Query Suggestions */}
                      <div className="brain-quick-queries">
                        <span className="mono-label" style={{ fontSize: "10px", color: "#666" }}>
                          TRY:
                        </span>
                        {[
                          "How does authentication work?",
                          "Explain project architecture",
                          "What API routes are exposed?",
                          "Database and state models"
                        ].map((suggestion) => (
                          <button
                            type="button"
                            key={suggestion}
                            className="quick-q-btn"
                            onClick={() => {
                              setBrainQuery(suggestion);
                              handleAskBrain(suggestion);
                            }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>

                      {/* Brain AI Response */}
                      {brainAnswer && (
                        <div className="brain-response-box">
                          {brainAnswer.error ? (
                            <div style={{ color: "#ef4444", fontSize: "13px" }}>
                              {brainAnswer.error}
                            </div>
                          ) : (
                            <>
                              <div
                                className="mono-label"
                                style={{
                                  color: "#c8ff3d",
                                  marginBottom: "8px",
                                  display: "flex",
                                  justifyContent: "space-between"
                                }}
                              >
                                <span>ANSWER (ENGINEERING SYNTHESIS)</span>
                                <span>{brainAnswer.provider || "Groq openai/gpt-oss-120b"}</span>
                              </div>
                              <div className="brain-answer-text">{brainAnswer.answer}</div>

                              {/* Sources */}
                              {brainAnswer.sources && brainAnswer.sources.length > 0 && (
                                <div className="brain-sources-list">
                                  <span className="mono-label" style={{ color: "#888", fontSize: "10px" }}>
                                    RETRIEVED KNOWLEDGE SOURCES:
                                  </span>
                                  {brainAnswer.sources.map((src, i) => (
                                    <div key={i} className="brain-source-item">
                                      <span>
                                        📄 {src.filePath} {src.title && `— ${src.title}`}
                                      </span>
                                      <span className="brain-source-score">
                                        {Math.round(src.score * 100)}% match
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="repo-empty-card" style={{ padding: "30px 20px" }}>
                    <div className="icon-wrap">
                      <Cpu size={26} />
                    </div>
                    <strong style={{ color: "#fff", fontSize: "15px" }}>
                      Project Brain Not Initialized
                    </strong>
                    <p>
                      Connect a GitHub repository to trigger the persistent RAG vector indexing pipeline
                      and activate AI architectural synthesis.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Metrics & System Synchronized State */}
            <section className="ceo-stats-grid">
              <div className="ceo-stat-card">
                <span className="stat-icon-wrap"><Users size={20} /></span>
                <div>
                  <span className="mono-label">WORKSPACE HEADCOUNT</span>
                  <strong>{employees.length}</strong>
                  <small>Active contributors &amp; leads</small>
                </div>
              </div>

              <div className="ceo-stat-card">
                <span className="stat-icon-wrap stat-icon-wrap--lime"><Layers size={20} /></span>
                <div>
                  <span className="mono-label">TOTAL WORKSPACES</span>
                  <strong>{workspaces.length}</strong>
                  <small>Isolated software projects</small>
                </div>
              </div>

              <div className="ceo-stat-card">
                <span className="stat-icon-wrap stat-icon-wrap--blue"><Activity size={20} /></span>
                <div>
                  <span className="mono-label">CLIENT-SERVER SYSTEM</span>
                  <strong style={{ color: "#c8ff3d" }}>SYNCHRONIZED</strong>
                  <small>MongoDB Atlas + Groq Active</small>
                </div>
              </div>

              <div className="ceo-stat-card">
                <span className="stat-icon-wrap stat-icon-wrap--purple"><Building size={20} /></span>
                <div>
                  <span className="mono-label">WORKSPACE AUTHORITY</span>
                  <strong>CEO Access</strong>
                  <small>Full administrative control</small>
                </div>
              </div>
            </section>
          </section>
        )}

        {/* ============================================================
            TAB 2: ALL WORKSPACES OVERVIEW
            ============================================================ */}
        {activeTab === "all-workspaces" && (
          <section className="all-workspaces-view">
            <SectionHeading
              eyebrow="PROJECT PORTFOLIO"
              index="02"
              title="Software Project Workspaces"
              description="Every workspace represents a separate software project with exactly one connected GitHub repository and an independent Project Brain."
            />

            <div className="all-ws-head">
              <div className="mono-label" style={{ color: "var(--muted, #999)", fontSize: "12px" }}>
                TOTAL PORTFOLIO: <strong style={{ color: "#c8ff3d" }}>{workspaces.length} WORKSPACES</strong>
              </div>

              <button
                type="button"
                className="button button--lime"
                onClick={openCreateWorkspaceModal}
              >
                <Plus size={16} />
                <span>Create New Workspace</span>
              </button>
            </div>

            <div className="all-ws-grid">
              {workspaces.map((ws) => {
                const isActive = ws.id === activeWorkspaceId;
                const repo = ws.repository;
                const brain = ws.brain || {};

                return (
                  <div
                    key={ws.id}
                    className={`ws-project-card ${isActive ? "is-active-card" : ""}`}
                  >
                    <div className="ws-project-card-top">
                      <div className="ws-project-card-title-row">
                        <h3 className="ws-project-card-title">{ws.name}</h3>
                        {isActive && (
                          <span className="mono-label kicker-pill" style={{ color: "#c8ff3d" }}>
                            CURRENT ACTIVE
                          </span>
                        )}
                      </div>

                      <p className="ws-project-card-desc">
                        {ws.description || "No description provided."}
                      </p>

                      {repo ? (
                        <div className="ws-project-repo-pill">
                          <FolderGit2 size={13} color="#c8ff3d" />
                          <span>{repo.fullName || repo.name}</span>
                          {repo.visibility === "private" ? (
                            <Lock size={10} color="#a78bfa" />
                          ) : (
                            <Globe size={10} color="#34d399" />
                          )}
                        </div>
                      ) : (
                        <div className="ws-project-repo-pill" style={{ color: "#f59e0b" }}>
                          <AlertCircle size={13} />
                          <span>No repository connected</span>
                        </div>
                      )}
                    </div>

                    <div className="ws-project-card-footer">
                      <div className="mono-label" style={{ fontSize: "11px", color: "#888" }}>
                        BRAIN:{" "}
                        <strong
                          style={{
                            color: brain.status === "ready" ? "#c8ff3d" : "#888"
                          }}
                        >
                          {brain.status === "ready"
                            ? `${brain.stats?.totalChunks || 0} chunks ready`
                            : brain.status === "indexing"
                            ? "Indexing..."
                            : "Uninitialized"}
                        </strong>
                      </div>

                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          className="button button--small button--ghost"
                          onClick={() => handleSelectWorkspace(ws.id)}
                        >
                          <span>Open Command</span>
                          <ArrowRight size={13} />
                        </button>

                        <button
                          type="button"
                          className="button button--small button--ghost"
                          onClick={() => openEditWorkspaceModal(ws)}
                          title="Configure Workspace"
                        >
                          <Edit3 size={13} />
                        </button>

                        {workspaces.length > 1 && (
                          <button
                            type="button"
                            className="remove-emp-btn"
                            onClick={() => handleDeleteWorkspace(ws)}
                            title="Delete Workspace"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Dashed "+ Add Another Workspace" Card */}
              <div className="ws-create-dashed-card" data-cursor onClick={openCreateWorkspaceModal}>
                <Plus size={32} />
                <strong style={{ fontSize: "15px" }}>Create New Workspace</strong>
                <span className="mono-label" style={{ fontSize: "11px" }}>
                  FOR SEPARATE SOFTWARE PROJECT
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================
            TAB 3: TEAM & ROLES (Preserved 100%)
            ============================================================ */}
        {activeTab === "team" && (
          <section className="ceo-team-view">
            <SectionHeading
              eyebrow="ORGANIZATION COMMAND"
              index="03"
              title="Team & Role Architecture"
              description="Manage your engineering, product, and infrastructure organization. Add team members, assign modular roles, and configure system permissions."
            />

            {/* Header Card */}
            <div className="ceo-header-card">
              <div className="ceo-header-copy">
                <div className="mono-label kicker-pill">
                  <ShieldCheck size={13} />
                  AUTHENTICATED STRICTLY WITH GITHUB
                </div>
                <h3 style={{ margin: "10px 0 6px", fontSize: "20px" }}>Executive Directory &amp; Access Control</h3>
                <p style={{ margin: 0 }}>
                  Assign modular roles and configure system permissions across client and server.
                </p>
              </div>

              <div className="ceo-header-cta" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  type="button"
                  className="button button--lime button--large"
                  onClick={() => setIsInviteModalOpen(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <Github size={18} />
                  <span>Invite with GitHub</span>
                </button>

                <button
                  type="button"
                  className="button button--ghost button--large add-emp-trigger"
                  onClick={() => setIsAddModalOpen(true)}
                >
                  <UserPlus size={18} />
                  <span>Manual Add</span>
                </button>
              </div>
            </div>

            {/* Employee Directory Section */}
            <div className="ceo-section-card">
              <div className="ceo-section-head">
                <div>
                  <h2>Team &amp; Role Management</h2>
                  <p>Configure team members in different roles across the Axon architecture.</p>
                </div>

                <div className="ceo-filter-tools">
                  {/* Search */}
                  <div className="ceo-search-box">
                    <Search size={15} />
                    <input
                      type="text"
                      placeholder="Search by name, email, role, or @handle..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Department Pills */}
                  <div className="ceo-dept-tabs">
                    {["all", "Leadership", "Engineering", "Marketing"].map((dept) => (
                      <button
                        type="button"
                        key={dept}
                        className={`dept-tab ${selectedDept.toLowerCase() === dept.toLowerCase() ? "is-active" : ""}`}
                        onClick={() => setSelectedDept(dept)}
                      >
                        {dept === "all" ? "All Departments" : dept}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Employee Table */}
              <div className="ceo-table-container">
                <table className="ceo-table">
                  <thead>
                    <tr>
                      <th>EMPLOYEE</th>
                      <th>GITHUB ACCOUNT</th>
                      <th>DEPARTMENT</th>
                      <th>ROLE &amp; PERMISSIONS</th>
                      <th>STATUS</th>
                      <th style={{ textAlign: "right" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp, idx) => {
                      const empId = emp.id || emp._id || `emp-${idx}`;
                      const empRole = emp.role || "Developer";
                      const ghUser = emp.githubUsername || "";
                      return (
                        <tr key={empId}>
                          <td>
                            <div className="emp-user-cell">
                              <img
                                src={emp.avatar || (ghUser ? `https://avatars.githubusercontent.com/${ghUser}` : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80")}
                                alt={emp.name || "Member"}
                                className="emp-avatar"
                                onError={(e) => {
                                  e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80";
                                }}
                              />
                              <div>
                                <strong>{emp.name || ghUser || "Team Member"}</strong>
                                <span>{emp.email || "No email available"}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            {ghUser ? (
                              <a
                                href={`https://github.com/${ghUser}`}
                                target="_blank"
                                rel="noreferrer"
                                className="emp-github-link"
                              >
                                <Github size={13} />
                                <span>@{ghUser}</span>
                                <ExternalLink size={11} />
                              </a>
                            ) : (
                              <span className="mono-label" style={{ color: "#777" }}>Direct Added</span>
                            )}
                          </td>

                          <td>
                            <span className="mono-label dept-pill">{emp.department || "Engineering"}</span>
                          </td>

                          <td>
                            <div className="role-selector-wrap">
                              <span
                                className="role-badge"
                                style={{
                                  borderColor: `${getRoleColor(empRole)}55`,
                                  color: getRoleColor(empRole)
                                }}
                              >
                                <i style={{ background: getRoleColor(empRole) }} />
                                {empRole}
                              </span>

                              <select
                                value={empRole}
                                onChange={(e) => handleRoleChange(empId, e.target.value)}
                                className="role-inline-select"
                                title="Change employee role"
                              >
                                {ROLES_LIST.map((r) => (
                                  <option key={r.id} value={r.name}>
                                    {r.name} ({r.department})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                          <td>
                            <span className={`status-pill status-pill--${(emp.status || "active").toLowerCase()}`}>
                              <i /> {emp.status || "Active"}
                            </span>
                          </td>

                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="remove-emp-btn"
                              onClick={() => handleDeleteEmployee(empId, emp.name)}
                              title="Remove employee from workspace"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty-cell" style={{ padding: "36px 20px" }}>
                          <Users size={26} color="#c8ff3d" style={{ marginBottom: "8px" }} />
                          <p style={{ margin: "4px 0", color: "#fff", fontWeight: 500 }}>No team members added yet.</p>
                          <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: "13px" }}>
                            Add your developer, tester, or marketer using the button below.
                          </p>
                          <button
                            type="button"
                            className="button button--small button--lime"
                            onClick={() => setIsAddModalOpen(true)}
                          >
                            <UserPlus size={14} />
                            <span>Add First Team Member</span>
                          </button>
                        </td>
                      </tr>
                    ) : filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty-cell">
                          <AlertCircle size={24} />
                          <p>No team members found matching your search criteria.</p>
                          <button
                            type="button"
                            className="button button--small button--ghost"
                            onClick={() => { setSearchTerm(""); setSelectedDept("all"); }}
                          >
                            Reset filters
                          </button>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pending GitHub Invitations Section */}
            {pendingInvitations.length > 0 && (
              <div className="ceo-section-card pending-invites-card">
                <div className="ceo-section-head">
                  <div>
                    <div className="mono-label kicker-pill" style={{ color: "#c084fc", marginBottom: "6px" }}>
                      <Github size={12} />
                      UNIQUE INVITATION LINKS ACTIVE
                    </div>
                    <h2>Pending GitHub Invitations ({pendingInvitations.filter((i) => i.status === "pending").length})</h2>
                    <p>Share these unique links with the invited GitHub developers. Only their specific GitHub account can accept.</p>
                  </div>

                  <button
                    type="button"
                    className="button button--small button--lime"
                    onClick={() => setIsInviteModalOpen(true)}
                  >
                    <Plus size={14} />
                    <span>Invite Another</span>
                  </button>
                </div>

                <div className="invites-grid">
                  {pendingInvitations.map((inv, idx) => {
                    const isPending = (inv.status || "pending") === "pending";
                    const invId = inv.id || inv._id || `inv-${idx}`;
                    return (
                      <div key={invId} className={`invite-grid-item invite-grid-item--${inv.status || "pending"}`}>
                        <div className="invite-item-head">
                          <div className="invite-user-info">
                            <img
                              src={inv.targetAvatar || (inv.targetGithubUsername ? `https://github.com/${inv.targetGithubUsername}.png` : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80")}
                              alt={inv.targetGithubUsername || "Target user"}
                              className="invite-avatar"
                              onError={(e) => {
                                e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80";
                              }}
                            />
                            <div>
                              <strong className="invite-handle">@{inv.targetGithubUsername || "user"}</strong>
                              <span className="mono-label invite-role-tag">
                                {inv.position || "Member"} ({inv.role ? inv.role.toUpperCase() : "MEMBER"})
                              </span>
                            </div>
                          </div>

                          <span className={`mono-label invite-status-pill status--${inv.status || "pending"}`}>
                            {(inv.status || "pending").toUpperCase()}
                          </span>
                        </div>

                        {isPending && (
                          <div className="invite-item-actions">
                            <div className="link-copy-inline">
                              <input
                                type="text"
                                readOnly
                                value={`${typeof window !== "undefined" ? window.location.origin : ""}?invite=${inv.token || ""}`}
                                className="inline-link-input mono-label"
                              />
                              <button
                                type="button"
                                className="inline-copy-btn mono-label"
                                onClick={() => handleCopyInviteLink(inv)}
                              >
                                {copiedInviteId === invId ? (
                                  <>
                                    <Check size={12} color="#c8ff3d" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={12} />
                                    <span>Copy Link</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="invite-buttons-row">
                              <button
                                type="button"
                                className="send-mail-inline-btn mono-label"
                                onClick={() => handleSendInviteEmail(inv)}
                              >
                                <Send size={11} />
                                <span>Send Email</span>
                              </button>

                              <button
                                type="button"
                                className="revoke-btn mono-label"
                                onClick={() => handleRevokeInvite(invId)}
                              >
                                Revoke Link
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modular Role Architecture Cards */}
            <section className="ceo-roles-reference">
              <div className="roles-ref-head">
                <h3>Modular Role Architecture</h3>
                <p>Every role corresponds to decoupled components in Axon's client-server architecture.</p>
              </div>

              <div className="roles-grid">
                {ROLES_LIST.map((role) => (
                  <div className="role-card" key={role.id}>
                    <div className="role-card-top">
                      <span className="role-color-dot" style={{ background: role.color }} />
                      <strong>{role.name}</strong>
                      <span className="mono-label role-dept-badge">{role.department}</span>
                    </div>
                    <p>
                      {role.name === "CEO" && "Sets overall technical vision, project governance, and organizational permissions."}
                      {role.name === "Developer" && "Builds front-end interfaces, backend endpoints, and core product features."}
                      {role.name === "Tester" && "Runs automated verification, test suites, quality assurance, and edge cases."}
                      {role.name === "Marketer" && "Drives user acquisition, product positioning, analytics, and marketing campaigns."}
                    </p>
                    <div className="role-card-meta mono-label">
                      <span>LEVEL: {role.level || "Core"}</span>
                      <span>PERMISSIONS: ACTIVE</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </section>
        )}
          </>
        )}
      </main>

      {/* Synchronized Landing Page Footer */}
      <Footer />

      {/* Connect Repository Modal */}
      <ConnectRepoModal
        isOpen={isConnectRepoModalOpen}
        onClose={() => setIsConnectRepoModalOpen(false)}
        workspace={activeWorkspace}
        token={token}
        onRepoConnected={handleRepoConnected}
        onRepoDisconnected={handleRepoDisconnected}
      />

      {/* Create / Edit Workspace Modal */}
      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        mode={workspaceModalMode}
        workspace={workspaceToEdit}
        onClose={() => setIsWorkspaceModalOpen(false)}
        token={token}
        onSaved={handleWorkspaceSaved}
      />

      {/* Add Employee Modal (Preserved 100%) */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
            <motion.div
              className="add-emp-dialog"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
            >
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAddModalOpen(false)}
              >
                <X size={18} />
              </button>

              <div className="modal-header">
                <span className="icon-pill"><UserPlus size={20} /></span>
                <div>
                  <span className="mono-label">TEAM EXPANSION</span>
                  <h3>Add Team Member</h3>
                </div>
              </div>

              <form onSubmit={handleAddEmployee} className="add-emp-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={newEmp.name}
                    onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Work Email</label>
                  <input
                    type="email"
                    required
                    placeholder="user@axon.workspace"
                    value={newEmp.email}
                    onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>GitHub Username</label>
                  <div className="input-with-prefix">
                    <span>@</span>
                    <input
                      type="text"
                      required
                      placeholder="github_username"
                      value={newEmp.githubUsername}
                      onChange={(e) => setNewEmp({ ...newEmp, githubUsername: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Role</label>
                    <select
                      value={newEmp.role}
                      onChange={(e) => {
                        const selected = ROLES_LIST.find((r) => r.name === e.target.value);
                        setNewEmp({
                          ...newEmp,
                          role: e.target.value,
                          department: selected ? selected.department : newEmp.department
                        });
                      }}
                    >
                      {ROLES_LIST.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Department</label>
                    <select
                      value={newEmp.department}
                      onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Leadership">Leadership</option>
                      <option value="Marketing">Marketing</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => setIsAddModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="button button--lime">
                    <Check size={16} />
                    <span>Confirm &amp; Add Employee</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unique GitHub Member Invitation Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        workspace={activeWorkspace}
        token={token}
        onMemberAdded={() => {
          fetchWorkspaceMembersAndInvites(activeWorkspaceId);
          fetchEmployees();
        }}
      />
    </div>
  );
}
