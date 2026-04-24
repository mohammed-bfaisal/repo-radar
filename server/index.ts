import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import axios from 'axios'
import path from 'path'
import fs from 'fs'
import { simpleGit } from 'simple-git'
import ignore from 'ignore'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

const PORT = 3001
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-5'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

// ── helpers ──────────────────────────────────────────────────────────────────

function githubHeaders() {
  const h: Record<string, string> = { Accept: 'application/vnd.github+json' }
  if (GITHUB_TOKEN) h['Authorization'] = `Bearer ${GITHUB_TOKEN}`
  return h
}

async function ghGet(url: string) {
  const res = await axios.get(url, { headers: githubHeaders() })
  return res.data
}

async function ghGetPaged(url: string, maxPages = 5) {
  const results: any[] = []
  let page = 1
  while (page <= maxPages) {
    const res = await axios.get(url, {
      headers: githubHeaders(),
      params: { per_page: 100, page }
    })
    results.push(...res.data)
    if (res.data.length < 100) break
    page++
  }
  return results
}

// ── GITHUB SCAN ───────────────────────────────────────────────────────────────

app.get('/api/github/scan', async (req, res) => {
  const { repo } = req.query as { repo: string }
  if (!repo) return res.status(400).json({ error: 'repo required' })

  // parse owner/name from URL or "owner/repo"
  let owner = '', name = ''
  try {
    const cleaned = repo.replace(/\.git$/, '').replace(/\/$/, '')
    const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/) || cleaned.match(/^([^/]+)\/([^/]+)$/)
    if (!match) throw new Error('bad')
    owner = match[1]; name = match[2]
  } catch {
    return res.status(400).json({ error: 'Could not parse repo. Use "owner/repo" or a GitHub URL.' })
  }

  const base = `https://api.github.com/repos/${owner}/${name}`

  try {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const send = (event: string, data: any) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)

    send('progress', { step: 'Fetching repo metadata...' })
    const repoMeta = await ghGet(base)

    send('progress', { step: 'Fetching languages...' })
    const languages = await ghGet(`${base}/languages`).catch(() => ({}))

    send('progress', { step: 'Fetching contributors...' })
    const contributors = await ghGetPaged(`${base}/contributors`, 2).catch(() => [])

    send('progress', { step: 'Fetching commits...' })
    const commits = await ghGetPaged(`${base}/commits`, 5).catch(() => [])

    send('progress', { step: 'Fetching branches...' })
    const branches = await ghGetPaged(`${base}/branches`, 1).catch(() => [])

    send('progress', { step: 'Fetching releases...' })
    const releases = await ghGetPaged(`${base}/releases`, 2).catch(() => [])

    send('progress', { step: 'Fetching open issues & PRs...' })
    const issues = await ghGetPaged(`${base}/issues?state=all`, 3).catch(() => [])

    send('progress', { step: 'Fetching file tree...' })
    let tree: any[] = []
    try {
      const treeRes = await ghGet(`${base}/git/trees/${repoMeta.default_branch}?recursive=1`)
      tree = treeRes.tree || []
    } catch { /* shallow repos may fail */ }

    send('progress', { step: 'Fetching README...' })
    let readme = ''
    try {
      const rdRes = await ghGet(`${base}/readme`)
      readme = Buffer.from(rdRes.content, 'base64').toString('utf8').slice(0, 4000)
    } catch { /* no readme */ }

    send('progress', { step: 'Fetching recent workflow runs...' })
    let ciRuns: any[] = []
    try {
      const ciRes = await ghGet(`${base}/actions/runs?per_page=20`)
      ciRuns = ciRes.workflow_runs || []
    } catch { /* no actions */ }

    const payload = {
      meta: repoMeta,
      languages,
      contributors: contributors.slice(0, 30),
      commits: commits.slice(0, 200),
      branches,
      releases,
      issues: issues.slice(0, 150),
      tree: tree.slice(0, 1000),
      readme,
      ciRuns: ciRuns.slice(0, 20),
      mode: 'github' as const
    }

    send('done', payload)
    res.end()
  } catch (err: any) {
    res.write(`event: scan_error\ndata: ${JSON.stringify({ error: err?.response?.data?.message || err.message })}\n\n`)
    res.end()
  }
})

// ── LOCAL FOLDER SCAN ─────────────────────────────────────────────────────────

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.cache', 'coverage', '.turbo', 'vendor', 'target'])
const TEXT_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift', '.c', '.cpp', '.h',
  '.css', '.scss', '.sass', '.less',
  '.html', '.vue', '.svelte',
  '.json', '.yaml', '.yml', '.toml', '.env.example',
  '.md', '.mdx', '.txt', '.sh', '.bash', '.zsh',
  '.sql', '.prisma', '.graphql',
  'Dockerfile', '.dockerignore', '.gitignore', 'Makefile', 'Rakefile'
])

