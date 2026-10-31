export const getActiveIntegrations = () => {
  return [
    {
      id: "github-oauth",
      name: "GitHub Authentication",
      type: "auth",
      status: "active",
      description: "Strict GitHub OAuth authentication provider"
    },
    {
      id: "postgres-core",
      name: "PostgreSQL Database",
      type: "storage",
      status: "connected",
      description: "Primary relational storage for workspace and employee records"
    },
    {
      id: "telemetry-stream",
      name: "Real-time Telemetry",
      type: "observability",
      status: "active",
      description: "API metrics and client-server request tracking"
    }
  ];
};
