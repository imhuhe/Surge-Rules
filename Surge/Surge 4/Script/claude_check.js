/*
Claude (claude.ai) 可用性检测面板 — 参照 chatgpt_check.js 写法
请求 claude.ai 的 cdn-cgi/trace 获取出口地区，按 Anthropic 封禁地区判断当前节点能否使用 Claude。
argument 可自定义：title、icon、iconerr、icon-color、iconerr-color
例：argument=title=Claude&icon=brain.head.profile&iconerr=xmark.seal.fill&icon-color=#D97757&iconerr-color=#D65C51
封禁地区按需在 blocked 数组增删。
*/

let url = "https://claude.ai/cdn-cgi/trace";
let blocked = ["CN", "HK", "MO", "RU", "BY", "IR", "KP", "CU", "SY"];

let titlediy, icon, iconerr, iconColor, iconerrColor;
if (typeof $argument !== 'undefined') {
  const args = $argument.split('&');
  for (let i = 0; i < args.length; i++) {
    const [key, value] = args[i].split('=');
    if (key === 'title') titlediy = value;
    else if (key === 'icon') icon = value;
    else if (key === 'iconerr') iconerr = value;
    else if (key === 'icon-color') iconColor = value;
    else if (key === 'iconerr-color') iconerrColor = value;
  }
}

$httpClient.get(url, function (error, response, data) {
  if (error || !data) {
    $done({
      title: titlediy ? titlediy : 'Claude',
      content: '检测失败',
      icon: iconerr ? iconerr : undefined,
      'icon-color': iconerrColor ? iconerrColor : undefined
    });
    return;
  }

  let cf = data.split("\n").reduce((acc, line) => {
    let [k, v] = line.split("=");
    acc[k] = v;
    return acc;
  }, {});
  let loc = cf.loc || "";
  let region = getCountryFlagEmoji(loc) + ' ' + loc;

  let supported = loc && blocked.indexOf(loc) === -1;
  $done({
    title: titlediy ? titlediy : 'Claude',
    content: `${supported ? '支持' : '不支持'} | 地区: ${region}`,
    icon: supported ? (icon || undefined) : (iconerr || undefined),
    'icon-color': supported ? (iconColor || undefined) : (iconerrColor || undefined)
  });
});

function getCountryFlagEmoji(countryCode) {
  if (!countryCode) return '🏳️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}
