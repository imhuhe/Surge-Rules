// 面板：测速（多流，中文）
// macOS 每流 8MB，iOS 每流 5MB；4 条并发流取合计吞吐

const LAT_URL = 'http://www.gstatic.com/generate_204'
const LAT_N   = 5
const STREAMS = 4
const BYTES   = ((typeof $environment !== 'undefined' && $environment.system === 'macOS') ? 8 : 5) * 1024 * 1024

const CF = (n) => `https://speed.cloudflare.com/__down?bytes=${n}&r=${Math.random().toString(36).slice(2, 10)}`

function speedBar(mbps) {
  const steps  = [1, 5, 10, 25, 50, 100, 200, 500, 1000]
  const filled = Math.min(steps.filter(s => mbps >= s).length + 1, 10)
  return '█'.repeat(filled) + '░'.repeat(10 - filled)
}

function fmtSpeed(mbps) {
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(2)} Gbps`
  if (mbps >= 1)    return `${mbps.toFixed(1)} Mbps`
  return `${(mbps * 1000).toFixed(0)} Kbps`
}

function barColor(mbps) {
  if (mbps === null) return '#8E8E93'
  if (mbps >= 100)   return '#34C759'
  if (mbps >= 20)    return '#FF9500'
  return '#FF6B6B'
}

const rtts = []
let dlMbps = null
let dlNote = ''
let latDone = false
let dlDone = false

function tryRender() {
  if (!latDone || !dlDone) return

  const sorted = [...rtts].sort((a, b) => a - b)
  const med  = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
  const min  = sorted.length ? sorted[0] : null
  const max  = sorted.length ? sorted[sorted.length - 1] : null
  const jit  = sorted.length > 1 ? max - min : null

  const dlLine = dlMbps !== null ? `${speedBar(dlMbps)}  ${fmtSpeed(dlMbps)}` : '测速失败，检查代理'
  const upd = new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  const content = [
    `⬇ ${dlLine}`,
    ``,
    `⚡ 中位 ${med !== null ? med + 'ms' : '—'} · 波动 ${jit !== null ? '±' + jit + 'ms' : '—'}`,
    `   ${min !== null ? min + '–' + max + 'ms' : '—'} · ${rtts.length} 次采样`,
    ``,
    `🌐 Cloudflare ×${STREAMS} · ${(BYTES / 1048576).toFixed(0)}MB/流${dlNote}`,
    `↻ ${upd}`,
  ].join('\n')

  $done({ title: '测速', content, icon: 'speedometer', 'icon-color': barColor(dlMbps) })
}

;(function dl() {
  const t0 = Date.now()
  let done = 0, bytes = 0, failed = 0

  for (let i = 0; i < STREAMS; i++) {
    $httpClient.get({ url: CF(BYTES), timeout: 25, 'binary-mode': true }, (e) => {
      if (e) failed++
      else bytes += BYTES

      if (++done === STREAMS) {
        const secs = (Date.now() - t0) / 1000
        if (bytes > 0 && secs > 0) {
          dlMbps = bytes * 8 / secs / 1e6
          dlNote = failed ? ` · ${failed} 条失败` : ''
        } else {
          dlNote = ' · 全部失败'
        }
        dlDone = true
        tryRender()
      }
    })
  }
})()

;(function lat(i) {
  if (i > LAT_N) { latDone = true; tryRender(); return }
  const t = Date.now()
  $httpClient.head({ url: LAT_URL, timeout: 5 }, e => {
    if (!e && i > 0) rtts.push(Date.now() - t)
    lat(i + 1)
  })
})(0)
