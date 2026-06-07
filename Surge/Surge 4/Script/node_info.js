// Surge Panel — 节点信息
// 依赖：ip-api.com · api6.ipify.org · edns.ip-api.com · cp.cloudflare.com · Surge $httpAPI · $network
// argument: group=Proxy（你的主策略组名）

const STORE_KEY = 'surge_node_panel_v1';
const LAT_URL   = 'https://cp.cloudflare.com/generate_204';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getParams(str) {
  if (!str) return {};
  try {
    return Object.fromEntries(
      str.split('&').map(s => s.split('=')).map(([k, v]) => [k, decodeURIComponent(v || '')])
    );
  } catch(e) { return {}; }
}

function httpAPI(path, method = 'GET', body = null) {
  return new Promise(resolve => $httpAPI(method, path, body, resolve));
}

function httpGet(url, timeout = 8) {
  return new Promise(resolve => {
    $httpClient.get({ url, timeout }, (e, _, d) => resolve(e ? null : d));
  });
}

function httpHead(url, timeout = 5) {
  return new Promise(resolve => {
    const t = Date.now();
    $httpClient.head({ url, timeout }, e => resolve(e ? null : Date.now() - t));
  });
}

function flag(cc) {
  if (!cc || cc.length !== 2) return '🌐';
  const B = 0x1F1E6 - 65;
  return [...cc.toUpperCase()].map(c => String.fromCodePoint(B + c.charCodeAt(0))).join('');
}

const SUB = {
  JP:'亚洲›东亚', KR:'亚洲›东亚', CN:'亚洲›东亚', TW:'亚洲›东亚', HK:'亚洲›东亚', MO:'亚洲›东亚',
  SG:'亚洲›东南亚', MY:'亚洲›东南亚', TH:'亚洲›东南亚', VN:'亚洲›东南亚',
  PH:'亚洲›东南亚', ID:'亚洲›东南亚', MM:'亚洲›东南亚', KH:'亚洲›东南亚',
  IN:'亚洲›南亚', PK:'亚洲›南亚', BD:'亚洲›南亚', LK:'亚洲›南亚',
  TR:'亚洲›西亚', AE:'亚洲›西亚', SA:'亚洲›西亚', IL:'亚洲›西亚',
  KW:'亚洲›西亚', QA:'亚洲›西亚', BH:'亚洲›西亚',
  RU:'欧洲›东欧', UA:'欧洲›东欧', PL:'欧洲›东欧', RO:'欧洲›东欧',
  DE:'欧洲›西欧', FR:'欧洲›西欧', NL:'欧洲›西欧', BE:'欧洲›西欧',
  GB:'欧洲›西欧', IE:'欧洲›西欧',
  AT:'欧洲›中欧', CH:'欧洲›中欧', CZ:'欧洲›中欧',
  ES:'欧洲›南欧', PT:'欧洲›南欧', IT:'欧洲›南欧', GR:'欧洲›南欧',
  SE:'欧洲›北欧', NO:'欧洲›北欧', FI:'欧洲›北欧', DK:'欧洲›北欧',
  US:'北美洲', CA:'北美洲', MX:'北美洲',
  BR:'南美洲', AR:'南美洲', CL:'南美洲', CO:'南美洲',
  AU:'大洋洲', NZ:'大洋洲',
  ZA:'非洲', NG:'非洲', EG:'非洲', KE:'非洲',
};

