/**
 * Axon Frontend API Configuration
 * Automatically uses VITE_API_BASE_URL in production (Vercel, Netlify, Render, etc.)
 * Falls back to local server in development.
 */
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

export default API_BASE;
