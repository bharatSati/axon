import { listUserRepositories, fetchRepositoryData } from "../services/githubService.js";

export const getRepositories = async (req, res) => {
  try {
    const userIdOrToken = req.user?.id || req.user?.username || null;
    const username = req.user?.username || "bharatSati";
    const { search = "", page = 1, perPage = 30 } = req.query;

    const data = await listUserRepositories(userIdOrToken, { search, page, perPage, username });
    res.json({
      success: true,
      ...data
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch GitHub repositories" });
  }
};

export const getRepository = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const userIdOrToken = req.user?.id || req.user?.username || null;

    const data = await fetchRepositoryData(userIdOrToken, owner, repo);
    res.json({
      success: true,
      data
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch repository details" });
  }
};
