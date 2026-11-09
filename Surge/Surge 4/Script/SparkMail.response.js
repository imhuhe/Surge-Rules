/**
 * Spark Mail 会员解锁 —— 本仓自建副本
 *
 * 源模块：https://yfamilys.com/module/spark.module（作者 yqc007）
 * 源脚本：https://raw.githubusercontent.com/yqc007/QuantumultX/master/SparkMailProCrack.js
 *         作者 Passer_by_yun，更新于 2022-11-18，标注适配 Spark 3.0.6
 * 上游做法：劫持 api.revenuecat.com 的订阅查询响应，整份换成一份「永久已购」的假数据
 *
 * 本副本相对上游的改动（意图不变，作用面更窄、更耐改）：
 *   1. 还原字符串表混淆，去掉自校验死循环，代码可读可改
 *   2. request_date / request_date_ms 用当前时间。上游写死 2022-11-18，
 *      RevenueCat SDK 靠这个字段判断缓存新旧，写死会让它认为响应过期、反复重取
 *   3. 真已付费（premium 未到期）或响应不是 JSON 时原样放行，不覆盖真实状态；
 *      非订阅型购买（non_subscriptions / other_purchases）保留服务端原值
 *   4. original_app_user_id 优先取请求 URL 里的真实用户 id，避免 SDK 判定用户身份不一致
 *   5. 响应里带的是别的 App 的真实订阅（产品 id 不以 spark_ 开头）就放行，
 *      不拿假数据顶掉别的 App 的已购状态；没有产品 id 的空响应仍按 Spark 处理
 *   6. 可选白名单 SPARK_API_KEY：填上 Spark 的 RevenueCat 公钥后只改写 Spark 自己的请求。
 *      取不到 Authorization 头时不拦（宁可能用，不静默失效）
 */
const SPARK_API_KEY = ""; // 形如 "appl_xxx"；留空＝api.revenuecat.com 下全部改写
const FAKE_EXPIRES = "2077-07-07T00:00:00Z";
const FAKE_PRODUCT = "spark_5999_1y_1w0";
const FAKE_PURCHASE = "2022-11-18T04:00:12Z";
const FAKE_FIRST_SEEN = "2022-11-18T04:02:28Z";

function isoNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function subscriberIdFromUrl(url) {
  var m = /\/subscribers\/([^\/?#]+)/.exec(url || "");
  return m ? decodeURIComponent(m[1]) : "";
}

function buildBody(real) {
  var now = Date.now();
  var sub = {
    original_purchase_date: FAKE_PURCHASE,
    expires_date: FAKE_EXPIRES,
    is_sandbox: false,
    refunded_at: null,
    unsubscribe_detected_at: null,
    grace_period_expires_date: null,
    period_type: "normal",
    purchase_date: FAKE_PURCHASE,
    billing_issues_detected_at: null,
    ownership_type: "PURCHASED",
    store: "app_store",
    auto_resume_date: null
  };
  var subscriptions = {};
  subscriptions[FAKE_PRODUCT] = sub;

  return {
    request_date_ms: now,
    request_date: isoNow(),
    subscriber: {
      non_subscriptions: real.non_subscriptions || {},
      first_seen: real.first_seen || FAKE_FIRST_SEEN,
      original_application_version: "1.0",
      other_purchases: real.other_purchases || {},
      management_url: "https://apps.apple.com/account/subscriptions",
      subscriptions: subscriptions,
      entitlements: {
        premium: {
          grace_period_expires_date: null,
          purchase_date: FAKE_PURCHASE,
          product_identifier: FAKE_PRODUCT,
          expires_date: FAKE_EXPIRES
        }
      },
      original_purchase_date: "2013-08-01T07:00:00Z",
      original_app_user_id:
        subscriberIdFromUrl($request && $request.url) ||
        real.original_app_user_id ||
        "00000000-0000-0000-0000-000000000000",
      last_seen: real.last_seen || FAKE_FIRST_SEEN
    }
  };
}

(function main() {
  var headers = ($request && $request.headers) || {};
  var auth = String(headers.Authorization || headers.authorization || "");
  if (SPARK_API_KEY && auth && auth.indexOf(SPARK_API_KEY) < 0) return $done({});

  var obj;
  try {
    obj = JSON.parse($response.body);
  } catch (e) {
    return $done({});
  }

  var real = (obj && obj.subscriber) || {};
  var premium = real.entitlements && real.entitlements.premium;
  if (premium && premium.expires_date && Date.parse(premium.expires_date) > Date.now()) {
    return $done({});
  }

  var subs = real.subscriptions || {};
  var keys = Object.keys(subs);
  var isSpark = keys.some(function (k) { return k.indexOf("spark_") === 0; });
  if (keys.length && !isSpark) return $done({});

  $done({ body: JSON.stringify(buildBody(real)) });
})();
