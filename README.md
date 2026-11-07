# 悦港 Harbour Joy · 香港物业网站

由 EUCOVE（origin/main e8f448d）复制，改为香港市场版本。2026-11-07 起在本目录独立开发，**未连接 GitHub 或 Cloudflare，未发布**。

## 与 EUCOVE 的主要差异

- 品牌：中文 悦港、英文 Harbour Joy；标志为楼宇加海浪图形（不含文字），配色海军蓝 #0B1F45、米白 #F7EFDC、黄铜 #C9A86A。
- 语言：中文为粤语口语、香港繁体（zh-HK），可切换英文。后台管理页保留书面繁体。
- 地区：港岛、九龙、新界、离岛（server/policy.ts）。港币、月租、实用面积（呎）。
- 首页「立体实景」：src/components/HkScene3D.tsx + hk-scene-engine.ts，用 Wikimedia 香港照片和本机 Depth Anything V2 景深图（scripts/create-hk-depth-maps.py 生成 public/depth/hk）组成可拖动的 3D 点云浮雕；WebGL 不可用时显示静态照片。
- 房源：server/owner-listings.json 为 11 个**示范盘**（demo: true），网页明确标注「示范盘」。上线前必须换成已签表格 3／表格 5 的真实放盘，再把 src/hk-site.ts 的 SHOW_DEMO_LISTINGS 改为 false。EUCOVE 的第三方摘录房源已清空——香港《地产代理条例》不允许未经业主书面同意刊登放盘。
- 合规：页脚显示公司地产代理牌照号码（src/hk-site.ts 的 EAA_COMPANY_LICENCE，未填时显示「待公布」）；私隐政策按《个人资料（私隐）条例》改写；团队成员需有牌照号码才列出（src/components/Team.tsx）。
- wrangler.jsonc / wrangler.net.jsonc 已改为 harbour-joy，去掉 eucove 域名、D1 ID 和 R2 桶，防止误发布到 EUCOVE。部署前需建立悦港自己的 D1、R2 和域名。

## 待确认

公司牌照号码、正式域名（src/hk-site.ts 的 SITE_ORIGIN）、业主优惠（沿用 EUCOVE「首个单位免佣、第二个半价、送搬屋，至 2027 年 2 月」）、团队成员、WhatsApp 号码、真实盘源。

---

# 澳洲房产中介网站

