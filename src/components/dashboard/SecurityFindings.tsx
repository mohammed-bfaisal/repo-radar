import { useState } from 'react'
import { Finding } from '../../types'

// Grouped, filterable list of security findings with severity badges.
// Critical and high findings are expanded by default; lower severities collapsed.

interface Props { findings: Finding[] }

const SEV_ORDER  = ['critical','high','medium','low','info'] as const
const SEV_COLOR: Record<string, string> = {
  critical: '#e53e3e',
  high:     '#f07055',
  medium:   '#f5a623',
  low:      '#5b9cf6',
  info:     '#999791',
}
const SEV_BG: Record<string, string> = {
  critical: 'rgba(229,62,62,0.10)',
  high:     'rgba(240,112,85,0.10)',
  medium:   'rgba(245,166,35,0.10)',
  low:      'rgba(91,156,246,0.08)',
  info:     'rgba(153,151,145,0.06)',
}

function groupBySeverity(findings: Finding[]) {
  const groups: Record<string, Finding[]> = {}
  for (const f of findings) {
    if (!groups[f.severity]) groups[f.severity] = []
    groups[f.severity].push(f)
  }
  return groups
}

function SeverityBadge({ sev }: { sev: string }) {
  return (
    <span className="sev-badge" style={{ color: SEV_COLOR[sev], background: SEV_BG[sev], borderColor: `${SEV_COLOR[sev]}30` }}>
      {sev}
    </span>
  )
}

function FindingRow({ f }: { f: Finding }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="finding-row" style={{ borderLeftColor: SEV_COLOR[f.severity] }} onClick={() => setOpen(o => !o)}>
      <div className="finding-row-top">
        <SeverityBadge sev={f.severity} />
        <span className="finding-message">{f.message}</span>
        <span className="finding-toggle">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="finding-detail">
          <div className="finding-location">
            <span className="finding-file">{f.file}</span>
            {f.line && <span className="finding-line">:{f.line}</span>}
          </div>
          <div className="finding-rule">{f.category} › {f.rule}</div>
          {f.snippet && <code className="finding-snippet">{f.snippet}</code>}
        </div>
      )}
    </div>
  )
}

export function SecurityFindings({ findings }: Props) {
  const groups = groupBySeverity(findings)
  const total  = findings.length
  const criticals = (groups.critical?.length ?? 0) + (groups.high?.length ?? 0)

  if (!total) {
    return (
      <div className="chart-card">
        <div className="chart-card-header"><span className="chart-title">Security Findings</span></div>
        <div className="chart-empty" style={{ color: '#4eca8b' }}>✓ No security findings detected</div>
      </div>
    )
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-title">Security Findings</span>
        <span className="chart-subtitle">
          {total} total
          {criticals > 0 && <span style={{ color: '#e53e3e', marginLeft: 8 }}>· {criticals} critical/high</span>}
        </span>
      </div>
      <div className="findings-list">
        {SEV_ORDER.filter(s => groups[s]?.length).map(sev => (
          <div key={sev}>
            <div className="findings-group-label" style={{ color: SEV_COLOR[sev] }}>
              {sev.toUpperCase()} ({groups[sev].length})
            </div>
            {groups[sev].map((f, i) => <FindingRow key={i} f={f} />)}
          </div>
        ))}
      </div>
    </div>
  )
}
