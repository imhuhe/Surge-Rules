const STORE_KEY = 'surge_node_panel_v1'
const LAT_URL   = 'https://cp.cloudflare.com/generate_204'

function getParams(str) {
  if (!str) return {}
  try {
    return Object.fromEntries(
      str.split('&').map(s => s.split('=')).map(([k, v]) => [k, decodeURIComponent(v || '')])
    )
  } catch(e) { return {} }
}

function httpAPI(path, method = 'GET', body = null) {
  return new Promise(resolve => $httpAPI(method, path, body, resolve))
}

function httpGet(url, timeout = 8) {
  return new Promise(resolve => {
    $httpClient.get({ url, timeout }, (e, _, d) => resolve(e ? null : d))
  })
}

function httpHead(url, timeout = 5) {
  return new Promise(resolve => {
    const t = Date.now()
    $httpClient.head({ url, timeout }, e => resolve(e ? null : Date.now() - t))
  })
}

function flag(cc) {
  if (!cc || cc.length !== 2) return '🌐'
  const B = 0x1F1E6 - 65
  return [...cc.toUpperCase()].map(c => String.fromCodePoint(B + c.charCodeAt(0))).join('')
}

const SUB = {
  JP: 'East Asia', KR: 'East Asia', CN: 'East Asia', TW: 'East Asia', HK: 'East Asia', MO: 'East Asia',
  SG: 'Southeast Asia', MY: 'Southeast Asia', TH: 'Southeast Asia', VN: 'Southeast Asia',
  PH: 'Southeast Asia', ID: 'Southeast Asia', MM: 'Southeast Asia', KH: 'Southeast Asia',
  IN: 'South Asia', PK: 'South Asia', BD: 'South Asia', LK: 'South Asia',
  TR: 'West Asia', AE: 'West Asia', SA: 'West Asia', IL: 'West Asia',
  KW: 'West Asia', QA: 'West Asia', BH: 'West Asia',
  RU: 'Eastern Europe', UA: 'Eastern Europe', PL: 'Eastern Europe', RO: 'Eastern Europe',
  DE: 'Western Europe', FR: 'Western Europe', NL: 'Western Europe', BE: 'Western Europe',
  GB: 'Western Europe', IE: 'Western Europe',
  AT: 'Central Europe', CH: 'Central Europe', CZ: 'Central Europe',
  ES: 'Southern Europe', PT: 'Southern Europe', IT: 'Southern Europe', GR: 'Southern Europe',
  SE: 'Northern Europe', NO: 'Northern Europe', FI: 'Northern Europe', DK: 'Northern Europe',
  US: 'North America', CA: 'North America', MX: 'North America',
  BR: 'South America', AR: 'South America', CL: 'South America', CO: 'South America',
  AU: 'Oceania', NZ: 'Oceania',
  ZA: 'Africa', NG: 'Africa', EG: 'Africa', KE: 'Africa',
}

const CARRIERS = {
  '460-00': 'China Mobile', '460-02': 'China Mobile', '460-04': 'China Mobile',
  '460-07': 'China Mobile', '460-08': 'China Mobile',
  '460-01': 'China Unicom', '460-06': 'China Unicom', '460-09': 'China Unicom',
  '460-03': 'China Telecom', '460-05': 'China Telecom', '460-11': 'China Telecom',
  '460-15': 'China Broadnet', '460-20': 'China Railcom',
  '454-00': 'CSL', '454-02': 'CSL', '454-10': 'CSL',
  '454-03': '3HK', '454-04': '3HK', '454-05': '3HK',
  '454-09': 'CMHK', '454-12': 'CMHK',
  '454-07': 'Unicom HK',
  '466-92': 'Chunghwa Telecom', '466-11': 'Chunghwa Telecom',
  '466-01': 'FarEasTone', '466-97': 'Taiwan Mobile',
  '440-10': 'NTT Docomo', '440-20': 'SoftBank', '440-11': 'Rakuten',
  '440-50': 'au', '440-51': 'au', '440-52': 'au',
  '440-00': 'Y!mobile',
  '450-05': 'SKT', '450-03': 'SKT',
  '450-02': 'KT', '450-04': 'KT',
  '450-06': 'LG U+', '450-10': 'LG U+',
  '525-01': 'SingTel', '525-05': 'StarHub', '525-03': 'M1',
  '310-260': 'T-Mobile', '311-490': 'T-Mobile',
  '310-410': 'AT&T', '310-030': 'AT&T',
  '311-480': 'Verizon', '310-004': 'Verizon',
  '234-30': 'EE', '234-10': 'O2', '234-20': '3', '234-15': 'Vodafone',
}

