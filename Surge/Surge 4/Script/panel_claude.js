// 面板：Claude 可用性与出口地区（中文）
// 通过 claude.ai 的 Cloudflare trace 读实际出口国家

const BLOCKED = new Set(['CN', 'HK', 'MO', 'KP', 'IR', 'CU', 'SY', 'RU', 'BY', 'VE', 'LY', 'SD'])

function flag(cc) {
  if (!cc || cc.length !== 2) return ''
  return [...cc.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))).join('')
}

function get(url) {
  return new Promise(r =>
    $httpClient.get({ url, headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8 }, (e, res, b) => r(e ? null : { status: res.status, body: b }))
  )
}

;(async () => {
  const trace = await get('https://claude.ai/cdn-cgi/trace')

  const cc = (trace?.body?.match(/loc=([A-Z]{2})/) || [])[1] || ''
  const region = cc ? ` · ${flag(cc)} ${cc}` : ''

  if (trace?.status !== 200) {
    $done({ title: 'Claude', content: `⚠️ 无法连接${region}`, icon: 'xmark.seal.fill', 'icon-color': '#8E8E93' })
    return
  }

  if (cc && BLOCKED.has(cc)) {
    $done({ title: 'Claude', content: `⛔ 受限${region}`, icon: 'xmark.seal.fill', 'icon-color': '#8E8E93' })
    return
  }

  $done({ title: 'Claude', content: `✅ 可用${region}`, icon: 'brain.head.profile', 'icon-color': '#D97757' })
})()