function shouldReadFile(filePath: string): boolean {
  const ext = path.extname(filePath)
  const base = path.basename(filePath)
  return TEXT_EXTS.has(ext) || TEXT_EXTS.has(base)
}

function walkDir(dir: string, ig: ReturnType<typeof ignore>, rootDir: string, files: Array<{ path: string, size: number }>) {
  let entries: fs.Dirent[]
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const relPath = path.relative(rootDir, fullPath)

    if (SKIP_DIRS.has(entry.name)) continue
    if (ig.ignores(relPath)) continue

    if (entry.isDirectory()) {
      walkDir(fullPath, ig, rootDir, files)
    } else if (entry.isFile()) {
      const stat = fs.statSync(fullPath)
      files.push({ path: fullPath, size: stat.size })
    }
  }
}

app.post('/api/local/scan', async (req, res) => {
  const { folderPath } = req.body
  if (!folderPath) return res.status(400).json({ error: 'folderPath required' })

  const absPath = path.resolve(folderPath)
  if (!fs.existsSync(absPath)) return res.status(400).json({ error: `Path does not exist: ${absPath}` })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const send = (event: string, data: any) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)

  try {
    send('progress', { step: 'Reading .gitignore...' })
    const ig = ignore()
    const gitignorePath = path.join(absPath, '.gitignore')
    if (fs.existsSync(gitignorePath)) {
      ig.add(fs.readFileSync(gitignorePath, 'utf8'))
    }

    send('progress', { step: 'Walking directory tree...' })
    const allFiles: Array<{ path: string, size: number }> = []
    walkDir(absPath, ig, absPath, allFiles)

    send('progress', { step: `Found ${allFiles.length} files. Reading source files...` })

    // read text files up to 200KB each, cap total at 800KB
    const fileContents: Array<{ path: string, content: string }> = []
    let totalBytes = 0
    const MAX_TOTAL = 800_000
    const MAX_FILE = 50_000

    const readableFiles = allFiles.filter(f => shouldReadFile(f.path) && f.size < MAX_FILE)

    for (const file of readableFiles) {
      if (totalBytes > MAX_TOTAL) break
      try {
        const content = fs.readFileSync(file.path, 'utf8')
        const relPath = path.relative(absPath, file.path)
        fileContents.push({ path: relPath, content: content.slice(0, MAX_FILE) })
        totalBytes += content.length
      } catch { /* binary or unreadable */ }
    }

    // git history
    send('progress', { step: 'Reading git history...' })
    let gitLog: any[] = []
    let gitBranches: string[] = []
    let gitRemote = ''
    let gitStats = {}

    try {
      const git = simpleGit(absPath)
      const isRepo = await git.checkIsRepo()
      if (isRepo) {
        const log = await git.log(['--max-count=200', '--stat'])
        gitLog = log.all.map(c => ({
          hash: c.hash.slice(0, 7),
          date: c.date,
          message: c.message,
          author_name: c.author_name,
          author_email: c.author_email,
        }))

        const branchSummary = await git.branchLocal()
        gitBranches = Object.keys(branchSummary.branches)

        try {
          const remotes = await git.getRemotes(true)
          gitRemote = remotes[0]?.refs?.fetch || ''
        } catch {}

        // author stats
        const authorMap: Record<string, number> = {}
        for (const c of gitLog) {
          authorMap[c.author_name] = (authorMap[c.author_name] || 0) + 1
        }
        gitStats = authorMap
      }
    } catch { /* not a git repo */ }

    // language breakdown from file extensions
    const langMap: Record<string, number> = {}
    for (const f of allFiles) {
      const ext = path.extname(f.path) || path.basename(f.path)
      langMap[ext] = (langMap[ext] || 0) + 1
    }

    // structure summary
    const dirStructure: Record<string, number> = {}
    for (const f of allFiles) {
      const rel = path.relative(absPath, f.path)
      const parts = rel.split(path.sep)
      const topDir = parts.length > 1 ? parts[0] : '(root)'
      dirStructure[topDir] = (dirStructure[topDir] || 0) + 1
    }

    const payload = {
      folderPath: absPath,
      folderName: path.basename(absPath),
      totalFiles: allFiles.length,
      readFiles: fileContents.length,
      fileContents,
      langMap,
      dirStructure,
      gitLog,
      gitBranches,
      gitRemote,
      gitAuthorStats: gitStats,
      mode: 'local' as const
    }

    send('done', payload)
    res.end()
  } catch (err: any) {
    send('error', { error: err.message })
    res.end()
  }
})

// ── AI ANALYSIS ───────────────────────────────────────────────────────────────

