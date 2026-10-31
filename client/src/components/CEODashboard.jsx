import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
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
  GitPullRequest,
  UploadCloud,
  FileText,
  ChevronUp,
  BarChart3
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ConnectRepoModal from "./ConnectRepoModal";
import WorkspaceModal from "./WorkspaceModal";
import Brand from "./Brand";
import SectionHeading from "./SectionHeading";
import Tilt3D from "./Tilt3D";
import Footer from "./Footer";
import DeveloperStudio from "./DeveloperStudio";
import TesterLab from "./TesterLab";
import MarketerDeck from "./MarketerDeck";
import TimeMachine from "./TimeMachine";
import FlowchartStudio from "./FlowchartStudio";
import PRIntelligenceStudio from "./PRIntelligenceStudio";
import AnalyticsStudio from "./AnalyticsStudio";
import InviteMemberModal from "./InviteMemberModal";
import FormattedAIResponse from "./FormattedAIResponse";
import { API_BASE } from "../config/api.js";

const ROLES_LIST = [
  { id: "ceo", name: "CEO", department: "Leadership", color: "#c8ff3d", level: "Executive" },
  { id: "developer", name: "Developer", department: "Engineering", color: "#c8ff3d", level: "Engineering" },
  { id: "tester", name: "Tester", department: "Engineering", color: "#c8ff3d", level: "Quality Assurance" },
  { id: "marketer", name: "Marketer", department: "Marketing", color: "#c8ff3d", level: "Growth & Marketing" }
];

// Role-Based Access Control (RBAC) & Feature Permissions (Clean Minimal Palette)
export const ROLE_DEFINITIONS = {
  ceo: {
    id: "ceo",
    title: "Chief Executive Officer",
    badgeLabel: "CEO / OWNER",
    department: "Executive Leadership",
    color: "#c8ff3d",
    icon: ShieldCheck,
    description: "Full governance, all studios unlocked, workspace settings & team access control.",
    allowedFeatures: [
      "overview",
      "analytics",
      "developer",
      "tester",
      "marketer",
      "timemachine",
      "flowchart",
      "pr-review",
      "team",
      "all-workspaces"
    ]
  },
  developer: {
    id: "developer",
    title: "Software Engineer",
    badgeLabel: "DEVELOPER",
    department: "Engineering",
    color: "#c8ff3d",
    icon: Code2,
    description: "Code inspection, RAG Project Brain, PR reviews, time machine evolution, and architecture diagrams.",
    allowedFeatures: [
      "overview",
      "analytics",
      "developer",
      "pr-review",
      "timemachine",
      "flowchart",
      "tester"
    ]
  },
  tester: {
    id: "tester",
    title: "QA Automation Engineer",
    badgeLabel: "TESTER QA",
    department: "Quality Assurance",
    color: "#c8ff3d",
    icon: TestTube,
    description: "Automated test suites, edge case verification, PR regression analysis, and testing flowcharts.",
    allowedFeatures: [
      "overview",
      "analytics",
      "tester",
      "pr-review",
      "flowchart",
      "timemachine"
    ]
  },
  marketer: {
    id: "marketer",
    title: "Growth & Product Marketer",
    badgeLabel: "MARKETER",
    department: "Growth & Marketing",
    color: "#c8ff3d",
    icon: Megaphone,
    description: "Product positioning, launch campaigns, customer journey flowcharts, and release tracking.",
    allowedFeatures: [
      "overview",
      "analytics",
      "marketer",
      "flowchart",
      "timemachine"
    ]
  }
};

const ALL_SIDEBAR_ITEMS = [
  {
    group: "CORE COMMAND",
    items: [
      { id: "overview", label: "Workspace Command", icon: Layers, color: "#c8ff3d" },
      { id: "analytics", label: "Repo & Org Analytics", icon: BarChart3, color: "#c8ff3d" }
    ]
  },
  {
    group: "ROLE STUDIOS",
    items: [
      { id: "developer", label: "Developer Studio", icon: Code2, color: "#8a8f88" },
      { id: "pr-review", label: "AI PR Reviewer", icon: GitPullRequest, color: "#8a8f88" },
      { id: "tester", label: "Tester QA Lab", icon: TestTube, color: "#8a8f88" },
      { id: "timemachine", label: "Time Machine", icon: History, color: "#8a8f88" },
      { id: "flowchart", label: "Flowchart Studio", icon: Palette, color: "#8a8f88" },
      { id: "marketer", label: "Marketer Deck", icon: Megaphone, color: "#8a8f88" }
    ]
  },
  {
    group: "GOVERNANCE & ADMIN",
    items: [
      { id: "team", label: "Team & Roles", icon: Users, color: "#8a8f88" },
      { id: "all-workspaces", label: "All Workspaces", icon: Building, color: "#8a8f88" }
    ]
  }
];

