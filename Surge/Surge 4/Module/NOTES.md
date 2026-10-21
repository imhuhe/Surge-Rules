# 模块备忘

模块文件里的注释刻意写短，原因与实测依据记在这里。

## 高德地图净化
- 打车、AI 对话、探索三个 tab 的后端（m5-zb、ai、sns 等域名）整域返回 200 空数据。代价：打车功能不可用，点进去是空白页。2026-10-21 老黄确认不用高德打车。
- 底部 tab 按钮是原生界面，删不掉。
- 脚本 `Script/Amap_remove_ads.js`：原 kelee.one 地址 2026-10-21 起 404，现用仓内副本（取自 GitHub 镜像，2026-03-09 版）。
- 已知失效：公交 `bus/plan/integrate` 现为 nvg.amap.com 的 new_integrate，响应是 zstd 二进制，脚本处理不了；搜索联想 sug 路径已改为 `search_business/process/middleLayer/sug`。

## 美团净化
- 美团每个 tab 都是真实交易入口，只清广告与埋点，不做整 tab 封杀。
- 首页团购瀑布流：实测 9 张卡片里 6 张带曝光计费的广告信息，删卡片而不是整接口，分页字段不变。
- msp/affogato 带客户端安全 SDK 的设备指纹参数，纯上报；曾放行后经原始样本证伪，已恢复拦截。
- 广告图源只让图消失，卡片骨架还在（空白块），API 层剔除见 Body Rewrite。

## 运营商 App 净化
本模块拦不掉的：
1. 位置权限弹窗是 App 本地代码弹的，不发网络请求，代理层够不着。只能在 设置 → 隐私与安全性 → 定位服务 → 该 App 里选「永不」。
2. 首页运营位无法精确净化。移动 App 的 biz-orange/* 接口响应体全是 AES 密文（82 条密文对 33 条明文，明文全是 SDK 与第三方），Body Rewrite 的 jq 用不了。广告与内容在同一响应里，只能整条拦或整条放。首页 getTopAreaList（136KB）与 aggregationData（43KB）属于这类，整条拦会连套餐余量、话费一起干掉，所以放行。精确净化要逆向拿密钥、写脚本解密改写再加密，投入产出比不成立。
3. 英文版的干净界面借不到：它走独立接口 biz-orange/DN/englishEdition/getEnglishEditionData，不是同一接口的 locale 参数差异。
