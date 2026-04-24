import type { Finding, FileContent, AdvancedReport } from './types'

// Advanced inferred-insight checks: scale risks, compliance surface,
// naming/intent gaps, and abandoned code detection.

// ── Scale risks — patterns that fail under production load ───────────────────

function findScaleRisks(files: FileContent[]): Finding[] {
  const findings: Finding[] = []

  const RULES: Array<{ rx: RegExp; rule: string; message: string; severity: Finding['severity'] }> = [
    // N+1 query: ORM call inside a loop
    { rx: /(?:for|forEach|map|filter)\s*[\(\{][\s\S]{0,200}(?:await\s+)?(?:db\.|prisma\.|mongoose\.|sequelize\.|find|findOne|findAll|query|execute)\s*\(/g,
      rule: 'scale-n-plus-1', message: 'ORM/DB call inside a loop — likely N+1 query pattern; use batch fetch + in-memory join', severity: 'high' },
    // Unbounded queries — no limit/pagination
    { rx: /\.findAll\(\s*\{(?![\s\S]*limit)[\s\S]*?\}\s*\)|\.find\(\s*\{(?![\s\S]*limit)[\s\S]{0,100}\}\s*\)/g,
      rule: 'scale-unbounded-query', message: 'findAll/find without a limit — returns full table as data grows', severity: 'medium' },
    // Synchronous file I/O in what looks like a request handler
    { rx: /(?:readFileSync|writeFileSync)\s*\([^)]+\)/g,
      rule: 'scale-sync-io', message: 'Synchronous I/O blocks the event loop — use async fs/promises instead', severity: 'medium' },
    // JSON.parse on large input without size check
    { rx: /JSON\.parse\s*\(\s*(?:req\.body|req\.text|body|data|input)\s*\)/g,
      rule: 'scale-json-parse-unchecked', message: 'JSON.parse on request body without size limit — DoS via large payload', severity: 'medium' },
    // Missing pagination
    { rx: /(?:router|app)\.\w+\([^)]*\)\s*(?:async\s*)?\([^)]*\)\s*\{[\s\S]{0,400}(?:findAll|\.find\(\{\}|SELECT \*)/g,
      rule: 'scale-endpoint-no-pagination', message: 'Route handler fetches all records without pagination — unsafe at scale', severity: 'high' },
    // Polling instead of event-driven (setInterval for data refresh)
    { rx: /setInterval\s*\([^,]+,\s*(?:[1-9]\d{2,}|[1-9]\d*000)\s*\)/g,
      rule: 'scale-polling', message: 'setInterval used for data refresh — consider WebSockets, SSE, or event queues instead', severity: 'low' },
  ]

  for (const file of files) {
    for (const { rx, rule, message, severity } of RULES) {
      rx.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = rx.exec(file.content)) !== null) {
        const line = file.content.slice(0, m.index).split('\n').length
        findings.push({ severity, category: 'Advanced › Scale Risks', rule, message, file: file.path, line, snippet: m[0].trim().slice(0, 100) })
        rx.lastIndex = m.index + 1 // avoid infinite loop on zero-width matches
      }
    }
  }
  return findings.slice(0, 40)
}

// ── Compliance surface signals ────────────────────────────────────────────────

