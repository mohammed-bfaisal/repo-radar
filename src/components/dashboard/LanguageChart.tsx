import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// Donut chart breaking down languages by bytes (GitHub) or file count (local).
// Capped at top 8 entries; remainder collapsed into "Other".

interface Props {
  data: Array<{ name: string; value: number }>
  unit: 'bytes' | 'files'
}

const COLORS = ['#c8f55a', '#5b9cf6', '#4eca8b', '#f5a623', '#f07055', '#b87cf5', '#5af5e8', '#999791']

const Tip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div style={{ background: '#18181d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ color: p.payload.fill || '#c8f55a', fontSize: 12, fontFamily: 'DM Mono, monospace', marginBottom: 2 }}>{p.name}</p>
      <p style={{ color: '#e8e6df', fontSize: 13, fontFamily: 'DM Mono, monospace' }}>{p.payload.pct}%</p>
    </div>
  )
}

export function LanguageChart({ data, unit }: Props) {
  const sorted = [...data].sort((a, b) => b.value - a.value)
  const top7 = sorted.slice(0, 7)
  const rest = sorted.slice(7).reduce((s, d) => s + d.value, 0)
  const chartData = rest > 0 ? [...top7, { name: 'Other', value: rest }] : top7
  const total = chartData.reduce((s, d) => s + d.value, 0)
  const withPct = chartData.map(d => ({ ...d, pct: total > 0 ? Math.round(d.value / total * 100) : 0 }))

  const renderLegend = () => (
    <div className="lang-legend">
      {withPct.map((d, i) => (
        <div key={i} className="lang-legend-item">
          <span className="lang-dot" style={{ background: COLORS[i % COLORS.length] }} />
          <span className="lang-name">{d.name}</span>
          <span className="lang-pct">{d.pct}%</span>
        </div>
      ))}
    </div>
  )

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-title">Languages</span>
        <span className="chart-subtitle">by {unit}</span>
      </div>
      {!withPct.length ? (
        <div className="chart-empty">No language data available</div>
      ) : (
        <div className="lang-chart-inner">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={withPct} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" strokeWidth={0}>
                {withPct.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<Tip />} />
            </PieChart>
          </ResponsiveContainer>
          {renderLegend()}
        </div>
      )}
    </div>
  )
}
