# Finance Research Platform

> A production-grade, AI-powered financial research workspace built for investment analysts — unifying CSV-based financial data ingestion, automated metric calculation, structured research notes, LLM-generated investment summaries, and real-time sector analytics behind a role-based access system.

---

## Live Application

| Resource | URL |
|---|---|
| **Live App** | [https://ai-powered-financial-intelligence-a.vercel.app](https://ai-powered-financial-intelligence-a.vercel.app) |
| **Backend API** | [https://ai-powered-financial-intelligence.onrender.com](https://ai-powered-financial-intelligence.onrender.com) |
| **GitHub — Frontend** | [github.com/Mdsehran/ai-powered-financial-intelligence-app](https://github.com/Mdsehran/ai-powered-financial-intelligence-app) |
| **GitHub — Backend** | [github.com/Mdsehran/ai-powered-financial-intelligence-platform](https://github.com/Mdsehran/ai-powered-financial-intelligence-platform) |

### Test Credentials

```txt
Admin account
Email:    admin@test.com
Password: admin123
Role:     admin (full access)

Note:
For financial data upload demo CSV file, simply download and use the provided sample CSV template directly from the application.
```
---

## Table of Contents

1. [What This Platform Does](#1-what-this-platform-does)
2. [Value Proposition for End Users](#2-value-proposition-for-end-users)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Database Schema](#5-database-schema)
6. [API Documentation](#6-api-documentation)
7. [Core Flows](#7-core-flows)
8. [Role-Based Access Control](#8-role-based-access-control)
9. [Financial Metrics Engine](#9-financial-metrics-engine)
10. [Investment Scoring Logic](#10-investment-scoring-logic)
11. [AI Summary System](#11-ai-summary-system)
12. [How to Navigate the Application](#12-how-to-navigate-the-application)
13. [Local Development Setup](#13-local-development-setup)
14. [AWS Deployment Guide](#14-aws-deployment-guide)
15. [Ollama Local Setup](#15-ollama-local-setup)
16. [Environment Variables Reference](#16-environment-variables-reference)
17. [CSV Upload Format](#17-csv-upload-format)
18. [Design Decisions](#18-design-decisions)
19. [Adding a New Metric (ROCE Example)](#19-adding-a-new-metric-roce-example)
20. [Scaling Approach](#20-scaling-approach)
21. [Known Bugs and Limitations](#21-known-bugs-and-limitations)

---

## 1. What This Platform Does

Financial analysts at investment firms, family offices, and research desks face a fragmented workflow: financial data lives in spreadsheets, research notes are in email threads, AI tools are separate subscriptions, and there is no unified place to compare companies across sectors.

This platform solves that fragmentation. It is a **single workspace** where analysts can:

- Create and manage a portfolio of companies
- Upload yearly financial data via CSV — once uploaded, six metrics are automatically calculated
- Write structured research notes tagged with sentiment (positive / neutral / negative)
- Generate a formatted one-page company brief from live database data
- Request an AI-generated investment summary powered by a large language model
- View aggregated analytics across all companies — sector rankings, sentiment groupings, investment scores
- Control who sees what through a three-tier role system

Every piece of data — financials, metrics, notes, scores, AI summaries, upload history — is stored relationally in PostgreSQL, queryable, auditable, and connected.

---

## 2. Value Proposition for End Users

### For the Investment Analyst

| Before this platform | With this platform |
|---|---|
| Manual CAGR calculations in Excel | Automatic calculation on every CSV upload |
| Research notes scattered in email | Structured notes with sentiment tagging per company |
| No unified score to compare companies | 0–100 investment score computed from 5 weighted factors |
| AI tools accessed separately | AI summary generated from your own data, stored in the same system |
| No audit trail for data uploads | Every upload logged with row count, status, and error detail |

### For the Research Manager (Admin)

- Full visibility into all analyst activity
- AI summary approval gate — summaries are **pending** by default, only published after admin review
- Role management — assign viewer access to clients or junior staff without giving edit rights
- Company brief generation for client-ready one-pagers

### For the Viewer (Client / Junior Analyst)

- Clean read-only access to approved research
- Company financials, metrics, and AI summaries — all in one page
- Sector-level analytics and company rankings on the Analytics dashboard
- No ability to modify any data — safe for external sharing

### Productivity Gains

- **From raw CSV to investment score in under 10 seconds** — upload a file, metrics calculate immediately
- **From scattered notes to AI summary in under 30 seconds** — Groq LLM generates a 150-word brief using your own notes and metrics as context
- **Zero manual aggregation** — the Analytics dashboard updates automatically as companies are added and financials uploaded

---

## 3. Technology Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18 | Component-based UI |
| TypeScript | 5 | Type safety throughout |
| Vite | 5 | Build tool and dev server |
| React Router | 6 | Client-side routing |
| React Query | 5 | Server state caching and synchronisation |
| Zustand | 4 | Global auth state |
| Axios | 1.x | HTTP client with interceptors |
| Recharts | 2.x | Bar charts and data visualisation |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20+ | Runtime |
| Express | 4 | HTTP framework |
| TypeScript | 5 | Type safety |
| pg (node-postgres) | 8 | PostgreSQL client |
| bcryptjs | 2 | Password hashing |
| jsonwebtoken | 9 | JWT auth tokens |
| csv-parse | 5 | CSV parsing |

### Infrastructure

| Service | Provider | Purpose |
|---|---|---|
| Frontend hosting | Vercel | Static React build, global CDN |
| Backend API | Render | Node.js Express server |
| Database | Render PostgreSQL | Managed PostgreSQL 15 |
| File storage | Managed PostgreSQL 15 | CSV file uploads |
| AI (production) | Groq API | Cloud LLM inference (llama-3.1-8b) |
| AI (local) | Ollama | Local LLM (tinyllama / llama3) |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
│                                                                 │
│   React + TypeScript SPA                                        │
│   ├── React Query  (server state)                               │
│   ├── Zustand      (auth state)                                 │
│   └── Axios        (HTTP with JWT interceptor)                  │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTPS
          ┌──────────▼──────────┐
          │    Vercel CDN       │
          │  (frontend static)  │
          └──────────┬──────────┘
                     │ API calls to Render
          ┌──────────▼──────────────────────────┐
          │         Render Web Service           │
          │                                      │
          │   Express + TypeScript API           │
          │   ├── /api/auth       (JWT)          │
          │   ├── /api/companies  (CRUD + AI)    │
          │   ├── /api/financials (CSV + metrics)│
          │   └── /api/analytics  (aggregation) │
          └────────┬───────────────┬─────────────┘
                   │               │
        ┌──────────▼──────┐  ┌────▼────────────┐
        │  Render Postgres │  │   Groq API      │
        │  PostgreSQL 15   │  │  llama-3.1-8b   │
        │  9 tables        │  │  (cloud LLM)    │
        └──────────────────┘  └─────────────────┘
                   │
        ┌──────────▼──────────┐
        │      PostgreSQL         │
        │  CSV file storage   │
        │  (pre-signed URLs)  │
        └─────────────────────┘
```

### Request Flow — Standard API Call

```
1. Browser makes API request
2. Axios request interceptor attaches JWT from localStorage
3. Request reaches Express router
4. authenticate middleware verifies JWT signature
5. requireRole middleware checks user role against allowed roles
6. Route handler executes business logic
7. PostgreSQL query executes
8. Response returns JSON
9. React Query caches response, updates UI
```

### Request Flow — CSV Upload

```
1. Analyst selects CSV file in browser
2. Frontend calls GET /financials/:id/upload-url
3. Backend checks AWS credentials:
   ├── If AWS configured → returns pre-signed S3 PUT URL + key
   └── If not configured → returns { mode: 'local' }
4a. (S3 mode) Browser uploads file directly to S3 via pre-signed URL
4b. (Local mode) Frontend reads file content as text
5. Frontend calls POST /financials/:id/process-csv with { s3_key, csvContent }
6. Backend parses CSV using csv-parse/sync
7. Validates required columns exist
8. Creates upload_audits record with status 'processing'
9. Upserts each row into financials table (ON CONFLICT DO UPDATE)
10. Runs calculateMetrics() on all historical rows for this company
11. Upserts financial_metrics record
12. Runs calculateScore() using metrics + note sentiment counts
13. Upserts company_scores record
14. Updates upload_audits status to 'success'
15. Returns { metrics, score, rows_imported } to frontend
16. React Query invalidates ['company', id] — page re-renders with new data
```

### Request Flow — AI Summary Generation

```
1. Analyst clicks "Generate AI Summary"
2. Frontend calls POST /companies/:id/ai-summary
3. Backend fetches: company data, financial metrics, last 5 notes, score
4. buildPrompt() constructs structured prompt from 4 data sources
5. generateSummary() checks environment:
   ├── GROQ_API_KEY set → POST to api.groq.com/v1/chat/completions
   └── No key → POST to localhost:11434/api/generate (Ollama)
6. LLM response received (or timeout after 30s)
7. INSERT into ai_summaries with status='pending', model_name, prompt_version
8. Response returns summary to frontend
9. Frontend shows "pending admin approval" state
10. Admin sees Approve button → PATCH /companies/:id/summaries/:sid/approve
11. status → 'approved', approved_by → admin user ID
12. Summary now visible to all roles
```

---

## 5. Database Schema

### Entity Relationship Overview

```
users ──────────────────────┐
  │                         │
  ├─── creates ──→ companies │
  │                  │      │
  │         ┌────────┤      │
  │         │        │      │
  │    financials  research_notes
  │         │        │
  │    financial_metrics   ai_summaries
  │         │              (approved_by → users)
  │    company_scores
  │
  └─── upload_audits
       company_briefs
```

### Table Definitions

#### `users`
```sql
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) DEFAULT 'viewer'
                  CHECK (role IN ('admin', 'analyst', 'viewer')),
  created_at    TIMESTAMP DEFAULT NOW()
);
```

#### `companies`
```sql
CREATE TABLE companies (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  sector        VARCHAR(100),
  description   TEXT,
  country       VARCHAR(100),
  founded_year  INT,
  created_by    INT REFERENCES users(id),
  deleted_at    TIMESTAMP,           -- soft delete
  created_at    TIMESTAMP DEFAULT NOW()
);
```

#### `financials`
```sql
CREATE TABLE financials (
  id               SERIAL PRIMARY KEY,
  company_id       INT REFERENCES companies(id) ON DELETE CASCADE,
  fiscal_year      INT NOT NULL,
  revenue          NUMERIC,
  ebitda           NUMERIC,
  pat              NUMERIC,          -- profit after tax
  total_debt       NUMERIC,
  operating_profit NUMERIC,
  UNIQUE(company_id, fiscal_year)    -- prevents duplicate year rows
);
```

#### `financial_metrics`
```sql
CREATE TABLE financial_metrics (
  id             SERIAL PRIMARY KEY,
  company_id     INT REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  op_margin      NUMERIC,            -- operating profit / revenue × 100
  pat_margin     NUMERIC,            -- PAT / revenue × 100
  sales_cagr_3y  NUMERIC,            -- compound annual growth rate (3Y)
  pat_cagr_3y    NUMERIC,
  debt_trend     VARCHAR(20),        -- 'increasing' | 'decreasing' | 'stable'
  margin_trend   VARCHAR(20),        -- 'improving' | 'declining' | 'stable'
  calculated_at  TIMESTAMP DEFAULT NOW()
);
```

#### `research_notes`
```sql
CREATE TABLE research_notes (
  id          SERIAL PRIMARY KEY,
  company_id  INT REFERENCES companies(id) ON DELETE CASCADE,
  author_id   INT REFERENCES users(id),
  content     TEXT NOT NULL,
  sentiment   VARCHAR(20) DEFAULT 'neutral'
                CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
```

#### `company_scores`
```sql
CREATE TABLE company_scores (
  id               SERIAL PRIMARY KEY,
  company_id       INT REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  investment_score NUMERIC,          -- PAT margin + op efficiency component
  growth_score     NUMERIC,          -- sales CAGR component
  risk_score       NUMERIC,          -- 100 - debt - sentiment components
  overall_score    NUMERIC,          -- sum of all weighted components (0–100)
  scored_at        TIMESTAMP DEFAULT NOW()
);
```

#### `ai_summaries`
```sql
CREATE TABLE ai_summaries (
  id             SERIAL PRIMARY KEY,
  company_id     INT REFERENCES companies(id) ON DELETE CASCADE,
  content        TEXT,
  model_name     VARCHAR(100),       -- e.g. 'llama-3.1-8b-instant'
  prompt_version VARCHAR(20),        -- e.g. 'v1.0' — for audit trail
  status         VARCHAR(20) DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by    INT REFERENCES users(id),
  generated_at   TIMESTAMP DEFAULT NOW()
);
```

#### `upload_audits`
```sql
CREATE TABLE upload_audits (
  id           SERIAL PRIMARY KEY,
  company_id   INT REFERENCES companies(id),
  uploaded_by  INT REFERENCES users(id),
  s3_key       VARCHAR(500),
  row_count    INT,
  status       VARCHAR(20),          -- 'processing' | 'success' | 'failed'
  error_log    TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);
```

#### `company_briefs`
```sql
CREATE TABLE company_briefs (
  id           SERIAL PRIMARY KEY,
  company_id   INT REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  content      TEXT,
  generated_by INT REFERENCES users(id),
  generated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. API Documentation

### Authentication

All endpoints except `POST /api/auth/login` and `POST /api/auth/register` require:
```
Authorization: Bearer <jwt_token>
```

### Auth Routes

#### `POST /api/auth/register`
Creates a new user account.

**Request body:**
```json
{
  "email": "analyst@firm.com",
  "password": "securepassword",
  "role": "analyst"
}
```

**Response:**
```json
{
  "token": "eyJhbGci...",
  "user": { "id": 2, "email": "analyst@firm.com", "role": "analyst" }
}
```

---

#### `POST /api/auth/login`
Authenticates an existing user.

**Request body:**
```json
{ "email": "admin@test.com", "password": "admin123" }
```

**Response:**
```json
{
  "token": "eyJhbGci...",
  "user": { "id": 1, "email": "admin@test.com", "role": "admin" }
}
```

---

### Company Routes

#### `GET /api/companies`
Returns all companies (non-deleted). Supports filtering and sorting.

**Query params:**
| Param | Type | Description |
|---|---|---|
| `search` | string | Case-insensitive name filter |
| `sector` | string | Exact sector match |
| `sort` | `name` \| `score` | Sort order |

**Response:** Array of company objects with `overall_score` joined.

---

#### `POST /api/companies`
Creates a new company. Requires `admin` or `analyst` role.

**Request body:**
```json
{
  "name": "Royal FMCG Ltd",
  "sector": "FMCG",
  "country": "India",
  "founded_year": 2001,
  "description": "Leading consumer goods company"
}
```

---

#### `GET /api/companies/:id`
Returns full company detail — all related data in one call.

**Response:**
```json
{
  "company":    { "id": 1, "name": "Royal", "sector": "FMCG", ... },
  "financials": [ { "fiscal_year": 2021, "revenue": 50000000, ... }, ... ],
  "metrics":    { "op_margin": 16.67, "pat_margin": 11.79, ... },
  "notes":      [ { "content": "...", "sentiment": "positive", ... } ],
  "score":      { "overall_score": 86, "growth_score": 30, ... },
  "summary":    { "content": "...", "status": "approved", ... }
}
```

---

#### `POST /api/companies/:id/notes`
Adds a research note. Requires `admin` or `analyst`.

**Request body:**
```json
{ "content": "Strong brand moat in tier-2 cities", "sentiment": "positive" }
```

---

#### `POST /api/companies/:id/brief`
Generates and saves a one-page company brief from live data. Requires `admin` or `analyst`.

**Response:** `{ "brief": "ONE-PAGE COMPANY BRIEF\n=====\n..." }`

---

#### `GET /api/companies/:id/brief`
Returns the most recently saved brief.

---

#### `POST /api/companies/:id/ai-summary`
Generates an AI summary using Groq / Ollama. Requires `admin` or `analyst`.

**Response:** The created `ai_summaries` record with `status: 'pending'`.

---

#### `PATCH /api/companies/:id/summaries/:sid/approve`
Approves a pending AI summary. Requires `admin`.

---

#### `PATCH /api/companies/:id/summaries/:sid/reject`
Rejects a pending AI summary. Requires `admin`.

---

#### `DELETE /api/companies/:id`
Soft-deletes a company (sets `deleted_at`). Requires `admin`.

---

### Financials Routes

#### `GET /api/financials/:cid/upload-url`
Returns a pre-signed S3 URL (production) or local mode indicator (development).

**Response (S3 mode):**
```json
{ "mode": "s3", "url": "https://s3.amazonaws.com/...", "key": "financials/1/1234.csv" }
```

**Response (local mode):**
```json
{ "mode": "local", "key": "local/1/1234.csv" }
```

---

#### `POST /api/financials/:cid/process-csv`
Processes uploaded CSV, calculates metrics and scores.

**Request body:**
```json
{
  "s3_key": "financials/1/1234.csv",
  "csvContent": "fiscal_year,revenue,...\n2021,50000000,..."
}
```

**Response:**
```json
{
  "success": true,
  "rows_imported": 3,
  "metrics": { "op_margin": 16.67, "sales_cagr_3y": 24.9, ... },
  "score": { "overall_score": 86, "growth_score": 30, ... }
}
```

---

### Analytics Routes

#### `GET /api/analytics/overview`
Returns aggregated sector data, company rankings, and sentiment grouping.

**Response:**
```json
{
  "sectors": [
    { "sector": "FMCG", "company_count": 3, "avg_score": 72.4, "avg_growth": 18.2, "avg_pat_margin": 10.1 }
  ],
  "rankings": [
    { "id": 1, "name": "Royal FMCG", "sector": "FMCG", "overall_score": 86 }
  ],
  "sentiments": [
    { "group": "Bullish",  "count": 4 },
    { "group": "Neutral",  "count": 2 },
    { "group": "Cautious", "count": 1 }
  ]
}
```

---

## 7. Core Flows

### Full Analyst Workflow (Step by Step)

```
Login as analyst
    ↓
Dashboard → click "+ Add Company"
    ↓
Fill name, sector, country, founded year → Create
    ↓
Company detail page opens (empty state — no financials yet)
    ↓
Click "Download sample CSV" → edit with real data → save as .csv
    ↓
Click "Choose File" → select CSV → "Upload & Calculate"
    ↓
System: parses CSV → upserts financials → calculates 6 metrics → scores company
    ↓
Metric cards appear + score badge updates on dashboard
    ↓
Add research notes with positive/neutral/negative sentiment tags
    ↓
Click "Generate Brief" → one-page formatted brief generated from live data
    ↓
Click "Generate AI Summary" → LLM synthesises metrics + notes → summary stored as 'pending'
    ↓
Admin logs in → sees "Approve Summary" button → approves
    ↓
Summary now visible to all roles including viewers
    ↓
Analytics page → sector chart + rankings update automatically
```

---

## 8. Role-Based Access Control

| Feature | Admin | Analyst | Viewer |
|---|:---:|:---:|:---:|
| Login | ✅ | ✅ | ✅ |
| View companies list | ✅ | ✅ | ✅ |
| View company detail | ✅ | ✅ | ✅ |
| View approved AI summaries | ✅ | ✅ | ✅ |
| View analytics dashboard | ✅ | ✅ | ✅ |
| Create companies | ✅ | ✅ | ❌ |
| Upload CSV financials | ✅ | ✅ | ❌ |
| Add research notes | ✅ | ✅ | ❌ |
| Generate company brief | ✅ | ✅ | ❌ |
| Generate AI summary | ✅ | ✅ | ❌ |
| View pending AI summaries | ✅ | ✅ | ❌ |
| Approve / reject summaries | ✅ | ❌ | ❌ |
| Delete companies | ✅ | ❌ | ❌ |

### How RBAC is enforced

**Backend:** Every route uses two composable middleware functions:

```typescript
// authenticate — verifies JWT, attaches req.user
// requireRole  — checks role against allowed list

router.post('/:id/ai-summary',
  authenticate,
  requireRole('admin', 'analyst'),
  handler
);
```

**Frontend:** `ProtectedRoute` wraps all authenticated pages. Role-conditional rendering hides action buttons from viewers. Even if a viewer removes the button from the DOM manually, the backend rejects the API call with `403 Forbidden`.

---

## 9. Financial Metrics Engine

All six metrics are calculated in `backend/src/services/metrics.ts` — a pure function module with no database dependencies. This means it is independently unit-testable.

### Metric Formulas

#### Operating Margin
```
op_margin = (operating_profit / revenue) × 100

Uses: latest fiscal year data only
```

#### PAT Margin
```
pat_margin = (pat / revenue) × 100

Uses: latest fiscal year data only
```

#### Sales CAGR (3-Year)
```
sales_cagr_3y = ((revenue_latest / revenue_oldest) ^ (1 / years) - 1) × 100

Uses: all uploaded fiscal years, calculates compound annual growth rate
Edge case: returns 0 if only one year of data
```

#### PAT CAGR (3-Year)
```
pat_cagr_3y = ((pat_latest / pat_oldest) ^ (1 / years) - 1) × 100
```

#### Debt Trend
```
debt_trend =
  total_debt[latest] < total_debt[oldest]  → 'decreasing'
  total_debt[latest] > total_debt[oldest]  → 'increasing'
  otherwise                                → 'stable'
```

#### Margin Trend
```
margin_trend =
  pat_margin[latest] > pat_margin[oldest]  → 'improving'
  pat_margin[latest] < pat_margin[oldest]  → 'declining'
  otherwise                                → 'stable'
```

---

## 10. Investment Scoring Logic

The scoring engine produces a **0–100 composite investment score** from five weighted components. Stored in `company_scores` and recalculated on every CSV upload.

| Component | Weight | Calculation |
|---|---|---|
| Revenue Growth (Sales CAGR 3Y) | 30 pts | `min(30, (sales_cagr_3y / 20) × 30)` — CAGR of 20%+ = full 30 pts |
| Profitability (PAT Margin) | 25 pts | `min(25, (pat_margin / 15) × 25)` — margin of 15%+ = full 25 pts |
| Efficiency (Op. Margin) | 20 pts | `min(20, (op_margin / 20) × 20)` — margin of 20%+ = full 20 pts |
| Debt Health | 15 pts | Decreasing → 15 pts, Stable → 8 pts, Increasing → 0 pts |
| Analyst Sentiment | 10 pts | Majority positive → 10, Mixed → 5, Majority negative → 0 |
| **Total** | **100 pts** | |

### Sentiment Grouping (Analytics Dashboard)

| Group | Score Range |
|---|---|
| Bullish | ≥ 70 |
| Neutral | 40 – 69 |
| Cautious | < 40 |

---

## 11. AI Summary System

### Architecture

The AI layer is environment-aware and automatically routes between two inference backends:

```typescript
if (process.env.GROQ_API_KEY) {
  // Production: Groq cloud API
  // Model: llama-3.1-8b-instant
  // Latency: 2–5 seconds
  // Cost: free tier (14,400 requests/day)
} else {
  // Local development: Ollama
  // Model: tinyllama or llama3
  // Latency: 5–30 seconds (CPU dependent)
  // Cost: zero
}
```

### Prompt Construction

The prompt is assembled from four live data sources:

```
Company: Royal FMCG Ltd (FMCG, India)
Operating Margin: 16.7%
PAT Margin: 11.8%
Sales CAGR 3Y: 24.9%
Debt Trend: decreasing
Margin Trend: improving
Investment Score: 86/100

Analyst Notes:
- [positive] Strong brand moat in tier-2 cities
- [neutral] Margin expansion depends on commodity prices

Write a clear investment summary covering growth, profitability, risk, and outlook.
```

### Approval Workflow

```
Generate → status: 'pending'   (visible to admin + analyst)
         ↓
Admin reviews → Approve
         ↓
         status: 'approved'    (visible to all roles)

         OR

Admin reviews → Reject
         ↓
         status: 'rejected'    (hidden from viewers)
```

### Auditability

Every AI summary record stores:
- `model_name` — exact model used (e.g. `llama-3.1-8b-instant`)
- `prompt_version` — template version (`v1.0`) for reproducibility
- `approved_by` — user ID of approving admin
- `generated_at` — timestamp

---

## 12. How to Navigate the Application

### Step 1 — Open the live app

Go to: **[https://ai-powered-financial-intelligence-a.vercel.app](https://ai-powered-financial-intelligence-a.vercel.app)**

> Note: The backend is on Render's free tier. If the first API call takes 30–60 seconds, this is the instance waking up. Subsequent requests are instant.

---

### Step 2 — Sign in

```
Email:    admin@test.com
Password: admin123
```

You will land on the **Dashboard** page.

---

### Step 3 — Dashboard

The dashboard shows all companies in a table. As admin you will see:

- A table with columns: Company name, Sector, Country, Founded, Score
- A **+ Add Company** button (top right)
- Search bar, sector filter, sort toggle (Name / Score)
- Coloured score badges: Green ≥70, Amber 40–69, Red <40
- Click any row or **View →** to open the company detail page

---

### Step 4 — Add a Company

1. Click **+ Add Company**
2. Fill in: Company Name (required), Sector, Country, Founded Year, Description
3. Click **Create Company**
4. You are redirected to the company detail page

---

### Step 5 — Upload Financial Data

On the company detail page:

1. Scroll to **Upload Financial Data (CSV)**
2. Click **Download sample CSV** — this downloads a correctly formatted template
3. Edit the template in Excel / Google Sheets with real data (or use sample data)
4. Click **Choose File** → select your `.csv` file
5. Click **Upload & Calculate**
6. Watch the metric cards populate and the investment score appear

The CSV must have these exact column headers:
```
fiscal_year,revenue,ebitda,pat,total_debt,operating_profit
```

---

### Step 6 — View Calculated Metrics

After upload, the page shows six metric cards:

| Metric | What it tells you |
|---|---|
| Op. Margin | How efficiently the company converts revenue to operating profit |
| PAT Margin | Final profitability after all expenses and taxes |
| Sales CAGR 3Y | Annual revenue growth rate over the uploaded period |
| PAT CAGR 3Y | Annual profit growth rate |
| Debt Trend | Whether debt is growing or shrinking over time |
| Margin Trend | Whether profitability is improving or declining |

---

### Step 7 — Add Research Notes

1. Scroll to **Research Notes**
2. Type your analysis in the text area
3. Click **Positive**, **Neutral**, or **Negative** to tag the sentiment
4. Click **Add Note**
5. Notes appear below with author name, date, and colour-coded sentiment badge

---

### Step 8 — Generate Company Brief

1. Scroll to **One-Page Company Brief**
2. Click **Generate Brief**
3. A formatted structured brief appears — pulled from live database data
4. Click **Load Saved** at any time to reload a previously generated brief

---

### Step 9 — Generate AI Summary

1. Scroll to **AI Summary (Ollama)**
2. Click **Generate AI Summary**
3. Wait 3–10 seconds for LLM inference
4. Summary appears with status badge: **PENDING**
5. As admin, click **✓ Approve Summary** to publish it
6. Status changes to **APPROVED** — now visible to viewers

---

### Step 10 — Analytics Dashboard

Click **Analytics** in the left sidebar:

- **Bullish / Neutral / Cautious buckets** — count of companies in each tier with progress bars showing portfolio percentage
- **Avg Score by Sector** — bar chart comparing investment scores across sectors
- **Sector Breakdown table** — company count, average score, average growth per sector
- **Top Companies by Score** — ranked table with gold ①②③ icons for top 3

---

### Step 11 — Create Additional Users

Use the register endpoint to create analyst or viewer accounts:

```bash
curl -X POST https://ai-powered-financial-intelligence.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"analyst@firm.com","password":"password123","role":"analyst"}'
```

Roles: `admin`, `analyst`, `viewer`

---

## 13. Local Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 15 (local or Docker)
- Git

### Step 1 — Clone repositories

```bash
# Backend
git clone https://github.com/Mdsehran/ai-powered-financial-intelligence-platform.git backend
cd backend

# Frontend (separate repo)
git clone https://github.com/Mdsehran/ai-powered-financial-intelligence-app.git frontend
cd frontend
```

### Step 2 — Database setup

**Option A — Docker (recommended)**
```bash
docker run --name finance-pg \
  -e POSTGRES_DB=finance_research \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 -d postgres:15
```

**Option B — Local PostgreSQL**
```bash
psql -U postgres -c "CREATE DATABASE finance_research;"
```

### Step 3 — Backend setup

```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/finance_research
JWT_SECRET=supersecretjwtkey1234567890abcdef
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
S3_BUCKET=finance-research-uploads
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=tinyllama
```

Start backend:
```bash
npx nodemon --watch src --ext ts --exec ts-node src/index.ts
```

Expected output:
```
✅ DB tables ready
🚀 Backend running on http://localhost:4000
```

### Step 4 — Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:4000/api
```

Start frontend:
```bash
npm run dev
```

App runs at: `http://localhost:5173`

### Step 5 — Create admin user

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123","role":"admin"}'
```

---

## 14. AWS Deployment Guide

### S3 Bucket Setup(future improvements)

```bash
# Create bucket
aws s3 mb s3://finance-research-uploads --region ap-south-1

# Block public access
aws s3api put-public-access-block \
  --bucket finance-research-uploads \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Add CORS policy for browser uploads
aws s3api put-bucket-cors \
  --bucket finance-research-uploads \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedOrigins": ["https://ai-powered-financial-intelligence-a.vercel.app"],
      "AllowedMethods": ["GET","PUT","POST"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }]
  }'
```

### IAM Policy

Create an IAM user with this policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject","s3:GetObject","s3:DeleteObject"],
    "Resource": "arn:aws:s3:::finance-research-uploads/*"
  }]
}
```

Set the access key and secret in your backend environment variables.

### RDS Setup (Optional — replaces Render Postgres)

```bash
aws rds create-db-instance \
  --db-instance-identifier finance-research \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password yourpassword \
  --allocated-storage 20 \
  --db-name finance_research
```

Update `DATABASE_URL` to point to the RDS endpoint. The SSL auto-detection in `db.ts` handles the connection automatically.

---

## 15. Ollama Local Setup

### Install Ollama

**Windows:**
```
https://ollama.com/download
```

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Pull a model

```bash
# Lightweight (637MB) — recommended for local dev
ollama pull tinyllama

# Full quality (4.7GB) — recommended for production-like results
ollama pull llama3
```

### Start Ollama server

```bash
ollama serve
# Listens on http://localhost:11434
```

### Verify it's working

```bash
curl http://localhost:11434/api/tags
# Should show your downloaded models
```

### Configure the backend

In `backend/.env`:
```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=tinyllama
```

If Ollama is running and the backend does NOT have `GROQ_API_KEY` set, AI summaries will use your local Ollama instance.

---

## 16. Environment Variables Reference

### Backend

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 4000) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens (min 32 chars) |
| `OLLAMA_URL` | For local AI | Ollama server URL (default: `http://localhost:11434`) |
| `OLLAMA_MODEL` | For local AI | Model name (e.g. `tinyllama`, `llama3`) |
| `GROQ_API_KEY` | For cloud AI | Groq API key — if set, overrides Ollama |

### Frontend

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend API base URL |

---

## 17. CSV Upload Format

### Required Columns

```csv
fiscal_year,revenue,ebitda,pat,total_debt,operating_profit
```

| Column | Type | Description |
|---|---|---|
| `fiscal_year` | Integer | Year (e.g. 2021, 2022, 2023) |
| `revenue` | Number | Total revenue in absolute value (e.g. 50000000 for 50M) |
| `ebitda` | Number | Earnings before interest, tax, depreciation, amortisation |
| `pat` | Number | Profit after tax |
| `total_debt` | Number | Total outstanding debt |
| `operating_profit` | Number | Revenue minus operating expenses |

### Sample File

```csv
fiscal_year,revenue,ebitda,pat,total_debt,operating_profit
2021,50000000,8000000,5000000,20000000,7500000
2022,62000000,10500000,6800000,18000000,9800000
2023,78000000,14000000,9200000,15000000,13000000
```

### Notes

- Values should be in absolute numbers, not millions or crores — the display layer converts to millions automatically
- Column headers are case-sensitive — must match exactly
- A minimum of 2 years is required for CAGR calculation; 3+ years gives the most accurate trend metrics
- Re-uploading the same fiscal year overwrites the previous entry (`ON CONFLICT DO UPDATE`)
- A "Download sample CSV" button on the company detail page provides a correctly formatted template

---

## 18. Design Decisions

### Why PostgreSQL over DynamoDB

The data model is inherently relational. Companies own financials, which produce metrics, which feed into scores and AI summaries. Expressing this in SQL gives clean foreign key constraints, cascade deletes, and the ability to run multi-table JOIN queries efficiently.

DynamoDB would require denormalising every relationship, making the analytics aggregation queries (sector roll-ups, CAGR averages across companies) significantly more complex to implement and maintain.

PostgreSQL's `NUMERIC` type also prevents floating point errors in financial calculations — critical for a finance application.

### Why Zustand over Redux

Redux solves state management at scale — hundreds of reducers, complex async middleware, time-travel debugging. This application has one piece of global state: the authenticated user. Zustand provides that in 20 lines without boilerplate.

React Query handles all server state (companies, financials, analytics) independently with built-in caching, background refetching, and optimistic updates.

### Why the metric calculator is a pure function

`calculateMetrics()` and `calculateScore()` in `services/metrics.ts` take plain data objects and return plain objects — no database calls, no side effects, no Express dependencies. This makes them independently unit-testable. Adding a new metric like ROCE is a single function addition that doesn't touch any other system.

### Why Groq as the production AI backend

Ollama requires a GPU or a capable CPU to run locally — not available on Render's free tier. Groq's cloud API provides access to the same Llama models with sub-5-second inference at zero cost (free tier: 14,400 requests/day). The abstraction layer in `services/ollama.ts` means swapping to AWS Bedrock or a self-hosted model requires changing one environment variable.

### Why pre-signed S3 URLs instead of backend upload

Streaming file bytes through the Express backend adds latency, increases memory usage, and adds unnecessary data transfer cost. Pre-signed URLs let the browser upload directly to S3 — the backend only generates the URL and later processes the content. This scales to large files without touching the API server's memory limits.

---

## 19. Adding a New Metric (ROCE Example)

Return on Capital Employed = EBIT / Capital Employed × 100

### Step 1 — Database migration

Add to `backend/src/config/db.ts` inside `initDB()`:

```sql
ALTER TABLE financials ADD COLUMN IF NOT EXISTS capital_employed NUMERIC;
ALTER TABLE financial_metrics ADD COLUMN IF NOT EXISTS roce NUMERIC;
```

### Step 2 — Calculation function

Add to `backend/src/services/metrics.ts`:

```typescript
function calculateROCE(ebit: number, capitalEmployed: number): number {
  if (!capitalEmployed) return 0;
  return (ebit / capitalEmployed) * 100;
}
```

Call it inside `calculateMetrics()`:

```typescript
const roce = calculateROCE(latest.operating_profit, latest.capital_employed);
return { op_margin, pat_margin, sales_cagr_3y, pat_cagr_3y, debt_trend, margin_trend, roce };
```

### Step 3 — Save to database

In `backend/src/routes/financials.ts`, add `roce` to the `financial_metrics` upsert:

```typescript
await pool.query(
  `INSERT INTO financial_metrics
     (company_id, op_margin, pat_margin, ..., roce)
   VALUES ($1,$2,$3,...,$8)
   ON CONFLICT (company_id) DO UPDATE SET ..., roce = EXCLUDED.roce`,
  [cid, metrics.op_margin, ..., metrics.roce]
);
```

### Step 4 — CSV column

Add `capital_employed` to the CSV format and the `financials` upsert in the same route.

### Step 5 — Frontend display

In `frontend/src/pages/CompanyDetail.tsx`:

```tsx
<MetricCard label="ROCE" value={metrics.roce} unit="%" />
```

**Total changes: 1 migration, 1 function, 2 SQL updates, 1 UI component. No route changes. No architectural changes.**

---

## 20. Scaling Approach

### Current (Render Free Tier)

- Single Express process handles all API requests
- Render PostgreSQL handles up to 25 concurrent connections
- Groq API handles AI inference without additional infrastructure
- Suitable for: 1–10 concurrent users, dozens of companies

### Short-Term (Render Paid / AWS ECS)

- ECS Fargate: multiple API containers auto-scaled on CPU/memory
- RDS PostgreSQL Multi-AZ: automatic failover, read replica for analytics queries
- Estimated capacity: 50–200 concurrent users

### Medium-Term

- CSV processing moves to async pipeline: S3 event → SQS → Lambda → RDS
  - Decouples upload acknowledgement from processing time
  - Handles large files (10,000+ rows) without blocking the API
- AI summary generation moves to SQS worker queue
  - Analysts submit requests and get notified when ready
  - Queue absorbs traffic spikes without Groq rate limit failures

### Long-Term

- Analytics queries move to materialised views refreshed nightly
  - Sector aggregations pre-computed rather than calculated on request
- Multi-tenancy via row-level security in PostgreSQL
  - Each firm's data isolated without separate database instances
- Ollama / Groq replaced by AWS Bedrock
  - Managed LLM inference with SLA guarantees
  - Same `generateSummary()` interface — zero application code change

---

## 21. Known Bugs and Limitations

### Current Limitations

| Issue | Impact | Planned Fix |
|---|---|---|
| Free Render tier cold start (30–60s first request) | First page load is slow | Upgrade to paid tier or use Render's keep-alive ping |
| No email verification on registration | Anyone with the URL can register | Add email verification flow |
| JWT tokens cannot be revoked before expiry (24h) | Logged-out users retain token validity briefly | Implement refresh token with server-side revocation list |
| CSV column validation is minimal | Malformed data uploads silently with 0 values | Add row-level validation with detailed error reporting |
| No file size limit on CSV uploads | Very large files could timeout | Add 10MB limit and streaming parser for large files |
| Ollama AI summary has no streaming | UI blocks during LLM inference | Implement SSE streaming for real-time token display |
| No pagination on company list | Slow rendering with 100+ companies | Add cursor-based pagination |
| Analytics queries recalculate on every request | Performance degrades with many companies | Add materialised view or Redis cache with 5-minute TTL |
| No test suite | Regressions not caught automatically | Add Vitest for metrics.ts unit tests; Supertest for API routes |

### Browser Compatibility

Tested on Chrome 120+, Firefox 120+, Edge 120+. Not tested on Safari — minor CSS variable issues possible.

---

## Author

**Sehran**
MCA — RVCE
Backend-focused Full-Stack Developer
TypeScript · Node.js · React · PostgreSQL

---

*Finance Research Platform — Built as part of a full-stack developer assessment.*
*Architecture decisions, trade-offs, and extension points documented above reflect production engineering thinking, not just trial-task implementation.*