function findComplianceSignals(files: FileContent[]): Finding[] {
  const findings: Finding[] = []

  const RULES: Array<{ rx: RegExp; rule: string; message: string; severity: Finding['severity'] }> = [
    // PII variable names being logged
    { rx: /(?:console\.log|logger\.\w+|print)\s*\([^)]*(?:email|phone|ssn|dob|dateOfBirth|password|credit_card|creditCard)/gi,
      rule: 'compliance-pii-logged', message: 'PII field logged — check GDPR/HIPAA requirements for logging personal data', severity: 'high' },
    // httpOnly false cookies
    { rx: /httpOnly\s*:\s*false/g,
      rule: 'compliance-cookie-httponly', message: 'Cookie with httpOnly:false is accessible to JavaScript — OWASP recommends httpOnly:true', severity: 'medium' },
    // secure false cookies
    { rx: /secure\s*:\s*false/,
      rule: 'compliance-cookie-secure', message: 'Cookie with secure:false is sent over HTTP — should be HTTPS-only in production', severity: 'medium' },
    // Data stored without encryption indicator (basic heuristic)
    { rx: /\.save\(\s*\{[\s\S]{0,200}(?:password|ssn|credit)/gi,
      rule: 'compliance-unencrypted-pii', message: 'PII field saved without visible encryption — verify data is encrypted at rest', severity: 'high' },
    // User-supplied file path in readFile
    { rx: /(?:readFile|createReadStream)\s*\(\s*(?:req\.|params\.|body\.|query\.)/g,
      rule: 'compliance-path-traversal', message: 'File operation with user-supplied path — validate and sanitise to prevent path traversal', severity: 'critical' },
    // Missing Content-Security-Policy header
    { rx: /res\.(?:set|header|setHeader)\s*\(\s*['"]Content-Security-Policy['"]/g,
      rule: 'compliance-csp-present', message: 'Content-Security-Policy header set — good practice', severity: 'info' },
  ]

  for (const file of files) {
    for (const { rx, rule, message, severity } of RULES) {
      rx.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = rx.exec(file.content)) !== null) {
        const line = file.content.slice(0, m.index).split('\n').length
        findings.push({ severity, category: 'Advanced › Compliance', rule, message, file: file.path, line, snippet: m[0].trim().slice(0, 100) })
        rx.lastIndex = m.index + 1
      }
    }
  }
  return findings.slice(0, 30)
}

// ── Naming / intent gaps ─────────────────────────────────────────────────────

function findNamingIntentGaps(files: FileContent[]): Finding[] {
  const findings: Finding[] = []

  const RULES: Array<{ rx: RegExp; rule: string; message: string }> = [
    // Function named "get" that does mutation
    { rx: /(?:function|const|async function)\s+get\w+[\s\S]{0,300}(?:\.save\(|\.update\(|\.delete\(|\.destroy\(|await\s+db\.)/g,
      rule: 'naming-get-mutates', message: 'Function named get* appears to perform mutations — name should reflect side effects' },
    // Function named "validate" that doesn't return boolean
    { rx: /(?:function|const)\s+validate\w+[\s\S]{0,500}(?:\.save\(|res\.json\(|throw new)/g,
      rule: 'naming-validate-side-effects', message: 'Function named validate* appears to have side effects beyond returning true/false' },
    // Meaningless variable names in non-test production code
    { rx: /(?:const|let|var)\s+(temp|data2?|stuff|foo|bar|baz|test\d*|tmp)\s*=/g,
      rule: 'naming-vague-variable', message: 'Vague variable name in production code — use a descriptive name that explains the value\'s purpose' },
    // isLoading/isError used as generic flags
    { rx: /(?:const|let)\s+(?:flag|status|check)\s*=/g,
      rule: 'naming-generic-flag', message: 'Generic flag name — use a descriptive boolean name like isReady, hasError, isAuthenticated' },
  ]

  for (const file of files) {
    const isTest = /\.(test|spec)\.[jt]sx?$|__tests__|\/tests?\//.test(file.path)
    if (isTest) continue
    for (const { rx, rule, message } of RULES) {
      rx.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = rx.exec(file.content)) !== null) {
        const line = file.content.slice(0, m.index).split('\n').length
        findings.push({ severity: 'info', category: 'Advanced › Naming & Intent', rule, message, file: file.path, line, snippet: m[0].trim().slice(0, 100) })
        rx.lastIndex = m.index + 1
      }
    }
  }
  return findings.slice(0, 30)
}

// ── Abandoned / dead code ────────────────────────────────────────────────────

function findAbandonedCode(files: FileContent[]): Finding[] {
  const findings: Finding[] = []

  // Build a map of all exported names
  const exportedNames = new Set<string>()
  const EXPORT_RX = /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g

  for (const file of files) {
    EXPORT_RX.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = EXPORT_RX.exec(file.content)) !== null) {
      exportedNames.add(m[1])
    }
  }

  // Count how many files import each name
  const importCounts = new Map<string, number>()
  const IMPORT_RX = /import\s+\{([^}]+)\}|import\s+(\w+)\s+from/g

  for (const file of files) {
    IMPORT_RX.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = IMPORT_RX.exec(file.content)) !== null) {
      const names = m[1]?.split(',').map(n => n.trim()) ?? (m[2] ? [m[2]] : [])
      for (const name of names) {
        importCounts.set(name, (importCounts.get(name) || 0) + 1)
      }
    }
  }

  // Find exported names that are never imported anywhere
  for (const file of files) {
    EXPORT_RX.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = EXPORT_RX.exec(file.content)) !== null) {
      const name = m[1]
      if ((importCounts.get(name) || 0) === 0 && name !== 'default') {
        const line = file.content.slice(0, m.index).split('\n').length
        findings.push({ severity: 'info', category: 'Advanced › Dead Code', rule: 'dead-export', message: `"${name}" is exported but never imported elsewhere — may be dead code`, file: file.path, line, snippet: m[0].trim().slice(0, 80) })
      }
    }
  }
  return findings.slice(0, 25)
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export function analyseAdvanced(files: FileContent[]): AdvancedReport {
  return {
    scaleRisks:       findScaleRisks(files),
    complianceSignals:findComplianceSignals(files),
    namingIntentGaps: findNamingIntentGaps(files),
    abandonedCode:    findAbandonedCode(files),
  }
}
