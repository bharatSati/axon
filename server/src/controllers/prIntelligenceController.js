import {
  getWorkspacePullRequests,
  getPullRequestDetails,
  analyzePullRequest,
  askQuestionAboutPR
} from "../services/prIntelligenceService.js";

export const getPullRequestsHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const { state = "all" } = req.query;
    const token = req.headers.authorization?.split(" ")[1] || null;

    const result = await getWorkspacePullRequests(workspaceId, { state }, token);
    res.json(result);
  } catch (err) {
    console.error("getPullRequestsHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getPullRequestDetailsHandler = async (req, res) => {
  try {
    const { id: workspaceId, prNumber } = req.params;
    const token = req.headers.authorization?.split(" ")[1] || null;

    const result = await getPullRequestDetails(workspaceId, prNumber, token);
    res.json(result);
  } catch (err) {
    console.error("getPullRequestDetailsHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const analyzePullRequestHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const { prNumber, customDiff, prMetadata } = req.body;
    const token = req.headers.authorization?.split(" ")[1] || null;

    const result = await analyzePullRequest(
      workspaceId,
      { prNumber, customDiff, prMetadata },
      token
    );
    res.json(result);
  } catch (err) {
    console.error("analyzePullRequestHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const askPRQuestionHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const { prNumber, question, prData } = req.body;
    const token = req.headers.authorization?.split(" ")[1] || null;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question is required." });
    }

    const result = await askQuestionAboutPR(
      workspaceId,
      { prNumber, question, prData },
      token
    );
    res.json(result);
  } catch (err) {
    console.error("askPRQuestionHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};