export default function CEODashboard() {
  const { user, token, logout, setCurrentView } = useAuth();

  // Navigation & Role Perspective State
  const [perspective, setPerspective] = useState("developer"); // "developer" | "ceo" | "tester" | "marketer"
  const [activeTab, setActiveTab] = useState("dedicated"); // "dedicated" | "all-workspaces" | "team"
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [simulatedRole, setSimulatedRole] = useState(null); // CEO can simulate other roles

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
  const [brainDocuments, setBrainDocuments] = useState([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [selectedFilterType, setSelectedFilterType] = useState("all");
  const [expandedSourceIdx, setExpandedSourceIdx] = useState(null);

  // Employees State (Preserved 100%)
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");

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
        } else {
          setActiveWorkspaceId("");
          localStorage.removeItem("axon_active_workspace_id");
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
      fetchBrainDocuments(activeWorkspaceId);
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
  // 4. PROJECT BRAIN (RAG + GROQ) EXPLORER & DOC INGESTION
  // ==========================================
  const fetchBrainDocuments = async (wsId) => {
    if (!wsId) return;
    try {
      const res = await fetch(`${API_BASE}/workspaces/${wsId}/brain/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBrainDocuments(data.documents || []);
      }
    } catch (err) {
      console.warn("Failed to fetch brain documents:", err.message);
    }
  };

  const handleUploadDocument = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeWorkspace) return;
    try {
      setIsUploadingDoc(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/workspaces/${activeWorkspace.id}/brain/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        showNotification(`Ingested "${file.name}" into Project Brain (${data.chunkCount || 0} chunks indexed).`);
        await fetchBrainDocuments(activeWorkspace.id);
        await fetchActiveWorkspaceDetails(activeWorkspace.id);
      } else {
        const errData = await res.json();
        showNotification(errData.error || "Failed to ingest document.");
      }
    } catch (err) {
      console.error("Document upload error:", err);
      showNotification("Network error uploading document.");
    } finally {
      setIsUploadingDoc(false);
      e.target.value = "";
    }
  };

  const handleDeleteDocument = async (docId, docName) => {
    if (!activeWorkspace || !docId) return;
    if (!window.confirm(`Delete document "${docName}" from Project Brain?`)) return;

    try {
      const res = await fetch(`${API_BASE}/workspaces/${activeWorkspace.id}/brain/documents/${docId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showNotification("Document removed from Project Brain.");
        await fetchBrainDocuments(activeWorkspace.id);
        await fetchActiveWorkspaceDetails(activeWorkspace.id);
      } else {
        const errData = await res.json();
        showNotification(errData.error || "Failed to delete document.");
      }
    } catch (err) {
      console.error("Delete document error:", err);
      showNotification("Network error deleting document.");
    }
  };

  const handleAskBrain = async (queryToUse) => {
    const q = queryToUse || brainQuery;
    if (!q || !q.trim() || !activeWorkspace) return;

    try {
      setIsBrainSearching(true);
      const payload = {
        query: q.trim(),
        topK: 4
      };
      if (selectedFilterType && selectedFilterType !== "all") {
        payload.filterType = selectedFilterType;
      }

      const res = await fetch(`${API_BASE}/workspaces/${activeWorkspace.id}/brain/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
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

  // Role Detection & Simulation
  const currentWorkspaceMember = (workspaceMembers || []).find(
    (m) =>
      (user?.username && m.githubUsername?.toLowerCase() === user.username.toLowerCase()) ||
      (user?.id && m.userId === user.id)
  );

  const isActualCEO =
    user?.role?.toUpperCase() === "CEO" ||
    activeWorkspace?.ownerId === user?.id ||
    activeWorkspace?.ownerId === user?.username ||
    currentWorkspaceMember?.role?.toLowerCase() === "ceo";

  const actualRole = isActualCEO ? "ceo" : (currentWorkspaceMember?.role?.toLowerCase() || "developer");
  const effectiveRole = isActualCEO && simulatedRole ? simulatedRole : actualRole;
  const roleConfig = ROLE_DEFINITIONS[effectiveRole] || ROLE_DEFINITIONS.developer;
  const RoleIcon = roleConfig.icon;

  const activeFeatureId =
    perspective === "analytics"
      ? "analytics"
      : perspective === "developer"
      ? "developer"
      : perspective === "tester"
      ? "tester"
      : perspective === "marketer"
      ? "marketer"
      : perspective === "timemachine"
      ? "timemachine"
      : perspective === "flowchart"
      ? "flowchart"
      : perspective === "pr-review"
      ? "pr-review"
      : activeTab === "team"
      ? "team"
      : activeTab === "all-workspaces"
      ? "all-workspaces"
      : "overview";

  const handleSelectFeature = (featureId) => {
    if (featureId === "overview") {
      setPerspective("ceo");
      setActiveTab("dedicated");
    } else if (featureId === "team") {
      setPerspective("ceo");
      setActiveTab("team");
    } else if (featureId === "all-workspaces") {
      setPerspective("ceo");
      setActiveTab("all-workspaces");
    } else {
      setPerspective(featureId);
      setActiveTab("dedicated");
    }
  };

  // Guard: Ensure active feature is allowed for effectiveRole
  useEffect(() => {
    const allowed = roleConfig.allowedFeatures || ["overview"];
    if (!allowed.includes(activeFeatureId)) {
      handleSelectFeature(allowed[0] || "overview");
    }
  }, [effectiveRole, activeFeatureId]);

  const filteredSidebarGroups = ALL_SIDEBAR_ITEMS.map((g) => ({
    ...g,
    items: g.items.filter((item) => roleConfig.allowedFeatures.includes(item.id))
  })).filter((g) => g.items.length > 0);

  const getFeatureTitle = (id) => {
    for (const group of ALL_SIDEBAR_ITEMS) {
      const item = group.items.find((i) => i.id === id);
      if (item) return item.label;
    }
    return "Workspace Command";
  };

  return (
    <div className="axon-layout">
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

      {/* ============================================================
          SIDEBAR NAVIGATION (ROLE-BASED RBAC)
          ============================================================ */}
      <aside className="axon-sidebar">
        {/* Sidebar Brand & Workspace Switcher Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand-row">
            <Brand onClick={() => setCurrentView("landing")} />
          </div>

          {/* Workspace Switcher Selector */}
          <div className="ws-switcher-wrap" style={{ position: "relative" }}>
            <button
              type="button"
              className="sidebar-ws-selector"
              onClick={() => setIsWorkspaceSwitcherOpen((prev) => !prev)}
              title="Switch active workspace"
            >
              <div className="sidebar-ws-meta">
                <span className="sidebar-ws-name">{activeWorkspace?.name || "Select Workspace"}</span>
                <span className="sidebar-ws-repo">
                  <FolderGit2 size={11} color={activeWorkspace?.repository ? "#c8ff3d" : "#f59e0b"} />
                  <span>{activeWorkspace?.repository ? activeWorkspace.repository.name : "No repo connected"}</span>
                </span>
              </div>
              <ChevronDown
                size={13}
                className={`ws-switcher-chevron ${isWorkspaceSwitcherOpen ? "is-open" : ""}`}
              />
            </button>

            {/* Popover */}
            <AnimatePresence>
              {isWorkspaceSwitcherOpen && (
                <motion.div
                  className="ws-dropdown-popover"
                  style={{ top: "100%", left: 0, width: "100%", zIndex: 120 }}
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
                              {ws.repository ? ws.repository.name : "No repo connected"}
                            </span>
                          </div>
                          {isSelected && <Check size={14} color="#c8ff3d" />}
                        </button>
                      );
                    })}
                  </div>

                  {isActualCEO && (
                    <div className="ws-dropdown-footer">
                      <button
                        type="button"
                        className="ws-footer-action"
                        onClick={openCreateWorkspaceModal}
                      >
                        <Plus size={14} />
                        <span>Create New Workspace</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Profile Card with USER ROLE Display */}
        <div className="sidebar-profile-card">
          <div className="profile-card-top">
            <img
              src={
                user?.avatar ||
                (user?.username
                  ? `https://avatars.githubusercontent.com/${user.username}`
                  : "https://avatars.githubusercontent.com/ghost")
              }
              alt={user?.name || user?.username || "User"}
              className="profile-card-avatar"
            />
            <div className="profile-card-user">
              <span className="profile-card-name">{user?.name || user?.username || "Workspace Member"}</span>
              <span className="profile-card-handle mono-label">
                <Github size={10} /> @{user?.username || "authenticated"}
              </span>
            </div>
          </div>

          {/* User Role Badge Display */}
          <div
            className="profile-role-badge mono-label"
            style={{
              background: `${roleConfig.color}15`,
              color: roleConfig.color,
              border: `1px solid ${roleConfig.color}44`
            }}
          >
            <RoleIcon size={12} />
            <span>{roleConfig.badgeLabel}</span>
          </div>

          {/* CEO Perspective Simulation Switcher */}
          {isActualCEO && (
            <div className="profile-sim-switcher">
              <span className="sim-label mono-label">CEO ROLE SIMULATION:</span>
              <select
                value={simulatedRole || "ceo"}
                onChange={(e) => setSimulatedRole(e.target.value === "ceo" ? null : e.target.value)}
                className="sim-select mono-label"
                title="Simulate how workspace looks for other roles"
              >
                <option value="ceo">👑 Full CEO Master Access</option>
                <option value="developer">💻 Preview as Developer</option>
                <option value="tester">🧪 Preview as Tester QA</option>
                <option value="marketer">📈 Preview as Marketer</option>
              </select>
            </div>
          )}
        </div>

        {/* Sidebar Navigation Items (Role Filtered) */}
        <nav className="sidebar-nav">
          {filteredSidebarGroups.map((group) => (
            <div key={group.group} className="sidebar-nav-group">
              <span className="sidebar-group-label mono-label">{group.group}</span>
              {group.items.map((item) => {
                const ItemIcon = item.icon;
                const isActive = activeFeatureId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-nav-item ${isActive ? "is-active" : ""}`}
                    onClick={() => handleSelectFeature(item.id)}
                  >
                    <ItemIcon
                      size={15}
                      className="nav-icon"
                      style={{ color: isActive ? "#c8ff3d" : item.color }}
                    />
                    <span>{item.label}</span>
                    {item.id === "team" && pendingInvitations.filter((i) => i.status === "pending").length > 0 && (
                      <span className="nav-badge mono-label">
                        {pendingInvitations.filter((i) => i.status === "pending").length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-repo-card mono-label">
            <div className="sidebar-repo-pill">
              <FolderGit2 size={12} color={activeWorkspace?.repository ? "#c8ff3d" : "#f59e0b"} />
              <span>{activeWorkspace?.repository?.name || "No Repo"}</span>
            </div>
            {isActualCEO && (
              <button
                type="button"
                className="button button--small button--ghost"
                style={{ padding: "2px 6px", fontSize: "10px" }}
                onClick={() => setIsConnectRepoModalOpen(true)}
              >
                {activeWorkspace?.repository ? "Sync" : "+ Connect"}
              </button>
            )}
          </div>

          <div className="sidebar-foot-actions">
            <button
              type="button"
              className="sidebar-foot-btn mono-label"
              onClick={() => setCurrentView("landing")}
              title="Return to Public Landing Page"
            >
              <ArrowLeft size={12} />
              <span>Landing</span>
            </button>
            <button
              type="button"
              className="sidebar-foot-btn sidebar-foot-btn--logout mono-label"
              onClick={logout}
              title="Sign Out"
            >
              <LogOut size={12} />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================
          MAIN WORKSPACE CONTENT CONTAINER
          ============================================================ */}
      <div className="axon-main-container">
        {/* Topbar with Breadcrumb & Quick Profile */}
        <header className="axon-topbar">
          <div className="topbar-left">
            <div className="topbar-breadcrumb mono-label">
              <span className="topbar-ws-tag">{activeWorkspace?.name || "Workspace"}</span>
              <span className="topbar-sep">/</span>
              <span className="topbar-feature-tag">
                {getFeatureTitle(activeFeatureId)}
              </span>
            </div>
          </div>

          <div className="topbar-right">
            {/* Role Badge near Profile in Topbar */}
            <span
              className="topbar-role-badge mono-label"
              style={{
                background: `${roleConfig.color}15`,
                color: roleConfig.color,
                border: `1px solid ${roleConfig.color}44`
              }}
            >
              <RoleIcon size={12} />
              <span>{roleConfig.badgeLabel}</span>
            </span>

            {/* Profile Avatar & Name */}
            <div className="topbar-profile-pill">
              <img
                src={
                  user?.avatar ||
                  (user?.username
                    ? `https://avatars.githubusercontent.com/${user.username}`
                    : "https://avatars.githubusercontent.com/ghost")
                }
                alt="Profile"
                className="topbar-avatar"
              />
              <span className="topbar-username">@{user?.username || "user"}</span>
            </div>

            <button
              type="button"
              className="button button--small button--ghost"
              onClick={logout}
              title="Sign Out"
              style={{ padding: "6px 10px" }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </header>

        {/* Viewport for Active Studio / Feature */}
        <div className="axon-viewport">
          {activeFeatureId === "analytics" && (
            <AnalyticsStudio
              workspace={activeWorkspace}
              token={token}
              onOpenConnectRepo={() => setIsConnectRepoModalOpen(true)}
            />
          )}

          {activeFeatureId === "developer" && (
            <DeveloperStudio
              workspace={activeWorkspace}
              token={token}
              onSwitchPerspective={(persp) => handleSelectFeature(persp)}
              onOpenConnectRepo={() => setIsConnectRepoModalOpen(true)}
            />
          )}

          {activeFeatureId === "tester" && (
            <TesterLab
              workspace={activeWorkspace}
              token={token}
            />
          )}

          {activeFeatureId === "marketer" && (
            <MarketerDeck
              workspace={activeWorkspace}
              token={token}
            />
          )}

          {activeFeatureId === "timemachine" && (
            <TimeMachine
              workspace={activeWorkspace}
              token={token}
              onSwitchPerspective={(persp) => handleSelectFeature(persp)}
            />
          )}

          {activeFeatureId === "flowchart" && (
            <FlowchartStudio
              workspace={activeWorkspace}
              token={token}
            />
          )}

          {activeFeatureId === "pr-review" && (
            <PRIntelligenceStudio
              workspace={activeWorkspace}
              token={token}
            />
          )}

          {/* ============================================================
              VIEW 1: DEDICATED WORKSPACE COMMAND
              ============================================================ */}
          {activeFeatureId === "overview" && activeWorkspace && (
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
                  onClick={() => setPerspective("analytics")}
                  style={{ borderColor: "rgba(200, 255, 61, 0.4)", color: "#c8ff3d", background: "rgba(200, 255, 61, 0.08)" }}
                  title="Launch Repo & Org Analytics"
                >
                  <BarChart3 size={14} />
                  <span>Repo Analytics</span>
                </button>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => setPerspective("timemachine")}
                  style={{ borderColor: "rgba(200, 255, 61, 0.3)", color: "#c8ff3d" }}
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
              <Tilt3D max={4} scale={1.008} className="bento-tilt">
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
                          onClick={() => handleSelectFeature("developer")}
                        >
                          <Code2 size={13} />
                          <span>Explore in IDE</span>
                        </button>

                        <button
                          type="button"
                          className="button button--ghost button--small"
                          onClick={() => setIsConnectRepoModalOpen(true)}
                        >
                          <RefreshCw size={13} />
                          <span>Replace</span>
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
              </Tilt3D>

              {/* Column 2: Workspace Project Brain (RAG Engine + Groq LLM) */}
              <Tilt3D max={4} scale={1.008} className="bento-tilt">
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
                          <span className="val" style={{ color: "#c8ff3d" }}>
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

                      {/* Brain Document Ingestion Section */}
                      <div className="brain-docs-container">
                        <div className="brain-docs-head">
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <FileText size={13} color="#c8ff3d" />
                            <span className="mono-label" style={{ fontSize: "10.5px", color: "#c8ff3d" }}>
                              PROJECT SPEC & DOCUMENT INGESTION
                            </span>
                            <span className="mono-label" style={{ fontSize: "9.5px", color: "#64748b" }}>
                              (PDF, DOCX, TXT, MD)
                            </span>
                          </div>

                          <div>
                            <input
                              type="file"
                              id="brain-file-input"
                              style={{ display: "none" }}
                              accept=".pdf,.docx,.txt,.md"
                              onChange={handleUploadDocument}
                              disabled={isUploadingDoc}
                            />
                            <label
                              htmlFor="brain-file-input"
                              className="brain-upload-action-btn"
                              style={{ opacity: isUploadingDoc ? 0.6 : 1, cursor: isUploadingDoc ? "not-allowed" : "pointer" }}
                            >
                              {isUploadingDoc ? <RefreshCw size={12} className="spin" /> : <UploadCloud size={12} />}
                              <span>{isUploadingDoc ? "Indexing..." : "Upload Document"}</span>
                            </label>
                          </div>
                        </div>

                        {brainDocuments && brainDocuments.length > 0 ? (
                          <div className="brain-docs-list">
                            {brainDocuments.map((doc) => (
                              <div key={doc.id} className="brain-doc-chip">
                                <FileText size={11} color="#c8ff3d" />
                                <span className="doc-name" title={doc.name}>{doc.name}</span>
                                <span className="doc-meta">
                                  ({doc.chunkCount || 0} chunks • {Math.round((doc.size || 0) / 1024)} KB)
                                </span>
                                <button
                                  type="button"
                                  className="brain-doc-delete-btn"
                                  title="Remove document from Project Brain"
                                  onClick={() => handleDeleteDocument(doc.id, doc.name)}
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>
                            No external documents uploaded yet. Ingest architecture diagrams, API specs, or PRDs to enrich RAG context.
                          </div>
                        )}
                      </div>

                      {/* Brain Query Explorer */}
                      <div className="brain-query-section">
                        {/* RAG Source Filter Strip */}
                        <div className="brain-filter-strip">
                          <span className="mono-label" style={{ fontSize: "10px", color: "#64748b" }}>
                            FILTER:
                          </span>
                          {[
                            { id: "all", label: "All Sources" },
                            { id: "code", label: "Codebase" },
                            { id: "commit", label: "Commits & Diffs" },
                            { id: "pull_request", label: "PRs & Reviews" },
                            { id: "issue", label: "Discussions & Issues" },
                            { id: "document", label: "Uploaded Specs" }
                          ].map((pill) => (
                            <button
                              key={pill.id}
                              type="button"
                              className={`brain-filter-pill ${selectedFilterType === pill.id ? "is-active" : ""}`}
                              onClick={() => setSelectedFilterType(pill.id)}
                            >
                              {pill.label}
                            </button>
                          ))}
                        </div>

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
                                <div className="brain-answer-text">
                                  <FormattedAIResponse content={brainAnswer.answer} />
                                </div>

                                {/* Sources */}
                                {brainAnswer.sources && brainAnswer.sources.length > 0 && (
                                  <div className="brain-sources-list">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                      <span className="mono-label" style={{ color: "#c8ff3d", fontSize: "10px" }}>
                                        RETRIEVED KNOWLEDGE SOURCES ({brainAnswer.sources.length}):
                                      </span>
                                      <span className="mono-label" style={{ color: "#64748b", fontSize: "10px" }}>
                                        LOCAL all-MiniLM-L6-v2 384d
                                      </span>
                                    </div>
                                    {brainAnswer.sources.map((src, i) => {
                                      const isExpanded = expandedSourceIdx === i;
                                      const getSourceIcon = (type) => {
                                        switch (type) {
                                          case "pull_request":
                                            return <GitPullRequest size={12} color="#c8ff3d" />;
                                          case "commit":
                                            return <GitBranch size={12} color="#c8ff3d" />;
                                          case "issue":
                                          case "discussion":
                                            return <Megaphone size={12} color="#c8ff3d" />;
                                          case "document":
                                            return <FileText size={12} color="#c8ff3d" />;
                                          default:
                                            return <Code2 size={12} color="#c8ff3d" />;
                                        }
                                      };

                                      return (
                                        <div key={i} className="brain-source-card">
                                          <div className="brain-source-top">
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                              {getSourceIcon(src.type)}
                                              <strong style={{ color: "#f8fafc", fontWeight: 500 }}>
                                                {src.filePath || src.title || "Repository Source"}
                                              </strong>
                                              {src.title && src.filePath && src.title !== src.filePath && (
                                                <span style={{ color: "#94a3b8", fontSize: "10.5px" }}>— {src.title}</span>
                                              )}
                                            </span>
                                            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                              <span className="brain-source-score">
                                                {Math.round(src.score * 100)}% match
                                              </span>
                                              {src.snippet && (
                                                <button
                                                  type="button"
                                                  className="brain-doc-delete-btn"
                                                  style={{ color: "#94a3b8" }}
                                                  onClick={() => setExpandedSourceIdx(isExpanded ? null : i)}
                                                  title={isExpanded ? "Collapse preview" : "Expand preview"}
                                                >
                                                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                          {isExpanded && src.snippet && (
                                            <div className="brain-source-snippet">
                                              {src.snippet}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
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
              </Tilt3D>
            </div>

            {/* Quick Studio Launchpad Bento */}
            <div className="ws-studio-launchpad-section">
              <div className="launchpad-header">
                <div className="launchpad-title-group">
                  <Sparkles size={16} color="#c8ff3d" />
                  <h3>INTELLIGENT STUDIOS</h3>
                </div>
                <span className="mono-label" style={{ color: "#64748b" }}>6 ENGINES ACTIVE // ONE-CLICK SWITCH</span>
              </div>

              <div className="studio-launchpad-grid">
                {/* 1. Developer Studio */}
                <Tilt3D max={5} scale={1.01} className="studio-tile-tilt">
                  <button
                    type="button"
                    className="studio-tile-card"
                    onClick={() => handleSelectFeature("developer")}
                  >
                    <div className="studio-tile-top">
                      <div className="studio-tile-icon-box">
                        <Code2 size={20} />
                      </div>
                      <ArrowRight size={14} className="studio-tile-arrow" />
                    </div>
                    <div className="studio-tile-body">
                      <span className="studio-tile-kicker mono-label">ENGINEERING</span>
                      <h4 className="studio-tile-name">Developer Studio</h4>
                      <p className="studio-tile-desc">
                        Explore workspace files, inspect code architectures, and query module dependencies.
                      </p>
                    </div>
                  </button>
                </Tilt3D>

                {/* 2. AI PR Reviewer */}
                <Tilt3D max={5} scale={1.01} className="studio-tile-tilt">
                  <button
                    type="button"
                    className="studio-tile-card"
                    onClick={() => handleSelectFeature("pr-review")}
                  >
                    <div className="studio-tile-top">
                      <div className="studio-tile-icon-box">
                        <GitPullRequest size={20} />
                      </div>
                      <ArrowRight size={14} className="studio-tile-arrow" />
                    </div>
                    <div className="studio-tile-body">
                      <span className="studio-tile-kicker mono-label">CODE QUALITY</span>
                      <h4 className="studio-tile-name">AI PR Reviewer</h4>
                      <p className="studio-tile-desc">
                        Deep pull request intelligence: simple explanations, bug hunting, and breaking change detection.
                      </p>
                    </div>
                  </button>
                </Tilt3D>

                {/* 3. Flowchart Studio */}
                <Tilt3D max={5} scale={1.01} className="studio-tile-tilt">
                  <button
                    type="button"
                    className="studio-tile-card"
                    onClick={() => handleSelectFeature("flowchart")}
                  >
                    <div className="studio-tile-top">
                      <div className="studio-tile-icon-box">
                        <Palette size={20} />
                      </div>
                      <ArrowRight size={14} className="studio-tile-arrow" />
                    </div>
                    <div className="studio-tile-body">
                      <span className="studio-tile-kicker mono-label">VISUAL LOGIC</span>
                      <h4 className="studio-tile-name">Flowchart Studio</h4>
                      <p className="studio-tile-desc">
                        Generate colorful, dynamic Mermaid system flows, user journeys, and architecture diagrams.
                      </p>
                    </div>
                  </button>
                </Tilt3D>

                {/* 4. Time Machine */}
                <Tilt3D max={5} scale={1.01} className="studio-tile-tilt">
                  <button
                    type="button"
                    className="studio-tile-card"
                    onClick={() => handleSelectFeature("timemachine")}
                  >
                    <div className="studio-tile-top">
                      <div className="studio-tile-icon-box">
                        <History size={20} />
                      </div>
                      <ArrowRight size={14} className="studio-tile-arrow" />
                    </div>
                    <div className="studio-tile-body">
                      <span className="studio-tile-kicker mono-label">TEMPORAL GIT</span>
                      <h4 className="studio-tile-name">Time Machine</h4>
                      <p className="studio-tile-desc">
                        Travel across git history, inspect historic snapshots, and compare architecture evolution.
                      </p>
                    </div>
                  </button>
                </Tilt3D>

                {/* 5. Tester Lab */}
                <Tilt3D max={5} scale={1.01} className="studio-tile-tilt">
                  <button
                    type="button"
                    className="studio-tile-card"
                    onClick={() => handleSelectFeature("tester")}
                  >
                    <div className="studio-tile-top">
                      <div className="studio-tile-icon-box">
                        <TestTube size={20} />
                      </div>
                      <ArrowRight size={14} className="studio-tile-arrow" />
                    </div>
                    <div className="studio-tile-body">
                      <span className="studio-tile-kicker mono-label">QUALITY ASSURANCE</span>
                      <h4 className="studio-tile-name">Tester Lab</h4>
                      <p className="studio-tile-desc">
                        Generate automated unit tests, edge case matrices, and regression verification plans.
                      </p>
                    </div>
                  </button>
                </Tilt3D>

                {/* 6. Marketer Deck */}
                <Tilt3D max={5} scale={1.01} className="studio-tile-tilt">
                  <button
                    type="button"
                    className="studio-tile-card"
                    onClick={() => handleSelectFeature("marketer")}
                  >
                    <div className="studio-tile-top">
                      <div className="studio-tile-icon-box">
                        <Megaphone size={20} />
                      </div>
                      <ArrowRight size={14} className="studio-tile-arrow" />
                    </div>
                    <div className="studio-tile-body">
                      <span className="studio-tile-kicker mono-label">PRODUCT GROWTH</span>
                      <h4 className="studio-tile-name">Marketer Deck</h4>
                      <p className="studio-tile-desc">
                        Synthesize customer narratives, launch announcements, feature changelogs, and campaign copy.
                      </p>
                    </div>
                  </button>
                </Tilt3D>
              </div>
            </div>

            {/* Minimalist System Architecture Bar */}
            <div className="system-arch-bar">
              <div className="system-arch-tile">
                <Users size={18} className="arch-tile-icon" />
                <div className="arch-tile-meta">
                  <span className="arch-tile-label mono-label">CONTRIBUTORS</span>
                  <span className="arch-tile-val">{employees.length} Active Leads</span>
                </div>
              </div>

              <div className="system-arch-tile">
                <Layers size={18} className="arch-tile-icon" />
                <div className="arch-tile-meta">
                  <span className="arch-tile-label mono-label">WORKSPACE PORTFOLIO</span>
                  <span className="arch-tile-val">{workspaces.length} Projects</span>
                </div>
              </div>

              <div className="system-arch-tile">
                <Activity size={18} className="arch-tile-icon" />
                <div className="arch-tile-meta">
                  <span className="arch-tile-label mono-label">NEURAL ENGINE</span>
                  <span className="arch-tile-val" style={{ color: "#c8ff3d" }}>SYNCHRONIZED</span>
                </div>
              </div>

              <div className="system-arch-tile">
                <ShieldCheck size={18} className="arch-tile-icon" />
                <div className="arch-tile-meta">
                  <span className="arch-tile-label mono-label">SYSTEM PERMISSIONS</span>
                  <span className="arch-tile-val">{roleConfig.badgeLabel}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================
            VIEW 2: ALL WORKSPACES OVERVIEW
            ============================================================ */}
        {activeFeatureId === "all-workspaces" && (
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
                  <Tilt3D key={ws.id} max={5} scale={1.01} className="all-ws-tilt">
                    <div
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
                              <Lock size={10} color="#94a3b8" />
                            ) : (
                              <Globe size={10} color="#c8ff3d" />
                            )}
                          </div>
                        ) : (
                          <div className="ws-project-repo-pill" style={{ color: "#94a3b8" }}>
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
                  </Tilt3D>
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
            VIEW 3: TEAM & ROLES (Preserved 100%)
            ============================================================ */}
        {activeFeatureId === "team" && (
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
                            Invite your developers, testers, or marketers securely with GitHub.
                          </p>
                          <button
                            type="button"
                            className="button button--small button--lime"
                            onClick={() => setIsInviteModalOpen(true)}
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                          >
                            <Github size={14} />
                            <span>Invite with GitHub</span>
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
                    <div className="mono-label kicker-pill" style={{ color: "#c8ff3d", marginBottom: "6px" }}>
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
        </div>

        {/* Synchronized Landing Page Footer */}
        <Footer />
      </div>

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
