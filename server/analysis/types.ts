// Shared type definitions for the static analysis pre-pass engine.
// Every scanner module imports from here so the shape stays consistent.

export interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: string
  rule: string
  message: string
  file: string
  line?: number
  snippet?: string
}

export interface FileContent {
  path: string
  content: string
}

export interface ComplexityMetrics {
  godFiles: Array<{ path: string; lines: number }>
  deepNestingFiles: Array<{ path: string; maxDepth: number }>
  highComplexityFiles: Array<{ path: string; score: number }>
  debugStatements: Array<{ file: string; line: number; text: string }>
  avgFileLines: number
  totalLines: number
}

export interface SmellsReport {
  emptyCatches: Finding[]
  genericExceptions: Finding[]
  unhandledPromises: Finding[]
  magicNumbers: Finding[]
  commentedCode: Finding[]
  duplicateBlocks: Array<{ file1: string; file2: string; sharedLines: number }>
}

export interface BestPracticesReport {
  detectedStack: string[]
  violations: Finding[]
}

export interface AdvancedReport {
  scaleRisks: Finding[]
  complianceSignals: Finding[]
  namingIntentGaps: Finding[]
  abandonedCode: Finding[]
}

export interface HealthScore {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
}

export interface ScoreReport {
  security: HealthScore
  health: HealthScore
  practices: HealthScore
  overall: HealthScore
}

export interface AnalysisReport {
  security: Finding[]
  complexity: ComplexityMetrics
  smells: SmellsReport
  bestPractices: BestPracticesReport
  advanced: AdvancedReport
  scores: ScoreReport
  fileCount: number
  linesAnalyzed: number
}
