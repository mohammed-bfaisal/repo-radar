import { Github, FolderOpen, Zap } from 'lucide-react'

interface Props {
  onGithubScan: (repo: string) => void
  onLocalScan: (path: string) => void
  health: any
  mode: 'github' | 'local'
  onModeChange: (mode: 'github' | 'local') => void
  githubInput: string
  onGithubInputChange: (v: string) => void
  localInput: string
  onLocalInputChange: (v: string) => void
}

export function InputPanel({ onGithubScan, onLocalScan, health, mode, onModeChange, githubInput, onGithubInputChange, localInput, onLocalInputChange }: Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'github' && githubInput.trim()) {
      onGithubScan(githubInput.trim())
    } else if (mode === 'local' && localInput.trim()) {
      onLocalScan(localInput.trim())
    }
  }

  const examples = [
    'facebook/react',
    'vercel/next.js',
    'vuejs/core',
    'microsoft/vscode',
  ]

  return (
    <div className="input-panel">
      <div className="input-panel-hero">
        <h1>What codebase do you want to understand?</h1>
        <p>Drop a GitHub repo or a local folder path. RepoRadar scans everything — commits, PRs, issues, file structure — and generates a deep intelligence report.</p>
      </div>

      <div className="mode-tabs">
        <button
          className={`mode-tab ${mode === 'github' ? 'active' : ''}`}
          onClick={() => onModeChange('github')}
        >
          <Github size={16} />
          GitHub Repo
        </button>
        <button
          className={`mode-tab ${mode === 'local' ? 'active' : ''}`}
          onClick={() => onModeChange('local')}
        >
          <FolderOpen size={16} />
          Local Folder
        </button>
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        {mode === 'github' ? (
          <div className="input-group">
            <label>GitHub repository</label>
            <div className="input-row">
              <input
                type="text"
                value={githubInput}
                onChange={e => onGithubInputChange(e.target.value)}
                placeholder="owner/repo  or  https://github.com/owner/repo"
                className="text-input"
                autoFocus={mode === 'github'}
              />
              <button type="submit" className="btn-primary" disabled={!githubInput.trim()}>
                <Zap size={15} />
                Analyze
              </button>
            </div>
            <div className="examples">
              <span>Try:</span>
              {examples.map(ex => (
                <button
                  key={ex}
                  type="button"
                  className="example-chip"
                  onClick={() => onGithubInputChange(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="input-group">
            <label>Absolute path to local folder</label>
            <div className="input-row">
              <input
                type="text"
                value={localInput}
                onChange={e => onLocalInputChange(e.target.value)}
                placeholder="/home/you/projects/my-app  or  C:\Users\you\projects\my-app"
                className="text-input"
                autoFocus={mode === 'local'}
              />
              <button type="submit" className="btn-primary" disabled={!localInput.trim()}>
                <Zap size={15} />
                Analyze
              </button>
            </div>
            <p className="input-hint">
              The backend server reads this path directly. Git history is extracted automatically if the folder is a git repo.
            </p>
          </div>
        )}
      </form>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-dot dot-blue" />
          <div>
            <strong>Full tree scan</strong>
            <p>Reads every source file, maps architecture, detects patterns</p>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-dot dot-green" />
          <div>
            <strong>Git archaeology</strong>
            <p>Commits, authors, velocity, pivots — the full evolution story</p>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-dot dot-amber" />
          <div>
            <strong>Issues & PRs</strong>
            <p>Surfaces recurring pain points, team dynamics, workflow patterns</p>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-dot dot-coral" />
          <div>
            <strong>AI-powered insights</strong>
            <p>Opinionated analysis via {health?.model || 'OpenRouter'} — not generic summaries</p>
          </div>
        </div>
      </div>
    </div>
  )
}
