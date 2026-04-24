import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ScanData } from '../types'
import { Download, RefreshCw, ChevronRight, BarChart2, FileText } from 'lucide-react'
import { DashboardPanel } from './DashboardPanel'

// When streaming: always shows the markdown report (no tabs yet — data not ready).
// When done: shows Dashboard tab (charts) and AI Report tab (markdown) with shared actions bar.

interface Props {
  report: string
  streaming: boolean
  data?: ScanData
  onReset: () => void
}

function MarkdownReport({ report, streaming }: { report: string; streaming: boolean }) {
  return (
    <div className="report-content">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="report-h1">{children}</h1>,
          h2: ({ children }) => <h2 className="report-h2"><ChevronRight size={16} className="h2-icon" />{children}</h2>,
          h3: ({ children }) => <h3 className="report-h3">{children}</h3>,
          p:  ({ children }) => <p  className="report-p">{children}</p>,
          ul: ({ children }) => <ul className="report-ul">{children}</ul>,
          ol: ({ children }) => <ol className="report-ol">{children}</ol>,
          li: ({ children }) => <li className="report-li">{children}</li>,
          strong: ({ children }) => <strong className="report-strong">{children}</strong>,
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-')
            return isBlock
              ? <code className="report-code-block">{children}</code>
              : <code className="report-code-inline">{children}</code>
          },
          pre:        ({ children }) => <pre className="report-pre">{children}</pre>,
          blockquote: ({ children }) => <blockquote className="report-blockquote">{children}</blockquote>,
          hr: () => <hr className="report-hr" />,
        }}
      >
        {report}
      </ReactMarkdown>
      {streaming && <span className="cursor-blink">▊</span>}
    </div>
  )
}