const CARRIERS = {
  // 中国大陆
  '460-00':'中国移动', '460-02':'中国移动', '460-04':'中国移动', '460-07':'中国移动', '460-08':'中国移动',
  '460-01':'中国联通', '460-06':'中国联通', '460-09':'中国联通',
  '460-03':'中国电信', '460-05':'中国电信', '460-11':'中国电信',
  '460-15':'中国广电', '460-20':'中移铁通',
  // 香港
  '454-00':'CSL', '454-02':'CSL', '454-10':'CSL',
  '454-03':'3HK', '454-04':'3HK', '454-05':'3HK',
  '454-09':'CMHK', '454-12':'CMHK',
  '454-07':'UNICOM HK',
  // 台湾
  '466-92':'中華電信', '466-11':'中華電信',
  '466-01':'遠傳電信', '466-97':'台灣大哥大',
  // 日本
  '440-10':'docomo', '440-20':'SoftBank', '440-11':'Rakuten',
  '440-50':'au', '440-51':'au', '440-52':'au',
  '440-00':'Y!mobile',
  // 韩国
  '450-05':'SKT', '450-03':'SKT',
  '450-02':'KT', '450-04':'KT',
  '450-06':'LG U+', '450-10':'LG U+',
  // 新加坡
  '525-01':'SingTel', '525-05':'StarHub', '525-03':'M1',
  // 美国
  '310-260':'T-Mobile', '311-490':'T-Mobile',
  '310-410':'AT&T', '310-030':'AT&T',
  '311-480':'Verizon', '310-004':'Verizon',
  // 英国
  '234-30':'EE', '234-10':'O2', '234-20':'3', '234-15':'Vodafone',
};

const RADIO_GEN = {
  'NR':'5G', 'NRNSA':'5G', 'LTE':'4G', 'eHRPD':'3.9G',
  'HSUPA':'3.75G', 'HSDPA':'3.5G', 'WCDMA':'3G',
  'EDGE':'2.75G', 'GPRS':'2.5G', 'CDMA1x':'2.5G',
};

function subRegion(cc) { return (SUB[cc] || '其他地区').replace('›', ' › '); }

