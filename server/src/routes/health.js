import { Router } from "express";

const router = Router();
const startTime = Date.now();

router.get("/", (req, res) => {
  res.json({
    status: "healthy",
    service: "axon-server",
    version: "1.0.0",
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString()
  });
});

export default router;
