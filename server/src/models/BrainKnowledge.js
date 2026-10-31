import mongoose from "mongoose";

const BrainChunkSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    documentId: { type: String, default: "repo", index: true },
    filePath: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        "code",
        "documentation",
        "configuration",
        "commit",
        "pull_request",
        "issue_discussion",
        "release",
        "architecture",
        "upload"
      ],
      default: "code"
    },
    title: { type: String },
    content: { type: String, required: true },
    embedding: {
      type: [Number],
      default: []
    },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  { _id: false }
);

const BrainDocumentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    originalName: { type: String },
    mimeType: { type: String, required: true },
    size: { type: Number, default: 0 },
    hash: { type: String, required: true },
    chunkCount: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["indexing", "ready", "error"], default: "ready" },
    error: { type: String }
  },
  { _id: false }
);

const BrainKnowledgeSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, unique: true, index: true },
    documents: { type: [BrainDocumentSchema], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed },
    overview: { type: mongoose.Schema.Types.Mixed },
    chunks: [BrainChunkSchema],
    indexData: { type: mongoose.Schema.Types.Mixed },
    embeddingModel: { type: String, default: "all-MiniLM-L6-v2" },
    vectorDimensions: { type: Number, default: 384 },
    lastIndexedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

export const BrainKnowledge =
  mongoose.models.BrainKnowledge || mongoose.model("BrainKnowledge", BrainKnowledgeSchema);
