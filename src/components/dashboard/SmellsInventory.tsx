import { AnalysisReport } from '../../types'

// Summary cards for each code smell category with a count badge and
// expandable worst-offender list.

interface Props { smells: AnalysisReport['smells'] }

interface SmellCardProps {
  title: string
  count: number
  accent: string
  description: string
  examples?: Array<{ label: string; sub?: string }>
}

function SmellCard({ title, count, accent, description, examples }: SmellCardProps) {
  const isClean = count === 0
  return (
    <div className="smell-card" style={{ borderTopColor: isClean ? '#4eca8b' : accent }}>
      <div className="smell-card-top">
        <span className="smell-card-title">{title}</span>
        <span className="smell-count" style={{ color: isClean ? '#4eca8b' : accent, background: isClean ? 'rgba(78,202,139,0.1)' : `${accent}18` }}>
          {isClean ? '✓' : count}
        </span>
      </div>
      <div className="smell-desc">{description}</div>
      {!isClean && examples && examples.length > 0 && (
        <div className="smell-examples">
          {examples.slice(0, 4).map((e, i) => (
            <div key={i} className="smell-example">
              <code className="smell-file">{e.label}</code>
              {e.sub && <span className="smell-sub">{e.sub}</span>}
            </div>
          ))}
          {examples.length > 4 && <div className="smell-more">+{examples.length - 4} more</div>}
        </div>
      )}
    </div>
  )
}

export function SmellsInventory({ smells }: Props) {
  const dupFiles = smells.duplicateBlocks.flatMap(d => [
    { label: d.file1.split('/').pop() ?? d.file1, sub: `↔ ${d.file2.split('/').pop() ?? d.file2}` }
  ])

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-title">Code Smell Inventory</span>
        <span className="chart-subtitle">
          {[smells.emptyCatches.length, smells.genericExceptions.length, smells.unhandledPromises.length,
            smells.magicNumbers.length, smells.commentedCode.length, smells.duplicateBlocks.length]
            .reduce((a, b) => a + b, 0)} total findings
        </span>
      </div>
      <div className="smells-grid">
        <SmellCard
          title="Empty Catches" count={smells.emptyCatches.length}
          accent="#f07055" description="Silent error swallowing — failures disappear invisibly"
          examples={smells.emptyCatches.map(f => ({ label: f.file.split('/').pop() ?? f.file, sub: `line ${f.line}` }))}
        />
        <SmellCard
          title="Generic Exceptions" count={smells.genericExceptions.length}
          accent="#f5a623" description="Catching too broadly masks specific error types"
          examples={smells.genericExceptions.map(f => ({ label: f.file.split('/').pop() ?? f.file, sub: `line ${f.line}` }))}
        />
        <SmellCard
          title="Unhandled Promises" count={smells.unhandledPromises.length}
          accent="#f07055" description=".then() without .catch() — crashes Node 15+ on rejection"
          examples={smells.unhandledPromises.map(f => ({ label: f.file.split('/').pop() ?? f.file, sub: `line ${f.line}` }))}
        />
        <SmellCard
          title="Magic Numbers" count={smells.magicNumbers.length}
          accent="#5b9cf6" description="Unnamed numeric literals — unreadable and error-prone to change"
          examples={smells.magicNumbers.map(f => ({ label: f.snippet ?? '', sub: f.file.split('/').pop() }))}
        />
        <SmellCard
          title="Commented-Out Code" count={smells.commentedCode.length}
          accent="#999791" description="Dead code kept as comments — use git history instead"
          examples={smells.commentedCode.map(f => ({ label: f.file.split('/').pop() ?? f.file, sub: `line ${f.line}` }))}
        />
        <SmellCard
          title="Duplicate Blocks" count={smells.duplicateBlocks.length}
          accent="#b87cf5" description="Copy-paste detected — DRY violation, divergence risk"
          examples={dupFiles}
        />
      </div>
    </div>
  )
}
