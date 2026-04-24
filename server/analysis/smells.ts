import type { Finding, SmellsReport, FileContent } from './types'

// Code smell detectors. Each check targets a specific bad pattern
// that is reliably identifiable without a full language parser.

// ── Empty / swallowed catch blocks ──────────────────────────────────────────

function findEmptyCatches(files: FileContent[]): Finding[] {
  const findings: Finding[] = []
  // Match: catch block whose body is only whitespace or a comment before the closing brace
  const EMPTY_CATCH_JS  = /catch\s*\([^)]*\)\s*\{\s*(?:\/\/[^\n]*)?\s*\}/g
  const EMPTY_CATCH_PY  = /except(?:\s+\w+)?:\s*\n\s*pass\b/g
  const GENERIC_CATCH_RUBY = /rescue\s*\n\s*end/g

  for (const file of files) {
    const content = file.content
    for (const rx of [EMPTY_CATCH_JS, EMPTY_CATCH_PY, GENERIC_CATCH_RUBY]) {
      rx.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = rx.exec(content)) !== null) {
        const line = content.slice(0, m.index).split('\n').length
        findings.push({ severity: 'medium', category: 'Smells › Error Handling', rule: 'empty-catch', message: 'Empty catch block silently swallows errors', file: file.path, line, snippet: m[0].trim().slice(0, 80) })
      }
    }
  }
  return findings
}

// ── Generic / bare exception catching ────────────────────────────────────────

function findGenericExceptions(files: FileContent[]): Finding[] {
  const findings: Finding[] = []
  const RULES: Array<{ rx: RegExp; msg: string }> = [
    { rx: /catch\s*\(\s*(?:e|err|error|ex|exception)\s*\)\s*\{/gi, msg: 'Bare catch(e) — consider catching specific error types' },
    { rx: /except\s*:/g,                                             msg: 'Bare except: catches all exceptions including SystemExit and KeyboardInterrupt' },
    { rx: /except\s+Exception\s*(?:as\s+\w+)?:/g,                   msg: 'except Exception catches too broadly — use a specific exception class' },
    { rx: /rescue\s+StandardError/g,                                 msg: 'rescue StandardError catches too broadly in Ruby' },
  ]
  for (const file of files) {
    for (const { rx, msg } of RULES) {
      rx.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = rx.exec(file.content)) !== null) {
        const line = file.content.slice(0, m.index).split('\n').length
        findings.push({ severity: 'low', category: 'Smells › Error Handling', rule: 'generic-exception', message: msg, file: file.path, line, snippet: m[0].trim().slice(0, 80) })
      }
    }
  }
  return findings
}

// ── Unhandled promise rejections ─────────────────────────────────────────────

function findUnhandledPromises(files: FileContent[]): Finding[] {
  const findings: Finding[] = []
  // .then() without a .catch() or .finally() chained on the same expression
  const THEN_NO_CATCH = /\.then\([^)]*\)(?!\s*\.catch)(?!\s*\.finally)/g

  for (const file of files) {
    if (!/\.[jt]sx?$/.test(file.path)) continue
    const content = file.content
    THEN_NO_CATCH.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = THEN_NO_CATCH.exec(content)) !== null) {
      const line = content.slice(0, m.index).split('\n').length
      findings.push({ severity: 'medium', category: 'Smells › Error Handling', rule: 'unhandled-promise', message: '.then() without .catch() — unhandled rejection will crash in Node 15+', file: file.path, line, snippet: m[0].trim().slice(0, 80) })
    }
  }
  return findings
}

// ── Magic numbers ────────────────────────────────────────────────────────────

