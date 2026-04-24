import type { Finding, FileContent } from './types'

// Pattern-based security scanner covering 9 vulnerability categories.
// Each category runs independently so findings stay clearly attributed.

type Sev = Finding['severity']
interface Rule { pattern: RegExp; rule: string; message: string; severity: Sev }

// ── 1. Hardcoded Secrets ─────────────────────────────────────────────────────

const SECRET_RULES: Rule[] = [
  { pattern: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']{4,}["']/i,               rule: 'hardcoded-password',    message: 'Hardcoded password literal',                                          severity: 'critical' },
  { pattern: /(?:api_?key|apikey)\s*[:=]\s*["'][^"']{8,}["']/i,                   rule: 'hardcoded-api-key',     message: 'Hardcoded API key value',                                             severity: 'critical' },
  { pattern: /(?:secret|private_?key)\s*[:=]\s*["'][^"']{8,}["']/i,               rule: 'hardcoded-secret',      message: 'Hardcoded secret value',                                              severity: 'critical' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/,                                                rule: 'github-pat',            message: 'GitHub personal access token found in source',                        severity: 'critical' },
  { pattern: /sk-[a-zA-Z0-9]{48}/,                                                 rule: 'openai-key',            message: 'OpenAI API key pattern found in source',                              severity: 'critical' },
  { pattern: /AKIA[0-9A-Z]{16}/,                                                   rule: 'aws-access-key-id',     message: 'AWS access key ID found in source',                                   severity: 'critical' },
  { pattern: /(?:aws_secret_access_key)\s*[:=]\s*["'][^"']+["']/i,                 rule: 'aws-secret-key',        message: 'AWS secret access key hardcoded',                                     severity: 'critical' },
  { pattern: /BEGIN\s+(?:RSA|EC|DSA|OPENSSH)\s+PRIVATE\s+KEY/,                    rule: 'private-key-in-source', message: 'Private key embedded in source file',                                  severity: 'critical' },
  { pattern: /(?:connectionString|connection_string)\s*=\s*["'][^"']*password/i,   rule: 'db-credentials',        message: 'Database connection string with embedded credentials',                 severity: 'critical' },
  { pattern: /(?:token)\s*[:=]\s*["'][a-zA-Z0-9_\-\.]{32,}["']/i,                 rule: 'hardcoded-token',        message: 'Hardcoded token value (long string assigned to "token")',              severity: 'high'     },
  { pattern: /sk-or-v1-[a-zA-Z0-9]{60,}/,                                          rule: 'openrouter-key',        message: 'OpenRouter API key found in source',                                   severity: 'critical' },
]

// ── 2. SQL Injection ─────────────────────────────────────────────────────────

const SQL_RULES: Rule[] = [
  { pattern: /`\s*SELECT\s.+\$\{/i,                                                rule: 'sqli-template-literal', message: 'SQL built with template literal interpolation — use parameterised queries', severity: 'critical' },
  { pattern: /"SELECT\s.+"\s*\+\s*(?:req|user|input|params|body|query)/i,          rule: 'sqli-concat',           message: 'SQL built by string concatenation with user input',                    severity: 'critical' },
  { pattern: /f["']SELECT\s.+\{(?:request|req|user|input)/i,                       rule: 'sqli-fstring',          message: 'SQL f-string with user variable — use parameterised queries',          severity: 'critical' },
  { pattern: /\.query\(\s*["']SELECT.+["']\s*\+/,                                  rule: 'sqli-query-concat',     message: '.query() called with concatenated SQL string',                        severity: 'high'     },
  { pattern: /execute\(\s*f["']/,                                                   rule: 'sqli-execute-fstring',  message: 'execute() called with f-string — injection risk if values are external', severity: 'high'  },
  { pattern: /knex\.raw\(\s*[`"'].+\$\{/,                                          rule: 'sqli-knex-raw',         message: 'knex.raw() with interpolation — pass bindings array instead',         severity: 'high'     },
]

// ── 3. XSS Vectors ──────────────────────────────────────────────────────────

const XSS_RULES: Rule[] = [
  { pattern: /dangerouslySetInnerHTML\s*=\s*\{\{?\s*__html/,                       rule: 'xss-react-dangerous-html', message: 'dangerouslySetInnerHTML used — ensure content is sanitised',       severity: 'high'     },
  { pattern: /innerHTML\s*=\s*(?!["'`])/,                                          rule: 'xss-innerhtml-variable',   message: 'innerHTML set to a variable — XSS risk if value is user-controlled', severity: 'high'  },
  { pattern: /document\.write\(/,                                                   rule: 'xss-document-write',       message: 'document.write() is a classic XSS entry point',                   severity: 'medium'   },
  { pattern: /eval\(\s*(?!['"`])/,                                                  rule: 'xss-eval-variable',        message: 'eval() called with a variable — code injection risk',              severity: 'critical' },
  { pattern: /v-html\s*=/,                                                          rule: 'xss-vue-v-html',           message: 'Vue v-html renders raw HTML — XSS if content is user-supplied',   severity: 'high'     },
  { pattern: /bypassSecurityTrustHtml/,                                             rule: 'xss-angular-bypass',       message: 'Angular bypassSecurityTrustHtml overrides sanitisation',           severity: 'high'     },
  { pattern: /setHTMLUnsafe\(/,                                                     rule: 'xss-set-html-unsafe',      message: 'setHTMLUnsafe() used — sanitise with DOMPurify if content is external', severity: 'high' },
]

// ── 4. Command Injection ─────────────────────────────────────────────────────

const CMD_RULES: Rule[] = [
  { pattern: /subprocess\.(run|call|Popen)\([^)]*shell\s*=\s*True/,                rule: 'cmdi-python-shell-true',  message: 'subprocess with shell=True — inject via crafted string',           severity: 'critical' },
  { pattern: /os\.system\(\s*(?!['"`])/,                                            rule: 'cmdi-python-os-system',   message: 'os.system() with variable argument — command injection risk',      severity: 'critical' },
  { pattern: /child_process\.\w+\(\s*(?:req|user|input|params)/,                   rule: 'cmdi-node-user-input',    message: 'child_process called directly with request/user data',              severity: 'critical' },
  { pattern: /execSync\(\s*`[^`]*\$\{(?:req|user|body|query|params)/,              rule: 'cmdi-exec-sync-template', message: 'execSync() with user data in template string',                      severity: 'critical' },
  { pattern: /\.exec\(\s*`[^`]*\$\{(?:req|user|body|query|params)/,                rule: 'cmdi-exec-template',      message: 'exec() with user data in template string',                         severity: 'critical' },
]

// ── 5. Weak Cryptography ─────────────────────────────────────────────────────

const CRYPTO_RULES: Rule[] = [
  { pattern: /createHash\(['"]md5['"]\)/,                                           rule: 'crypto-weak-md5',         message: 'MD5 is broken — use SHA-256 or bcrypt/argon2 for passwords',       severity: 'high'     },
  { pattern: /createHash\(['"]sha1['"]\)/,                                          rule: 'crypto-weak-sha1',        message: 'SHA-1 is deprecated for security — use SHA-256+',                  severity: 'medium'   },
  { pattern: /hashlib\.(md5|sha1)\(/,                                               rule: 'crypto-python-weak-hash', message: 'MD5/SHA-1 detected — insecure for passwords or digital signatures', severity: 'high'    },
  { pattern: /Math\.random\(\).{0,40}(?:token|key|secret|nonce|salt|csrf)/i,       rule: 'crypto-insecure-random',  message: 'Math.random() used for security value — use crypto.randomBytes()', severity: 'critical' },
  { pattern: /random\.random\(\).{0,40}(?:token|key|secret|nonce)/i,               rule: 'crypto-python-random',    message: 'random.random() for secret — use the secrets module instead',      severity: 'critical' },
  { pattern: /(?:DES|RC4|Blowfish|3DES)\b/,                                         rule: 'crypto-weak-cipher',      message: 'Weak cipher algorithm — use AES-256-GCM or ChaCha20-Poly1305',    severity: 'high'     },
]

// ── 6. JWT Misuse ────────────────────────────────────────────────────────────

const JWT_RULES: Rule[] = [
  { pattern: /algorithms?\s*:\s*\[['"]none['"]\]/,                                  rule: 'jwt-algorithm-none',      message: 'JWT algorithm "none" disables signature verification entirely',     severity: 'critical' },
  { pattern: /verify\s*:\s*false/,                                                   rule: 'jwt-verify-disabled',     message: 'JWT signature verification explicitly disabled',                   severity: 'critical' },
  { pattern: /ignoreExpiration\s*:\s*true/,                                          rule: 'jwt-ignore-expiration',   message: 'JWT expiry check disabled — tokens never expire',                  severity: 'high'     },
  { pattern: /jwt\.decode\((?!.*verify)/,                                            rule: 'jwt-decode-no-verify',    message: 'jwt.decode() without verifying signature — use jwt.verify()',     severity: 'high'     },
  { pattern: /secret\s*[:=]\s*["'](?:secret|password|changeme|todo|fixme)["']/i,   rule: 'jwt-weak-secret',         message: 'JWT signed with a weak/placeholder secret',                        severity: 'critical' },
]

// ── 7. CORS Misconfiguration ─────────────────────────────────────────────────

const CORS_RULES: Rule[] = [
  { pattern: /origin\s*:\s*['"]?\*['"]?/,                                           rule: 'cors-wildcard',           message: 'CORS allows all origins — restrict in production',                 severity: 'medium'   },
  { pattern: /Access-Control-Allow-Origin['":\s]+\*/,                               rule: 'cors-header-wildcard',    message: 'CORS wildcard header set — pair with credentials is dangerous',   severity: 'medium'   },
  { pattern: /credentials\s*:\s*true[\s\S]{0,200}origin\s*:\s*\*|origin\s*:\s*\*[\s\S]{0,200}credentials\s*:\s*true/, rule: 'cors-creds-wildcard', message: 'CORS wildcard + credentials=true — allows full cross-origin auth attacks', severity: 'critical' },
]

// ── 8. Missing Rate-Limit Signals ────────────────────────────────────────────

const RATE_LIMIT_RULES: Rule[] = [
  { pattern: /(?:router|app)\.post\(\s*['"]\/(?:login|auth|signin|register|password|forgot|reset)['"]/i, rule: 'ratelimit-auth-endpoint', message: 'Auth endpoint — confirm rate-limiting middleware wraps this route', severity: 'medium' },
  { pattern: /(?:router|app)\.post\(\s*['"]\/api\/(?:login|auth|token)['"]/i,       rule: 'ratelimit-api-auth',      message: 'API auth endpoint — ensure rate limiting is applied',               severity: 'medium'   },
]

// ── 9. Secrets-in-VCS Signals ────────────────────────────────────────────────

const VCS_RULES: Rule[] = [
  { pattern: /BEGIN\s+CERTIFICATE/,                                                  rule: 'vcs-certificate',         message: 'Certificate in source — verify it should live in the repo',        severity: 'low'      },
  { pattern: /(?:database_url|DATABASE_URL)\s*=\s*postgres(?:ql)?:\/\/\w+:\w+@/i,  rule: 'vcs-db-url',              message: 'Database URL with credentials hardcoded in source',                severity: 'critical' },
]

// ── Scanner ──────────────────────────────────────────────────────────────────

function scanWithRules(file: FileContent, rules: Rule[], category: string, skipTests = false): Finding[] {
  const findings: Finding[] = []
  const isTest = /\.(test|spec)\.[jt]sx?$|__tests__|\/tests?\//.test(file.path)
  if (skipTests && isTest) return findings

  const lines = file.content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const isCommentLine = /^(?:\/\/|#|\/\*|\*)\s/.test(trimmed)

    for (const rule of rules) {
      if (!rule.pattern.test(line)) continue
      // Skip pattern matches inside comments for secret rules
      if (isCommentLine && category.includes('Secret')) continue
      findings.push({
        severity: rule.severity, category, rule: rule.rule,
        message: rule.message,
        file: file.path, line: i + 1,
        snippet: trimmed.slice(0, 120),
      })
      break // one finding per line per category
    }
  }
  return findings
}

export function scanSecurity(files: FileContent[]): Finding[] {
  const all: Finding[] = []
  for (const f of files) {
    all.push(...scanWithRules(f, SECRET_RULES,     'Security › Secrets',          true))
    all.push(...scanWithRules(f, SQL_RULES,        'Security › SQL Injection',    false))
    all.push(...scanWithRules(f, XSS_RULES,        'Security › XSS',              false))
    all.push(...scanWithRules(f, CMD_RULES,        'Security › Command Injection', false))
    all.push(...scanWithRules(f, CRYPTO_RULES,     'Security › Weak Crypto',      false))
    all.push(...scanWithRules(f, JWT_RULES,        'Security › JWT',              false))
    all.push(...scanWithRules(f, CORS_RULES,       'Security › CORS',             false))
    all.push(...scanWithRules(f, RATE_LIMIT_RULES, 'Security › Rate Limiting',    false))
    all.push(...scanWithRules(f, VCS_RULES,        'Security › VCS Leak',         false))
  }
  // De-duplicate: same file + line + rule
  const seen = new Set<string>()
  return all.filter(f => {
    const key = `${f.file}:${f.line}:${f.rule}`
    return seen.has(key) ? false : (seen.add(key), true)
  })
}
