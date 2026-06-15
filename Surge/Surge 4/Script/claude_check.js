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
  const [trace, home] = await Promise.all([
    get('https://claude.ai/cdn-cgi/trace'),
    get('https://claude.ai/'),
  ])

  const cc = (trace?.body?.match(/loc=([A-Z]{2})/) || [])[1] || ''
  const accessible = home?.status === 200
  const region = cc ? ` | Region: ${flag(cc)} ${cc}` : ''

  if (!accessible) {
    $done({ title: 'Claude', content: `Unreachable${region}`, icon: 'xmark.seal.fill', 'icon-color': '#8E8E93' })
    return
  }

  if (cc && BLOCKED.has(cc)) {
    $done({ title: 'Claude', content: `Restricted${region}`, icon: 'xmark.seal.fill', 'icon-color': '#8E8E93' })
    return
  }

  $done({ title: 'Claude', content: `Available${region}`, icon: 'brain.head.profile', 'icon-color': '#D97757' })
})()
