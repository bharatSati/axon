import mongoose from "mongoose";

const BrainChunkSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    filePath: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String },
    content: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  { _id: false }
);

const BrainKnowledgeSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, unique: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    overview: { type: mongoose.Schema.Types.Mixed },
    chunks: [BrainChunkSchema],
    indexData: { type: mongoose.Schema.Types.Mixed },
    lastIndexedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

export const BrainKnowledge =
  mongoose.models.BrainKnowledge || mongoose.model("BrainKnowledge", BrainKnowledgeSchema);
