// GitHub-style commit calendar heatmap — last 52 weeks rendered as a CSS grid.
// Pure HTML/CSS, no recharts needed for this one.

interface Props {
  commitDates: string[]
}

// Maps commit count to one of five accent-intensity levels
function intensityStyle(count: number): React.CSSProperties {
  if (count === 0)  return { background: 'rgba(255,255,255,0.04)' }
  if (count <= 2)  return { background: 'rgba(200,245,90,0.18)' }
  if (count <= 5)  return { background: 'rgba(200,245,90,0.38)' }
  if (count <= 10) return { background: 'rgba(200,245,90,0.62)' }
  return { background: '#c8f55a' }
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function CommitHeatmap({ commitDates }: Props) {
  // Count commits per day
  const counts: Record<string, number> = {}
  for (const raw of commitDates) {
    try {
      const key = new Date(raw).toISOString().slice(0, 10)
      counts[key] = (counts[key] || 0) + 1
    } catch { /* skip */ }
  }

  // Build 52-week grid starting from the most recent Sunday
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - 364)
  // Roll back to the Sunday of that week
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const cells: Array<{ date: string; count: number; month: number; dayOfWeek: number }> = []
  const cur = new Date(startDate)
  while (cur <= today) {
    const key = cur.toISOString().slice(0, 10)
    cells.push({ date: key, count: counts[key] || 0, month: cur.getMonth(), dayOfWeek: cur.getDay() })
    cur.setDate(cur.getDate() + 1)
  }

  // Build month label positions (column index where each month starts)
  const monthLabels: Array<{ label: string; col: number }> = []
  cells.forEach((c, i) => {
    const col = Math.floor(i / 7)
    if (c.dayOfWeek === 0) {
      const prev = cells[i - 1]
      if (!prev || prev.month !== c.month) {
        monthLabels.push({ label: MONTHS[c.month], col })
      }
    }
  })

  const totalCommits = Object.values(counts).reduce((s, v) => s + v, 0)

  return (
    <div className="chart-card heatmap-card">
      <div className="chart-card-header">
        <span className="chart-title">Commit Calendar</span>
        <span className="chart-subtitle">{totalCommits.toLocaleString()} commits in the last year</span>
      </div>
      {totalCommits === 0 ? (
        <div className="chart-empty">No commit history in the last year</div>
      ) : (
        <div className="heatmap-wrap">
          {/* month labels row */}
          <div className="heatmap-month-row">
            <div style={{ width: 28 }} />
            <div className="heatmap-months">
              {monthLabels.map((m, i) => (
                <span key={i} className="heatmap-month-label" style={{ gridColumn: m.col + 1 }}>{m.label}</span>
              ))}
            </div>
          </div>
          {/* day labels + grid */}
          <div className="heatmap-body">
            <div className="heatmap-day-labels">
              {DAYS.map((d, i) => (
                <span key={i} className="heatmap-day-label" style={{ visibility: i % 2 === 1 ? 'visible' : 'hidden' }}>{d}</span>
              ))}
            </div>
            <div className="heatmap-grid">
              {cells.map((c, i) => (
                <div
                  key={i}
                  className="heatmap-cell"
                  style={intensityStyle(c.count)}
                  title={`${c.date}: ${c.count} commit${c.count !== 1 ? 's' : ''}`}
                />
              ))}
            </div>
          </div>
          {/* legend */}
          <div className="heatmap-legend">
            <span>Less</span>
            {[0,1,3,6,11].map(v => (
              <div key={v} className="heatmap-cell" style={intensityStyle(v)} />
            ))}
            <span>More</span>
          </div>
        </div>
      )}
    </div>
  )
}