const RADIO_GEN = {
  'NR': '5G', 'NRNSA': '5G', 'LTE': '4G', 'eHRPD': '3.9G',
  'HSUPA': '3.75G', 'HSDPA': '3.5G', 'WCDMA': '3G',
  'EDGE': '2.75G', 'GPRS': '2.5G', 'CDMA1x': '2.5G',
}

function subRegion(cc) { return SUB[cc] || 'Other' }

function dur(ms) {
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24)
  if (d > 0) return `${d}d ${h % 24}h`
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m`
  return 'just now'
}

function tzOffHours(tz) {
  try {
    const d = new Date()
    const tzMs  = new Date(d.toLocaleString('en-US', { timeZone: tz })).getTime()
    const utcMs = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()
    return Math.round((tzMs - utcMs) / 1800000) / 2
  } catch(e) { return null }
}

function fmtTZDiff(pOff, lOff) {
  const d = pOff - lOff
  if (d === 0) return 'same as local'
  return `${d > 0 ? 'ahead' : 'behind'} by ${Math.abs(d)}h`
}

function getLocalNetInfo() {
  const ssid    = $network.wifi?.ssid
  const cell    = $network['cellular-data']
  const localV4 = $network.v4?.primaryAddress || ''
  const localV6 = $network.v6?.primaryAddress || ''

  let netLabel = 'Unknown'
  let icon     = 'network'
  let iconColor = '#5B8AF5'
  let localIP  = localV4 || ''

  if (ssid) {
    netLabel  = `Wi-Fi · ${ssid}`
    icon      = 'wifi'
    iconColor = '#005CAF'
  } else if (cell) {
    const carrier = CARRIERS[cell.carrier] || 'Cellular'
    const gen     = RADIO_GEN[cell.radio] || cell.radio || ''
    netLabel  = [carrier, gen].filter(Boolean).join(' · ')
    icon      = 'simcard'
    iconColor = '#F9BF45'
  }

  if (localV4 && localV6) localIP = `${localV4} / ${localV6.slice(0, 18)}…`

  return { netLabel, localIP, icon, iconColor }
}

;(async () => {
  const NOW       = Date.now()
  const params    = getParams($argument || '')
  const groupName = params.group || 'Proxy'

  let nodeName = 'DIRECT'
  try {
    const allGroups  = await httpAPI('/v1/policy_groups')
    const groupNames = Object.keys(allGroups)
    let cur = (await httpAPI('/v1/policy_groups/select?group_name=' + encodeURIComponent(groupName))).policy
    while (groupNames.includes(cur)) {
      cur = (await httpAPI('/v1/policy_groups/select?group_name=' + encodeURIComponent(cur))).policy
    }
    nodeName = cur || 'DIRECT'
  } catch(e) {}

  const { netLabel, localIP, icon, iconColor } = getLocalNetInfo()

  const [ipRaw, v6Raw, dnsRaw, rtt1, rtt2, rtt3] = await Promise.all([
    httpGet('http://ip-api.com/json/?fields=status,country,countryCode,city,timezone,isp,org,as,asname,proxy,hosting,mobile,query', 8),
    httpGet('https://api6.ipify.org?format=json', 5),
    httpGet('http://edns.ip-api.com/json', 5),
    httpHead(LAT_URL, 5),
    httpHead(LAT_URL, 5),
    httpHead(LAT_URL, 5),
  ])

  let ipInfo = null
  try { ipInfo = JSON.parse(ipRaw) } catch(e) {}
  let ipv6Addr = null
  try { ipv6Addr = JSON.parse(v6Raw)?.ip || null } catch(e) {}
  let dnsInfo = null
  try { dnsInfo = JSON.parse(dnsRaw) } catch(e) {}
  const rtts = [rtt1, rtt2, rtt3].filter(r => r !== null)

  if (!ipInfo || ipInfo.status !== 'success') {
    $done({ title: 'Node Info', content: 'IP query failed, check network', icon: 'wifi.exclamationmark', 'icon-color': '#CB1B45' })
    return
  }

  let st = {}
  try { st = JSON.parse($persistentStore.read(STORE_KEY) || '{}') } catch(e) {}
  const ipChanged = !!st.ip && st.ip !== ipInfo.query
  if (!st.ip || ipChanged) {
    st = { ip: ipInfo.query, since: NOW, chg: ipChanged ? (st.chg || 0) + 1 : 0 }
    $persistentStore.write(JSON.stringify(st), STORE_KEY)
  }
  const stable   = dur(NOW - (st.since || NOW))
  const chgNote  = ipChanged ? '  ← Changed' : ''
  const chgLine  = st.chg > 0 ? ` · changed ${st.chg}×` : ''

  const f   = flag(ipInfo.countryCode)
  const geo = `${f}  ${subRegion(ipInfo.countryCode)} · ${ipInfo.country} · ${ipInfo.city}`

  const asNum  = (ipInfo.as || '').split(' ')[0] || ''
  const asName = ipInfo.asname || ''

  const pOff      = tzOffHours(ipInfo.timezone)
  const lOff      = tzOffHours(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const utcLabel  = pOff !== null ? `UTC${pOff >= 0 ? '+' : ''}${pOff}` : ipInfo.timezone
  const wd        = new Date().toLocaleString('en-US', { timeZone: ipInfo.timezone, weekday: 'short' })
  const hhmm      = new Date().toLocaleString('en-US', { timeZone: ipInfo.timezone, hour: '2-digit', minute: '2-digit', hour12: false })
  const diffLabel = (pOff !== null && lOff !== null) ? fmtTZDiff(pOff, lOff) : ''

  const risk = [
    ipInfo.hosting ? 'DC⚡' : 'DC✓',
    ipInfo.proxy   ? 'Proxy⚡' : 'Proxy✓',
    ipInfo.mobile  ? 'Mobile✓' : 'Mobile✗',
  ].join('  ')

  let dnsStr = '—'
  if (dnsInfo?.dns?.ip) {
    dnsStr = dnsInfo.dns.ip
    if (dnsInfo.dns.geo) dnsStr += `  ${dnsInfo.dns.geo}`
  }

  let latStr = '—'
  if (rtts.length) {
    const avg = Math.round(rtts.reduce((a, b) => a + b, 0) / rtts.length)
    const jit = Math.max(...rtts) - Math.min(...rtts)
    latStr = `${avg}ms${jit > 0 ? ' ±' + jit : ''}`
  }

  const v6  = ipv6Addr ? `${ipv6Addr}  ✓` : 'IPv6 unavailable'
  const upd = new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  const lines = [
    `🟢 ${nodeName}`,
    `   ${groupName}`,
    ``,
    `🌐  ${ipInfo.query}${chgNote}`,
    `     ${v6}`,
    ``,
    geo,
    `🏢  ${ipInfo.isp}`,
    `     ${asNum} · ${asName}`,
    ``,
    `🛡  ${risk}`,
    `🔍  ${dnsStr}`,
    ``,
    `🕐  ${utcLabel} · ${wd} ${hhmm} · ${diffLabel}`,
    ``,
    `⏱  Stable ${stable}${chgLine}`,
    `📶  ${latStr} · ${netLabel}`,
  ]
  if (localIP) lines.push(`     Local ${localIP}`)
  lines.push(``, `↻  ${upd}`)

  $done({ title: 'Node Info', content: lines.join('\n'), icon, 'icon-color': iconColor })
})()
