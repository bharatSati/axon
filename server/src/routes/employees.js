import { Router } from "express";
import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getRoles,
  getWorkspaceStats
} from "../controllers/employeeController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// Public roles listing
router.get("/roles", getRoles);

// Workspace statistics
router.get("/stats", getWorkspaceStats);

// Employee CRUD operations (protected by GitHub Auth)
router.get("/", authenticateToken, getEmployees);
router.post("/", authenticateToken, addEmployee);
router.put("/:id", authenticateToken, updateEmployee);
router.delete("/:id", authenticateToken, deleteEmployee);

export default router;
