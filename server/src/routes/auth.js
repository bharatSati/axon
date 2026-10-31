import { Router } from "express";
import {
  initiateGitHubOAuth,
  handleGitHubCallback,
  exchangeGitHubCodeEndpoint,
  getCurrentUser,
  devCEOLogin,
  logout
} from "../controllers/authController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// Strict GitHub OAuth endpoints
router.get("/github", initiateGitHubOAuth);
router.get("/github/callback", handleGitHubCallback);
router.post("/github/exchange", exchangeGitHubCodeEndpoint);
router.post("/exchange", exchangeGitHubCodeEndpoint);

// Current user profile
router.get("/me", authenticateToken, getCurrentUser);

// Dev / Direct CEO login option (when testing locally without setting up live GitHub App)
router.post("/dev-login", devCEOLogin);

// Logout
router.post("/logout", logout);

export default router;
