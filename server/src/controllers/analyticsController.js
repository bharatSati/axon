import {
  getWorkspaceAnalytics,
  generateAnalyticsAIDiagnostic
} from "../services/analyticsService.js";
import { getUserGitHubToken } from "./authController.js";

/**
 * GET /api/workspaces/:id/analytics
 * Fetches consolidated repository, organization, commit, PR, discussion, and code telemetry.
 */
export const getWorkspaceAnalyticsHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const userToken = await getUserGitHubToken(req.user?.id || req.user?.userId);

    const analyticsData = await getWorkspaceAnalytics(workspaceId, userToken);
    res.json(analyticsData);
  } catch (err) {
    console.error("[AnalyticsController] Error getting workspace analytics:", err);
    res.status(500).json({ error: err.message || "Failed to load workspace analytics" });
  }
};

/**
 * POST /api/workspaces/:id/analytics/ai-diagnostic
 * Generates or regenerates on-demand executive AI health diagnostic for the repo.
 */
export const generateAIDiagnosticHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const { analyticsData } = req.body || {};

    const aiResult = await generateAnalyticsAIDiagnostic(workspaceId, analyticsData);
    res.json(aiResult);
  } catch (err) {
    console.error("[AnalyticsController] Error generating AI diagnostic:", err);
    res.status(500).json({ error: err.message || "Failed to generate AI repository diagnostic" });
  }
};
