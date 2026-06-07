// Surge Panel — 测速
// 下行自适应（5MB→25MB）+ 延迟5次采样
// 建议手动刷新（update-interval=0）

const CF = (n) => `https://speed.cloudflare.com/__down?bytes=${n}`;
const LAT_URL = 'https://cp.cloudflare.com/generate_204';
const LAT_N   = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

function speedBar(mbps) {
  // 对数刻度：1/5/10/25/50/100/200/500/1000 Mbps
  const steps = [1, 5, 10, 25, 50, 100, 200, 500, 1000];
  const filled = Math.min(steps.filter(s => mbps >= s).length + 1, 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function fmtSpeed(mbps) {
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(2)} Gbps`;
  if (mbps >= 1)    return `${mbps.toFixed(1)} Mbps`;
  return `${(mbps * 1000).toFixed(0)} Kbps`;
}

function barColor(mbps) {
  if (mbps === null) return '#8E8E93';
  if (mbps >= 100)  return '#34C759'; // 绿
  if (mbps >= 20)   return '#FF9500'; // 橙
  return '#FF6B6B';                   // 红
}

// ── State ─────────────────────────────────────────────────────────────────────

const rtts = [];
let dlMbps    = null;
let latDone   = false;
let dlDone    = false;

function tryRender() {
  if (!latDone || !dlDone) return;

  const avg = rtts.length ? Math.round(rtts.reduce((a, b) => a + b, 0) / rtts.length) : null;
  const min = rtts.length ? Math.min(...rtts) : null;
  const max = rtts.length ? Math.max(...rtts) : null;
  const jit = rtts.length > 1 ? max - min : null;

  const dlLine  = dlMbps !== null
    ? `${speedBar(dlMbps)}  ${fmtSpeed(dlMbps)}`
    : '测速失败，请重试';
  const latLine = avg !== null ? `${avg}ms` : '—';
  const jitLine = jit !== null ? `±${jit}ms` : '—';
  const mmLine  = (min !== null && max !== null)
    ? `最快 ${min}ms  最慢 ${max}ms  (${rtts.length} 次采样)`
    : '—';

  const upd = new Date().toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });

  const content = [
    `下行速率`,
    dlLine,
    ``,
    `延  迟   ${latLine}    抖动 ${jitLine}`,
    `         ${mmLine}`,
    ``,
    `测速节点  Cloudflare`,
    `更新于 ${upd}`,
  ].join('\n');

  $done({
    title: '测速',
    content,
    icon: 'speedometer',
    'icon-color': barColor(dlMbps),
  });
}

// ── 下行测速（自适应） ─────────────────────────────────────────────────────────

(function dl() {
  const B5 = 5 * 1024 * 1024, t0 = Date.now();
  $httpClient.get({ url: CF(B5), timeout: 40, 'binary-mode': true }, (e) => {
    if (e) { dlDone = true; tryRender(); return; }
    const mbps5 = B5 * 8 / ((Date.now() - t0) / 1000) / 1e6;

    if (mbps5 > 50) {
      // 快速连接：再跑 25MB 以提高精度
      const B25 = 25 * 1024 * 1024, t1 = Date.now();
      $httpClient.get({ url: CF(B25), timeout: 40, 'binary-mode': true }, (e2) => {
        dlMbps = e2 ? mbps5 : B25 * 8 / ((Date.now() - t1) / 1000) / 1e6;
        dlDone = true; tryRender();
      });
    } else {
      dlMbps = mbps5;
      dlDone = true; tryRender();
    }
  });
})();

// ── 延迟采样（5次顺序执行） ───────────────────────────────────────────────────

(function lat(i) {
  if (i >= LAT_N) { latDone = true; tryRender(); return; }
  const t = Date.now();
  $httpClient.head({ url: LAT_URL, timeout: 5 }, e => {
    if (!e) rtts.push(Date.now() - t);
    lat(i + 1);
  });
})(0);
