import mongoose from "mongoose";

const InvitationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    workspaceId: { type: String, required: true, index: true },
    workspaceName: { type: String, default: "" },
    role: { type: String, required: true, default: "developer" }, // "developer" | "tester" | "marketer" | "ceo"
    position: { type: String, default: "Software Engineer" },
    department: { type: String, default: "Engineering" },
    targetGithubUsername: { type: String, required: true, lowercase: true, trim: true, index: true },
    targetEmail: { type: String, default: "" },
    targetName: { type: String, default: "" },
    targetAvatar: { type: String, default: "" },
    invitedBy: {
      userId: { type: String },
      username: { type: String },
      name: { type: String },
      avatar: { type: String }
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "revoked", "expired"],
      default: "pending",
      index: true
    },
    acceptedBy: {
      userId: { type: String },
      username: { type: String },
      acceptedAt: { type: Date }
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
    }
  },
  {
    timestamps: true
  }
);

export const Invitation = mongoose.models.Invitation || mongoose.model("Invitation", InvitationSchema);
