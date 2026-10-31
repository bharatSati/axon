# Axon System Architecture

## 1. System Overview

Axon is engineered as a decoupled client-server platform designed to simplify complex workflows and eliminate tool fragmentation. The architecture enforces strict separation of concerns, clear API contracts, and modular service isolation.

```
+--------------------------------------------------------------+
|                         AXON CLIENT                          |
|  - Presentation Layer & User Interactions                    |
|  - Navigation & Responsive Workspaces                        |
|  - Real-Time State Management & Optimistic UI Updates        |
+------------------------------+-------------------------------+
                               |
                               | REST / WebSocket APIs
                               v
+--------------------------------------------------------------+
|                         AXON SERVER                          |
|  - API Gateway & Request Validation                          |
|  - Application Logic & Modular Domain Controllers            |
|  - Service Orchestration & Event Dispatching                 |
+------------------------------+-------------------------------+
                               |
             +-----------------+-----------------+
             |                                   |
             v                                   v
+------------------------+           +------------------------+
|      DATA STORES       |           |   EXTERNAL SERVICES    |
| - Primary Database     |           | - Third-Party APIs     |
| - Caching & Session    |           | - Microservices        |
| - Audit & Telemetry    |           | - Integrations Mesh    |
+------------------------+           +------------------------+
```

---

## 2. Directory Layout & Boundaries

The codebase is organized into top-level directories according to system responsibilities:

```
axon/
├── client/                     # Frontend Application
│   ├── public/                 # Static assets & 3D/canvas models
│   ├── src/
│   │   ├── components/         # Reusable UI components & 3D scenes
│   │   ├── hooks/              # Custom React hooks (smooth scroll, viewport, etc.)
│   │   ├── styles/             # Global, layout, and theme styles
│   │   ├── App.jsx             # Root application orchestrator
│   │   └── main.jsx            # Frontend entry point
│   ├── index.html              # HTML template
│   ├── package.json            # Client dependencies & build scripts
│   └── vite.config.js          # Vite configuration
│
├── server/                     # Backend API & Logic Layer
│   ├── src/
│   │   ├── controllers/        # Request handling & business logic
│   │   ├── routes/             # API route definitions
│   │   ├── services/           # External service integration & domain logic
│   │   └── index.js            # Express application entry & configuration
│   ├── package.json            # Server dependencies & scripts
│   └── README.md               # Server documentation
│
├── docs/                       # Technical Documentation
│   ├── PROJECT_OVERVIEW.md     # Product overview & design vision
│   ├── ARCHITECTURE.md         # Architecture blueprint & specifications
│   ├── API_REFERENCE.md        # API contracts & schemas
│   └── DEVELOPMENT_GUIDELINES.md # Engineering standards & best practices
│
├── package.json                # Root orchestration & workspace scripts
└── README.md                   # Root project documentation
```

---

## 3. Component Responsibilities

### 3.1 Client (`client/`)
- **Role:** Handles the user interface, navigation, and user interactions.
- **Key Responsibilities:**
  - Rendering responsive, high-performance UI views.
  - Maintaining client-side application state.
  - Communicating with the backend through structured API requests.
  - Ensuring smooth, human-grade feedback (GSAP, Framer Motion, Three.js, Rive).

### 3.2 Server (`server/`)
- **Role:** Manages application logic, API endpoints, data processing, and communication with external services.
- **Key Responsibilities:**
  - Route validation, authentication, and authorization.
  - Executing business operations and domain rules.
  - Integrating external third-party services and data sources.
  - Delivering predictable JSON responses with low latency.

### 3.3 Docs (`docs/`)
- **Role:** Dedicated home for technical specifications, architecture references, and development guidelines.
- **Key Responsibilities:**
  - Documenting API contracts and lifecycle flows.
  - Accelerating developer onboarding and maintaining architectural standards over time.

---

## 4. Key Design Principles

1. **Modularity:** Different application components maintain separate responsibilities, making the system easier to extend.
2. **Scalability:** The decoupled architecture provides room for introducing additional features, workers, and integrations as requirements evolve.
3. **Maintainability:** Organized frontend and backend components simplify debugging, updates, and long-term development.
4. **Integration:** API-based communication creates a foundation for connecting external services and additional modules.
5. **Developer Experience:** Clear project organization and documentation make collaboration and onboarding easier.
