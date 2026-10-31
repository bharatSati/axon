import crypto from "crypto";
import { Invitation } from "../models/Invitation.js";
import { Workspace } from "../models/Workspace.js";
import { User } from "../models/User.js";
import { Employee } from "../models/Employee.js";
import { config } from "../config/index.js";

/**
 * 1. Create a Unique Workspace Invitation Link for a GitHub User
 */
export async function createWorkspaceInvitation(
  workspaceId,
  { targetGithubUsername, role = "developer", position = "Software Engineer", department = "Engineering", email = "" },
  invitedByUser = {}
) {
  if (!workspaceId) throw new Error("Workspace ID is required");
  if (!targetGithubUsername || !targetGithubUsername.trim()) {
    throw new Error("Target GitHub username is required");
  }

  const workspace = await Workspace.findOne({ id: workspaceId });
  if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);

  // Normalize username (strip leading @ and lowercase)
  const cleanUsername = targetGithubUsername.trim().replace(/^@/, "").toLowerCase();

  // STRICT REQUIREMENT: User must have logged into Axon previously via GitHub OAuth
  const existingUser = await User.findOne({
    username: new RegExp(`^${cleanUsername}$`, "i")
  }).lean();

  if (!existingUser) {
    throw new Error(
      `Cannot generate invite link: User @${cleanUsername} has not logged in to Axon yet. They must sign in with GitHub on the website at least once so their verified account and email are registered in the system.`
    );
  }

  // Check if they are already an active member of this workspace
  const isAlreadyMember = (workspace.members || []).some(
    (m) => m.githubUsername?.toLowerCase() === cleanUsername
  );
  if (isAlreadyMember) {
    throw new Error(`@${cleanUsername} is already an active member of ${workspace.name}.`);
  }

  const token = `inv_${crypto.randomBytes(16).toString("hex")}`;
  const invitationId = `inv_id_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const invitation = new Invitation({
    id: invitationId,
    token,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    role: role.toLowerCase(),
    position: position || "Software Engineer",
    department: department || "Engineering",
    targetGithubUsername: cleanUsername,
    targetEmail: existingUser.email || email || `${cleanUsername}@users.noreply.github.com`,
    targetName: existingUser.name || cleanUsername,
    targetAvatar: existingUser.avatar || `https://github.com/${cleanUsername}.png`,
    invitedBy: {
      userId: invitedByUser?.id || "ceo",
      username: invitedByUser?.username || "ceo",
      name: invitedByUser?.name || "Workspace Owner",
      avatar: invitedByUser?.avatar || ""
    },
    status: "pending",
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days valid
  });

  await invitation.save();

  const clientBase = config.clientUrl || "http://localhost:5173";
  const inviteUrl = `${clientBase}?invite=${token}`;

  return {
    success: true,
    invitation,
    inviteUrl,
    isRegisteredUser: true,
    targetUser: {
      username: existingUser.username,
      name: existingUser.name,
      email: existingUser.email,
      avatar: existingUser.avatar
    }
  };
}

/**
 * 2. Get All Invitations for a Workspace
 */
export async function getWorkspaceInvitations(workspaceId) {
  const invitations = await Invitation.find({ workspaceId }).sort({ createdAt: -1 }).lean();
  return { success: true, invitations };
}

/**
 * 3. Get Workspace Members List (including owner as CEO)
 */
export async function getWorkspaceMembers(workspaceId) {
  const workspace = await Workspace.findOne({ id: workspaceId }).lean();
  if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);

  let members = workspace.members || [];

  // Check if owner is already represented; if not, add owner profile
  const hasOwner = members.some((m) => m.userId === workspace.ownerId || m.role === "ceo");
  if (!hasOwner && workspace.ownerId) {
    const ownerUser = await User.findOne({
      $or: [{ id: workspace.ownerId }, { username: workspace.ownerId }]
    }).lean();

    members = [
      {
        userId: workspace.ownerId,
        githubUsername: ownerUser?.username || "ceo",
        name: ownerUser?.name || "Chief Executive Officer",
        email: ownerUser?.email || "ceo@axon.dev",
        avatar: ownerUser?.avatar || "",
        role: "ceo",
        position: "Chief Executive Officer / Workspace Owner",
        department: "Leadership",
        joinedAt: workspace.createdAt || new Date(),
        invitedBy: "System"
      },
      ...members
    ];
  }

  return { success: true, members, workspaceId: workspace.id, workspaceName: workspace.name };
}

