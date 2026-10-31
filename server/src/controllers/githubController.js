import { listUserRepositories, fetchRepositoryData } from "../services/githubService.js";
import { getUserGitHubToken } from "./authController.js";

export const getRepositories = async (req, res) => {
  try {
    const token = req.user?.githubToken || (await getUserGitHubToken(req.user?.id || req.user?.username));
    const username = req.user?.username;
    const { search = "", page = 1, perPage = 30 } = req.query;

    if (!username && !token) {
      return res.status(401).json({ error: "Authenticated GitHub user session required." });
    }

    const data = await listUserRepositories(token, { search, page, perPage, username });
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
    const token = req.user?.githubToken || (await getUserGitHubToken(req.user?.id || req.user?.username));

    const data = await fetchRepositoryData(token, owner, repo);
    res.json({
      success: true,
      data
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch repository details" });
  }
};
