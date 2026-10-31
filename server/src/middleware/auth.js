import jwt from "jsonwebtoken";
import { config } from "../config/index.js";

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = (authHeader && authHeader.split(" ")[1]) || req.query.token;

  if (!token) {
    return res.status(401).json({ error: "Access denied. Strictly GitHub authentication required." });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired session token. Please re-authenticate with GitHub." });
  }
};

export const requireCEO = (req, res, next) => {
  if (!req.user || req.user.role !== "CEO") {
    return res.status(403).json({ error: "Access forbidden. Only the CEO / Workspace Owner can perform this action." });
  }
  next();
};
