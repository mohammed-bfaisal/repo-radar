export type ScanMode = 'github' | 'local'

export interface ScanProgress {
  step: string
}

export interface GithubScanData {
  mode: 'github'
  meta: any
  languages: Record<string, number>
  contributors: any[]
  commits: any[]
  branches: any[]
  releases: any[]
  issues: any[]
  tree: any[]
  readme: string
  ciRuns: any[]
}

export interface LocalScanData {
  mode: 'local'
  folderPath: string
  folderName: string
  totalFiles: number
  readFiles: number
  fileContents: Array<{ path: string; content: string }>
  langMap: Record<string, number>
  dirStructure: Record<string, number>
  gitLog: any[]
  gitBranches: string[]
  gitRemote: string
  gitAuthorStats: Record<string, number>
}

export type ScanData = GithubScanData | LocalScanData

export type AppState =
  | { phase: 'idle' }
  | { phase: 'scanning'; steps: string[] }
  | { phase: 'analyzing'; report: string }
  | { phase: 'done'; report: string; data: ScanData }
  | { phase: 'error'; message: string }
