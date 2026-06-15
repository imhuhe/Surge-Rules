(async () => {
  const args = Object.fromEntries(
    ($argument || '').split('&').map(s => s.split('=')).map(([k, v]) => [k, decodeURIComponent(v || '')])
  )

  const url = args.url
  if (!url) {
    $done({ title: args.title || 'Subscription', content: 'No URL configured', icon: args.icon || 'cloud.fill', 'icon-color': '#8E8E93' })
    return
  }

  const [err, resp] = await new Promise(r =>
    $httpClient.get({ url, headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10 }, (e, res) => r([e, res]))
  )

  if (err || resp.status !== 200) {
    $done({ title: args.title || 'Subscription', content: 'Failed to fetch subscription info', icon: args.icon || 'cloud.fill', 'icon-color': '#8E8E93' })
    return
  }

  const key = Object.keys(resp.headers).find(k => k.toLowerCase() === 'subscription-userinfo')
  if (!key) {
    $done({ title: args.title || 'Subscription', content: 'No usage info in response headers', icon: args.icon || 'cloud.fill', 'icon-color': '#8E8E93' })
    return
  }

  const info = Object.fromEntries(
    resp.headers[key].match(/\w+=[\d.eE+]+/g).map(s => s.split('=')).map(([k, v]) => [k, Number(v)])
  )

  function fmt(bytes) {
    if (!bytes) return '0 B'
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
  }

  const used = info.upload + info.download
  const available = info.total - used
  const lines = [`Used: ${fmt(used)} / Available: ${fmt(available)}`]

  if (info.expire) {
    const d = new Date(info.expire * 1000)
    lines.push(`Expires: ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }

  $done({
    title: args.title || 'Subscription',
    content: lines.join('\n'),
    icon: args.icon || 'cloud.fill',
    'icon-color': args.color || '#333333',
  })
})()
