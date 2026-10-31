import mongoose from "mongoose";
import { config } from "../config/index.js";

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    return;
  }

  if (!config.mongoUri) {
    console.warn("⚠️ MONGODB_URI not found in environment. Running in offline/in-memory mode.");
    return false;
  }

  try {
    const conn = await mongoose.connect(config.mongoUri.trim(), {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    isConnected = true;
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}/${conn.connection.name}`);
    return true;
  } catch (err) {
    console.error(`❌ MongoDB Connection Error: ${err.message}`);
    isConnected = false;
    return false;
  }
};

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  console.warn("⚠️ MongoDB disconnected.");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB runtime error:", err.message);
});

export const getDBStatus = () => ({
  isConnected,
  readyState: mongoose.connection.readyState
});
