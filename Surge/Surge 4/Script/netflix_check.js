const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

function flag(cc) {
  if (!cc || cc.length !== 2) return ''
  return [...cc.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))).join('')
}

;(async () => {
  const [err, resp, body] = await new Promise(r =>
    $httpClient.get({ url: 'https://www.netflix.com/title/80018499', headers: { 'User-Agent': UA }, timeout: 10 }, (e, res, b) => r([e, res, b]))
  )

  if (err) {
    $done({ title: 'Netflix', content: 'Request failed', icon: 'xmark.seal.fill', 'icon-color': '#8E8E93' })
    return
  }

  const cc = (body?.match(/"requestCountry"\s*:\s*"([A-Z]{2})"/) || [])[1] || ''
  const region = cc ? ` | Region: ${flag(cc)} ${cc}` : ''

  if (resp.status === 200) {
    $done({ title: 'Netflix', content: `Full library${region}`, icon: 'popcorn.fill', 'icon-color': '#E50914' })
  } else if (resp.status === 403) {
    $done({ title: 'Netflix', content: `Self-produced only${region}`, icon: 'popcorn.fill', 'icon-color': '#E50914' })
  } else {
    $done({ title: 'Netflix', content: 'Unavailable', icon: 'xmark.seal.fill', 'icon-color': '#8E8E93' })
  }
})()
