import { performance } from 'node:perf_hooks'

const target = process.argv[2]
const users = Number(process.argv[3] ?? 300)
if (!target) {
  console.error('Cách dùng: npm run test:load -- https://ten-mien.vn 300')
  process.exit(1)
}

const request = async () => {
  const started = performance.now()
  try {
    const response = await fetch(target, { redirect: 'follow' })
    await response.arrayBuffer()
    return { ok: response.ok, status: response.status, ms: performance.now() - started }
  } catch {
    return { ok: false, status: 0, ms: performance.now() - started }
  }
}

const results = await Promise.all(Array.from({ length: users }, request))
const times = results.map((result) => result.ms).sort((a, b) => a - b)
const percentile = (value) => times[Math.min(times.length - 1, Math.floor(times.length * value))]
const failures = results.filter((result) => !result.ok)
const statuses = results.reduce((counts, result) => {
  const key = String(result.status)
  counts[key] = (counts[key] ?? 0) + 1
  return counts
}, {})

console.log(JSON.stringify({
  target,
  simulatedUsers: users,
  success: users - failures.length,
  failures: failures.length,
  p50Ms: Math.round(percentile(0.5)),
  p95Ms: Math.round(percentile(0.95)),
  maxMs: Math.round(times.at(-1) ?? 0),
  statuses,
}, null, 2))

if (failures.length) process.exitCode = 1
