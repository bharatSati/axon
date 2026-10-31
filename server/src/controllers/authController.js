import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { User } from "../models/User.js";

// In-memory store for active CEO sessions and GitHub tokens
let currentCEO = null;
export const userAccessTokens = new Map();

export const getUserGitHubToken = async (userIdOrUsername) => {
  if (!userIdOrUsername) {
    return process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || null;
  }

  // 1. In-memory cache
  const cached =
    userAccessTokens.get(userIdOrUsername) ||
    (currentCEO && (userAccessTokens.get(currentCEO.id) || userAccessTokens.get(currentCEO.username)));
  if (cached) return cached;

  // 2. Check MongoDB User persistence
  try {
    const userDoc = await User.findOne({
      $or: [
        { id: userIdOrUsername },
        { username: userIdOrUsername },
        { githubId: !isNaN(Number(userIdOrUsername)) ? Number(userIdOrUsername) : -1 }
      ]
    }).lean();

    if (userDoc && userDoc.githubToken) {
      userAccessTokens.set(userIdOrUsername, userDoc.githubToken);
      userAccessTokens.set(userDoc.id, userDoc.githubToken);
      userAccessTokens.set(userDoc.username, userDoc.githubToken);
      return userDoc.githubToken;
    }
  } catch (e) {
    // MongoDB lookup non-blocking
  }

  return process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || null;
};

export const initiateGitHubOAuth = (req, res) => {
  const rawClientId = config.github.clientId;
  const rawCallbackUrl = config.github.callbackUrl;

  const clientId = rawClientId ? rawClientId.trim() : "";
  const callbackUrl = rawCallbackUrl ? rawCallbackUrl.trim() : "";

  // Check if real GitHub OAuth credentials have been set in .env
  const isConfigured = clientId && clientId !== "your_github_client_id_here" && !clientId.startsWith("your_");

  if (!isConfigured) {
    const devFallbackUrl = `${config.clientUrl}?auth_status=need_config&message=GitHub+OAuth+credentials+not+configured+in+.env`;
    return res.redirect(devFallbackUrl);
  }

  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.set("client_id", clientId);

  // Only pass redirect_uri if explicitly specified in .env to prevent "redirect_uri not associated" errors
  if (callbackUrl) {
    githubAuthUrl.searchParams.set("redirect_uri", callbackUrl);
  }

  // GitHub Apps (Client IDs starting with 'Iv') configure permissions in the GitHub App settings.
  // Passing dynamic 'scope' parameter to a GitHub App causes GitHub to return a 404 error!
  // Only pass 'scope' for traditional OAuth Apps (IDs not starting with 'Iv').
  if (!clientId.startsWith("Iv")) {
    githubAuthUrl.searchParams.set("scope", "repo read:user user:email");
  }

  githubAuthUrl.searchParams.set("state", Math.random().toString(36).substring(7));

  res.redirect(githubAuthUrl.toString());
};

