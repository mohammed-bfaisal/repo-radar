import { AnalysisReport } from '../../types'

// Displays complexity metrics: god files, deep nesting, high cyclomatic
// complexity, and a ranked table of leftover debug statements.

interface Props { complexity: AnalysisReport['complexity'] }

function MetricTable<T>({ title, items, cols }: {
  title: string
  items: T[]
  cols: Array<{ label: string; get: (item: T) => string | number; accent?: boolean }>
}) {
  if (!items.length) return (
    <div className="complexity-section">
      <div className="complexity-section-title">{title}</div>
      <div className="chart-empty" style={{ padding: '8px 0', textAlign: 'left' }}>None detected</div>
    </div>
  )
  return (
    <div className="complexity-section">
      <div className="complexity-section-title">{title} <span className="complexity-count">({items.length})</span></div>
      <div className="complexity-table">
        {items.slice(0, 8).map((item, i) => (
          <div key={i} className="complexity-row">
            {cols.map((col, j) => (
              <span key={j} className={col.accent ? 'complexity-cell accent' : 'complexity-cell'}>{col.get(item)}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function shortPath(p: string): string {
  const parts = p.split('/')
  return parts.length > 3 ? `…/${parts.slice(-2).join('/')}` : p
}

export function ComplexityMetrics({ complexity }: Props) {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-title">Complexity Metrics</span>
        <span className="chart-subtitle">avg {complexity.avgFileLines} lines/file · {complexity.totalLines.toLocaleString()} total</span>
      </div>
      <div className="complexity-grid">
        <MetricTable
          title="God Files (>500 lines)"
          items={complexity.godFiles}
          cols={[
            { label: 'File', get: f => shortPath(f.path) },
            { label: 'Lines', get: f => f.lines.toLocaleString(), accent: true },
          ]}
        />
        <MetricTable
          title="Deep Nesting"
          items={complexity.deepNestingFiles}
          cols={[
            { label: 'File', get: f => shortPath(f.path) },
            { label: 'Max Depth', get: f => `${f.maxDepth} levels`, accent: true },
          ]}
        />
        <MetricTable
          title="High Cyclomatic Complexity"
          items={complexity.highComplexityFiles}
          cols={[
            { label: 'File', get: f => shortPath(f.path) },
            { label: 'Score', get: f => f.score, accent: true },
          ]}
        />
        <MetricTable
          title="Debug Statements in Production"
          items={complexity.debugStatements}
          cols={[
            { label: 'File', get: d => shortPath(d.file) },
            { label: 'Line', get: d => d.line, accent: true },
            { label: 'Code', get: d => d.text.slice(0, 40) },
          ]}
        />
      </div>
    </div>
  )
}