function findMagicNumbers(files: FileContent[]): Finding[] {
  const findings: Finding[] = []
  // Numbers > 9 that are not 10, 100, 1000, -1, 0, 1 and not in test files
  const MAGIC = /(?<![.\w])([2-9]\d{1,}|1[1-9]|[2-9]\d)(?![.\w%])/g
  const COMMON_OK = new Set([10, 16, 24, 32, 60, 64, 100, 128, 256, 360, 404, 500, 1000, 1024])

  for (const file of files) {
    const isTest = /\.(test|spec)\.[jt]sx?$|__tests__|\/tests?\//.test(file.path)
    if (isTest) continue
    const lines = file.content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Skip import/require lines, comments, and CSS
      if (/^\s*(?:import|require|\/\/|#|\/\*|\*|@)/.test(line)) continue
      if (/\.(css|scss|less|svg)$/.test(file.path)) continue
      MAGIC.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = MAGIC.exec(line)) !== null) {
        const num = parseInt(m[1], 10)
        if (COMMON_OK.has(num)) continue
        findings.push({ severity: 'info', category: 'Smells › Readability', rule: 'magic-number', message: `Magic number ${m[1]} — extract to a named constant`, file: file.path, line: i + 1, snippet: line.trim().slice(0, 80) })
        break // one per line is enough
      }
    }
  }
  return findings.slice(0, 60) // cap to avoid noise
}

// ── Commented-out code ───────────────────────────────────────────────────────

function findCommentedCode(files: FileContent[]): Finding[] {
  const findings: Finding[] = []
  // Comment lines that look like code (contain = or ( or ; or : and are not sentences)
  const CODE_IN_COMMENT = /^\s*(?:\/\/|#)\s*.{5,}(?:[=({;]|=>|->|\bif\b|\bfor\b|\breturn\b)/

  for (const file of files) {
    const lines = file.content.split('\n')
    let runLength = 0
    let startLine = 0

    for (let i = 0; i < lines.length; i++) {
      if (CODE_IN_COMMENT.test(lines[i])) {
        if (runLength === 0) startLine = i + 1
        runLength++
      } else {
        if (runLength >= 3) {
          findings.push({ severity: 'info', category: 'Smells › Readability', rule: 'commented-code', message: `${runLength}-line block of commented-out code — delete or restore it`, file: file.path, line: startLine, snippet: lines[startLine - 1].trim().slice(0, 80) })
        }
        runLength = 0
      }
    }
  }
  return findings.slice(0, 30)
}

// ── Copy-paste / duplicate block detection ────────────────────────────────────

function findDuplicateBlocks(files: FileContent[]): SmellsReport['duplicateBlocks'] {
  // Hash 6-line sliding windows; files sharing many identical hashes are duplicates
  const MIN_LINES = 6
  const windowHashes = new Map<string, string>() // hash -> 'file:startLine'
  const duplicates: SmellsReport['duplicateBlocks'] = []

  for (const file of files) {
    const lines = file.content.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length < MIN_LINES) continue

    for (let i = 0; i <= lines.length - MIN_LINES; i++) {
      const window = lines.slice(i, i + MIN_LINES).join('\n')
      if (window.length < 60) continue // skip trivial windows
      const existing = windowHashes.get(window)
      if (existing) {
        const [file1] = existing.split(':')
        if (file1 !== file.path) {
          duplicates.push({ file1, file2: file.path, sharedLines: MIN_LINES })
        }
      } else {
        windowHashes.set(window, `${file.path}:${i}`)
      }
    }
  }

  // De-duplicate pairs
  const seen = new Set<string>()
  return duplicates.filter(d => {
    const key = [d.file1, d.file2].sort().join('||')
    return seen.has(key) ? false : (seen.add(key), true)
  }).slice(0, 20)
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export function analyseSmells(files: FileContent[]): SmellsReport {
  return {
    emptyCatches:     findEmptyCatches(files),
    genericExceptions:findGenericExceptions(files),
    unhandledPromises:findUnhandledPromises(files),
    magicNumbers:     findMagicNumbers(files),
    commentedCode:    findCommentedCode(files),
    duplicateBlocks:  findDuplicateBlocks(files),
  }
}
