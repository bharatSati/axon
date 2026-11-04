import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import gsap from "gsap";
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
  BarChart3,
  Zap
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ConnectRepoModal from "./ConnectRepoModal";
import WorkspaceModal from "./WorkspaceModal";
import Brand from "./Brand";
import DashboardBackdrop from "./DashboardBackdrop";
import SectionHeading from "./SectionHeading";
import Tilt3D from "./Tilt3D";
import DeveloperStudio from "./DeveloperStudio";
import TesterLab from "./TesterLab";
import MarketerDeck from "./MarketerDeck";
import TimeMachine from "./TimeMachine";
import FlowchartStudio from "./FlowchartStudio";
import PRIntelligenceStudio from "./PRIntelligenceStudio";
import AnalyticsStudio from "./AnalyticsStudio";
import WorkspaceOverview from "./WorkspaceOverview";
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
  const viewportRef = useRef(null);

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

  const handleDisconnectRepository = async () => {
    if (!activeWorkspace?.repository) return;
    if (!window.confirm(`Disconnect "${activeWorkspace.repository.name}"? Project Brain will be paused.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/workspaces/${activeWorkspace.id}/repository`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.workspace) handleRepoDisconnected(data.workspace);
    } catch (err) {
      console.error(err);
      showNotification("Could not disconnect the repository.");
    }
  };

  const handleReindexBrain = async (wsId = activeWorkspaceId) => {
    if (!wsId) return;
    try {
      showNotification("Initiating Project Brain re-indexing...");
      const res = await fetch(`${API_BASE}/workspaces/${wsId}/brain/reindex`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.workspace) {
        setWorkspaces((prev) =>
          prev.map((w) => (w.id === data.workspace.id ? { ...w, ...data.workspace } : w))
        );
        showNotification(data.message || "Project Brain re-indexing initiated!");
      } else {
        showNotification(data.error || "Failed to trigger re-indexing.");
      }
    } catch (err) {
      console.error(err);
      showNotification("Failed to trigger re-indexing.");
    }
  };

  // Auto-poll workspace indexing status if active workspace is currently indexing
  useEffect(() => {
    if (!activeWorkspaceId || activeWorkspace?.brain?.status !== "indexing") return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/workspaces/${activeWorkspaceId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const ws = data.workspace;
          if (ws && ws.brain?.status !== "indexing") {
            setWorkspaces((prev) =>
              prev.map((w) => (w.id === ws.id ? ws : w))
            );
          }
        }
      } catch (err) {
        // silent retry
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [activeWorkspaceId, activeWorkspace?.brain?.status, token]);

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
        setBrainAnswer({ query: q.trim(), ...data });
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

  // GSAP-powered studio transitions: panels settle in, KPI cards stagger up.
  useEffect(() => {
    if (!viewportRef.current) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const ctx = gsap.context(() => {
      const panels = gsap.utils.toArray(".axon-viewport > *");
      if (panels.length) {
        gsap.fromTo(
          panels,
          { opacity: 0, y: 22, filter: "blur(10px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.62,
            ease: "power3.out",
            clearProps: "filter,transform,opacity"
          }
        );
      }

      const cards = gsap.utils.toArray(
        ".analytics-kpi-card, .ov-stat, .ov-card, .ws-project-card, .ov-studio, .tm-banner, .flowchart-prompt-box"
      );
      if (cards.length) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 18, scale: 0.985 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.55,
            stagger: 0.045,
            delay: 0.08,
            ease: "power2.out",
            clearProps: "transform,opacity"
          }
        );
      }
    }, viewportRef);

    return () => ctx.revert();
  }, [activeFeatureId, activeWorkspaceId]);

  // One-time chrome entrance for the dashboard shell.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".axon-sidebar",
        { x: -26, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.7, ease: "expo.out", clearProps: "transform,opacity" }
      );
      gsap.fromTo(
        ".axon-topbar",
        { y: -16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.65, delay: 0.08, ease: "expo.out", clearProps: "transform,opacity" }
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="axon-layout">
      <DashboardBackdrop />

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
            <span className="sidebar-version mono-label">v1.0</span>
          </div>

          {/* Workspace Switcher Selector */}
          <div className="ws-switcher-wrap" style={{ position: "relative" }}>
            <button
              type="button"
              className="sidebar-ws-selector"
              onClick={() => setIsWorkspaceSwitcherOpen((prev) => !prev)}
              title="Switch active workspace"
            >
              <span className="sidebar-ws-avatar">
                {(activeWorkspace?.name || "W").charAt(0).toUpperCase()}
              </span>
              <div className="sidebar-ws-meta">
                <span className="sidebar-ws-name">{activeWorkspace?.name || "Select workspace"}</span>
                <span className="sidebar-ws-repo">
                  {activeWorkspace?.repository ? activeWorkspace.repository.name : "No repository"}
                </span>
              </div>
              <ChevronDown
                size={14}
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
              <span className="profile-card-name">{user?.name || user?.username || "Workspace member"}</span>
              <span className="profile-card-handle">
                @{user?.username || "authenticated"}
              </span>
            </div>
          </div>

          {/* CEO Perspective Simulation Switcher */}
          {isActualCEO && (
            <div className="profile-sim-switcher">
              <span className="sim-label">Preview as</span>
              <select
                value={simulatedRole || "ceo"}
                onChange={(e) => setSimulatedRole(e.target.value === "ceo" ? null : e.target.value)}
                className="sim-select"
                title="Preview the workspace as another role"
              >
                <option value="ceo">Full CEO access</option>
                <option value="developer">Developer</option>
                <option value="tester">Tester</option>
                <option value="marketer">Marketer</option>
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
                      size={16}
                      className="nav-icon"
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
          <div className="sidebar-repo-card">
            <div className="sidebar-repo-meta">
              <span className="sidebar-repo-label">Repository</span>
              <span className="sidebar-repo-pill">
                <FolderGit2 size={12} />
                {activeWorkspace?.repository?.name || "Not connected"}
              </span>
            </div>
            {isActualCEO && (
              <button
                type="button"
                className="sidebar-repo-action"
                onClick={() => setIsConnectRepoModalOpen(true)}
              >
                {activeWorkspace?.repository ? "Manage" : "Connect"}
              </button>
            )}
          </div>

          <div className="sidebar-foot-actions">
            <button
              type="button"
              className="sidebar-foot-btn"
              onClick={() => setCurrentView("landing")}
              title="Return to public site"
            >
              <ArrowLeft size={13} />
              <span>Back to site</span>
            </button>
            <button
              type="button"
              className="sidebar-foot-btn sidebar-foot-btn--logout"
              onClick={logout}
              title="Sign out"
            >
              <LogOut size={13} />
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
            <div className="topbar-breadcrumb">
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
              className="topbar-role-badge"
              title={roleConfig.title}
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
              <span className="topbar-username">{user?.name || `@${user?.username || "user"}`}</span>
            </div>

            <button
              type="button"
              className="topbar-icon-btn"
              onClick={logout}
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* Viewport for Active Studio / Feature */}
        <div className="axon-viewport" ref={viewportRef}>
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

          {activeFeatureId === "overview" && activeWorkspace && (
            <WorkspaceOverview
              workspace={activeWorkspace}
              brainStatus={brainStatus}
              brainStats={brainStats}
              brainDocuments={brainDocuments}
              isUploadingDoc={isUploadingDoc}
              onUploadDocument={handleUploadDocument}
              onDeleteDocument={handleDeleteDocument}
              brainQuery={brainQuery}
              setBrainQuery={setBrainQuery}
              brainAnswer={brainAnswer}
              isBrainSearching={isBrainSearching}
              onAskBrain={handleAskBrain}
              selectedFilterType={selectedFilterType}
              setSelectedFilterType={setSelectedFilterType}
              expandedSourceIdx={expandedSourceIdx}
              setExpandedSourceIdx={setExpandedSourceIdx}
              onSelectFeature={handleSelectFeature}
              onOpenConnectRepo={() => setIsConnectRepoModalOpen(true)}
              onEditWorkspace={openEditWorkspaceModal}
              onDeleteWorkspace={handleDeleteWorkspace}
              onDisconnectRepo={handleDisconnectRepository}
              onReindexBrain={handleReindexBrain}
              employeeCount={employees.length}
              workspaceCount={workspaces.length}
              roleConfig={roleConfig}
            />
          )}

        {/* ============================================================
            VIEW 2: ALL WORKSPACES OVERVIEW
            ============================================================ */}
        {activeFeatureId === "all-workspaces" && (
          <section className="all-workspaces-view" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Symmetric Top Header Card */}
            <div className="analytics-header-card">
              <div className="analytics-header-main">
                <div className="analytics-eyebrow">
                  <span className="analytics-live-dot" />
                  MULTI-PROJECT PORTFOLIO &amp; REPOSITORY DIRECTORY
                </div>
                <h1 className="analytics-main-title">Software Project Workspaces</h1>
                <div className="analytics-repo-strip">
                  <span className="analytics-repo-badge">
                    <Layers size={14} className="text-lime" />
                    <strong>{workspaces.length} Workspaces</strong>
                  </span>
                  <span className="analytics-branch-badge">
                    connected repos: <code>{workspaces.filter((w) => w.repository).length}</code>
                  </span>
                  <span className="analytics-meta-pill">
                    Multi-Tenant Isolation
                  </span>
                  <span className="analytics-meta-pill" style={{ color: "#38bdf8", borderColor: "rgba(56,189,248,0.3)" }}>
                    Brain RAG Enabled
                  </span>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="analytics-header-actions">
                <div className="analytics-health-card">
                  <div className="health-grade-circle" style={{ borderColor: "#c8ff3d" }}>
                    <span className="health-grade-text" style={{ color: "#c8ff3d", fontSize: "14px" }}>
                      100%
                    </span>
                  </div>
                  <div className="health-meta">
                    <div className="health-score-val" style={{ color: "#c8ff3d" }}>
                      ALL HEALTHY
                    </div>
                    <div className="health-label">Portfolio Integrity</div>
                  </div>
                </div>

                <div className="analytics-action-buttons">
                  <button
                    type="button"
                    className="analytics-btn-primary"
                    onClick={openCreateWorkspaceModal}
                    title="Create a new software project workspace"
                  >
                    <Plus size={14} />
                    <span>Create Workspace</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Symmetrical Bento KPI Grid: 4 Portfolio Metrics */}
            <div className="analytics-kpi-grid">
              <div className="analytics-kpi-card">
                <div className="kpi-top">
                  <span className="kpi-title">TOTAL WORKSPACES</span>
                  <div className="kpi-icon-wrap">
                    <Layers size={16} />
                  </div>
                </div>
                <div className="kpi-number">{workspaces.length}</div>
                <div className="kpi-sub">
                  <span className="kpi-tag-lime">PORTFOLIO</span>
                  <span>Independent projects</span>
                </div>
              </div>

              <div className="analytics-kpi-card">
                <div className="kpi-top">
                  <span className="kpi-title">CONNECTED REPOSITORIES</span>
                  <div className="kpi-icon-wrap">
                    <FolderGit2 size={16} />
                  </div>
                </div>
                <div className="kpi-number">{workspaces.filter((w) => w.repository).length}</div>
                <div className="kpi-sub">
                  <span className="kpi-tag-blue">GITHUB LIVE</span>
                  <span>1:1 repository bindings</span>
                </div>
              </div>

              <div className="analytics-kpi-card">
                <div className="kpi-top">
                  <span className="kpi-title">PROJECT BRAINS READY</span>
                  <div className="kpi-icon-wrap">
                    <Sparkles size={16} />
                  </div>
                </div>
                <div className="kpi-number">{workspaces.filter((w) => w.brain?.status === "ready").length}</div>
                <div className="kpi-sub">
                  <span className="kpi-tag-lime">RAG VECTORIZED</span>
                  <span>Contextual index active</span>
                </div>
              </div>

              <div className="analytics-kpi-card">
                <div className="kpi-top">
                  <span className="kpi-title">GOVERNANCE MODEL</span>
                  <div className="kpi-icon-wrap">
                    <ShieldCheck size={16} />
                  </div>
                </div>
                <div className="kpi-number">RBAC v2</div>
                <div className="kpi-sub">
                  <span className="kpi-tag-blue">SECURED</span>
                  <span>Multi-role access enforcement</span>
                </div>
              </div>
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
                            <span className="mono-label kicker-pill">
                              CURRENT ACTIVE
                            </span>
                          )}
                        </div>

                        <p className="ws-project-card-desc">
                          {ws.description || "No description provided."}
                        </p>

                        {repo ? (
                          <div className="ws-project-repo-pill">
                            <FolderGit2 size={13} />
                            <span>{repo.fullName || repo.name}</span>
                            {repo.visibility === "private" ? (
                              <Lock size={10} color="#94a3b8" />
                            ) : (
                              <Globe size={10} />
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
                              color: brain.status === "ready" ? "var(--d-text)" : "var(--d-muted)"
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
          <section className="ceo-team-view" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Symmetric Top Header Card */}
            <div className="analytics-header-card">
              <div className="analytics-header-main">
                <div className="analytics-eyebrow">
                  <span className="analytics-live-dot" />
                  ORGANIZATION GOVERNANCE &amp; ACCESS CONTROL
                </div>
                <h1 className="analytics-main-title">Team &amp; Role Architecture</h1>
                <div className="analytics-repo-strip">
                  <span className="analytics-repo-badge">
                    <ShieldCheck size={14} className="text-lime" />
                    <strong>GitHub OAuth RBAC</strong>
                  </span>
                  <span className="analytics-meta-pill">
                    {employees.length} Members
                  </span>
                  <span className="analytics-meta-pill" style={{ color: "#38bdf8", borderColor: "rgba(56,189,248,0.3)" }}>
                    Multi-Role Architecture
                  </span>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="analytics-header-actions">
                <div className="analytics-health-card">
                  <div className="health-grade-circle" style={{ borderColor: "#c8ff3d" }}>
                    <span className="health-grade-text" style={{ color: "#c8ff3d", fontSize: "14px" }}>
                      SEC
                    </span>
                  </div>
                  <div className="health-meta">
                    <div className="health-score-val" style={{ color: "#c8ff3d" }}>
                      RBAC ENFORCED
                    </div>
                    <div className="health-label">Access Governance</div>
                  </div>
                </div>

                <div className="analytics-action-buttons">
                  <button
                    type="button"
                    className="analytics-btn-primary"
                    onClick={() => setIsInviteModalOpen(true)}
                    title="Invite team member with GitHub"
                  >
                    <Github size={14} />
                    <span>Invite with GitHub</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Symmetrical Bento KPI Grid: 4 Organization Metrics */}
            <div className="analytics-kpi-grid">
              <div className="analytics-kpi-card">
                <div className="kpi-top">
                  <span className="kpi-title">TOTAL TEAM MEMBERS</span>
                  <div className="kpi-icon-wrap">
                    <Users size={16} />
                  </div>
                </div>
                <div className="kpi-number">{employees.length}</div>
                <div className="kpi-sub">
                  <span className="kpi-tag-lime">ORGANIZATION</span>
                  <span>Active team roster</span>
                </div>
              </div>

              <div className="analytics-kpi-card">
                <div className="kpi-top">
                  <span className="kpi-title">ENGINEERING LEADS</span>
                  <div className="kpi-icon-wrap">
                    <Code2 size={16} />
                  </div>
                </div>
                <div className="kpi-number">
                  {employees.filter((e) => (e.role || "").toLowerCase().includes("dev") || (e.department || "").toLowerCase().includes("eng")).length}
                </div>
                <div className="kpi-sub">
                  <span className="kpi-tag-blue">CONTRIBUTORS</span>
                  <span>Core commit authors</span>
                </div>
              </div>

              <div className="analytics-kpi-card">
                <div className="kpi-top">
                  <span className="kpi-title">EXECUTIVE LEADERSHIP</span>
                  <div className="kpi-icon-wrap">
                    <ShieldCheck size={16} />
                  </div>
                </div>
                <div className="kpi-number">
                  {employees.filter((e) => (e.role || "").toLowerCase().includes("ceo") || (e.department || "").toLowerCase().includes("lead")).length}
                </div>
                <div className="kpi-sub">
                  <span className="kpi-tag-lime">GOVERNANCE</span>
                  <span>Full administrative rights</span>
                </div>
              </div>

              <div className="analytics-kpi-card">
                <div className="kpi-top">
                  <span className="kpi-title">ACCESS PROTOCOL</span>
                  <div className="kpi-icon-wrap">
                    <Lock size={16} />
                  </div>
                </div>
                <div className="kpi-number">OAuth 2.0</div>
                <div className="kpi-sub">
                  <span className="kpi-tag-blue">STRICT</span>
                  <span>Signed GitHub credentials</span>
                </div>
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
                          <Users size={26} style={{ marginBottom: "8px" }} />
                          <p style={{ margin: "4px 0", color: "var(--d-text)", fontWeight: 550, fontSize: "13.5px" }}>No team members added yet.</p>
                          <p style={{ margin: "0 0 16px", color: "var(--d-muted)", fontSize: "12.5px" }}>
                            Invite your developers, testers, or marketers securely with GitHub.
                          </p>
                          <button
                            type="button"
                            className="button button--small button--ghost"
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
                    <div className="mono-label kicker-pill" style={{ marginBottom: "6px" }}>
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
