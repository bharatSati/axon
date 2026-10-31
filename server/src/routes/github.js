import { Router } from "express";
import { getRepositories, getRepository } from "../controllers/githubController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

router.get("/repositories", authenticateToken, getRepositories);
router.get("/repositories/:owner/:repo", authenticateToken, getRepository);

export default router;
