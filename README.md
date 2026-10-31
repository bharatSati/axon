# Axon — Unified & Intelligent Workspace

Axon is a software platform designed to provide a unified and intelligent workspace through a modular, scalable, and maintainable architecture. The core idea behind Axon is to simplify complex workflows by bringing essential capabilities together in one place, reducing fragmentation and making interactions more efficient.

Modern software applications often rely on multiple disconnected tools, services, and workflows. This creates unnecessary complexity, increases operational overhead, and makes information difficult to manage. Axon aims to address this challenge by establishing a structured application environment where different functionalities can work together seamlessly.

---

## Architecture and Technology

Axon follows a clean **client-server architecture**, divided into two major components with dedicated documentation:

```
axon/
├── client/                     # Frontend Application (React, Vite, GSAP, Three.js)
│   ├── src/
│   │   ├── components/         # Landing components & CEODashboard
│   │   ├── context/            # AuthContext (Strict GitHub Authentication)
│   │   ├── hooks/              # Custom interaction & scroll hooks
│   │   └── styles/             # Modular styling & design tokens
│   └── package.json
│
├── server/                     # Backend API & Application Logic (Express, JWT)
│   ├── src/
│   │   ├── controllers/        # AuthController & EmployeeController
│   │   ├── middleware/         # GitHub JWT Token Authentication & CEO Authorization
│   │   ├── routes/             # /api/auth, /api/employees, /api/workspace, /api/health
│   │   └── config/             # Environment configuration (.env)
│   ├── .env                    # Active environment variables
│   ├── .env.example            # Environment template
│   └── package.json
│
├── docs/                       # Technical Documentation
│   ├── PROJECT_OVERVIEW.md     # Project vision & architectural philosophy
│   ├── ARCHITECTURE.md         # Full architecture blueprint & component contracts
│   ├── API_REFERENCE.md        # Complete API documentation & schemas
│   └── DEVELOPMENT_GUIDELINES.md # Engineering standards & best practices
│
├── package.json                # Root orchestration scripts
└── README.md                   # Repository documentation
```

- **Frontend (`client/`):** Handles the user interface, navigation, and user interactions. Responsible for presenting information clearly, providing a smooth user experience, and rendering the executive CEO Dashboard.
- **Backend (`server/`):** Manages application logic, API endpoints, data processing, GitHub OAuth handling, employee role management, and communication with external services.
- **Documentation (`docs/`):** Dedicated directory for technical documentation, architecture specifications, API references, and development guidelines.

---

## Strict GitHub Authentication & CEO Onboarding

Axon enforces **strict GitHub OAuth authentication** for the CEO and Workspace Owners:

1. **CEO Sign-Up with GitHub:**
   - The CEO authenticates exclusively via GitHub.
   - Upon logging in, Axon provisions their executive profile as **CEO / Workspace Owner**.
2. **Executive Command Dashboard:**
   - The CEO gains direct access to the **CEO Workspace Dashboard**.
   - View real-time workspace metrics (headcount, role distribution, system synchronization).
3. **Employee Role Assignment:**
   - The CEO can add new employees and assign them to specific roles and departments:
     - **Engineering:** Engineering Lead, Senior Frontend Engineer, Senior Backend Engineer, Fullstack Developer, QA & Reliability Engineer.
     - **Infrastructure:** DevOps & Cloud Architect, Security Specialist.
     - **Product & Design:** Product Manager, UI/UX Designer.
   - The CEO can update roles on-the-fly and manage workspace membership.

---

## Environment Setup (`.env`)

Configure GitHub OAuth credentials in `server/.env`:

```bash
# Server Configuration
PORT=4000
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_super_secret_jwt_key_2026

# GitHub OAuth Credentials
# Register a GitHub OAuth App at: https://github.com/settings/developers
# - Homepage URL: http://localhost:5173
# - Authorization callback URL: http://localhost:4000/api/auth/github/callback
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_CALLBACK_URL=http://localhost:4000/api/auth/github/callback
```

> **Note for Local Testing:** The platform includes an instant local CEO preview mode allowing you to test the complete CEO Dashboard and employee management workflows immediately even before configuring live GitHub OAuth keys.

---

## Quick Start

### 1. Install Dependencies
```bash
# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

### 2. Run the Development Servers
From the root directory:

```bash
# Start Client (Vite: http://localhost:5173)
npm run dev

# In a second terminal, start Server (Express API: http://localhost:4000)
npm run server:dev
```

### 3. Build for Production
```bash
npm run build
```

---

## Key Design Principles

- **Modularity:** Different application components maintain separate responsibilities, making the system easier to extend.
- **Scalability:** Its architecture provides room for introducing additional features and integrations as requirements evolve.
- **Maintainability:** Organized frontend and backend components simplify debugging, updates, and long-term development.
- **Integration:** API-based communication creates a foundation for connecting external services and additional modules.
- **Developer Experience:** Clear project organization and documentation make collaboration and onboarding easier.

---

## Vision

The long-term vision behind Axon is to develop a flexible and dependable software platform that can evolve with changing user requirements. Instead of building an application that becomes increasingly difficult to maintain as it grows, Axon emphasizes a modular foundation that supports continuous improvement.
