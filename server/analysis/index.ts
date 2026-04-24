import type { FileContent, AnalysisReport } from './types'
import { scanSecurity } from './security'
import { analyseComplexity } from './complexity'
import { analyseSmells } from './smells'
import { analyseBestPractices } from './bestPractices'
import { analyseAdvanced } from './advanced'
import { calculateScores } from './scoring'

// Main analysis orchestrator. Runs all scanners on the provided file contents
// and assembles the final AnalysisReport used by both the dashboard and AI prompt.

export function runAnalysis(files: FileContent[]): AnalysisReport {
  if (!files.length) {
    return emptyReport()
  }

  const security    = scanSecurity(files)
  const complexity  = analyseComplexity(files)
  const smells      = analyseSmells(files)
  const bestPractices = analyseBestPractices(files)
  const advanced    = analyseAdvanced(files)

  const partial = { security, complexity, smells, bestPractices, advanced }
  const scores  = calculateScores(partial)

  const totalLines = files.reduce((sum, f) => sum + f.content.split('\n').length, 0)

  return {
    ...partial,
    scores,
    fileCount:     files.length,
    linesAnalyzed: totalLines,
  }
}

function emptyReport(): AnalysisReport {
  const emptyScore = { score: 0, grade: 'F' as const }
  return {
    security: [], complexity: { godFiles: [], deepNestingFiles: [], highComplexityFiles: [], debugStatements: [], avgFileLines: 0, totalLines: 0 },
    smells: { emptyCatches: [], genericExceptions: [], unhandledPromises: [], magicNumbers: [], commentedCode: [], duplicateBlocks: [] },
    bestPractices: { detectedStack: [], violations: [] },
    advanced: { scaleRisks: [], complianceSignals: [], namingIntentGaps: [], abandonedCode: [] },
    scores: { security: emptyScore, health: emptyScore, practices: emptyScore, overall: emptyScore },
    fileCount: 0, linesAnalyzed: 0,
  }
}

export type { AnalysisReport, FileContent }
