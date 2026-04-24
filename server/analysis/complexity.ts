import type { ComplexityMetrics, FileContent } from './types'

// Computes code complexity metrics without a full AST parser.
// Uses line counting, indentation depth, and decision-point keyword density.

const DEBUG_PATTERNS = [
  /console\.(log|debug|info|warn|error)\s*\(/,
  /\bdebugger\b/,
  /\bprint\s*\(/,
  /\bvar_dump\s*\(/,
  /\bdd\s*\(/,
  /binding\.pry/,
  /byebug/,
  /\bputs\s+/,
  /fmt\.Print(?:ln|f)?\s*\(/,
  /System\.out\.print/,
]

const COMPLEXITY_KEYWORDS = /\b(if|else\s+if|elif|for|while|switch|case|catch|rescue|except|&&|\|\||\?\s*[^:])(?!\s*\(?\s*["'`])/g

// Count leading whitespace depth (normalised to tab-stops of 2)
function maxNestingDepth(content: string): number {
  let max = 0
  for (const line of content.split('\n')) {
    const leading = line.match(/^(\s+)/)?.[1] ?? ''
    const spaces = leading.replace(/\t/g, '  ').length
    const depth = Math.floor(spaces / 2)
    if (depth > max) max = depth
  }
  return max
}

// Cyclomatic complexity proxy: count decision-point keywords per file
function complexityScore(content: string): number {
  const matches = content.match(COMPLEXITY_KEYWORDS)
  return matches ? matches.length : 0
}

// Count non-blank lines
function lineCount(content: string): number {
  return content.split('\n').filter(l => l.trim().length > 0).length
}

// Find all debug statement locations
function findDebugStatements(files: FileContent[]): ComplexityMetrics['debugStatements'] {
  const found: ComplexityMetrics['debugStatements'] = []
  for (const file of files) {
    const isTest = /\.(test|spec)\.[jt]sx?$|__tests__|\/tests?\//.test(file.path)
    if (isTest) continue
    const lines = file.content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (DEBUG_PATTERNS.some(p => p.test(line))) {
        found.push({ file: file.path, line: i + 1, text: line.trim().slice(0, 80) })
      }
    }
  }
  return found
}

export function analyseComplexity(files: FileContent[]): ComplexityMetrics {
  const GOD_FILE_THRESHOLD = 500
  const HIGH_NESTING_THRESHOLD = 6
  const HIGH_COMPLEXITY_THRESHOLD = 30

  const godFiles: ComplexityMetrics['godFiles'] = []
  const deepNestingFiles: ComplexityMetrics['deepNestingFiles'] = []
  const highComplexityFiles: ComplexityMetrics['highComplexityFiles'] = []

  let totalLines = 0
  let fileCount = 0

  for (const file of files) {
    const lines = lineCount(file.content)
    const nesting = maxNestingDepth(file.content)
    const complexity = complexityScore(file.content)

    totalLines += lines
    fileCount++

    if (lines >= GOD_FILE_THRESHOLD)
      godFiles.push({ path: file.path, lines })

    if (nesting >= HIGH_NESTING_THRESHOLD)
      deepNestingFiles.push({ path: file.path, maxDepth: nesting })

    if (complexity >= HIGH_COMPLEXITY_THRESHOLD)
      highComplexityFiles.push({ path: file.path, score: complexity })
  }

  // Sort each list worst-first
  godFiles.sort((a, b) => b.lines - a.lines)
  deepNestingFiles.sort((a, b) => b.maxDepth - a.maxDepth)
  highComplexityFiles.sort((a, b) => b.score - a.score)

  return {
    godFiles:           godFiles.slice(0, 15),
    deepNestingFiles:   deepNestingFiles.slice(0, 10),
    highComplexityFiles:highComplexityFiles.slice(0, 15),
    debugStatements:    findDebugStatements(files),
    avgFileLines:       fileCount > 0 ? Math.round(totalLines / fileCount) : 0,
    totalLines,
  }
}
