(async () => {
  const args = Object.fromEntries(
    (($argument || '')).split('&').map(s => s.split('=')).map(([k, v]) => [k, decodeURIComponent(v || '')])
  )

  const url = args.url
  if (!url) {
    $done({ title: args.title || '订阅', content: '未配置订阅地址', icon: args.icon || 'cloud.fill', 'icon-color': '#8E8E93' })
    return
  }

  const [err, resp] = await new Promise(r =>
    $httpClient.get({ url, timeout: 10 }, (e, res) => r([e, res]))
  )

  if (err || !resp || resp.status !== 200) {
    $done({ title: args.title || '订阅', content: '订阅信息获取失败', icon: args.icon || 'cloud.fill', 'icon-color': '#8E8E93' })
    return
  }

  const key = Object.keys(resp.headers).find(k => k.toLowerCase() === 'subscription-userinfo')
  if (!key) {
    $done({ title: args.title || '订阅', content: '响应头里没有用量信息', icon: args.icon || 'cloud.fill', 'icon-color': '#8E8E93' })
    return
  }

  const info = Object.fromEntries(
    resp.headers[key].match(/\w+=[\d.eE+]+/g).map(s => s.split('=')).map(([k, v]) => [k, Number(v)])
  )

  function fmt(bytes) {
    if (!bytes || bytes <= 0) return '0 B'
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
  }

  const used      = (info.upload || 0) + (info.download || 0)
  const total     = info.total || 0
  const available = total > used ? total - used : 0
  const pct       = total > 0 ? Math.round(used / total * 100) : null

  const lines = [
    `已用 ${fmt(used)}${pct !== null ? `（${pct}%）` : ''}`,
    `可用 ${fmt(available)}`,
  ]

  if (info.expire) {
    const d = new Date(info.expire * 1000)
    const expire = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
    lines.push(`到期 ${expire}${days > 0 ? `（${days} 天）` : ''}`)
  }

  $done({
    title: args.title || '订阅',
    content: lines.join('\n'),
    icon: args.icon || 'cloud.fill',
    'icon-color': args.color || '#333333',
  })
})()
