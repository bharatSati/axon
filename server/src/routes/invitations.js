import { Router } from "express";
import {
  createInvitationHandler,
  getWorkspaceInvitationsHandler,
  getWorkspaceMembersHandler,
  getInvitationByTokenHandler,
  acceptInvitationHandler,
  directAddMemberHandler,
  revokeInvitationHandler,
  removeMemberHandler,
  searchUsersHandler
} from "../controllers/invitationController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// Public: View invite info by token
router.get("/token/:token", getInvitationByTokenHandler);

// Protected: Requires GitHub JWT session
router.post("/", authenticateToken, createInvitationHandler);
router.post("/accept", authenticateToken, acceptInvitationHandler);
router.post("/direct-add", authenticateToken, directAddMemberHandler);
router.get("/workspace/:workspaceId", authenticateToken, getWorkspaceInvitationsHandler);
router.get("/workspace/:workspaceId/members", authenticateToken, getWorkspaceMembersHandler);
router.delete("/workspace/:workspaceId/member/:username", authenticateToken, removeMemberHandler);
router.delete("/:id", authenticateToken, revokeInvitationHandler);
router.get("/users/search", authenticateToken, searchUsersHandler);

export default router;
