import { AnalysisReport } from '../../types'

// Detected tech stack chips + best-practice violation list grouped by language/framework.
// Violations are coloured by severity and show file + line on hover.

interface Props { bestPractices: AnalysisReport['bestPractices'] }

const STACK_COLORS: Record<string, string> = {
  'React': '#61dafb', 'Next.js': '#ffffff', 'Vue': '#4fc08d', 'Angular': '#dd0031',
  'Svelte': '#ff3e00', 'Express': '#68a063', 'NestJS': '#ea2845', 'FastAPI': '#009688',
  'Django': '#092e20', 'Flask': '#ffffff', 'TypeScript': '#3178c6', 'Python': '#3572a5',
  'Go': '#00add8', 'Rust': '#dea584', 'Java': '#b07219', 'Ruby': '#701516',
  'Prisma': '#5a67d8', 'Docker': '#2496ed', 'GitHub Actions': '#2088ff',
  'Jest/Vitest': '#c21325', 'pytest': '#0a9edc',
}

const SEV_COLOR: Record<string, string> = {
  critical: '#e53e3e', high: '#f07055', medium: '#f5a623', low: '#5b9cf6', info: '#999791',
}

function shortPath(p: string): string {
  const parts = p.split('/')
  return parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : p
}

function groupByCategory(violations: AnalysisReport['bestPractices']['violations']) {
  const groups: Record<string, typeof violations> = {}
  for (const v of violations) {
    const cat = v.category.split('›')[1]?.trim() ?? v.category
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(v)
  }
  return groups
}

export function BestPracticesCheck({ bestPractices }: Props) {
  const { detectedStack, violations } = bestPractices
  const groups = groupByCategory(violations)

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-title">Best Practices</span>
        <span className="chart-subtitle">{violations.length} violations across {detectedStack.length} detected technologies</span>
      </div>

      {/* Stack chips */}
      <div className="stack-chips">
        {detectedStack.map(s => (
          <span key={s} className="stack-chip" style={{ borderColor: `${STACK_COLORS[s] ?? '#5b9cf6'}60`, color: STACK_COLORS[s] ?? '#5b9cf6' }}>
            {s}
          </span>
        ))}
        {!detectedStack.length && <span className="chart-empty" style={{ padding: 0 }}>Stack not detected</span>}
      </div>

      {/* Violations */}
      {Object.keys(groups).length === 0 ? (
        <div className="chart-empty" style={{ color: '#4eca8b' }}>✓ No best-practice violations detected</div>
      ) : (
        <div className="bp-groups">
          {Object.entries(groups).map(([cat, items]) => (
            <div key={cat} className="bp-group">
              <div className="bp-group-label">{cat}</div>
              {items.slice(0, 6).map((v, i) => (
                <div key={i} className="bp-row">
                  <span className="bp-sev" style={{ color: SEV_COLOR[v.severity], background: `${SEV_COLOR[v.severity]}15` }}>{v.severity}</span>
                  <span className="bp-msg">{v.message}</span>
                  <span className="bp-loc">{shortPath(v.file)}{v.line ? `:${v.line}` : ''}</span>
                </div>
              ))}
              {items.length > 6 && <div className="bp-more">+{items.length - 6} more in this category</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
