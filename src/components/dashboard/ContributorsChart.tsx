import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// Horizontal bar chart of top contributors ranked by commit count.
// Input is pre-normalized so this component is mode-agnostic.

interface Props {
  data: Array<{ name: string; commits: number }>
}

const Tip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#18181d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ color: '#e8e6df', fontSize: 12, fontFamily: 'DM Mono, monospace', marginBottom: 2 }}>{payload[0]?.payload?.name}</p>
      <p style={{ color: '#c8f55a', fontSize: 13, fontFamily: 'DM Mono, monospace' }}>{payload[0].value} commits</p>
    </div>
  )
}

// Truncate long names so bars render cleanly
function shortName(name: string): string {
  return name.length > 16 ? name.slice(0, 15) + '…' : name
}

export function ContributorsChart({ data }: Props) {
  const top = data.slice(0, 10)

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-title">Top Contributors</span>
        <span className="chart-subtitle">by commit count</span>
      </div>
      {!top.length ? (
        <div className="chart-empty">No contributor data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, top.length * 32)}>
          <BarChart data={top} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
            <XAxis type="number" tick={{ fill: '#5c5a55', fontSize: 10, fontFamily: 'DM Mono, monospace' }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#999791', fontSize: 11, fontFamily: 'DM Mono, monospace' }} tickLine={false} axisLine={false} tickFormatter={shortName} />
            <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="commits" radius={[0, 4, 4, 0]}>
              {top.map((_, i) => (
                <Cell key={i} fill={i === 0 ? '#c8f55a' : `rgba(200,245,90,${0.55 - i * 0.04})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
