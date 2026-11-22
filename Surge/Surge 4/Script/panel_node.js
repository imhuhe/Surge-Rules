// 面板：节点信息（中文，分组留白）
// argument=group=<组名>

const STORE_KEY = 'surge_node_panel_v3'
const LAT_URL   = 'http://www.gstatic.com/generate_204'

function getParams(str) {
  if (!str || typeof str !== 'string') return {}
  try {
    return Object.fromEntries(str.split('&').map(s => s.split('=')).map(([k, v]) => [k, decodeURIComponent(v || '')]))
  } catch (e) { return {} }
}

function httpAPI(path, method = 'GET', body = null) {
  return new Promise(resolve => $httpAPI(method, path, body, resolve))
}

function httpGet(url, timeout = 8) {
  return new Promise(resolve => $httpClient.get({ url, timeout }, (e, _, d) => resolve(e ? null : d)))
}

function httpHead(url, timeout = 5) {
  return new Promise(resolve => {
    const t = Date.now()
    $httpClient.head({ url, timeout }, e => resolve(e ? null : Date.now() - t))
  })
}

function dur(ms) {
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24)
  if (d > 0) return `${d} 天`
  if (h > 0) return `${h} 小时`
  if (m > 0) return `${m} 分钟`
  return '不到 1 分钟'
}

function tzOffHours(tz) {
  try {
    const d = new Date()
    const tzMs  = new Date(d.toLocaleString('en-US', { timeZone: tz })).getTime()
    const utcMs = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()
    return Math.round((tzMs - utcMs) / 1800000) / 2
  } catch (e) { return null }
}

function netLabel() {
  if (typeof $network === 'undefined') return ''
  const ssid = $network.wifi && $network.wifi.ssid
  if (ssid) return ssid
  if ($network['cellular-data']) return '蜂窝'
  return ''
}

;(async () => {
  try {
    const watchdog = setTimeout(() => {
      try { $done({ title: '节点信息', content: '超时，稍后重试', icon: 'wifi.exclamationmark', 'icon-color': '#CB1B45' }) } catch (e) {}
    }, 12000)

    const rawArg    = (typeof $argument === 'undefined' || $argument === null) ? '' : String($argument)
    const params    = getParams(rawArg)
    const groupName = params.group || 'Proxy'

    let nodeName = 'DIRECT'
    try {
      const allGroups  = await httpAPI('/v1/policy_groups')
      const groupNames = Object.keys(allGroups || {})
      let cur = (await httpAPI('/v1/policy_groups/select?group_name=' + encodeURIComponent(groupName))).policy
      let guard = 0
      while (groupNames.includes(cur) && guard++ < 5) {
        cur = (await httpAPI('/v1/policy_groups/select?group_name=' + encodeURIComponent(cur))).policy
      }
      nodeName = cur || 'DIRECT'
    } catch (e) {}

    const [ipRaw, r1, r2, r3] = await Promise.all([
      httpGet('http://ip-api.com/json/?fields=status,country,city,timezone,as,proxy,hosting,mobile,query&lang=zh-CN', 8),
      httpHead(LAT_URL, 5), httpHead(LAT_URL, 5), httpHead(LAT_URL, 5),
    ])

    let info = null
    try { info = JSON.parse(ipRaw) } catch (e) {}

    if (!info || info.status !== 'success') {
      clearTimeout(watchdog)
      $done({ title: '节点信息', content: 'IP 查询失败，检查代理', icon: 'wifi.exclamationmark', 'icon-color': '#CB1B45' })
      return
    }

    let st = {}
    try { st = JSON.parse($persistentStore.read(STORE_KEY) || '{}') } catch (e) {}
    const changed = !!st.ip && st.ip !== info.query
    if (!st.ip || changed) {
      st = { ip: info.query, since: Date.now(), chg: changed ? (st.chg || 0) + 1 : 0 }
      $persistentStore.write(JSON.stringify(st), STORE_KEY)
    }

    const rtts = [r1, r2, r3].filter(r => r !== null)
    const spread = rtts.length > 1 ? Math.max(...rtts) - Math.min(...rtts) : 0
    const lat = rtts.length
      ? `${Math.round(rtts.reduce((a, b) => a + b, 0) / rtts.length)}ms${spread > 0 ? ' ±' + spread : ''}`
      : '—'

    const geo   = info.city && info.city !== info.country ? `${info.country} · ${info.city}` : info.country
    const asNum = (info.as || '').split(' ')[0] || ''
    const kind  = info.hosting ? '机房' : (info.mobile ? '移动' : '住宅')

    const pOff = tzOffHours(info.timezone)
    const lOff = tzOffHours(Intl.DateTimeFormat().resolvedOptions().timeZone)
    const diff = (pOff !== null && lOff !== null)
      ? (pOff === lOff ? '同本机' : `${pOff > lOff ? '快' : '慢'} ${Math.abs(pOff - lOff)} 小时`)
      : ''
    const hhmm = new Date().toLocaleString('en-US', { timeZone: info.timezone, hour: '2-digit', minute: '2-digit', hour12: false })
    const utc  = pOff !== null ? `UTC${pOff >= 0 ? '+' : ''}${pOff}` : ''

    const chgNote = st.chg > 0 ? ` · 换过 ${st.chg} 次` : ''
    const net     = netLabel()

    const lines = [
      `🟢 ${nodeName} · ${groupName}`,
      `🌏 ${geo} · ${asNum} · ${kind}`,
      `🖥 ${info.query}${chgNote}`,
      `📶 ${lat} · 同 IP ${dur(Date.now() - (st.since || Date.now()))}`,
      `🕐 ${utc} ${hhmm}${diff ? ' · ' + diff : ''}${net ? ' · ' + net : ''}`,
    ]

    clearTimeout(watchdog)
    $done({
      title: '节点信息',
      content: lines.join('\n'),
      icon: 'network',
      'icon-color': '#5B8AF5',
    })
  } catch (err) {
    try { $done({ title: '节点信息', content: '脚本错误：' + (err && err.message ? err.message : String(err)), icon: 'exclamationmark.triangle', 'icon-color': '#CB1B45' }) } catch (e) {}
  }
})()
