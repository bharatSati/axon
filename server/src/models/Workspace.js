import mongoose from "mongoose";

const RepositorySchema = new mongoose.Schema(
  {
    id: { type: Number },
    name: { type: String, required: true },
    fullName: { type: String, required: true },
    owner: { type: String, required: true },
    description: { type: String, default: "" },
    defaultBranch: { type: String, default: "main" },
    visibility: { type: String, default: "public" },
    stars: { type: Number, default: 0 },
    language: { type: String, default: "JavaScript" },
    htmlUrl: { type: String },
    connectedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const BrainStatusSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["uninitialized", "indexing", "ready", "error"],
      default: "uninitialized"
    },
    message: { type: String },
    error: { type: String },
    lastIndexedAt: { type: Date },
    durationMs: { type: Number },
    stats: {
      totalFiles: { type: Number, default: 0 },
      totalChunks: { type: Number, default: 0 },
      totalCommits: { type: Number, default: 0 },
      techStack: [{ type: String }]
    },
    overview: { type: mongoose.Schema.Types.Mixed }
  },
  { _id: false }
);

const WorkspaceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    ownerId: { type: String, default: "default", index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    repository: { type: RepositorySchema, default: null },
    brain: { type: BrainStatusSchema, default: () => ({ status: "uninitialized" }) }
  },
  {
    timestamps: true
  }
);

export const Workspace = mongoose.models.Workspace || mongoose.model("Workspace", WorkspaceSchema);
