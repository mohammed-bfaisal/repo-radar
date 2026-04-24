import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

// Groups commit dates by calendar month and renders an area chart.
// Works for both GitHub commits and local git log entries.

interface Props {
  commitDates: string[]
  title?: string
}

interface DataPoint { month: string; commits: number }

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#18181d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ color: '#999791', fontSize: 11, fontFamily: 'DM Mono, monospace', marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#c8f55a', fontSize: 13, fontFamily: 'DM Mono, monospace' }}>{payload[0].value} commits</p>
    </div>
  )
}

function buildMonthlyData(dates: string[]): DataPoint[] {
  // Pre-fill last 18 months so months with 0 commits still appear
  const counts: Record<string, number> = {}
  const now = new Date()
  for (let i = 17; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    counts[key] = 0
  }
  for (const raw of dates) {
    try {
      const d = new Date(raw)
      if (isNaN(d.getTime())) continue
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key in counts) counts[key]++
    } catch { /* skip unparseable */ }
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, commits]) => {
      const [y, m] = key.split('-')
      const label = new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      return { month: label, commits }
    })
}

export function CommitFrequencyChart({ commitDates, title = 'Commit Activity' }: Props) {
  const data = buildMonthlyData(commitDates)
  const hasData = data.some(d => d.commits > 0)

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-title">{title}</span>
        <span className="chart-subtitle">last 18 months</span>
      </div>
      {!hasData ? (
        <div className="chart-empty">No commit history available</div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="commitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#c8f55a" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#c8f55a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#5c5a55', fontSize: 10, fontFamily: 'DM Mono, monospace' }} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={{ fill: '#5c5a55', fontSize: 10, fontFamily: 'DM Mono, monospace' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<Tip />} />
            <Area type="monotone" dataKey="commits" stroke="#c8f55a" strokeWidth={2} fill="url(#commitGrad)" dot={false} activeDot={{ r: 4, fill: '#c8f55a' }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