function dur(ms) {
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}天 ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m`;
  return '刚刚';
}

function tzOffHours(tz) {
  try {
    const d = new Date();
    const tzMs  = new Date(d.toLocaleString('en-US', { timeZone: tz  })).getTime();
    const utcMs = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
    return Math.round((tzMs - utcMs) / 1800000) / 2;
  } catch(e) { return null; }
}

function fmtTZDiff(pOff, lOff) {
  const d = pOff - lOff;
  if (d === 0) return '与本机同区';
  return `${d > 0 ? '领先' : '落后'}本机 ${Math.abs(d)}h`;
}

// — 本机网络信息（$network）—
function getLocalNetInfo() {
  const ssid     = $network.wifi?.ssid;
  const cell     = $network['cellular-data'];
  const localV4  = $network.v4?.primaryAddress || '';
  const localV6  = $network.v6?.primaryAddress || '';

  let netLabel = '未知网络';
  let icon     = 'network';
  let iconColor = '#5B8AF5';
  let localIP  = localV4 || '';

  if (ssid) {
    netLabel  = `Wi-Fi · ${ssid}`;
    icon      = 'wifi';
    iconColor = '#005CAF';
  } else if (cell) {
    const carrier = CARRIERS[cell.carrier] || '蜂窝网络';
    const gen     = RADIO_GEN[cell.radio] || cell.radio || '';
    const radio   = cell.radio || '';
    netLabel  = [carrier, gen, radio].filter(Boolean).join(' · ');
    icon      = 'simcard';
    iconColor = '#F9BF45';
  }

  if (localV4 && localV6) localIP = `${localV4} / ${localV6.slice(0, 18)}…`;

  return { netLabel, localIP, icon, iconColor };
}

// ── Main ──────────────────────────────────────────────────────────────────────

;(async () => {
  const NOW = Date.now();
  const params    = getParams($argument || '');
  const groupName = params.group || 'Proxy';

  // — 获取实际节点名 —
  let nodeName = 'DIRECT';
  try {
    const allGroups  = await httpAPI('/v1/policy_groups');
    const groupNames = Object.keys(allGroups);
    let cur = (await httpAPI('/v1/policy_groups/select?group_name=' + encodeURIComponent(groupName))).policy;
    while (groupNames.includes(cur)) {
      cur = (await httpAPI('/v1/policy_groups/select?group_name=' + encodeURIComponent(cur))).policy;
    }
    nodeName = cur || 'DIRECT';
  } catch(e) {}

  // — 本机网络 —
  const { netLabel, localIP, icon, iconColor } = getLocalNetInfo();

  // — 并行请求 —
  const [ipRaw, v6Raw, dnsRaw, rtt1, rtt2, rtt3] = await Promise.all([
    httpGet('http://ip-api.com/json/?fields=status,country,countryCode,city,timezone,isp,org,as,asname,proxy,hosting,mobile,query', 8),
    httpGet('https://api6.ipify.org?format=json', 5),
    httpGet('http://edns.ip-api.com/json', 5),
    httpHead(LAT_URL, 5),
    httpHead(LAT_URL, 5),
    httpHead(LAT_URL, 5),
  ]);

  // — 解析 —
  let ipInfo = null;
  try { ipInfo = JSON.parse(ipRaw); } catch(e) {}
  let ipv6Addr = null;
  try { ipv6Addr = JSON.parse(v6Raw)?.ip || null; } catch(e) {}
  let dnsInfo = null;
  try { dnsInfo = JSON.parse(dnsRaw); } catch(e) {}
  const rtts = [rtt1, rtt2, rtt3].filter(r => r !== null);

  if (!ipInfo || ipInfo.status !== 'success') {
    $done({ title: '节点信息', content: '⚠️ IP 查询失败，请检查网络', icon: 'wifi.exclamationmark', 'icon-color': '#CB1B45' });
    return;
  }

  // — IP 稳定性 —
  let st = {};
  try { st = JSON.parse($persistentStore.read(STORE_KEY) || '{}'); } catch(e) {}
  const ipChanged = !!st.ip && st.ip !== ipInfo.query;
  if (!st.ip || ipChanged) {
    st = { ip: ipInfo.query, since: NOW, chg: ipChanged ? (st.chg || 0) + 1 : 0 };
    $persistentStore.write(JSON.stringify(st), STORE_KEY);
  }
  const stable  = dur(NOW - (st.since || NOW));
  const chgNote = ipChanged ? '  ← 已更换' : '';
  const chgLine = st.chg > 0 ? ` · 换过 ${st.chg} 次` : '';

  // — 地理 —
  const f   = flag(ipInfo.countryCode);
  const geo = `${f}  ${subRegion(ipInfo.countryCode)} · ${ipInfo.country} · ${ipInfo.city}`;

  // — ASN —
  const asNum  = (ipInfo.as || '').split(' ')[0] || '';
  const asName = ipInfo.asname || '';

  // — 时区 —
  const pOff = tzOffHours(ipInfo.timezone);
  const lOff = tzOffHours(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const utcLabel  = pOff !== null ? `UTC${pOff >= 0 ? '+' : ''}${pOff}` : ipInfo.timezone;
  const wd        = new Date().toLocaleString('zh-CN', { timeZone: ipInfo.timezone, weekday: 'short' });
  const hhmm      = new Date().toLocaleString('zh-CN', { timeZone: ipInfo.timezone, hour: '2-digit', minute: '2-digit', hour12: false });
  const diffLabel = (pOff !== null && lOff !== null) ? fmtTZDiff(pOff, lOff) : '';

  // — 风险标记 —
  const risk = [
    ipInfo.hosting ? '机房⚡' : '机房✓',
    ipInfo.proxy   ? 'Proxy⚡' : 'Proxy✓',
    ipInfo.mobile  ? 'Mobile✓' : 'Mobile✗',
  ].join('  ');

  // — DNS —
  let dnsStr = '未获取';
  if (dnsInfo?.dns?.ip) {
    dnsStr = dnsInfo.dns.ip;
    if (dnsInfo.dns.geo) dnsStr += `  ${dnsInfo.dns.geo}`;
  }

  // — 延迟 —
  let latStr = '—';
  if (rtts.length) {
    const avg = Math.round(rtts.reduce((a, b) => a + b, 0) / rtts.length);
    const jit = Math.max(...rtts) - Math.min(...rtts);
    latStr = `${avg}ms${jit > 0 ? ' ±' + jit : ''}`;
  }

  const v6  = ipv6Addr ? `${ipv6Addr}  ✓` : 'IPv6 不可用';
  const upd = new Date().toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });

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
    `⏱  稳定 ${stable}${chgLine}`,
    `📶  ${latStr} · ${netLabel}`,
  ];
  if (localIP) lines.push(`     本机 ${localIP}`);
  lines.push(``, `↻  ${upd}`);

  $done({ title: '节点信息', content: lines.join('\n'), icon, 'icon-color': iconColor });
})();
