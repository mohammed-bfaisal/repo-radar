export type ScanMode = 'github' | 'local'

// ── Analysis report types (mirrors server/analysis/types.ts) ─────────────────

export interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: string
  rule: string
  message: string
  file: string
  line?: number
  snippet?: string
}

export interface HealthScore { score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F' }

export interface AnalysisReport {
  security: Finding[]
  complexity: {
    godFiles: Array<{ path: string; lines: number }>
    deepNestingFiles: Array<{ path: string; maxDepth: number }>
    highComplexityFiles: Array<{ path: string; score: number }>
    debugStatements: Array<{ file: string; line: number; text: string }>
    avgFileLines: number
    totalLines: number
  }
  smells: {
    emptyCatches: Finding[]
    genericExceptions: Finding[]
    unhandledPromises: Finding[]
    magicNumbers: Finding[]
    commentedCode: Finding[]
    duplicateBlocks: Array<{ file1: string; file2: string; sharedLines: number }>
  }
  bestPractices: {
    detectedStack: string[]
    violations: Finding[]
  }
  advanced: {
    scaleRisks: Finding[]
    complianceSignals: Finding[]
    namingIntentGaps: Finding[]
    abandonedCode: Finding[]
  }
  scores: {
    security: HealthScore
    health: HealthScore
    practices: HealthScore
    overall: HealthScore
  }
  fileCount: number
  linesAnalyzed: number
}

export interface ScanProgress {
  step: string
}

export interface GithubScanData {
  mode: 'github'
  meta: any
  languages: Record<string, number>
  contributors: any[]
  commits: any[]
  branches: any[]
  releases: any[]
  issues: any[]
  tree: any[]
  readme: string
  ciRuns: any[]
  fileContents?: Array<{ path: string; content: string }>
  analysis?: AnalysisReport
}

export interface LocalScanData {
  mode: 'local'
  folderPath: string
  folderName: string
  totalFiles: number
  readFiles: number
  fileContents: Array<{ path: string; content: string }>
  langMap: Record<string, number>
  dirStructure: Record<string, number>
  gitLog: any[]
  gitBranches: string[]
  gitRemote: string
  gitAuthorStats: Record<string, number>
  analysis?: AnalysisReport
}

export type ScanData = GithubScanData | LocalScanData

export type AppState =
  | { phase: 'idle' }
  | { phase: 'scanning'; steps: string[] }
  | { phase: 'analyzing'; report: string }
  | { phase: 'done'; report: string; data: ScanData }
  | { phase: 'error'; message: string }