app.post('/api/analyze', async (req, res) => {
  const { data, mode } = req.body

  if (!OPENROUTER_API_KEY) {
    return res.status(400).json({ error: 'OPENROUTER_API_KEY not set in .env' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const prompt = mode === 'github' ? buildGithubPrompt(data) : buildLocalPrompt(data)

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: OPENROUTER_MODEL,
        stream: true,
        max_tokens: 8000,
        messages: [
          {
            role: 'system',
            content: `You are a senior software architect and engineering intelligence system. 
You analyze codebases deeply and produce comprehensive, insightful reports. 
Your analysis is technical, opinionated, honest, and genuinely useful — not generic.
You surface non-obvious insights: patterns, anti-patterns, evolution trends, risk areas, architectural decisions.
Format your report in clean Markdown with clear sections.`
          },
          { role: 'user', content: prompt }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://reporadar.local',
          'X-Title': 'RepoRadar'
        },
        responseType: 'stream'
      }
    )

    response.data.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n').filter(l => l.trim())
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const raw = line.slice(6)
          if (raw === '[DONE]') { res.write('data: [DONE]\n\n'); return }
          try {
            const parsed = JSON.parse(raw)
            const delta = parsed.choices?.[0]?.delta?.content
            if (delta) res.write(`data: ${JSON.stringify({ text: delta })}\n\n`)
          } catch {}
        }
      }
    })

    response.data.on('end', () => { res.write('data: [DONE]\n\n'); res.end() })
    response.data.on('error', (err: Error) => {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
    })
  } catch (err: any) {
    const status = err?.response?.status
    let errMsg = err?.response?.data?.error?.message || err.message
    if (status === 429) errMsg = 'OpenRouter rate limit hit (429). Check your plan at openrouter.ai/activity or try a cheaper/different model.'
    if (status === 401) errMsg = 'OpenRouter API key is invalid or missing. Check OPENROUTER_API_KEY in your .env file.'
    res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`)
    res.end()
  }
})

// ── PROMPT BUILDERS ───────────────────────────────────────────────────────────

function buildGithubPrompt(data: any): string {
  const { meta, languages, contributors, commits, branches, releases, issues, tree, readme, ciRuns } = data

  const commitSample = commits.slice(0, 100).map((c: any) =>
    `[${c.commit?.author?.date?.slice(0, 10)}] ${c.commit?.author?.name}: ${c.commit?.message?.split('\n')[0]}`
  ).join('\n')

  const issuesSample = issues.slice(0, 60).map((i: any) =>
    `[${i.state}] #${i.number} ${i.pull_request ? '(PR)' : '(Issue)'}: ${i.title}`
  ).join('\n')

  const filePaths = tree.filter((f: any) => f.type === 'blob').map((f: any) => f.path).join('\n')

  const topContributors = contributors.slice(0, 15).map((c: any) =>
    `${c.login}: ${c.contributions} commits`
  ).join(', ')

  return `Analyze this GitHub repository and produce a comprehensive intelligence report.

## Repository: ${meta.full_name}

**Basic Info:**
- Description: ${meta.description || 'none'}
- Created: ${meta.created_at?.slice(0, 10)}
- Last pushed: ${meta.pushed_at?.slice(0, 10)}
- Stars: ${meta.stargazers_count} | Forks: ${meta.forks_count} | Watchers: ${meta.watchers_count}
- Open issues: ${meta.open_issues_count}
- Default branch: ${meta.default_branch}
- License: ${meta.license?.name || 'none'}
- Topics: ${meta.topics?.join(', ') || 'none'}

**Languages:**
${JSON.stringify(languages, null, 2)}

**Branches (${branches.length}):**
${branches.map((b: any) => b.name).join(', ')}

**Releases (${releases.length}):**
${releases.slice(0, 10).map((r: any) => `${r.tag_name} (${r.published_at?.slice(0, 10)}): ${r.name}`).join('\n')}

**Top Contributors:**
${topContributors}

**README (first 4000 chars):**
${readme || '(none)'}

**File Tree (first 1000 entries):**
${filePaths}

**Commit History (${commits.length} total, showing 100):**
${commitSample}

**Issues & PRs (${issues.length} total, showing 60):**
${issuesSample}

**Recent CI Runs:**
${ciRuns.slice(0, 10).map((r: any) => `${r.name}: ${r.conclusion || r.status} (${r.created_at?.slice(0, 10)})`).join('\n')}

---

Write a comprehensive repository intelligence report with these sections:

# Repository Intelligence Report: ${meta.name}

## 1. Executive Summary
A sharp, opinionated paragraph about what this project is, what it does, and its current state.

## 2. Technical Architecture
What's the stack? How is the codebase structured? What architectural patterns are used? Any notable design decisions visible from the file tree and code?

## 3. Codebase Evolution
Tell the story of how this project evolved. Use the commit history — when did major phases happen? Were there pivots, rewrites, or significant architectural changes? What was the velocity like over time?

## 4. Development Patterns
How does the team work? Commit patterns (times, frequency, message quality), PR practices, branching strategy, release cadence. What does the contributor distribution look like?

## 5. Key Strengths
What is this codebase doing well? Concrete observations.

## 6. Risk Areas & Technical Debt
Be honest. What looks risky, under-tested, over-complicated, or likely to cause problems? What smells are visible?

## 7. Issue & PR Insights
What themes come up in issues? Any recurring pain points? What does the PR flow reveal about team dynamics?

## 8. Dependency & Ecosystem Health
What does the language/tooling choice say? Any concerns about ecosystem maturity or maintenance?

## 9. Notable Insights
3-5 non-obvious, genuinely interesting observations about this codebase that you'd only see by looking closely.

## 10. Recommendations
Top 5 concrete, actionable recommendations for the team.

Be specific, technical, and opinionated. Avoid generic statements that could apply to any codebase.`
}