GitHub 私有仓库：[2026-10-27-EUCOVE](https://github.com/hs5824730-droid/2026-10-27-EUCOVE)。其他智能体接手前请阅读 [AGENTS.md](AGENTS.md) 和 [GitHub 协作与同步](docs/GitHub协作与同步.md)。

面向房东的中文／英文网站，包含仅招租、长期托管、买卖房源、历史记录、远程看房、咨询后台及 Telegram 通知。UI 和交互由 Claude 实现。

## 本地运行

要求 Node.js 24+、npm。数据库使用 Node 自带的 SQLite，单实例运行并使用持久磁盘。

```powershell
npm install
# 首次配置：复制 .env.example 为 .env.local 并填写配置；已有 .env.local 时不要覆盖
npm run dev
```

前台：http://localhost:5173 。后台：http://localhost:5173/admin/login 。API：http://127.0.0.1:3001/api/health 。开发服务器仅监听本机。

同一局域网的手机或电脑需要访问时，先停止本地预览，再运行：

```powershell
npm run dev:lan -- 192.168.100.110
```

手机连接与电脑同一个网络，打开 `http://192.168.100.110:5173`。如果电脑地址发生变化，将参数替换为新的局域网 IPv4；省略参数时使用检测到的第一个私网 IPv4。此命令开放网站的 5173 端口，API 仍仅监听本机，并自动使用指定地址校验表单来源及生成通知链接。电脑和预览进程需要保持运行；它不会将网站发布到公网。

当前工作目录已生成私密本地配置，初始管理员登录信息保存在 `data/local-admin.txt`。不要将此文件、`.env.local`、数据库或上传文件提交到公开仓库。管理员密码不会写在网页或文档中；服务器首次运行时使用 ADMIN_EMAIL / ADMIN_PASSWORD 创建账号，已有账号不自动覆盖。

## 已实现的业务基础

- 五城：Melbourne、Sydney、Perth、Adelaide、Canberra；界面中英文切换。
- 仅招租／长期托管由房东选择；拒绝其他中介转来的出租或托管委托。
- 房源草稿、发布与下架（关闭发布），图片上传、双语介绍、价格、户型、历史事件和 3D 链接。
- 管理员、城市负责人、助理三种角色。城市成员只能访问授权城市，助理不可修改房源或分配负责人。
- 表单校验、同次提交重试去重、机器人诱捕字段、限流及同源写入校验。
- 咨询持久入库、按城市匹配负责人、状态／备注／下次跟进、优惠委托顺序及搬家服务状态。
- 咨询先保存，再由服务器向 Telegram 发送摘要和需登录的后台链接。最多自动尝试五次，失败记录保留，管理员可重新排队；网络超时重试可能导致重复提醒，咨询编号可用于识别。
- 团队账号创建、CSV 咨询导出、数据导入脚本及数据库备份。

## 通知和联系配置

2026-10-30 新增待上线的[Telegram 手动接粉分配](docs/Telegram手动接粉分配.md)：先在既有机器人私聊选择接粉人员，再推送 Signal；迁移默认关闭，完成配置并获发布授权后才启用。

在 `.env.local` 设置 TELEGRAM_BOT_TOKEN、TELEGRAM_CHAT_ID、APP_URL。APP_URL 上线后须改为真实 HTTPS 网站地址，使通知中的后台链接可从手机打开。凭证仅由服务器读取，前端只知道是否已配置。

WhatsApp 实际号码尚待提供；配置 WHATSAPP_NUMBER 为含国家代码的数字。号码为空时网站引导提交表单，不能显示虚假号码。

未向真实机器人发送测试咨询。自动化测试使用独立临时数据库和模拟 Telegram 接口，不会触发真实消息。上线前需用明确标记的测试咨询完成实际收件测试。

浏览器测试可先运行 `npm run build`，再运行 `npm run test:browser:server`，访问 `http://127.0.0.1:3002`。此入口强制使用临时数据库并关闭 Telegram，与本地真实预览隔离；其中的测试账号仅用于该独立测试服务，不用于实际网站。

## 历史资料及 3D

数据库初始不包含虚构的在售或成交房源。通过后台录入，或按照 `API交接.md` 的 PropertyInput 格式整理为 JSON 数组运行：

```powershell
npm run data:import -- 房源资料.json
```

批量导入会先验证全部记录，再作为草稿保存；重复导入会新建草稿，不自动判定同一地址。审核后再发布。房屋与历次挂牌、调价、成交事件保存在同一房源时间线中，重新挂牌应维护已有房源记录。

3D 导览支持经过许可的 HTTPS Matterport、Kuula、iGuide 等链接。实际房屋需要真实采集资料；示意演示不代表真实房源。不要将 AI 场景当作真实在售房屋。真实品牌、团队、房源、照片和正式活动细则待用户提供。

## 检查和构建

```powershell
npm test
npm run build
npm run data:backup
```

服务器可直接提供构建后的 dist 文件：先构建，设置生产环境、APP_URL 及 HOST，再运行 `npm start`。生产环境使用 HTTPS 反向代理；仅在可信反向代理后设置 TRUST_PROXY=true。配置 NODE_ENV=production 后 cookie 仅通过 HTTPS 发送。将持久数据库和 uploads 放在持久磁盘，做好异地备份；不能部署在每次启动即丢失磁盘的环境。

新增管理员可设置 NEW_ADMIN_EMAIL、NEW_ADMIN_PASSWORD（至少12位）和可选 NEW_ADMIN_NAME 后运行 `npm run admin:create`。其他城市负责人和助理可由管理员在后台建立。

## 首版范围

本后台用于网站内容、获客和接待协作。租金代收、信托账户、押金、会计、电子签约、自动佣金结算及租客门户未纳入首版。房东优惠记录需要人工审核，不根据联系方式自动认定所有权或优惠资格。

活动确认口径为同一房东首单免出租佣金、第二单佣金半价，持续到 2027 年 2 月；具体日期、长期管理费是否包含以及搬家范围等仍待确定，不推定所有费用全免。
