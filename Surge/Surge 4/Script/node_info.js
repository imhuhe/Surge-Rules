// Surge Panel — 节点信息
// 依赖：ip-api.com · api6.ipify.org · edns.ip-api.com · cp.cloudflare.com
// 建议刷新间隔：300s

const STORE_KEY = 'surge_node_panel_v1';
const LAT_URL   = 'https://cp.cloudflare.com/generate_204';
const LAT_N     = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  KZ:'亚洲›中亚', UZ:'亚洲›中亚',
  RU:'欧洲›东欧', UA:'欧洲›东欧', PL:'欧洲›东欧', RO:'欧洲›东欧', BG:'欧洲›东欧',
  DE:'欧洲›西欧', FR:'欧洲›西欧', NL:'欧洲›西欧', BE:'欧洲›西欧', LU:'欧洲›西欧',
  GB:'欧洲›西欧', IE:'欧洲›西欧',
  AT:'欧洲›中欧', CH:'欧洲›中欧', CZ:'欧洲›中欧', HU:'欧洲›中欧', SK:'欧洲›中欧',
  ES:'欧洲›南欧', PT:'欧洲›南欧', IT:'欧洲›南欧', GR:'欧洲›南欧', HR:'欧洲›南欧',
  SE:'欧洲›北欧', NO:'欧洲›北欧', FI:'欧洲›北欧', DK:'欧洲›北欧', IS:'欧洲›北欧',
  US:'北美洲', CA:'北美洲', MX:'北美洲',
  BR:'南美洲', AR:'南美洲', CL:'南美洲', CO:'南美洲', PE:'南美洲',
  AU:'大洋洲', NZ:'大洋洲',
  ZA:'非洲', NG:'非洲', EG:'非洲', KE:'非洲', ET:'非洲',
};

function subRegion(cc) { return (SUB[cc] || '其他地区').replace('›', ' › '); }

function dur(ms) {
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0)  return `${d}天 ${h % 24}h`;
  if (h > 0)  return `${h}h ${m % 60}m`;
  if (m > 0)  return `${m}m`;
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

// ── State ─────────────────────────────────────────────────────────────────────

const NOW = Date.now();
let ipInfo = null, ipv6Addr = null, dnsInfo = null;
const rtts = [];
let pending = 4;

function tick() { if (--pending === 0) render(); }

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  if (!ipInfo || ipInfo.status !== 'success') {
    $done({
      title: '节点信息', content: '⚠️ IP 查询失败，请检查网络',
      icon: 'exclamationmark.triangle.fill', 'icon-color': '#FF6B6B',
    });
    return;
  }

  // — IP 稳定性 —
  let st = {};
  try { st = JSON.parse($persistentStore.read(STORE_KEY) || '{}'); } catch(e) {}
  const ipChanged = !!st.ip && st.ip !== ipInfo.query;
  if (!st.ip) {
    st = { ip: ipInfo.query, since: NOW, chg: 0 };
    $persistentStore.write(JSON.stringify(st), STORE_KEY);
  } else if (ipChanged) {
    st = { ip: ipInfo.query, since: NOW, chg: (st.chg || 0) + 1 };
    $persistentStore.write(JSON.stringify(st), STORE_KEY);
  }
  const stable   = dur(NOW - (st.since || NOW));
  const chgNote  = ipChanged ? '  ← 已更换' : '';
  const chgLine  = st.chg > 0 ? ` · 累计换过 ${st.chg} 次` : '';

  // — 地理 —
  const f   = flag(ipInfo.countryCode);
  const geo = `${f}  ${subRegion(ipInfo.countryCode)} · ${ipInfo.country} · ${ipInfo.city}`;

  // — ASN —
  const asNum  = (ipInfo.as || '').split(' ')[0] || '';
  const asName = ipInfo.asname || '';

  // — 时区 —
  const pOff = tzOffHours(ipInfo.timezone);
  const lOff = tzOffHours(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const utcLabel = pOff !== null
    ? `UTC${pOff >= 0 ? '+' : ''}${pOff}`
    : ipInfo.timezone;
  const wd   = new Date().toLocaleString('zh-CN', { timeZone: ipInfo.timezone, weekday: 'short' });
  const hhmm = new Date().toLocaleString('zh-CN', { timeZone: ipInfo.timezone, hour: '2-digit', minute: '2-digit', hour12: false });
  const diffLabel = (pOff !== null && lOff !== null) ? fmtTZDiff(pOff, lOff) : '';

  // — 风险标记 —
  const risk = [
    ipInfo.hosting ? '机房⚡' : '机房✓',
    ipInfo.proxy   ? 'Proxy⚡' : 'Proxy✓',
    ipInfo.mobile  ? 'Mobile✓' : 'Mobile✗',
  ].join('  ');

  // — DNS —
  let dnsStr = '未获取';
  if (dnsInfo && dnsInfo.dns && dnsInfo.dns.ip) {
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

  // — 本机网络 —
  const netType = ($surge.networkType || '').toUpperCase();
  const ssid    = $surge.ssid || '';
  const net     = (netType === 'WIFI' && ssid) ? `Wi-Fi · ${ssid}` : (netType || '未知');

  // — 节点 —
  const node   = $surge.nodeName   || '—';
  const policy = $surge.policyName || '—';
  const v6Line = ipv6Addr ? `IPv6   ${ipv6Addr}  ✓` : `IPv6   不可用`;

  const upd = new Date().toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });

  const content = [
    `🟢 ${node}`,
    `   ${policy}`,
    ``,
    `IPv4   ${ipInfo.query}${chgNote}`,
    v6Line,
    ``,
    geo,
    `     ${ipInfo.isp}`,
    `     ${asNum} · ${asName}`,
    ``,
    `标记   ${risk}`,
    `DNS    ${dnsStr}`,
    ``,
    `${utcLabel} · ${wd} ${hhmm} · ${diffLabel}`,
    ``,
    `IP 已稳定 ${stable}${chgLine}`,
    `延迟 ${latStr} · ${net}`,
    ``,
    `更新于 ${upd}`,
  ].join('\n');

  $done({ title: '节点信息', content, icon: 'network', 'icon-color': '#5B8AF5' });
}

// ── Requests（并行） ───────────────────────────────────────────────────────────

// 1. 主 IP 信息
$httpClient.get({
  url: 'http://ip-api.com/json/?fields=status,country,countryCode,city,timezone,isp,org,as,asname,proxy,hosting,mobile,query',
  timeout: 8,
}, (e, _, d) => {
  if (!e && d) try { ipInfo = JSON.parse(d); } catch(_) {}
  tick();
});

// 2. IPv6 检测
$httpClient.get({
  url: 'https://api6.ipify.org?format=json',
  timeout: 5,
}, (e, _, d) => {
  if (!e && d) try { ipv6Addr = JSON.parse(d).ip || null; } catch(_) {}
  tick();
});

// 3. DNS 泄露检测
$httpClient.get({
  url: 'http://edns.ip-api.com/json',
  timeout: 5,
}, (e, _, d) => {
  if (!e && d) try { dnsInfo = JSON.parse(d); } catch(_) {}
  tick();
});

// 4. 延迟采样（3次顺序执行）
(function lat(i) {
  if (i >= LAT_N) { tick(); return; }
  const t = Date.now();
  $httpClient.head({ url: LAT_URL, timeout: 5 }, e => {
    if (!e) rtts.push(Date.now() - t);
    lat(i + 1);
  });
})(0);
