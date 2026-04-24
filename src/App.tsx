import { useState, useEffect } from 'react'
import { scanGithub, scanLocal, analyzeWithAI, checkHealth } from './lib/api'
import { ScanData, AppState } from './types'
import { InputPanel } from './components/InputPanel'
import { ProgressPanel } from './components/ProgressPanel'
import { ReportPanel } from './components/ReportPanel'
import { Header } from './components/Header'
import './index.css'

export default function App() {
  const [state, setState] = useState<AppState>({ phase: 'idle' })
  const [health, setHealth] = useState<any>(null)
  const [scanMode, setScanMode] = useState<'github' | 'local'>('github')
  const [githubInput, setGithubInput] = useState('')
  const [localInput, setLocalInput] = useState('')

  useEffect(() => {
    checkHealth()
      .then(setHealth)
      .catch(() => setHealth({ ok: false, error: 'Backend not reachable — run npm run dev' }))
  }, [])

  const handleGithubScan = async (repo: string) => {
    setState({ phase: 'scanning', steps: ['Connecting to GitHub...'] })

    scanGithub(
      repo,
      (step) => setState(s => s.phase === 'scanning' ? { phase: 'scanning', steps: [...s.steps, step] } : s),
      (data) => startAnalysis(data),
      (message) => setState({ phase: 'error', message })
    )
  }

  const handleLocalScan = async (folderPath: string) => {
    setState({ phase: 'scanning', steps: ['Starting local scan...'] })

    try {
      await scanLocal(
        folderPath,
        (step) => setState(s => s.phase === 'scanning' ? { phase: 'scanning', steps: [...s.steps, step] } : s),
        (data) => startAnalysis(data),
        (message) => setState({ phase: 'error', message })
      )
    } catch (err: any) {
      setState({ phase: 'error', message: err.message })
    }
  }

  const startAnalysis = async (data: ScanData) => {
    setState({ phase: 'analyzing', report: '' })

    await analyzeWithAI(
      data,
      (chunk) => setState(s => s.phase === 'analyzing' ? { phase: 'analyzing', report: s.report + chunk } : s),
      () => setState(s => s.phase === 'analyzing' ? { phase: 'done', report: s.report, data } : s),
      (message) => setState({ phase: 'error', message })
    )
  }

  const handleReset = () => setState({ phase: 'idle' })

  return (
    <div className="app">
      <Header />

      {health && !health.ok && (
        <div className="health-warning">
          ⚠ {health.error || 'Backend offline'}
        </div>
      )}

      {health && health.ok && !health.hasKey && (
        <div className="health-warning">
          ⚠ OPENROUTER_API_KEY not set in .env — analysis will fail. Copy .env.example → .env and add your key.
        </div>
      )}

      <main className="main">
        <div style={{ display: state.phase === 'idle' ? 'block' : 'none' }}>
          <InputPanel
            onGithubScan={handleGithubScan}
            onLocalScan={handleLocalScan}
            health={health}
            mode={scanMode}
            onModeChange={setScanMode}
            githubInput={githubInput}
            onGithubInputChange={setGithubInput}
            localInput={localInput}
            onLocalInputChange={setLocalInput}
          />
        </div>

        {state.phase === 'scanning' && (
          <ProgressPanel steps={state.steps} label="Scanning..." />
        )}

        {state.phase === 'analyzing' && (
          <ReportPanel
            report={state.report}
            streaming={true}
            onReset={handleReset}
          />
        )}

        {state.phase === 'done' && (
          <ReportPanel
            report={state.report}
            streaming={false}
            data={state.data}
            onReset={handleReset}
          />
        )}

        {state.phase === 'error' && (
          <div className="error-panel">
            <div className="error-icon">✕</div>
            <h2>Something went wrong</h2>
            <p>{state.message}</p>
            <button onClick={handleReset} className="btn-primary">Start over</button>
          </div>
        )}
      </main>
    </div>
  )
}