/**
 * 4. Get Public Invitation Details by Token
 */
export async function getInvitationByToken(token) {
  if (!token) throw new Error("Invitation token is required");

  const invitation = await Invitation.findOne({ token }).lean();
  if (!invitation) {
    throw new Error("Invitation not found or invalid link.");
  }

  // Check expiration
  if (new Date() > new Date(invitation.expiresAt) && invitation.status === "pending") {
    await Invitation.updateOne({ token }, { status: "expired" });
    invitation.status = "expired";
  }

  return {
    success: true,
    invitation: {
      token: invitation.token,
      workspaceId: invitation.workspaceId,
      workspaceName: invitation.workspaceName,
      role: invitation.role,
      position: invitation.position,
      department: invitation.department,
      targetGithubUsername: invitation.targetGithubUsername,
      targetName: invitation.targetName,
      targetAvatar: invitation.targetAvatar,
      invitedBy: invitation.invitedBy,
      status: invitation.status,
      expiresAt: invitation.expiresAt
    }
  };
}

/**
 * 5. Accept Invitation (Strict GitHub Username Verification)
 */
export async function acceptWorkspaceInvitation(token, authenticatedUser) {
  if (!token) throw new Error("Invitation token is required");
  if (!authenticatedUser || !authenticatedUser.username) {
    throw new Error("Authentication required. Please sign in with GitHub.");
  }

  const invitation = await Invitation.findOne({ token });
  if (!invitation) throw new Error("Invitation link is invalid or does not exist.");

  if (invitation.status === "accepted") {
    return {
      success: true,
      alreadyAccepted: true,
      workspaceId: invitation.workspaceId,
      workspaceName: invitation.workspaceName,
      role: invitation.role,
      message: "You have already accepted this invitation."
    };
  }

  if (invitation.status !== "pending") {
    throw new Error(`This invitation is no longer active (Status: ${invitation.status}).`);
  }

  if (new Date() > new Date(invitation.expiresAt)) {
    invitation.status = "expired";
    await invitation.save();
    throw new Error("This invitation link has expired. Please ask the workspace CEO for a new invite.");
  }

  // STRICT GITHUB USERNAME VERIFICATION
  const currentUsername = (authenticatedUser.username || "").toLowerCase().trim();
  const targetUsername = (invitation.targetGithubUsername || "").toLowerCase().trim();

  if (currentUsername !== targetUsername) {
    throw new Error(
      `Access Denied: This invitation is strictly reserved for GitHub user @${invitation.targetGithubUsername}. You are currently authenticated as @${authenticatedUser.username}. Please switch to the invited GitHub account to join.`
    );
  }

  const workspace = await Workspace.findOne({ id: invitation.workspaceId });
  if (!workspace) throw new Error(`Workspace ${invitation.workspaceId} no longer exists.`);

  // Add or update member in workspace.members
  if (!workspace.members) workspace.members = [];

  const existingMemberIndex = workspace.members.findIndex(
    (m) => m.githubUsername?.toLowerCase() === currentUsername || m.userId === authenticatedUser.id
  );

  const memberData = {
    userId: authenticatedUser.id || `gh_${authenticatedUser.githubId || Date.now()}`,
    githubUsername: currentUsername,
    name: authenticatedUser.name || authenticatedUser.username,
    email: authenticatedUser.email || invitation.targetEmail || "",
    avatar: authenticatedUser.avatar || invitation.targetAvatar || "",
    role: invitation.role || "developer",
    position: invitation.position || "Software Engineer",
    department: invitation.department || "Engineering",
    joinedAt: new Date(),
    invitedBy: invitation.invitedBy?.username || "CEO"
  };

  if (existingMemberIndex >= 0) {
    workspace.members[existingMemberIndex] = {
      ...workspace.members[existingMemberIndex],
      ...memberData
    };
  } else {
    workspace.members.push(memberData);
  }

  await workspace.save();

  // Create or update Employee in directory
  try {
    await Employee.findOneAndUpdate(
      { githubUsername: currentUsername },
      {
        id: memberData.userId,
        name: memberData.name,
        email: memberData.email || `${currentUsername}@users.noreply.github.com`,
        githubUsername: currentUsername,
        role: memberData.position || memberData.role,
        department: memberData.department,
        status: "Active",
        avatar: memberData.avatar
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn("Employee directory sync notice:", err.message);
  }

  // Update Invitation status to accepted
  invitation.status = "accepted";
  invitation.acceptedBy = {
    userId: authenticatedUser.id,
    username: authenticatedUser.username,
    acceptedAt: new Date()
  };
  await invitation.save();

  return {
    success: true,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    role: invitation.role,
    position: invitation.position,
    member: memberData,
    message: `Congratulations! You have joined ${workspace.name} as ${invitation.position} (${invitation.role.toUpperCase()}).`
  };
}

/**
 * 6. Direct Add Member to Workspace (Instant CEO Add)
 */
export async function directAddMemberToWorkspace(
  workspaceId,
  { targetGithubUsername, role = "developer", position = "Software Engineer", department = "Engineering", email = "", name = "" },
  invitedByUser = {}
) {
  if (!workspaceId) throw new Error("Workspace ID is required");
  if (!targetGithubUsername || !targetGithubUsername.trim()) {
    throw new Error("Target GitHub username is required");
  }

  const workspace = await Workspace.findOne({ id: workspaceId });
  if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);

  const cleanUsername = targetGithubUsername.trim().replace(/^@/, "").toLowerCase();

  // STRICT REQUIREMENT: User must have logged into Axon previously via GitHub OAuth
  const registeredUser = await User.findOne({
    username: new RegExp(`^${cleanUsername}$`, "i")
  }).lean();

  if (!registeredUser) {
    throw new Error(
      `Cannot add member: GitHub user @${cleanUsername} has not logged into Axon yet. They must sign in with GitHub on the website at least once so their account and verified email are stored.`
    );
  }

  const memberData = {
    userId: registeredUser.id,
    githubUsername: cleanUsername,
    name: name || registeredUser.name || cleanUsername,
    email: registeredUser.email || email || `${cleanUsername}@users.noreply.github.com`,
    avatar: registeredUser.avatar || `https://github.com/${cleanUsername}.png`,
    role: role.toLowerCase(),
    position: position || "Software Engineer",
    department: department || "Engineering",
    joinedAt: new Date(),
    invitedBy: invitedByUser?.username || "CEO"
  };

  if (!workspace.members) workspace.members = [];

  const existingIdx = workspace.members.findIndex(
    (m) => m.githubUsername?.toLowerCase() === cleanUsername
  );

  if (existingIdx >= 0) {
    workspace.members[existingIdx] = memberData;
  } else {
    workspace.members.push(memberData);
  }

  await workspace.save();

  // Update employee directory
  try {
    await Employee.findOneAndUpdate(
      { githubUsername: cleanUsername },
      {
        id: memberData.userId,
        name: memberData.name,
        email: memberData.email,
        githubUsername: cleanUsername,
        role: memberData.position,
        department: memberData.department,
        status: "Active",
        avatar: memberData.avatar
      },
      { upsert: true, new: true }
    );
  } catch (e) {
    console.warn("Employee directory notice:", e.message);
  }

  return {
    success: true,
    member: memberData,
    workspaceId: workspace.id,
    workspaceName: workspace.name
  };
}

/**
 * 7. Revoke Invitation
 */
export async function revokeWorkspaceInvitation(workspaceId, invitationId) {
  const invitation = await Invitation.findOneAndUpdate(
    { id: invitationId, workspaceId },
    { status: "revoked" },
    { new: true }
  );

  if (!invitation) throw new Error("Invitation not found");
  return { success: true, invitation };
}

/**
 * 8. Remove Member from Workspace
 */
export async function removeWorkspaceMember(workspaceId, githubUsername) {
  const workspace = await Workspace.findOne({ id: workspaceId });
  if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);

  const clean = githubUsername.toLowerCase().trim();
  workspace.members = (workspace.members || []).filter(
    (m) => m.githubUsername?.toLowerCase() !== clean
  );

  await workspace.save();
  return { success: true, workspaceId, remainingMembers: workspace.members };
}

/**
 * 9. Search Registered Users (for invite autocomplete)
 */
export async function searchRegisteredGitHubUsers(query = "") {
  const clean = (query || "").trim().replace(/^@/, "");
  if (!clean) {
    const recent = await User.find().sort({ lastLoginAt: -1 }).limit(10).lean();
    return {
      users: recent.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        email: u.email,
        avatar: u.avatar
      }))
    };
  }

  const regex = new RegExp(clean, "i");
  const users = await User.find({
    $or: [{ username: regex }, { name: regex }, { email: regex }]
  })
    .limit(10)
    .lean();

  return {
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      avatar: u.avatar
    }))
  };
}
