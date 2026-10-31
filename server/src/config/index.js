import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from server directory first, fallback to root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const config = {
  port: process.env.PORT || 4000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || "axon_fallback_jwt_secret_key_2026",
  mongoUri: process.env.MONGODB_URI || "",
  github: {
    appId: process.env.GITHUB_APP_ID || "",
    appSlug: process.env.GITHUB_APP_SLUG || "",
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    callbackUrl: process.env.GITHUB_CALLBACK_URL || "http://localhost:4000/api/auth/github/callback",
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || ""
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    baseUrl: process.env.GROQ_API_BASE_URL || "https://api.groq.com/openai/v1"
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash"
  },
  rag: {
    chunkSize: parseInt(process.env.RAG_CHUNK_SIZE || "800", 10),
    chunkOverlap: parseInt(process.env.RAG_CHUNK_OVERLAP || "120", 10),
    topK: parseInt(process.env.RAG_TOP_K || "4", 10),
    embeddingModel: process.env.RAG_EMBEDDING_MODEL || "all-MiniLM-L6-v2",
    similarityThreshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || "0.15"),
    atlasIndexName: process.env.ATLAS_VECTOR_INDEX_NAME || "vector_index"
  }
};
