# ◉ RepoRadar

**Codebase intelligence.** Drop a GitHub repo URL or a local folder path — RepoRadar scans everything and generates a comprehensive AI-powered report.

## What it analyzes

- **GitHub repos** — file tree, commit history, PRs, issues, contributors, releases, CI runs, languages
- **Local folders** — all source files, directory structure, git log, author stats, language breakdown

## Report sections

1. Executive Summary
2. Technical Architecture
3. Code Quality Assessment / Codebase Evolution
4. Development Patterns
5. Key Strengths
6. Risk Areas & Technical Debt
7. Issues & PR Insights (GitHub) / Dependency Analysis (local)
8. Security & Performance Observations
9. Notable Insights
10. Recommendations

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required — get a key at https://openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-v1-...

# Model string (default: anthropic/claude-sonnet-4-5)
OPENROUTER_MODEL=anthropic/claude-sonnet-4-5

# Optional — GitHub token for higher rate limits + private repos
GITHUB_TOKEN=ghp_...
```

### 3. Run

```bash
npm run dev
```

Opens at **http://localhost:5173**

The Vite frontend proxies API calls to the Express backend on port 3001.

## Model recommendations

| Use case | Model |
|---|---|
| Best quality | `anthropic/claude-opus-4` |
| Good balance | `anthropic/claude-sonnet-4-5` |
| Faster/cheaper | `google/gemini-2.5-flash` |
| Long contexts | `google/gemini-2.5-pro` |
| Local/free | `deepseek/deepseek-r1` |

## Architecture

```
reporadar/
├── server/
│   └── index.ts         # Express backend
│                          # - GET  /api/github/scan   (SSE)
│                          # - POST /api/local/scan    (SSE)
│                          # - POST /api/analyze       (streaming)
│                          # - GET  /api/health
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── InputPanel.tsx
│   │   ├── ProgressPanel.tsx
│   │   └── ReportPanel.tsx
│   ├── lib/
│   │   └── api.ts        # API client (SSE + fetch)
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
└── vite.config.ts
```

## Notes

- GitHub API is rate-limited to 60 req/hr without a token, 5000/hr with one
- Local scans skip `node_modules`, `dist`, `.git`, `build`, and respects `.gitignore`
- Files larger than 50KB are skipped; total source budget is ~800KB per scan
- Reports are downloadable as `.md` files
