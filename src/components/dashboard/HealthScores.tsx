import { AnalysisReport } from '../../types'

// A–F grade cards for security, health, practices, and overall.
// Colour-coded so risk jumps out instantly without reading numbers.

interface Props { analysis: AnalysisReport }

const GRADE_COLOR: Record<string, string> = {
  A: '#4eca8b',
  B: '#c8f55a',
  C: '#f5a623',
  D: '#f07055',
  F: '#e53e3e',
}

const LABELS = {
  security:  'Security',
  health:    'Code Health',
  practices: 'Best Practices',
  overall:   'Overall',
}

export function HealthScores({ analysis }: Props) {
  const { scores } = analysis
  const entries = (['overall', 'security', 'health', 'practices'] as const)

  return (
    <div className="chart-card health-scores-card">
      <div className="chart-card-header">
        <span className="chart-title">Health Scores</span>
        <span className="chart-subtitle">{analysis.fileCount} files · {analysis.linesAnalyzed.toLocaleString()} lines analysed</span>
      </div>
      <div className="health-scores-grid">
        {entries.map(key => {
          const { score, grade } = scores[key]
          const color = GRADE_COLOR[grade] ?? '#999791'
          const isOverall = key === 'overall'
          return (
            <div key={key} className={`health-score-card ${isOverall ? 'health-score-overall' : ''}`}>
              <div className="health-grade" style={{ color, borderColor: `${color}40` }}>
                {grade}
              </div>
              <div className="health-score-num" style={{ color }}>{score}</div>
              <div className="health-score-label">{LABELS[key]}</div>
              {/* mini bar */}
              <div className="health-bar-track">
                <div className="health-bar-fill" style={{ width: `${score}%`, background: color }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
