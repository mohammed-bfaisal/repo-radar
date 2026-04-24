import type { Finding, HealthScore, ScoreReport, AnalysisReport } from './types'

// Converts raw findings into A–F health scores.
// Each severity level carries a different deduction weight;
// scores are capped at 0 and rounded to the nearest integer.

const DEDUCTIONS: Record<Finding['severity'], number> = {
  critical: 18,
  high:     10,
  medium:    5,
  low:       2,
  info:      0,
}

function gradeFromScore(score: number): HealthScore['grade'] {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 45) return 'D'
  return 'F'
}

function scoreFromFindings(findings: Finding[], maxDeduction = 100): HealthScore {
  const deduction = findings.reduce((sum, f) => sum + DEDUCTIONS[f.severity], 0)
  const score = Math.max(0, 100 - Math.min(deduction, maxDeduction))
  return { score, grade: gradeFromScore(score) }
}

export function calculateScores(report: Pick<AnalysisReport, 'security' | 'smells' | 'complexity' | 'bestPractices' | 'advanced'>): ScoreReport {
  const security = scoreFromFindings(report.security)

  const healthFindings: Finding[] = [
    ...report.smells.emptyCatches,
    ...report.smells.genericExceptions,
    ...report.smells.unhandledPromises,
    ...report.complexity.godFiles.map(f => ({
      severity: f.lines > 1000 ? 'high' : 'medium',
      category: 'Complexity', rule: 'god-file',
      message: `God file: ${f.lines} lines`, file: f.path,
    } as Finding)),
    ...report.complexity.deepNestingFiles.map(f => ({
      severity: 'medium' as const,
      category: 'Complexity', rule: 'deep-nesting',
      message: `Deep nesting: ${f.maxDepth} levels`, file: f.path,
    })),
  ]
  const health = scoreFromFindings(healthFindings)

  const practices = scoreFromFindings(report.bestPractices.violations)

  // Weighted overall: security 40%, health 35%, practices 25%
  const overallRaw = security.score * 0.40 + health.score * 0.35 + practices.score * 0.25
  const overallScore = Math.round(overallRaw)
  const overall: HealthScore = { score: overallScore, grade: gradeFromScore(overallScore) }

  return { security, health, practices, overall }
}