function buildLocalPrompt(data: any): string {
  const { folderName, folderPath, totalFiles, fileContents, langMap, dirStructure, gitLog, gitBranches, gitAuthorStats } = data

  const fileTree = Object.entries(dirStructure)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .map(([dir, count]) => `  ${dir}/  (${count} files)`)
    .join('\n')

  const langBreakdown = Object.entries(langMap)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 20)
    .map(([ext, count]) => `  ${ext}: ${count}`)
    .join('\n')

  const commitSample = gitLog.slice(0, 100).map((c: any) =>
    `[${c.date?.slice(0, 10)}] ${c.author_name}: ${c.message?.split('\n')[0]}`
  ).join('\n')

  const authorStats = Object.entries(gitAuthorStats)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([name, count]) => `  ${name}: ${count} commits`)
    .join('\n')

  // build source files section (truncated to fit)
  let sourceSection = ''
  let charBudget = 60_000
  for (const f of fileContents) {
    const block = `\n### ${f.path}\n\`\`\`\n${f.content.slice(0, 3000)}\n\`\`\`\n`
    if (charBudget - block.length < 0) break
    sourceSection += block
    charBudget -= block.length
  }

  return `Analyze this local codebase and produce a comprehensive intelligence report.

## Project: ${folderName}
**Path:** ${folderPath}
**Total files:** ${totalFiles} (${fileContents.length} read for analysis)

**Directory Structure:**
${fileTree}

**Language/Extension Breakdown:**
${langBreakdown}

**Git Branches:**
${gitBranches.join(', ') || '(not a git repo)'}

**Author Commit Stats:**
${authorStats || '(no git history)'}

**Commit History (${gitLog.length} commits, showing 100):**
${commitSample || '(no git history)'}

## Source Files
${sourceSection}

---

Write a comprehensive codebase intelligence report with these sections:

# Codebase Intelligence Report: ${folderName}

## 1. Executive Summary
A sharp, opinionated paragraph about what this project is, what it does, and its current state.

## 2. Technical Architecture
What's the stack? How is the codebase structured? What are the key modules/layers? What architectural patterns are used? How do the pieces fit together?

## 3. Code Quality Assessment
Be honest and specific. What's the actual quality of this code? Naming conventions, modularity, separation of concerns, error handling, typing, documentation. Point to specific files/patterns.

## 4. Codebase Evolution
If there's git history — tell the story of how this project evolved. When were major phases? Any pivots or rewrites? If no git history, analyze structural evidence of evolution.

## 5. Key Strengths
What is this codebase doing well? Concrete observations with file references where possible.

## 6. Risk Areas & Technical Debt
Be honest. What looks risky, fragile, or likely to cause problems? What patterns will hurt the team at scale?

## 7. Dependency Analysis
What libraries/frameworks are being used? How appropriate are they for the task? Any concerning dependencies or missing ones?

## 8. Security & Performance Observations
Any visible security concerns? Any obvious performance issues in the code?

## 9. Notable Insights
3-5 non-obvious, genuinely interesting observations about this codebase.

## 10. Recommendations
Top 5 concrete, prioritized recommendations for improving this codebase.

Be specific, technical, and opinionated. Reference actual file names and patterns you observe.`
}

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    model: OPENROUTER_MODEL,
    hasKey: !!OPENROUTER_API_KEY,
    hasGithubToken: !!GITHUB_TOKEN
  })
})

app.listen(PORT, () => {
  console.log(`\n🔍 RepoRadar server running on http://localhost:${PORT}`)
  console.log(`   Model: ${OPENROUTER_MODEL}`)
  console.log(`   API key: ${OPENROUTER_API_KEY ? '✓ set' : '✗ missing — set OPENROUTER_API_KEY in .env'}`)
  console.log(`   GitHub token: ${GITHUB_TOKEN ? '✓ set' : '○ not set (rate limited to 60 req/hr)'}`)
  console.log()
})
