const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

function flag(cc) {
  if (!cc || cc.length !== 2) return ''
  return [...cc.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))).join('')
}

;(async () => {
  const [err, resp, body] = await new Promise(r =>
    $httpClient.get({ url: 'https://www.youtube.com/premium', headers: { 'User-Agent': UA }, timeout: 10 }, (e, res, b) => r([e, res, b]))
  )

  if (err || !resp || !body) {
    $done({ title: 'YouTube Premium', content: 'Request failed', icon: 'xmark.seal.fill', 'icon-color': '#8E8E93' })
    return
  }

  const cc = (body.match(/"GL"\s*:\s*"([A-Z]{2})"/) || [])[1] || ''
  const region = cc ? ` | Region: ${flag(cc)} ${cc}` : ''
  // 旧脚本找 MONTHLY_PLAN/premiumFeature 等 token，YT 改版后已消失故永远误报 Unavailable。
  // 改为负向判定：页面未提示“本地区不可用”即视为可用。
  const unavailable = /Premium is(?:n't| not) available|not available in your (?:country|region)/i.test(body)

  if (resp.status === 200 && !unavailable) {
    $done({ title: 'YouTube Premium', content: `Available${region}`, icon: 'play.rectangle.fill', 'icon-color': '#FF0000' })
  } else {
    $done({ title: 'YouTube Premium', content: `Unavailable${region}`, icon: 'xmark.seal.fill', 'icon-color': '#8E8E93' })
  }
})()
