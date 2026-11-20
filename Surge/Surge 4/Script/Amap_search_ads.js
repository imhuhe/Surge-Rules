try {
  const body = $response.body;
  let obj = JSON.parse(body);
  const isAd = (it) => {
    const d = (it && it.data) || {};
    const c = d.cpc || {};
    const info = (d.poi && d.poi.item_info) || {};
    return String(c.is_ad) === "1" || String(info.is_ad) === "1" || ((d.img_info || {}).ad_text === "广告");
  };
  const m = (obj.data && obj.data.modules) || {};
  let n = 0;
  for (const key of ["listResult", "poiInfo"]) {
    const node = m[key] && m[key].data;
    if (node && Array.isArray(node.list)) {
      const kept = node.list.filter((it) => !isAd(it));
      n += node.list.length - kept.length;
      node.list = kept;
    }
  }
  $done(n > 0 ? { body: JSON.stringify(obj) } : {});
} catch (e) {
  $done({});
}
