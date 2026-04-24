import { ScanData, GithubScanData, LocalScanData } from '../types'
import { StatCards } from './dashboard/StatCards'
import { CommitFrequencyChart } from './dashboard/CommitFrequencyChart'
import { ContributorsChart } from './dashboard/ContributorsChart'
import { LanguageChart } from './dashboard/LanguageChart'
import { IssuesChart } from './dashboard/IssuesChart'
import { CommitHeatmap } from './dashboard/CommitHeatmap'
import { FileStructureChart } from './dashboard/FileStructureChart'
import { ReleaseTimeline } from './dashboard/ReleaseTimeline'

// Central data normalizer + layout assembler for all chart components.
// Each chart receives pre-shaped props so individual components stay mode-agnostic.

interface Props { data: ScanData }

function extractCommitDates(data: ScanData): string[] {
  if (data.mode === 'github') {
    return (data as GithubScanData).commits
      .map((c: any) => c.commit?.author?.date)
      .filter(Boolean)
  }
  return (data as LocalScanData).gitLog
    .map((c: any) => c.date)
    .filter(Boolean)
}

function extractContributors(data: ScanData): Array<{ name: string; commits: number }> {
  if (data.mode === 'github') {
    return (data as GithubScanData).contributors
      .map((c: any) => ({ name: c.login, commits: c.contributions }))
  }
  return Object.entries((data as LocalScanData).gitAuthorStats)
    .map(([name, commits]) => ({ name, commits: commits as number }))
    .sort((a, b) => b.commits - a.commits)
}

function extractLanguages(data: ScanData): { items: Array<{ name: string; value: number }>; unit: 'bytes' | 'files' } {
  if (data.mode === 'github') {
    const items = Object.entries((data as GithubScanData).languages)
      .map(([name, value]) => ({ name, value: value as number }))
    return { items, unit: 'bytes' }
  }
  const items = Object.entries((data as LocalScanData).langMap)
    .map(([name, value]) => ({ name: name || '(no ext)', value: value as number }))
  return { items, unit: 'files' }
}

function extractFileStructure(data: ScanData): Array<{ name: string; count: number }> {
  const map = data.mode === 'github'
    ? buildGithubDirStructure((data as GithubScanData).tree)
    : (data as LocalScanData).dirStructure
  return Object.entries(map).map(([name, count]) => ({ name, count: count as number }))
}

function buildGithubDirStructure(tree: any[]): Record<string, number> {
  const dirs: Record<string, number> = {}
  for (const item of tree) {
    if (item.type !== 'blob') continue
    const parts = (item.path as string).split('/')
    const top = parts.length > 1 ? parts[0] : '(root)'
    dirs[top] = (dirs[top] || 0) + 1
  }
  return dirs
}

function extractReleases(data: ScanData) {
  if (data.mode !== 'github') return []
  return (data as GithubScanData).releases.map((r: any) => ({
    tag: r.tag_name,
    date: r.published_at || r.created_at || '',
    name: r.name || '',
    body: r.body || '',
  }))
}

export function DashboardPanel({ data }: Props) {
  const commitDates   = extractCommitDates(data)
  const contributors  = extractContributors(data)
  const { items: langItems, unit: langUnit } = extractLanguages(data)
  const fileStructure = extractFileStructure(data)
  const releases      = extractReleases(data)
  const isGithub      = data.mode === 'github'

  return (
    <div className="dashboard">
      {/* Row 1: KPI stat cards */}
      <StatCards data={data} />

      {/* Row 2: commit frequency (wide) + language donut */}
      <div className="dash-row dash-row-2-1">
        <CommitFrequencyChart commitDates={commitDates} />
        <LanguageChart data={langItems} unit={langUnit} />
      </div>

      {/* Row 3: contributors + issues/PRs (GitHub) or file structure (local) */}
      <div className="dash-row dash-row-1-1">
        <ContributorsChart data={contributors} />
        {isGithub
          ? <IssuesChart issues={(data as GithubScanData).issues} />
          : <FileStructureChart data={fileStructure} />
        }
      </div>

      {/* Row 4: commit heatmap full width */}
      <CommitHeatmap commitDates={commitDates} />

      {/* Row 5: file structure (GitHub) + release timeline  |  local: nothing extra */}
      {isGithub && (
        <div className="dash-row dash-row-1-1">
          <FileStructureChart data={fileStructure} />
          <ReleaseTimeline releases={releases} />
        </div>
      )}
    </div>
  )
}
