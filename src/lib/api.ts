import { ScanData } from '../types'

export async function scanGithub(
  repo: string,
  onProgress: (step: string) => void,
  onDone: (data: ScanData) => void,
  onError: (msg: string) => void
) {
  const es = new EventSource(`/api/github/scan?repo=${encodeURIComponent(repo)}`)

  es.addEventListener('progress', (e) => {
    const d = JSON.parse(e.data)
    onProgress(d.step)
  })

  es.addEventListener('done', (e) => {
    es.close()
    onDone(JSON.parse(e.data))
  })

  es.addEventListener('scan_error', (e: any) => {
    es.close()
    try { onError(JSON.parse(e.data).error) } catch { onError('Scan failed') }
  })

  es.onerror = (e: any) => {
    if (es.readyState === EventSource.CLOSED) return
    es.close()
    onError('Connection to server lost. Is the backend running?')
  }
}

export async function scanLocal(
  folderPath: string,
  onProgress: (step: string) => void,
  onDone: (data: ScanData) => void,
  onError: (msg: string) => void
) {
  const response = await fetch('/api/local/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderPath })
  })

  if (!response.ok || !response.body) {
    onError('Failed to start local scan')
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('event: progress')) continue
      if (line.startsWith('data: ')) {
        const raw = line.slice(6)
        try {
          const parsed = JSON.parse(raw)
          if (parsed.step) onProgress(parsed.step)
          else if (parsed.error) onError(parsed.error)
          else onDone(parsed)
        } catch {}
      }
    }
  }
}

export async function analyzeWithAI(
  data: ScanData,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void
) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, mode: data.mode })
  })

  if (!response.ok || !response.body) {
    onError('Analysis request failed')
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (raw === '[DONE]') { onDone(); return }
      try {
        const parsed = JSON.parse(raw)
        if (parsed.text) onChunk(parsed.text)
        if (parsed.error) { onError(parsed.error); return }
      } catch {}
    }
  }
}

export async function checkHealth() {
  const res = await fetch('/api/health')
  return res.json()
}
