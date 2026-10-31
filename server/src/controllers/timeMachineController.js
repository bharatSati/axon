import {
  getWorkspaceCommitTimeline,
  getWorkspaceCommitSnapshot,
  getHistoricalFileContent,
  getWorkspaceArchitectureEvolution,
  compareWorkspaceVersions,
  askHistoricalIntelligence,
  explainCommitWithBrain,
  askQuestionAboutCommit
} from "../services/timeMachineService.js";

export const getCommitsHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const limit = parseInt(req.query.limit, 10) || 80;
    const branch = req.query.branch || "main";

    const result = await getWorkspaceCommitTimeline(workspaceId, { limit, branch });
    if (!result.success) {
      return res.status(400).json({ error: result.error, uninitialized: true });
    }
    res.json(result);
  } catch (err) {
    console.error("getCommitsHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getSnapshotHandler = async (req, res) => {
  try {
    const { id: workspaceId, sha } = req.params;
    if (!sha) {
      return res.status(400).json({ error: "Commit SHA parameter is required" });
    }

    const result = await getWorkspaceCommitSnapshot(workspaceId, sha);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error("getSnapshotHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getFileAtCommitHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const { sha, filePath } = req.query;

    if (!sha || !filePath) {
      return res.status(400).json({ error: "Both 'sha' and 'filePath' query parameters are required" });
    }

    const result = await getHistoricalFileContent(workspaceId, sha, filePath);
    res.json(result);
  } catch (err) {
    console.error("getFileAtCommitHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getArchitectureEvolutionHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const result = await getWorkspaceArchitectureEvolution(workspaceId);
    if (!result.success) {
      return res.status(400).json({ error: result.error, uninitialized: true });
    }
    res.json(result);
  } catch (err) {
    console.error("getArchitectureEvolutionHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const compareVersionsHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const { baseSha, targetSha } = req.body;

    if (!baseSha || !targetSha) {
      return res.status(400).json({ error: "baseSha and targetSha are both required" });
    }

    const result = await compareWorkspaceVersions(workspaceId, baseSha, targetSha);
    res.json(result);
  } catch (err) {
    console.error("compareVersionsHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const askHistoryHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    const result = await askHistoricalIntelligence(workspaceId, question.trim());
    res.json(result);
  } catch (err) {
    console.error("askHistoryHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const explainCommitHandler = async (req, res) => {
  try {
    const { id: workspaceId, sha } = req.params;
    if (!sha) {
      return res.status(400).json({ error: "Commit SHA parameter is required" });
    }

    const result = await explainCommitWithBrain(workspaceId, sha);
    res.json(result);
  } catch (err) {
    console.error("explainCommitHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const askCommitHandler = async (req, res) => {
  try {
    const { id: workspaceId, sha } = req.params;
    const { question } = req.body;

    if (!sha) {
      return res.status(400).json({ error: "Commit SHA parameter is required" });
    }
    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    const result = await askQuestionAboutCommit(workspaceId, sha, question.trim());
    res.json(result);
  } catch (err) {
    console.error("askCommitHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};
