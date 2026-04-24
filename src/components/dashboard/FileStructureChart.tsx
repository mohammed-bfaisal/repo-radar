import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// Horizontal bar chart of top-level directory file counts.
// Clearer than a treemap for this dataset size and dark theme.

interface Props {
  data: Array<{ name: string; count: number }>
}

const COLORS = ['#5b9cf6','#4eca8b','#f5a623','#f07055','#b87cf5','#5af5e8','#c8f55a','#999791']

const Tip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#18181d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ color: '#e8e6df', fontSize: 12, fontFamily: 'DM Mono, monospace', marginBottom: 2 }}>{payload[0]?.payload?.name}/</p>
      <p style={{ color: '#c8f55a', fontSize: 13, fontFamily: 'DM Mono, monospace' }}>{payload[0].value} files</p>
    </div>
  )
}

function shortName(name: string): string {
  return name.length > 14 ? name.slice(0, 13) + '…' : name
}

export function FileStructureChart({ data }: Props) {
  const top = [...data].sort((a, b) => b.count - a.count).slice(0, 12)

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-title">File Structure</span>
        <span className="chart-subtitle">files per top-level directory</span>
      </div>
      {!top.length ? (
        <div className="chart-empty">No file structure data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, top.length * 28)}>
          <BarChart data={top} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
            <XAxis type="number" tick={{ fill: '#5c5a55', fontSize: 10, fontFamily: 'DM Mono, monospace' }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#999791', fontSize: 11, fontFamily: 'DM Mono, monospace' }} tickLine={false} axisLine={false} tickFormatter={shortName} />
            <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {top.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
