# Axon Development Guidelines

## 1. Guiding Philosophy

Axon is built with an engineering-focused mindset:
1. **Modularity over Monoliths:** Keep UI, API, and business logic cleanly separated.
2. **Clear Boundaries:** Frontend code stays in `client/`, backend logic stays in `server/`, and documentation stays in `docs/`.
3. **Continuous Documentation:** Any structural or API change must be reflected in `docs/`.

---

## 2. Directory Conventions

### 2.1 Client (`client/`)
- Built with **React + Vite**.
- Reusable UI elements belong in `src/components/`.
- Styling is separated into modular CSS files inside `src/styles/`.
- Hooks for shared behavior reside in `src/hooks/`.
- Avoid direct database queries or secret management on the client; always route through backend APIs.

### 2.2 Server (`server/`)
- Built with **Node.js + Express**.
- Routes belong in `src/routes/`.
- Handlers and business validation belong in `src/controllers/`.
- Third-party API calls belong in `src/services/`.
- Always return consistent JSON envelopes with status indicators.

### 2.3 Docs (`docs/`)
- Always maintain Markdown files for system architecture, setup instructions, and endpoint references.

---

## 3. Running the Project Locally

### Prerequisites
- Node.js >= 18
- npm >= 9

### Quick Start
To start the client development server from the repository root:
```bash
npm run dev
```

To run the backend server in development mode:
```bash
npm run server:dev
```

To build the client application for production:
```bash
npm run build
```
