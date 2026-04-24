import { AnalysisReport } from '../../types'

// Four advanced-insight panels: scale risks, compliance signals,
// naming/intent gaps, and abandoned/dead code — all in one card.

interface Props { advanced: AnalysisReport['advanced'] }

const SEV_COLOR: Record<string, string> = {
  critical: '#e53e3e', high: '#f07055', medium: '#f5a623', low: '#5b9cf6', info: '#999791',
}

function shortPath(p: string): string {
  if (p === 'app-wide') return p
  const parts = p.split('/')
  return parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : p
}

interface SectionProps {
  title: string
  emoji: string
  items: AnalysisReport['advanced']['scaleRisks']
  emptyMsg: string
  accent: string
}

function InsightSection({ title, emoji, items, emptyMsg, accent }: SectionProps) {
  return (
    <div className="insight-section">
      <div className="insight-section-header">
        <span className="insight-emoji">{emoji}</span>
        <span className="insight-title">{title}</span>
        <span className="insight-count" style={{ color: items.length ? accent : '#4eca8b' }}>
          {items.length || '✓'}
        </span>
      </div>
      {!items.length ? (
        <div className="insight-empty">{emptyMsg}</div>
      ) : (
        <div className="insight-rows">
          {items.slice(0, 6).map((item, i) => (
            <div key={i} className="insight-row">
              <span className="insight-sev" style={{ color: SEV_COLOR[item.severity], background: `${SEV_COLOR[item.severity]}15` }}>
                {item.severity}
              </span>
              <div className="insight-row-body">
                <div className="insight-msg">{item.message}</div>
                <div className="insight-loc">{shortPath(item.file)}{item.line ? `:${item.line}` : ''}</div>
              </div>
            </div>
          ))}
          {items.length > 6 && <div className="insight-more">+{items.length - 6} more</div>}
        </div>
      )}
    </div>
  )
}

export function AdvancedInsights({ advanced }: Props) {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-title">Advanced Insights</span>
        <span className="chart-subtitle">
          {advanced.scaleRisks.length + advanced.complianceSignals.length +
           advanced.namingIntentGaps.length + advanced.abandonedCode.length} total signals
        </span>
      </div>
      <div className="insights-grid">
        <InsightSection
          title="Scale Risks" emoji="⚡" accent="#f5a623"
          items={advanced.scaleRisks}
          emptyMsg="No scale risk patterns detected"
        />
        <InsightSection
          title="Compliance Signals" emoji="🔒" accent="#f07055"
          items={advanced.complianceSignals}
          emptyMsg="No compliance surface signals detected"
        />
        <InsightSection
          title="Naming / Intent Gaps" emoji="🏷" accent="#5b9cf6"
          items={advanced.namingIntentGaps}
          emptyMsg="No naming/intent gaps detected"
        />
        <InsightSection
          title="Dead / Abandoned Code" emoji="👻" accent="#999791"
          items={advanced.abandonedCode}
          emptyMsg="No unused exports detected"
        />
      </div>
    </div>
  )
}
