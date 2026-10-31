import {
  createWorkspaceInvitation,
  getWorkspaceInvitations,
  getWorkspaceMembers,
  getInvitationByToken,
  acceptWorkspaceInvitation,
  directAddMemberToWorkspace,
  revokeWorkspaceInvitation,
  removeWorkspaceMember,
  searchRegisteredGitHubUsers
} from "../services/invitationService.js";

export const createInvitationHandler = async (req, res) => {
  try {
    const { workspaceId, targetGithubUsername, role, position, department, email } = req.body;
    const result = await createWorkspaceInvitation(
      workspaceId,
      { targetGithubUsername, role, position, department, email },
      req.user
    );
    res.json(result);
  } catch (err) {
    console.error("createInvitationHandler error:", err);
    res.status(400).json({ error: err.message });
  }
};

export const getWorkspaceInvitationsHandler = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const result = await getWorkspaceInvitations(workspaceId);
    res.json(result);
  } catch (err) {
    console.error("getWorkspaceInvitationsHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getWorkspaceMembersHandler = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const result = await getWorkspaceMembers(workspaceId);
    res.json(result);
  } catch (err) {
    console.error("getWorkspaceMembersHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getInvitationByTokenHandler = async (req, res) => {
  try {
    const { token } = req.params;
    const result = await getInvitationByToken(token);
    res.json(result);
  } catch (err) {
    console.error("getInvitationByTokenHandler error:", err);
    res.status(404).json({ error: err.message });
  }
};

export const acceptInvitationHandler = async (req, res) => {
  try {
    const { token } = req.body;
    const result = await acceptWorkspaceInvitation(token, req.user);
    res.json(result);
  } catch (err) {
    console.error("acceptInvitationHandler error:", err);
    res.status(403).json({ error: err.message });
  }
};

export const directAddMemberHandler = async (req, res) => {
  try {
    const { workspaceId, targetGithubUsername, role, position, department, email, name } = req.body;
    const result = await directAddMemberToWorkspace(
      workspaceId,
      { targetGithubUsername, role, position, department, email, name },
      req.user
    );
    res.json(result);
  } catch (err) {
    console.error("directAddMemberHandler error:", err);
    res.status(400).json({ error: err.message });
  }
};

export const revokeInvitationHandler = async (req, res) => {
  try {
    const { id: invitationId } = req.params;
    const { workspaceId } = req.query;
    const result = await revokeWorkspaceInvitation(workspaceId, invitationId);
    res.json(result);
  } catch (err) {
    console.error("revokeInvitationHandler error:", err);
    res.status(400).json({ error: err.message });
  }
};

export const removeMemberHandler = async (req, res) => {
  try {
    const { workspaceId, username } = req.params;
    const result = await removeWorkspaceMember(workspaceId, username);
    res.json(result);
  } catch (err) {
    console.error("removeMemberHandler error:", err);
    res.status(400).json({ error: err.message });
  }
};

export const searchUsersHandler = async (req, res) => {
  try {
    const { q } = req.query;
    const result = await searchRegisteredGitHubUsers(q);
    res.json(result);
  } catch (err) {
    console.error("searchUsersHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};
