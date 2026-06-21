const BLOCKED = new Set(['CN', 'HK', 'MO', 'KP', 'IR', 'CU', 'SY', 'RU', 'BY'])

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
  // chat.openai.com 已 308 跳转到 chatgpt.com，旧脚本要 home===200 故永远误报 Unreachable。
  // 改用 trace 判可达+地区；封锁用 compliance 接口的 unsupported_country 标记。
  const [trace, comp] = await Promise.all([
    get('https://chatgpt.com/cdn-cgi/trace'),
    get('https://api.openai.com/compliance/cookie_requirements'),
  ])

  const cc = (trace?.body?.match(/loc=([A-Z]{2})/) || [])[1] || ''
  const region = cc ? ` | Region: ${flag(cc)} ${cc}` : ''

  if (trace?.status !== 200) {
    $done({ title: 'ChatGPT', content: `Unreachable${region}`, icon: 'xmark.seal.fill', 'icon-color': '#8E8E93' })
    return
  }

  const blocked = /unsupported_country/i.test(comp?.body || '') || (cc && BLOCKED.has(cc))
  if (blocked) {
    $done({ title: 'ChatGPT', content: `Restricted${region}`, icon: 'xmark.seal.fill', 'icon-color': '#8E8E93' })
    return
  }

  $done({ title: 'ChatGPT', content: `Available${region}`, icon: 'sparkles', 'icon-color': '#10A37F' })
})()
