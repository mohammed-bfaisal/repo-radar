interface Props {
  steps: string[]
  label: string
}

export function ProgressPanel({ steps, label }: Props) {
  return (
    <div className="progress-panel">
      <div className="progress-spinner">
        <div className="spinner-ring" />
        <span className="spinner-icon">◉</span>
      </div>
      <h2>{label}</h2>
      <div className="progress-steps">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`progress-step ${i === steps.length - 1 ? 'active' : 'done'}`}
          >
            <span className="step-dot">{i === steps.length - 1 ? '›' : '✓'}</span>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
