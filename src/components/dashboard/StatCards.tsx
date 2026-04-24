import { ScanData } from '../../types'

// Renders the top-row KPI cards — numbers pulled from raw scan data.
// GitHub and local modes produce different card sets.

interface Card { label: string; value: string; sub?: string }

function fmtNum(n: number | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function buildCards(data: ScanData): Card[] {
  if (data.mode === 'github') {
    const d = data as any
    const openIssues = d.issues?.filter((i: any) => !i.pull_request && i.state === 'open').length ?? 0
    const openPRs   = d.issues?.filter((i: any) =>  i.pull_request && i.state === 'open').length ?? 0
    return [
      { label: 'Stars',        value: fmtNum(d.meta?.stargazers_count), sub: `${fmtNum(d.meta?.forks_count)} forks` },
      { label: 'Commits',      value: fmtNum(d.commits?.length),        sub: `${fmtNum(d.contributors?.length)} contributors` },
      { label: 'Open Issues',  value: fmtNum(openIssues),               sub: `${fmtNum(openPRs)} open PRs` },
      { label: 'Releases',     value: fmtNum(d.releases?.length),       sub: `${fmtNum(d.branches?.length)} branches` },
      { label: 'Watchers',     value: fmtNum(d.meta?.watchers_count),   sub: d.meta?.license?.spdx_id || 'No license' },
      { label: 'Languages',    value: fmtNum(Object.keys(d.languages || {}).length), sub: d.meta?.topics?.slice(0, 2).join(', ') || '' },
    ]
  }
  const d = data as any
  const authors = Object.keys(d.gitAuthorStats || {}).length
  return [
    { label: 'Total Files',   value: fmtNum(d.totalFiles),     sub: `${fmtNum(d.readFiles)} analyzed` },
    { label: 'Commits',       value: fmtNum(d.gitLog?.length), sub: `${fmtNum(authors)} contributor${authors !== 1 ? 's' : ''}` },
    { label: 'Branches',      value: fmtNum(d.gitBranches?.length), sub: d.gitRemote ? 'has remote' : 'local only' },
    { label: 'File Types',    value: fmtNum(Object.keys(d.langMap || {}).length), sub: 'distinct extensions' },
    { label: 'Top Directory', value: Object.entries(d.dirStructure || {}).sort(([,a],[,b]) => (b as number)-(a as number))[0]?.[0] || '—', sub: 'most files' },
    { label: 'Git Remote',    value: d.gitRemote ? 'Connected' : 'None', sub: d.gitRemote ? d.gitRemote.replace(/.*github\.com\//, '') : 'local repo' },
  ]
}

export function StatCards({ data }: { data: ScanData }) {
  const cards = buildCards(data)
  return (
    <div className="stat-cards-grid">
      {cards.map((c, i) => (
        <div key={i} className="stat-card">
          <div className="stat-card-value">{c.value}</div>
          <div className="stat-card-label">{c.label}</div>
          {c.sub && <div className="stat-card-sub">{c.sub}</div>}
        </div>
      ))}
    </div>
  )
}
