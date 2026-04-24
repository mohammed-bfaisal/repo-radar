import type { Finding, FileContent, BestPracticesReport } from './types'

// Stack detection + best-practice rule enforcement.
// Detects the active tech stack first, then applies only relevant rule sets.

// ── Stack detection ──────────────────────────────────────────────────────────

export function detectStack(files: FileContent[], pkgJson?: string): string[] {
  const stack: string[] = []
  const paths  = files.map(f => f.path)
  const allContent = files.map(f => f.content).join('\n')

  const has  = (pattern: RegExp) => pattern.test(allContent)
  const hasFile = (name: string) => paths.some(p => p.endsWith(name) || p.includes(`/${name}`))

  // Languages
  if (paths.some(p => /\.[jt]sx?$/.test(p))) stack.push('JavaScript/TypeScript')
  if (paths.some(p => /\.py$/.test(p)))        stack.push('Python')
  if (paths.some(p => /\.go$/.test(p)))         stack.push('Go')
  if (paths.some(p => /\.rs$/.test(p)))         stack.push('Rust')
  if (paths.some(p => /\.java$/.test(p)))       stack.push('Java')
  if (paths.some(p => /\.rb$/.test(p)))         stack.push('Ruby')

  // Frameworks
  if (has(/from ['"]react['"]/))                stack.push('React')
  if (has(/from ['"]next['"]/))                 stack.push('Next.js')
  if (has(/from ['"]vue['"]/))                  stack.push('Vue')
  if (has(/from ['"]@angular/))                 stack.push('Angular')
  if (has(/from ['"]svelte['"]/))               stack.push('Svelte')
  if (has(/express\(\)/))                       stack.push('Express')
  if (has(/fastapi|FastAPI/))                   stack.push('FastAPI')
  if (has(/from ['"]django/))                   stack.push('Django')
  if (has(/from ['"]flask/))                    stack.push('Flask')
  if (has(/NestFactory/))                       stack.push('NestJS')

  // Databases / ORMs
  if (has(/prisma|PrismaClient/))               stack.push('Prisma')
  if (has(/mongoose|Mongoose/))                 stack.push('MongoDB/Mongoose')
  if (has(/typeorm|TypeORM/))                   stack.push('TypeORM')
  if (has(/sequelize|Sequelize/))               stack.push('Sequelize')
  if (has(/SQLAlchemy/))                        stack.push('SQLAlchemy')

  // Testing
  if (has(/describe\(|it\(|test\(/) && has(/expect\(/)) stack.push('Jest/Vitest')
  if (has(/import pytest/))                     stack.push('pytest')
  if (has(/import.*unittest/))                  stack.push('unittest')

  // Infrastructure
  if (hasFile('Dockerfile'))                    stack.push('Docker')
  if (hasFile('docker-compose.yml') || hasFile('docker-compose.yaml')) stack.push('Docker Compose')
  if (paths.some(p => /\.github\/workflows/.test(p)))                  stack.push('GitHub Actions')
  if (hasFile('serverless.yml') || hasFile('serverless.yaml'))         stack.push('Serverless Framework')

  return [...new Set(stack)]
}

// ── TypeScript-specific rules ────────────────────────────────────────────────

function checkTypeScript(files: FileContent[]): Finding[] {
  const tsFiles = files.filter(f => /\.tsx?$/.test(f.path))
  const findings: Finding[] = []

  for (const file of tsFiles) {
    const lines = file.content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // any type usage
      if (/:\s*any\b/.test(line) && !/\/\/.*:\s*any/.test(line))
        findings.push({ severity: 'low', category: 'Best Practices › TypeScript', rule: 'ts-any-type', message: 'Explicit `any` type — consider a specific type or `unknown`', file: file.path, line: i + 1, snippet: line.trim().slice(0, 80) })
      // as type assertions (excluding `as const`)
      if (/\)\s+as\s+(?!const)/.test(line))
        findings.push({ severity: 'info', category: 'Best Practices › TypeScript', rule: 'ts-type-assertion', message: 'Type assertion with `as` — may hide actual type errors', file: file.path, line: i + 1, snippet: line.trim().slice(0, 80) })
      // ts-ignore / ts-nocheck
      if (/@ts-ignore/.test(line))
        findings.push({ severity: 'medium', category: 'Best Practices › TypeScript', rule: 'ts-ignore', message: '@ts-ignore suppresses a type error — fix the underlying issue instead', file: file.path, line: i + 1, snippet: line.trim().slice(0, 80) })
      if (/@ts-nocheck/.test(line))
        findings.push({ severity: 'high', category: 'Best Practices › TypeScript', rule: 'ts-nocheck', message: '@ts-nocheck disables TypeScript for the entire file', file: file.path, line: i + 1, snippet: line.trim().slice(0, 80) })
    }
  }
  return findings
}

// ── React-specific rules ─────────────────────────────────────────────────────

function checkReact(files: FileContent[]): Finding[] {
  const reactFiles = files.filter(f => /\.tsx?$|\.jsx?$/.test(f.path) && /react|jsx/i.test(f.content))
  const findings: Finding[] = []

  for (const file of reactFiles) {
    const lines = file.content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // .map( without key prop nearby
      if (/\.map\s*\(\s*(?:\w+|\([^)]*\))\s*=>/.test(line) && !/key\s*=/.test(line) && !/key\s*=/.test(lines[i + 1] ?? ''))
        findings.push({ severity: 'medium', category: 'Best Practices › React', rule: 'react-missing-key', message: '.map() without key prop — causes incorrect reconciliation and list bugs', file: file.path, line: i + 1, snippet: line.trim().slice(0, 80) })
      // Direct state mutation
      if (/this\.state\.\w+\s*=(?!=)/.test(line))
        findings.push({ severity: 'high', category: 'Best Practices › React', rule: 'react-direct-state-mutation', message: 'Direct state mutation — use this.setState() or a hook setter', file: file.path, line: i + 1, snippet: line.trim().slice(0, 80) })
      // useEffect with [] but uses stateful values (simplified heuristic)
      if (/useEffect\s*\(/.test(line) && /,\s*\[\s*\]\s*\)/.test(lines.slice(i, i + 10).join(' ')))
        findings.push({ severity: 'info', category: 'Best Practices › React', rule: 'react-effect-empty-deps', message: 'useEffect with [] — verify all used values are in the dependency array', file: file.path, line: i + 1, snippet: line.trim().slice(0, 80) })
    }
  }
  return findings
}

// ── Node / Express-specific rules ────────────────────────────────────────────

function checkNode(files: FileContent[], stack: string[]): Finding[] {
  if (!stack.includes('Express') && !stack.includes('NestJS')) return []
  const findings: Finding[] = []

  const fullContent = files.map(f => f.content).join('\n')
  // No helmet
  if (!/helmet\(\)/.test(fullContent))
    findings.push({ severity: 'medium', category: 'Best Practices › Node/Express', rule: 'node-no-helmet', message: 'helmet() not detected — HTTP security headers are unset', file: 'app-wide', snippet: 'app.use(helmet())' })
  // No input validation library
  if (!/joi|yup|zod|express-validator|ajv/.test(fullContent))
    findings.push({ severity: 'medium', category: 'Best Practices › Node/Express', rule: 'node-no-validation', message: 'No input validation library detected (joi/yup/zod/express-validator)', file: 'app-wide' })

  for (const file of files) {
    const lines = file.content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Sync FS in async handler
      if (/(?:readFileSync|writeFileSync|existsSync|mkdirSync)/.test(line))
        findings.push({ severity: 'medium', category: 'Best Practices › Node/Express', rule: 'node-sync-in-handler', message: 'Synchronous fs call blocks the event loop — use the async fs/promises API', file: file.path, line: i + 1, snippet: line.trim().slice(0, 80) })
    }
  }
  return findings
}

// ── Python-specific rules ────────────────────────────────────────────────────

function checkPython(files: FileContent[]): Finding[] {
  const pyFiles = files.filter(f => f.path.endsWith('.py'))
  const findings: Finding[] = []

  for (const file of pyFiles) {
    const lines = file.content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Mutable default arguments
      if (/def\s+\w+\s*\([^)]*=\s*(?:\[\]|\{\}|list\(\)|dict\(\))/.test(line))
        findings.push({ severity: 'high', category: 'Best Practices › Python', rule: 'py-mutable-default', message: 'Mutable default argument — the object is shared across all calls, use None instead', file: file.path, line: i + 1, snippet: line.trim().slice(0, 80) })
      // type() == instead of isinstance()
      if (/type\s*\(\s*\w+\s*\)\s*==/.test(line))
        findings.push({ severity: 'low', category: 'Best Practices › Python', rule: 'py-type-check', message: 'type() == used for type check — isinstance() handles inheritance correctly', file: file.path, line: i + 1, snippet: line.trim().slice(0, 80) })
      // Old-style % string formatting
      if (/%\s*(?:\w+|\()\s*%/.test(line) && /['"]\s*%/.test(line))
        findings.push({ severity: 'info', category: 'Best Practices › Python', rule: 'py-percent-format', message: 'Old-style % string formatting — prefer f-strings or .format()', file: file.path, line: i + 1, snippet: line.trim().slice(0, 80) })
    }
  }
  return findings
}

// ── Universal rules ──────────────────────────────────────────────────────────

function checkUniversal(files: FileContent[]): Finding[] {
  const findings: Finding[] = []

  for (const file of files) {
    const lines = file.content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // process.env accessed without fallback or validation
      if (/process\.env\.\w+(?!\s*\?\?|\s*\|\||\s*!|\s*===|\s*!==)/.test(line) && !/process\.env\.NODE_ENV/.test(line))
        findings.push({ severity: 'info', category: 'Best Practices › Universal', rule: 'env-no-default', message: 'process.env value used without fallback or validation — may be undefined at runtime', file: file.path, line: i + 1, snippet: line.trim().slice(0, 80) })
    }
  }
  return findings.slice(0, 40)
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export function analyseBestPractices(files: FileContent[], pkgJson?: string): BestPracticesReport {
  const stack = detectStack(files, pkgJson)
  const violations: Finding[] = [
    ...checkTypeScript(files),
    ...checkReact(files),
    ...checkNode(files, stack),
    ...checkPython(files),
    ...checkUniversal(files),
  ]
  return { detectedStack: stack, violations }
}
