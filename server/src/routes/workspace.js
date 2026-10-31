import { Router } from "express";
import multer from "multer";
import {
  getWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  connectRepository,
  disconnectRepository,
  getBrainStatusHandler,
  queryBrainHandler,
  askBrainHandler,
  getBrainKnowledgeChunks,
  uploadBrainDocumentHandler,
  getBrainDocumentsHandler,
  deleteBrainDocumentHandler,
  getWorkspaceFiles,
  getWorkspaceFileContent,
  inspectCodeHandler,
  testLabHandler,
  growthDeckHandler,
  getWorkspaceStatus,
  syncWorkspaceState,
  getIntegrations
} from "../controllers/workspaceController.js";
import {
  getCommitsHandler,
  getSnapshotHandler,
  getFileAtCommitHandler,
  getArchitectureEvolutionHandler,
  compareVersionsHandler,
  askHistoryHandler,
  explainCommitHandler,
  askCommitHandler
} from "../controllers/timeMachineController.js";
import {
  generateFlowchartHandler,
  getPresetsHandler
} from "../controllers/flowchartController.js";
import {
  getPullRequestsHandler,
  getPullRequestDetailsHandler,
  analyzePullRequestHandler,
  askPRQuestionHandler
} from "../controllers/prIntelligenceController.js";
import {
  getWorkspaceAnalyticsHandler,
  generateAIDiagnosticHandler
} from "../controllers/analyticsController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max document size
});

// Legacy status and integrations
router.get("/status", getWorkspaceStatus);
router.post("/sync", syncWorkspaceState);
router.get("/integrations", getIntegrations);

// Workspaces CRUD
router.get("/", authenticateToken, getWorkspaces);
router.post("/", authenticateToken, createWorkspace);
router.get("/:id", authenticateToken, getWorkspace);
router.put("/:id", authenticateToken, updateWorkspace);
router.delete("/:id", authenticateToken, deleteWorkspace);

// Repository association
router.post("/:id/repository", authenticateToken, connectRepository);
router.delete("/:id/repository", authenticateToken, disconnectRepository);

// Project Brain (RAG Knowledge Base)
router.get("/:id/brain/status", authenticateToken, getBrainStatusHandler);
router.post("/:id/brain/query", authenticateToken, queryBrainHandler);
router.post("/:id/brain/ask", authenticateToken, askBrainHandler);
router.get("/:id/brain/chunks", authenticateToken, getBrainKnowledgeChunks);
router.get("/:id/brain/documents", authenticateToken, getBrainDocumentsHandler);
router.post("/:id/brain/documents", authenticateToken, upload.single("file"), uploadBrainDocumentHandler);
router.delete("/:id/brain/documents/:docId", authenticateToken, deleteBrainDocumentHandler);
router.get("/:id/files", authenticateToken, getWorkspaceFiles);
router.get("/:id/file-content", authenticateToken, getWorkspaceFileContent);
router.post("/:id/brain/inspect-code", authenticateToken, inspectCodeHandler);
router.post("/:id/brain/test-lab", authenticateToken, testLabHandler);
router.post("/:id/brain/growth-deck", authenticateToken, growthDeckHandler);

// Time Machine — Project History & Evolution Intelligence
router.get("/:id/time-machine/commits", authenticateToken, getCommitsHandler);
router.get("/:id/time-machine/snapshot/:sha", authenticateToken, getSnapshotHandler);
router.get("/:id/time-machine/file", authenticateToken, getFileAtCommitHandler);
router.get("/:id/time-machine/evolution", authenticateToken, getArchitectureEvolutionHandler);
router.post("/:id/time-machine/compare", authenticateToken, compareVersionsHandler);
router.post("/:id/time-machine/ask", authenticateToken, askHistoryHandler);
router.get("/:id/time-machine/commit/:sha/explain", authenticateToken, explainCommitHandler);
router.post("/:id/time-machine/commit/:sha/ask", authenticateToken, askCommitHandler);

// Architecture Flowchart Studio (AI Mermaid Engine)
router.get("/:id/flowchart/presets", authenticateToken, getPresetsHandler);
router.post("/:id/flowchart/generate", authenticateToken, generateFlowchartHandler);

// AI Pull Request Explainer + Intelligent Code Reviewer
router.get("/:id/pr", authenticateToken, getPullRequestsHandler);
router.get("/:id/pr/:prNumber", authenticateToken, getPullRequestDetailsHandler);
router.post("/:id/pr/analyze", authenticateToken, analyzePullRequestHandler);
router.post("/:id/pr/ask", authenticateToken, askPRQuestionHandler);

// Organization & Repository Deep Analytics Studio
router.get("/:id/analytics", authenticateToken, getWorkspaceAnalyticsHandler);
router.post("/:id/analytics/ai-diagnostic", authenticateToken, generateAIDiagnosticHandler);

export default router;
