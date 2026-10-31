import express from "express";
import cors from "cors";
import { config } from "./config/index.js";
import { connectDB } from "./db/connection.js";
import healthRouter from "./routes/health.js";
import workspaceRouter from "./routes/workspace.js";
import authRouter from "./routes/auth.js";
import employeeRouter from "./routes/employees.js";
import githubRouter from "./routes/github.js";

const app = express();
const PORT = config.port;

// Connect to MongoDB Atlas (non-blocking)
connectDB().catch((err) => {
  console.warn("MongoDB startup notice:", err.message);
});

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/health", healthRouter);
app.use("/api/workspace", workspaceRouter);
app.use("/api/workspaces", workspaceRouter);
app.use("/api/auth", authRouter);
app.use("/api/employees", employeeRouter);
app.use("/api/github", githubRouter);

// Root informational endpoint
app.get("/api", (req, res) => {
  res.json({
    name: "Axon Server API",
    version: "1.0.0",
    architecture: "client-server",
    authProvider: "GitHub OAuth Strictly",
    endpoints: [
      "/api/health",
      "/api/workspace/status",
      "/api/workspace/sync",
      "/api/workspace/integrations",
      "/api/auth/github",
      "/api/auth/github/callback",
      "/api/auth/me",
      "/api/auth/dev-login",
      "/api/employees",
      "/api/employees/roles",
      "/api/employees/stats"
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Axon Server running on http://localhost:${PORT}`);
});
