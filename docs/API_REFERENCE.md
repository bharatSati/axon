# Axon API Reference

## Base URL
Default local development base URL:
```
http://localhost:4000/api
```

All responses return standard JSON with appropriate HTTP status codes.

---

## 1. System Health

### `GET /api/health`
Returns the operational health and uptime status of the Axon server.

**Response `200 OK`:**
```json
{
  "status": "healthy",
  "service": "axon-server",
  "version": "1.0.0",
  "uptime": 128.45,
  "timestamp": "2026-10-31T09:30:00.000Z"
}
```

---

## 2. Workspace Management

### `GET /api/workspace/status`
Retrieves the overall health, active modules, and connection status of the unified workspace.

**Response `200 OK`:**
```json
{
  "workspace": "Axon Core",
  "status": "synchronized",
  "architecture": "client-server",
  "metrics": {
    "latencyMs": 14,
    "activeModules": 6,
    "uptime": "99.99%",
    "fragmentationRate": "0%"
  },
  "modules": [
    { "id": "client-ui", "name": "Client Presentation Layer", "status": "active" },
    { "id": "api-gateway", "name": "API Gateway & Router", "status": "active" },
    { "id": "server-core", "name": "Server Domain Logic", "status": "active" },
    { "id": "data-store", "name": "Primary Data Store", "status": "connected" },
    { "id": "external-mesh", "name": "External Connectors", "status": "ready" },
    { "id": "docs-engine", "name": "Technical Documentation", "status": "available" }
  ]
}
```

### `POST /api/workspace/sync`
Triggers cross-module synchronization between client, server logic, and external services.

**Request Payload:**
```json
{
  "source": "client",
  "scope": "workspace_state",
  "payload": {
    "refreshTelemetry": true
  }
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "syncId": "sync_8410b",
  "durationMs": 14,
  "message": "Workspace state synchronized successfully across client and server.",
  "timestamp": "2026-10-31T09:30:01.000Z"
}
```

---

## 3. Extensibility & Integration

### `GET /api/workspace/integrations`
Lists configured and available third-party services connected to Axon.

**Response `200 OK`:**
```json
{
  "total": 3,
  "integrations": [
    { "id": "crm", "name": "CRM Connector", "type": "data", "status": "connected" },
    { "id": "analytics", "name": "Telemetry Stream", "type": "observability", "status": "active" },
    { "id": "webhooks", "name": "Event Dispatcher", "type": "integration", "status": "listening" }
  ]
}
```
