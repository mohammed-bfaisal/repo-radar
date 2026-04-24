import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'

// Shows issue and PR health as open/closed donuts plus top labels.
// GitHub-only — renders nothing meaningful for local scans.

interface Props {
  issues: any[]
}

const OPEN_COLOR  = '#f07055'
const CLOSED_COLOR = '#4eca8b'
const MERGED_COLOR = '#5b9cf6'

const Tip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#18181d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ color: payload[0].payload.fill, fontSize: 13, fontFamily: 'DM Mono, monospace' }}>
        {payload[0].name}: {payload[0].value}
      </p>
    </div>
  )
}

const LabelTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#18181d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ color: '#c8f55a', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>{payload[0]?.payload?.name}: {payload[0].value}</p>
    </div>
  )
}

export function IssuesChart({ issues }: Props) {
  const rawIssues = issues.filter(i => !i.pull_request)
  const rawPRs    = issues.filter(i =>  i.pull_request)

  const openI    = rawIssues.filter(i => i.state === 'open').length
  const closedI  = rawIssues.filter(i => i.state === 'closed').length
  const openPR   = rawPRs.filter(p => p.state === 'open').length
  const mergedPR = rawPRs.filter(p => p.pull_request?.merged_at).length
  const closedPR = rawPRs.filter(p => p.state === 'closed' && !p.pull_request?.merged_at).length

  // Count labels across all issues
  const labelCounts: Record<string, number> = {}
  for (const issue of issues) {
    for (const lbl of issue.labels || []) {
      labelCounts[lbl.name] = (labelCounts[lbl.name] || 0) + 1
    }
  }
  const topLabels = Object.entries(labelCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  const issueData = [
    { name: 'Open',   value: openI,   fill: OPEN_COLOR },
    { name: 'Closed', value: closedI, fill: CLOSED_COLOR },
  ].filter(d => d.value > 0)

  const prData = [
    { name: 'Open',   value: openPR,   fill: OPEN_COLOR },
    { name: 'Merged', value: mergedPR, fill: MERGED_COLOR },
    { name: 'Closed', value: closedPR, fill: '#5c5a55' },
  ].filter(d => d.value > 0)

  if (!issues.length) return (
    <div className="chart-card"><div className="chart-empty">No issue data available</div></div>
  )

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-title">Issues &amp; PRs</span>
        <span className="chart-subtitle">{rawIssues.length} issues · {rawPRs.length} PRs</span>
      </div>

      <div className="issues-donuts">
        {/* Issues donut */}
        <div className="issues-donut-wrap">
          <div className="chart-sub-label">Issues</div>
          <ResponsiveContainer width={110} height={110}>
            <PieChart>
              <Pie data={issueData} cx="50%" cy="50%" innerRadius={32} outerRadius={50} dataKey="value" strokeWidth={0}>
                {issueData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip content={<Tip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-legend">
            {issueData.map((d, i) => (
              <span key={i} style={{ color: d.fill, fontSize: 11, fontFamily: 'DM Mono, monospace' }}>{d.name} {d.value}</span>
            ))}
          </div>
        </div>

        {/* PRs donut */}
        <div className="issues-donut-wrap">
          <div className="chart-sub-label">Pull Requests</div>
          <ResponsiveContainer width={110} height={110}>
            <PieChart>
              <Pie data={prData} cx="50%" cy="50%" innerRadius={32} outerRadius={50} dataKey="value" strokeWidth={0}>
                {prData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip content={<Tip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-legend">
            {prData.map((d, i) => (
              <span key={i} style={{ color: d.fill, fontSize: 11, fontFamily: 'DM Mono, monospace' }}>{d.name} {d.value}</span>
            ))}
          </div>
        </div>

        {/* Labels bar */}
        {topLabels.length > 0 && (
          <div className="labels-bar-wrap">
            <div className="chart-sub-label">Top Labels</div>
            <ResponsiveContainer width="100%" height={Math.max(100, topLabels.length * 22)}>
              <BarChart data={topLabels} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#999791', fontSize: 10, fontFamily: 'DM Mono, monospace' }} tickLine={false} axisLine={false} />
                <Tooltip content={<LabelTip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="count" fill="#5b9cf6" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
