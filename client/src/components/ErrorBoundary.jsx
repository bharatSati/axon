import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "400px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px",
            color: "#fff",
            textAlign: "center"
          }}
        >
          <div
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "560px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)"
            }}
          >
            <AlertTriangle size={36} color="#ef4444" style={{ marginBottom: "16px" }} />
            <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 600 }}>View Render Error</h3>
            <p style={{ margin: "0 0 20px", color: "#9ca3af", fontSize: "14px", lineHeight: "1.6" }}>
              {this.state.error?.message || "An unexpected error occurred while rendering this section."}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#c8ff3d",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "13px"
              }}
            >
              <RefreshCw size={14} />
              <span>Reload Section</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