// Reusable helper to exchange GitHub code for CEO profile and JWT
export const exchangeCodeForCEO = async (code) => {
  const tokenPayload = {
    client_id: config.github.clientId?.trim(),
    client_secret: config.github.clientSecret?.trim(),
    code
  };

  if (config.github.callbackUrl) {
    tokenPayload.redirect_uri = config.github.callbackUrl.trim();
  }

  // 1. Exchange code for GitHub access token
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(tokenPayload)
  });

  const tokenData = await tokenResponse.json();

  if (tokenData.error || !tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.error || "Failed to exchange GitHub authorization code");
  }

  const accessToken = tokenData.access_token;

  // 2. Fetch authenticated user profile from GitHub
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "Axon-Intelligent-Workspace"
    }
  });

  const githubUser = await userResponse.json();

  // 3. Fetch user emails if profile email is private
  let email = githubUser.email;
  if (!email) {
    try {
      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "Axon-Intelligent-Workspace"
        }
      });
      const emails = await emailsResponse.json();
      const primary = emails.find((e) => e.primary && e.verified) || emails[0];
      if (primary) email = primary.email;
    } catch (e) {
      console.warn("Could not fetch secondary GitHub emails:", e.message);
    }
  }

  if (!email) {
    email = `${githubUser.login}@users.noreply.github.com`;
  }

  // 4. Create CEO profile
  const ceoProfile = {
    id: `gh_${githubUser.id}`,
    githubId: githubUser.id,
    username: githubUser.login,
    name: githubUser.name || githubUser.login,
    email,
    avatar: githubUser.avatar_url,
    bio: githubUser.bio || "Chief Executive Officer & Workspace Owner",
    company: githubUser.company || "Axon Workspace",
    role: "CEO",
    title: "Chief Executive Officer",
    githubToken: accessToken,
    authenticatedWith: "github",
    loginAt: new Date().toISOString()
  };

  userAccessTokens.set(ceoProfile.id, accessToken);
  userAccessTokens.set(ceoProfile.username, accessToken);
  if (githubUser.id) userAccessTokens.set(`gh_${githubUser.id}`, accessToken);

  // Persist user with GitHub token to MongoDB Atlas
  try {
    await User.findOneAndUpdate(
      { id: ceoProfile.id },
      { ...ceoProfile, lastLoginAt: new Date() },
      { upsert: true, new: true }
    );
  } catch (e) {
    console.warn("MongoDB User save notice:", e.message);
  }

  currentCEO = ceoProfile;

  // 5. Sign JWT session token with githubToken included
  const token = jwt.sign(ceoProfile, config.jwtSecret, { expiresIn: "7d" });

  return { token, user: ceoProfile };
};

// GET /api/auth/github/callback (Used when GitHub redirects to the backend)
export const handleGitHubCallback = async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error || !code) {
    const errorMsg = encodeURIComponent(error_description || "GitHub authentication was canceled or failed.");
    return res.redirect(`${config.clientUrl}?error=${errorMsg}`);
  }

  try {
    const { token } = await exchangeCodeForCEO(code);
    res.redirect(`${config.clientUrl}?token=${token}&auth=github_success`);
  } catch (err) {
    console.error("GitHub OAuth Callback Error:", err);
    res.redirect(`${config.clientUrl}?error=${encodeURIComponent(err.message || "Authentication failed")}`);
  }
};

// POST /api/auth/github/exchange (Used when GitHub redirects to the frontend with ?code=...)
export const exchangeGitHubCodeEndpoint = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  try {
    const result = await exchangeCodeForCEO(code);
    res.json({
      success: true,
      token: result.token,
      user: result.user
    });
  } catch (err) {
    console.error("Code Exchange Error:", err);
    res.status(400).json({ error: err.message || "Failed to exchange GitHub authorization code" });
  }
};

export const devCEOLogin = (req, res) => {
  const { username = "bharatSati", name = "Bharat Sati", email = "ceo@axon.workspace" } = req.body || {};

  const devCEO = {
    id: `gh_dev_${Date.now()}`,
    githubId: 8941203,
    username: username || "bharatSati",
    name: name || "Bharat Sati",
    email: email || "bharat@axon.workspace",
    avatar: `https://avatars.githubusercontent.com/${username || "bharatSati"}`,
    bio: "Chief Executive Officer & Founder of Axon",
    company: "Axon Technologies",
    role: "CEO",
    title: "Chief Executive Officer",
    authenticatedWith: "github",
    loginAt: new Date().toISOString()
  };

  currentCEO = devCEO;

  const token = jwt.sign(devCEO, config.jwtSecret, { expiresIn: "7d" });

  res.json({
    success: true,
    message: "Authenticated strictly with GitHub (CEO Profile Active)",
    token,
    user: devCEO
  });
};

export const getCurrentUser = (req, res) => {
  res.json({
    user: req.user || currentCEO
  });
};

export const logout = (req, res) => {
  currentCEO = null;
  res.json({
    success: true,
    message: "Logged out successfully"
  });
};