export function ReportPanel({ report, streaming, data, onReset }: Props) {
  const [tab, setTab] = useState<'dashboard' | 'report'>('dashboard')
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const name = data?.mode === 'github'
      ? (data as any).meta?.full_name?.replace('/', '_') || 'report'
      : (data as any)?.folderName || 'report'
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `reporadar_${name}_${new Date().toISOString().slice(0, 10)}.md`
    a.click(); URL.revokeObjectURL(url)
  }

  const repoName = data?.mode === 'github'
    ? (data as any).meta?.full_name
    : (data as any)?.folderName

  // ── Streaming state: simple sidebar + markdown ─────────────────────────────
  if (streaming) {
    return (
      <div className="report-layout">
        <aside className="report-sidebar">
          <div className="sidebar-header">
            <span className="sidebar-title">{data?.mode === 'github' ? 'GitHub' : 'Local'}</span>
            <span className="sidebar-name">{repoName || '…'}</span>
          </div>
          <div className="sidebar-actions" style={{ marginTop: 'auto' }}>
            <button className="btn-ghost" onClick={onReset}><RefreshCw size={13} /> Cancel</button>
          </div>
        </aside>
        <div className="report-main">
          <div className="streaming-badge"><span className="streaming-dot" /> Analyzing…</div>
          <MarkdownReport report={report} streaming={true} />
        </div>
      </div>
    )
  }

  // ── Done state: tabbed layout ──────────────────────────────────────────────
  return (
    <div className="report-done-wrap">
      {/* top action bar with tabs */}
      <div className="report-topbar">
        <div className="report-topbar-left">
          <div className="topbar-repo-name">{repoName}</div>
          <div className="report-tab-group">
            <button className={`report-tab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>
              <BarChart2 size={14} /> Dashboard
            </button>
            <button className={`report-tab ${tab === 'report' ? 'active' : ''}`} onClick={() => setTab('report')}>
              <FileText size={14} /> AI Report
            </button>
          </div>
        </div>
        <div className="report-topbar-actions">
          {tab === 'report' && (
            <>
              <button className="btn-secondary" onClick={handleCopy}>{copied ? '✓ Copied' : 'Copy MD'}</button>
              <button className="btn-secondary" onClick={handleDownload}><Download size={13} /> Download</button>
            </>
          )}
          <button className="btn-ghost" onClick={onReset}><RefreshCw size={13} /> New scan</button>
        </div>
      </div>

      {/* tab content */}
      {tab === 'dashboard' && data && (
        <div className="dashboard-wrap">
          <DashboardPanel data={data} />
        </div>
      )}

      {tab === 'report' && (
        <div className="report-layout">
          <aside className="report-sidebar">
            <div className="sidebar-header">
              <span className="sidebar-title">{data?.mode === 'github' ? 'GitHub' : 'Local'}</span>
              <span className="sidebar-name">{repoName}</span>
            </div>
            {data && buildStats(data).map((section, i) => (
              <div key={i} className="sidebar-section">
                <div className="sidebar-section-label">{section.label}</div>
                {section.items.map((item, j) => (
                  <div key={j} className="sidebar-stat">
                    <span className="stat-key">{item.key}</span>
                    <span className="stat-val">{item.value}</span>
                  </div>
                ))}
              </div>
            ))}
          </aside>
          <div className="report-main">
            <MarkdownReport report={report} streaming={false} />
          </div>
        </div>
      )}
    </div>
  )
}

function fmtNum(n: number | undefined): string {
  if (n == null) return '—'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function buildStats(data: ScanData) {
  if (data.mode === 'github') {
    const d = data as any
    const totalIssues = d.issues?.filter((i: any) => !i.pull_request).length || 0
    const totalPRs    = d.issues?.filter((i: any) =>  i.pull_request).length || 0
    const langEntries = Object.entries(d.languages || {}).sort(([,a],[,b]) => (b as number)-(a as number)).slice(0,5)
    const totalBytes  = langEntries.reduce((s,[,v]) => s + (v as number), 0)
    return [
      { label: 'Repository', items: [
        { key: 'Stars',      value: fmtNum(d.meta?.stargazers_count) },
        { key: 'Forks',      value: fmtNum(d.meta?.forks_count) },
        { key: 'Open issues',value: fmtNum(d.meta?.open_issues_count) },
        { key: 'License',    value: d.meta?.license?.spdx_id || '—' },
        { key: 'Created',    value: d.meta?.created_at?.slice(0,10) || '—' },
        { key: 'Last push',  value: d.meta?.pushed_at?.slice(0,10) || '—' },
      ]},
      { label: 'Activity', items: [
        { key: 'Commits',      value: fmtNum(d.commits?.length) },
        { key: 'Contributors', value: fmtNum(d.contributors?.length) },
        { key: 'Issues',       value: fmtNum(totalIssues) },
        { key: 'Pull requests',value: fmtNum(totalPRs) },
        { key: 'Releases',     value: fmtNum(d.releases?.length) },
        { key: 'Branches',     value: fmtNum(d.branches?.length) },
      ]},
      { label: 'Languages', items: langEntries.map(([lang, bytes]) => ({
        key: lang, value: totalBytes > 0 ? `${Math.round((bytes as number)/totalBytes*100)}%` : '—'
      }))}
    ]
  }
  const d = data as any
  return [
    { label: 'Project', items: [
      { key: 'Total files',    value: fmtNum(d.totalFiles) },
      { key: 'Files analyzed', value: fmtNum(d.readFiles) },
      { key: 'Branches',       value: fmtNum(d.gitBranches?.length) },
      { key: 'Commits',        value: fmtNum(d.gitLog?.length) },
    ]},
    { label: 'Top contributors', items: Object.entries(d.gitAuthorStats || {})
      .sort(([,a],[,b]) => (b as number)-(a as number)).slice(0,5)
      .map(([name, count]) => ({ key: name.split(' ')[0], value: `${count}c` }))
    },
    { label: 'File types', items: Object.entries(d.langMap || {})
      .sort(([,a],[,b]) => (b as number)-(a as number)).slice(0,5)
      .map(([ext, count]) => ({ key: ext || '(none)', value: String(count) }))
    }
  ]
}
