import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/space-grotesk";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "lenis/dist/lenis.css";
import "./styles/global.css";
import "./styles/sections.css";
import "./styles/dashboard.css";
import "./styles/responsive.css";
import "./styles/three.css";
import "./styles/ceo-dashboard.css";
import "./styles/dashboard-ui.css";
import "./styles/dashboard-enhance.css";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
