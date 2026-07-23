# Job Application Tracker

[![CI](https://github.com/eduardo-bertolin/Job_Application_Tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/eduardo-bertolin/Job_Application_Tracker/actions/workflows/ci.yml)

A full-stack application to track job applications, providing visual kanban boards, metrics dashboards, Gmail integration for status updates, and semantic matching for resume-to-job compatibility.

## Overview & Architecture
This project is built using:
- **Frontend**: React (Vite), TypeScript, TailwindCSS, Zustand (State), React Router, dnd-kit (Kanban).
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL.
- **Authentication**: JWT stored in HttpOnly cookies, bcrypt for password hashing.
- **Gmail Integration**: OAuth 2.0 flow to read user emails (read-only scope). Tokens are AES-256-GCM encrypted in the DB.
- **Semantic Matching**: Local embeddings generated via `@xenova/transformers` (running `all-MiniLM-L6-v2` via ONNX). Similarity is calculated using Cosine Similarity. No external APIs (like OpenAI) are used to keep costs at zero and preserve privacy.

## Features
- **Authentication**: Secure JWT-based auth with HttpOnly cookies and refresh tokens.
- **Kanban Board**: Drag and drop interface for tracking application statuses.
- **Metrics Dashboard**: Visual charts (Recharts) summarizing application funnels and progress over time.
- **Gmail Sync**: Authenticate with Google to automatically scan recent emails for job application updates, suggesting status changes.
- **Resume Matcher**: Upload a PDF or paste resume text to automatically calculate a compatibility score (0-100%) against job descriptions.

## Local Setup

### Prerequisites
- Node.js (v20+)
- PostgreSQL (or Docker Desktop)

### Steps
1. **Clone and Install dependencies**
   ```bash
   git clone <[repo-url](https://github.com/eduardo-bertolin/Job_Application_Tracker.git)>
   cd Job_Application_Tracker
   npm install -w client
   npm install -w server
   ```

2. **Environment Variables**
   Create a `.env` file in the `/server` directory:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/job_tracker_dev?schema=public"
   PORT=3001
   JWT_SECRET="your_super_secret_jwt_key"
   JWT_REFRESH_SECRET="your_super_secret_refresh_key"
   ENCRYPTION_KEY="32_byte_hex_string_for_aes_256_gcm" # e.g. 64 characters hex
   GOOGLE_CLIENT_ID="your_google_client_id"
   GOOGLE_CLIENT_SECRET="your_google_client_secret"
   GOOGLE_REDIRECT_URI="http://localhost:3001/gmail/callback"
   ```

3. **Database Setup**
   ```bash
   # If using Docker
   docker-compose up -d
   
   # Run migrations
   cd server
   npx prisma db push
   ```

4. **Run the Application**
   ```bash
   # From the root directory (using concurrently)
   npm run dev
   
   # Or run separately:
   # Terminal 1: cd server && npm run dev
   # Terminal 2: cd client && npm run dev
   ```
   The client will be at `http://localhost:5173` and the server at `http://localhost:3001`.

## Testing

### Unit Tests
We use **Vitest** for unit testing.
```bash
# Run all unit tests
npm run test -w client
npm run test -w server

# Run with coverage
npm run test -w client -- --coverage
npm run test -w server -- --coverage
```

### E2E Tests (Playwright)
Playwright tests run against a local test database. Ensure port 5432 is available.
```bash
cd client
npx playwright install --with-deps # Only needed once
npx playwright test
```

## Technical Decisions & Trade-offs
- **Local Embeddings vs OpenAI API**: Chose `@xenova/transformers` running `all-MiniLM-L6-v2` in Node.js instead of OpenAI's `text-embedding-3-small`. 
  - *Trade-off*: Zero cost, offline capability, and no API keys required. However, it uses ~100MB RAM in the Node process and produces lower-dimensional embeddings (384 vs 1536), which are less nuanced but sufficient for resume matching.
- **JSON Arrays vs pgvector**: Embeddings are stored as stringified JSON arrays in standard PostgreSQL `Text` columns rather than using the `pgvector` extension.
  - *Trade-off*: Avoids the operational overhead of installing Postgres extensions in deployment/CI. Since users only have a few hundred applications max, calculating cosine similarity in memory (Node.js) is virtually instantaneous.
- **OAuth Token Storage**: Gmail access/refresh tokens are encrypted at rest using AES-256-GCM.
  - *Trade-off*: Adds slightly more complexity to the auth service, but critical for security since these tokens grant access to user emails.
- **HttpOnly Cookies**: Selected for JWT delivery instead of LocalStorage.
  - *Trade-off*: Prevents XSS attacks from stealing tokens. Requires proper CORS configuration and `credentials: true` on frontend requests.

## Known Limitations
- **Gmail API (Testing Mode)**: If the Google Cloud Project is in "Testing" status, refresh tokens expire automatically after 7 days. Users will need to re-authenticate weekly.
- **Gmail E2E Testing**: The Gmail integration requires a real interactive OAuth flow with Google's consent screen, which involves CAPTCHAs and 2FA. This cannot be reliably automated in CI without specialized service accounts, so it is excluded from Playwright tests.
- **Cold Starts**: The embedding model is loaded into memory on server boot. This takes 3-5 seconds and downloads ~100MB of ONNX weights on the first ever run.

## Final Local Checklist
Before considering the project "done", run:
1. `npm run lint -w client && npm run lint -w server`
2. `npm run test -w client && npm run test -w server`
3. `cd client && npx playwright test`
4. `npm run build -w client && npm run build -w server`
