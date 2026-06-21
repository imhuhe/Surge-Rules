const CF      = (n) => `https://speed.cloudflare.com/__down?bytes=${n}`
const LAT_URL = 'https://cp.cloudflare.com/generate_204'
const LAT_N   = 5

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
let dlMbps  = null
let latDone = false
let dlDone  = false

function tryRender() {
  if (!latDone || !dlDone) return

  const avg = rtts.length ? Math.round(rtts.reduce((a, b) => a + b, 0) / rtts.length) : null
  const min = rtts.length ? Math.min(...rtts) : null
  const max = rtts.length ? Math.max(...rtts) : null
  const jit = rtts.length > 1 ? max - min : null

  const dlLine  = dlMbps !== null
    ? `${speedBar(dlMbps)}  ${fmtSpeed(dlMbps)}`
    : 'Speed test failed (check proxy)'
  const latLine = avg !== null ? `${avg}ms` : '—'
  const jitLine = jit !== null ? `±${jit}ms` : '—'

  const upd = new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  const content = [
    `⬇  ${dlLine}`,
    ``,
    `⚡  Latency ${latLine}    Jitter ${jitLine}`,
    `     Min ${min !== null ? min + 'ms' : '—'}  Max ${max !== null ? max + 'ms' : '—'}  (${rtts.length} samples)`,
    ``,
    `🌐  Cloudflare`,
    `↻  ${upd}`,
  ].join('\n')

  $done({ title: 'Speed Test', content, icon: 'speedometer', 'icon-color': barColor(dlMbps) })
}

;(function dl() {
  // 先拉 1MB 探路、超时 15s：烂节点上也能快速出数不再长挂；
  // 只有探到 >30Mbps 才升级到 10MB 取更准的值。
  const B1 = 1 * 1024 * 1024, t0 = Date.now()
  $httpClient.get({ url: CF(B1), timeout: 15, 'binary-mode': true }, (e) => {
    if (e) { dlDone = true; tryRender(); return }
    const mbps1 = B1 * 8 / ((Date.now() - t0) / 1000) / 1e6

    if (mbps1 > 30) {
      const B10 = 10 * 1024 * 1024, t1 = Date.now()
      $httpClient.get({ url: CF(B10), timeout: 15, 'binary-mode': true }, (e2) => {
        dlMbps = e2 ? mbps1 : B10 * 8 / ((Date.now() - t1) / 1000) / 1e6
        dlDone = true; tryRender()
      })
    } else {
      dlMbps = mbps1
      dlDone = true; tryRender()
    }
  })
})();

(function lat(i) {
  if (i >= LAT_N) { latDone = true; tryRender(); return }
  const t = Date.now()
  $httpClient.head({ url: LAT_URL, timeout: 5 }, e => {
    if (!e) rtts.push(Date.now() - t)
    lat(i + 1)
  })
})(0)
