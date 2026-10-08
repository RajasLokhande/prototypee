# SafePatch AI

An automated security vulnerability detection and repair system for a document portal, built as a college project prototype.

## What It Does

This system demonstrates the complete lifecycle of finding and fixing a **Broken Object Level Authorization (BOLA/IDOR)** vulnerability:

1. **DETECT** — A security scanner logs in as a test user and attempts to access documents belonging to other users
2. **PROVE** — Generates structured evidence showing the unauthorized access succeeded
3. **ANALYZE** — Sends the vulnerability evidence + source code to an AI (Claude API or mock fallback) to identify the root cause
4. **PATCH** — The AI generates the smallest possible code fix (a single authorization check)
5. **SANDBOX** — The patch is applied in a temporary sandbox, never touching the original code directly
6. **VERIFY** — Automated security + regression tests run against the patched code
7. **ACCEPT/REJECT** — The repair is accepted only if all tests pass

```
DETECT → PROVE → ANALYZE → GENERATE PATCH → APPLY IN SANDBOX → RUN TESTS → VERIFY → ACCEPT/REJECT
```

## The Vulnerability

The document portal has an intentional IDOR vulnerability:

- **Before fix:** Alice (authenticated) requests `GET /api/documents/201` → Bob's document → **200 OK** ❌
- **After fix:** Alice requests `GET /api/documents/201` → Bob's document → **403 Forbidden** ✅
- **Legitimate access still works:** Alice requests `GET /api/documents/101` → her own document → **200 OK** ✅

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Authentication | JWT |
| AI | Anthropic Claude API (optional) |
| Styling | Vanilla CSS (Clutch Security design system) |

## Project Structure

```
prototypr/
├── backend/
│   ├── database/          # SQLite initialization
│   │   └── init.js
│   ├── middleware/         # JWT authentication
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js        # Login/register endpoints
│   │   ├── documents.js   # VULNERABLE document CRUD (the target)
│   │   ├── scanner.js     # Security scanner endpoint
│   │   └── repair.js      # AI analysis, patch, verify, reset
│   ├── services/
│   │   ├── ai-analyzer.js # Claude API + mock fallback
│   │   ├── patch-engine.js# Sandbox creation + diff application
│   │   └── test-runner.js # Security + regression tests
│   ├── scripts/
│   │   └── seed.js        # Database seeding (Alice, Bob, documents)
│   ├── server.js          # Express entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Header.jsx # Navigation header
│   │   ├── pages/
│   │   │   ├── Login.jsx  # Login with quick demo buttons
│   │   │   ├── Dashboard.jsx # Security dashboard (7 sections)
│   │   │   └── Portal.jsx # Document portal UI
│   │   ├── App.jsx        # Routes and auth state
│   │   ├── main.jsx       # React entry
│   │   └── index.css      # Design system tokens
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .env                   # Environment variables
├── .env.example           # Template for env vars
├── prompt.txt             # Original project specification
├── clutchSecurity.md      # Design system reference
└── README.md              # This file
```

## How Each Module Maps to the Problem Statement

| Problem Statement Goal | Module |
|----------------------|--------|
| "Tracks down the flaw" | `scanner.js` — authenticates as users, tries cross-user document access, detects 200 OK where 403 expected |
| "Proof first" | `scanner.js` — generates structured JSON proof with canary evidence, user IDs, HTTP status comparison |
| "Smallest fix" | `ai-analyzer.js` — Claude/mock AI generates a minimal unified diff (just an ownership check) |
| "Checks that nothing else broke" | `test-runner.js` — runs security tests (unauthorized blocked) AND regression tests (login, upload, list, delete still work) |

## Setup & Run

### Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend + frontend dependencies
npm run setup
```

### 2. Seed the Database

```bash
npm run seed
```

This creates:
- **Alice** (username: `alice`, password: `alice123`)
- **Bob** (username: `bob`, password: `bob123`)
- 2 documents per user (with CANARY markers)

### 3. Start the Application

```bash
npm run dev
```

This starts:
- Backend at `http://localhost:3000`
- Frontend at `http://localhost:5173`

### 4. Open the Dashboard

Navigate to `http://localhost:5173` in your browser.

## Demo Walkthrough

1. **Login as Alice** — Click "Login as Alice" quick button
2. **View Document Portal** — See Alice's documents, note their IDs
3. **Go to Security Dashboard** — Click "Security Dashboard" in the nav
4. **Check System Status** — All 4 systems should show green (running/ready)
5. **Run Security Scan** — Click "▶ Run Security Scan"
   - Scanner discovers Alice can access Bob's documents
   - Shows CRITICAL BOLA vulnerability with proof
6. **Analyze with AI** — Click "🤖 Analyze with AI"
   - AI identifies missing authorization check in `GET /api/documents/:id`
   - Shows root cause, affected file/function
7. **Review the Patch** — See the syntax-highlighted diff
   - Only 7 lines added, 0 removed — minimal fix
8. **Apply Patch** — Click "✅ Apply Patch"
   - Sandbox created → Patch applied → Tests run
   - Security tests: unauthorized access now returns 403 ✅
   - Regression tests: login, listing, upload, delete all pass ✅
9. **Verify Result** — Green "REPAIR VERIFIED" verdict
10. **Reset** — Click "🔄 Reset to Vulnerable Version" to demo again

## AI Configuration

### With Claude API (Optional)
Add your Anthropic API key to `.env`:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Without API Key (Default)
The system uses a deterministic mock AI analyzer that produces the same correct patch. The full demo works without any API key.

## Test Credentials

| User | Username | Password |
|------|----------|----------|
| Alice | alice | alice123 |
| Bob | bob | bob123 |

## License

MIT
