import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    githubId: { type: Number, index: true },
    username: { type: String, required: true, index: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "" },
    company: { type: String, default: "" },
    role: { type: String, default: "CEO" },
    title: { type: String, default: "Chief Executive Officer" },
    githubToken: { type: String, default: "" },
    authenticatedWith: { type: String, default: "github" },
    lastLoginAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
