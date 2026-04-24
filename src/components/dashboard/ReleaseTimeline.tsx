// Vertical dot timeline of GitHub releases — tag, name, date, description.
// GitHub-only; renders a placeholder for local scans.

interface Release { tag: string; date: string; name: string; body?: string }

interface Props { releases: Release[] }

export function ReleaseTimeline({ releases }: Props) {
  const sorted = [...releases].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12)

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-title">Release History</span>
        <span className="chart-subtitle">{releases.length} releases</span>
      </div>
      {!sorted.length ? (
        <div className="chart-empty">No releases found</div>
      ) : (
        <div className="release-list">
          {sorted.map((r, i) => (
            <div key={i} className="release-item">
              <div className="release-dot" />
              <div className="release-content">
                <div className="release-tag">{r.tag}</div>
                {r.name && r.name !== r.tag && (
                  <div className="release-name">{r.name}</div>
                )}
                <div className="release-date">{r.date.slice(0, 10)}</div>
                {r.body && (
                  <div className="release-body">
                    {r.body.split('\n').slice(0, 3).join(' ').slice(0, 140)}{r.body.length > 140 ? '…' : ''}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
