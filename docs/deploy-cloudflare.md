# 桉湾 EUCOVE：Cloudflare 部署与运维

## 2026-10-27：登记回首页与专用 Google 授权入口

当前 com `0ff3fbd7-5b0b-4ee5-a5cf-bea6ed99886c`，net `dc6b3851-1ceb-40dc-8b4f-9537d250fa22`。保留两域各自营销设计；回执/404/logo 使用适合各站的完整文档首页地址。仅新增0018 Google授权表，未改原客户、城市、接待、游标或通知切点。19:15仅后端修复Workers不支持的redirect:error与全局fetch类绑定问题，两域静态主JS/CSS不变。

专用免费Google项目、Sheets API及正式Web OAuth已实际连接。**原两条登记在北京时间19:16:25/26由正式自动outbox同步成功，D1均synced，表内第2、3行来源ID逐条一致，19:18刷新复核无重复。** 管理员入口 <https://eucove.com/admin/rental-registrations>，可查看连接和逐条同步状态。仅原指定表；没有人工connector append、没有新增测试客户或外发消息。连接令牌加密存D1，关闭需用连接enabled或REGISTRATION_SHEETS_KILL_SWITCH；不回旧库。详情与兼容回滚见[本次修复报告](../data/design-review/registration-repair-2026-10-27/report.md)。以下为历史记录。

## 2026-10-27：独立房东登记、四联系入口及通知修复已发布

当前com 100% `ce33033c-600c-478b-976a-2c0ad9587ae1`，net 100% `53e9d94d-c373-4118-90cf-85c844ddb5b3`。**两站保留不同设计**：com旧营销页面及白色外壳，net新版；独立登记/contact返回com营销页会加载原com文档。两站 `/zh/rental-registration` 和 `/en/rental-registration` 已上线，仅姓名、电话、邮箱必填。0015–0017增量迁移及完整备份/逐行保护核对通过，没有轮换账号或改原接待/通知配置。

Google目标表已固定，但真实持续同步关闭、待正规后端离线授权；不能把网站上线说成Google已接通。完整版本、正式链接、com即时样式纠正、备份/测试/限制和phone/mail/alias兼容回滚见[本次正式终态](../data/design-review/registration-release-2026-10-27/report.md)。以下为此前历史记录。

## 2026-10-26：本轮整合已正式发布

当前 `.com` 100% `b3ce7eef-57bc-483a-8a54-53e5a00f2f30`，`.net` 100% `c72dd855-43eb-4a05-a7ff-7943e6583235`。net 为 Claude 最新照片黑白橙 UI；com 保旧营销视觉并最小增加邮箱/当前后台。两站同原后端和 D1。0012–0014 已迁移，jiangyuan 原身份凭据已安全轮换，Judy 江牧组/Brisbane 微信已追加（7WA+7QR），邮件未来切点北京时间21:56:13已启用。原客户、13目标、城市/排序/游标/历史保护核对通过。

最终完整备份、真实版本、32组正式浏览验证、邮件已测/未测与兼容回滚要求见 [本轮正式终态](../data/design-review/integrated-release-2026-10-26/report.md)。下文版本与“待上线”说明均为历史，不应据此重复迁移、轮换或导入。

## 2026-10-26：独立 .net 新版与语言路径

https://eucove.net/zh 与 https://eucove.net/en 已上线，独立 `eucove-net` Worker 100% 版本 `b75eb9a5-27ff-48aa-89e5-956ba0545df4`；经 BACKEND 服务绑定复用现有业务真源，无 D1/R2/secret/cron 复制或迁移。`www.eucove.net` 308 保参转 apex。`.com` 保持 `60d1194d-5dcc-4940-a2f1-0c751d163c77`，版本/关键HTML与静态资源字节/配置绑定均未变。

Claude 最终UI、Sol语言路由/SEO/技术接线与320px英文表头窄屏换行修复已整合；36租12售正常。104测试、最终构建与冻结哈希、32组真实中英页面布局及真实后台登录/退出/Signal只读健康通过；完整原生D1备份及业务字段比对无变化，无真实分流/咨询/外发测试。证据、素材局限及仅net回滚说明见 [net发布终态](../data/design-review/net-release-2026-10-26/report.md)。以下为 `.com` 及历史部署记录。

## 2026-10-25 Meta 即时表单 → Google 表格 → TG / Signal

用户明确指令部署后，已发布 `60d1194d-5dcc-4940-a2f1-0c751d163c77`（100%），新增签名接入 `/api/integrations/meta-leads`、独立密钥与表格/表单白名单；无数据库迁移，静态资源无更新，保留原 Signal 即时发送。Google「3008房产中介 / 工作表1」脚本每分钟运行，从北京时间 21:44:39 起处理新线索，不自动分配，通知显示“等待主动分配”。首轮成功，原两条记录标记启用前未导入；线上鉴权及 TG/Signal 只读健康核验通过，无真实群测试消息。详情见 [Meta即时表单接入](Meta即时表单-Google表格与双通知接入.md)。下方版本仅为历史记录。

## 2026-10-25 最新：电话 / 微信 / WhatsApp 三方式直联

当前正式版本 **25baaaa8-d5d4-4c5b-8dcd-5113e7380530**，https://eucove.com 。0011仅新增电话动作事件；95/95及Cloudflare构建通过，正式390/430/1280中英只读验收通过。完整原生D1备份和逐字段比对确认原客户、7WA6QR、城市/排序/游标、模板、通知配置与历史保留；36租12售不变。本轮未发真实测试消息或创建生产假咨询。Pixel仍仅PageView，监控保持。

兼容备用版本 **15f424a6-4404-4209-8497-121b40e4ff70**（已上传未激活）保phone-aware后端及新后台，紧急时关闭新直联入口、保原表单；不能直接退a961/旧SQL覆盖新phone记录。实际备份/回滚步骤、限制和截图见 `data/design-review/direct-contact-methods-2026-10-25/production/report.md`。下面旧版信息仅供历史追溯。

## 2026-10-24 最新：WhatsApp进线语与通知正文

当前 **881bae3a-0fac-4c83-a414-c18c291b69c4**，https://eucove.com 。管理员 /admin/reception → WhatsApp 展开“WhatsApp 进线语”，全局中英文/城市服务变量/预览/保存；空值不预填，按保存lead生成官方WA草稿链接并固化文本版本，不改历史。0009增加设置单行和两可空快照列，现客户/7WA6QR/城市/顺序/游标/通知cutover全保留。

Telegram与Signal共享客户通知正文已去“登录后台查看”及后台网址，保实际WA/当次QR链接；不重发旧客户。76/76、Cloudflare构建、390/1280中英本地真实隔离直达及正式后台只读验收通过。Signal正常启用，无额外真实消息或Railway变更。完整证据与备份在data/design-review/wa-prefill-2026-10-24/report.md。以下为历史版本记录。

## 2026-10-24 最新：城市默认全部与微信名称

当前版本 **6036f0e7-9a6f-4890-9859-bd2d62fc687b**，https://eucove.com 。WA与微信均支持城市多选，cities=[]/缺省默认所有城市，非空限定范围；原已选城市不改。0008只替换原子trigger，现7WA/6QR、客户/历史/游标保留。六微信原图昵称及归档文件名缺失元数据已核对回填，新上传保实际原文件名（含中文），公开仍仅码体。新分配保存名称快照并供后台/TG/Signal共享，旧客户不回灌。此前所有公开房源入口去来源/核实日期小修完整保留，36租12售正常。

72/72及中文文件名定向35/35、Cloudflare构建、390/1280中英本地保存与正式只读验收通过。Signal正式鉴权健康且启用cutover保持，不发测试群消息，不改secret/设备/Railway资源。完整备份/保护比对/截图/实际旧文件名限制见data/design-review/reception-cities-2026-10-24/report.md。代码回滚优先91536d28-3375-45fa-9f6d-062c35b5d4a5（不动D1/R2/新业务）。以下旧节仅作历史记录，旧“空城市拒配/微信仅全局”已被用户新规则覆盖。

## 2026-10-24 房源公开展示小修

当前版本 **`86a32ecd-f2a7-4569-8ff1-9f35f2e58d68`**，https://eucove.com。按用户“所有入口”要求删除具体房源来源名/来源链接/核实日期展示节点，覆盖出租、成交、市场参考、历史、旧组件及深链；保真实可入住/成交日期、地图署名与市场参考非桉湾案例说明。内部来源审核metadata、原36租12售allowlist及96首图/缩略图哈希均保持，Signal/Telegram后端与生产开关不变；无迁移/secret/Signalstate/游标改动，未发通知测试。定向构建及线上390/1280中英DOM检查通过，证据在 `data/design-review/listing-display-2026-10-24/`。下面旧版本记录保留供追溯。

## 2026-10-23 本机验收后的正式发布

用户明确“部署”后已发布 **`78f99e43-82a6-4e53-bdaa-1e488c15cc9a`** 至 https://eucove.com，包含Claude手机header随页面滚动修复及独立Signal通知。0007迁移已应用；Signal从 `2026-10-23T15:14:35.948Z` 起仅处理未来正常新咨询，既有1条没有回灌。正式Worker→Railway签名健康链和固定群状态均核实，未发送真实群测试消息。

Railway启用部署 `a344dc9b-2f95-4a6f-ab04-72773e982372`，固定“做大做强”群；设备卷和幂等ledger私有，本机freeze不解除。36租12售/原接待配置/双池游标/历史保持。WA城市当前实查仍0条配置，不猜配。完整费用、备份过程顺序疏漏、恢复书签、实际验证与回滚方式见 [Signal云中继与本地验收](Signal云中继与本地验收.md) 首节，以下旧版本状态仅作历史记录。

域名为 `eucove.com`，规范地址为 `https://eucove.com`。下文原准备流程保留供参考；实际执行状态以本节为准，不能把旧的“未连接/未创建”验证记录当作当前状态。

## 2026-10-23 后续修复：已正式部署

当前版本 `ac88e9e6-98ec-4341-aa0b-a003f73c5c2c`，正式地址 `https://eucove.com`。本轮由 Sol 接手 Claude 已定设计上的技术接线与手机紧凑排版；不是把仍在提案的前端字段直接当成后台事实。

- 原先生产房源全关闭已由用户明确更新为精选48条发布授权：36套核验可租、12条已成交参考、182个房间、364个WebP处理图、0个视频。`server/public-viewing-release.json` 是显式最小字段/媒体允许清单；R2仍私有，仅受控GET/HEAD媒体接口开放所选哈希图。原始HTML、manifest、未选照片、3D和其他市场资料继续404。原源档案 `publicReuseApproved=false` 和来源审核保留；用户的网站发布指令不被写成图片作者许可。
- D1 0004–0006已迁移：严格WA城市子池、独立原子游标、未来通知同消息更新和查询索引。生产现有客户/接待ID/顺序/双池游标/历史均只读比对保留。没有用本地库覆盖线上。
- 7个WA号码均未获明确城市映射，保持 `cities=[]`。管理员到“渠道分流”每行编辑勾选可接待城市，再保存顺序与配置。空数组不接带城市咨询；无匹配保存咨询后说明未配置，绝不跨城兜底。无城市独立分享入口仍全局轮询。6个微信码维持独立全局池，不与WA配对。
- 新咨询通知明确含客户姓名、真实已保存电话/微信ID、房产城市，以及实际持久分配目标/链接/时间与操作记录。微信只留微信号时，电话如实为未提供。未来通知记 `message_id`，分配晚到则幂等更新同一条消息；旧已发消息不补发。后台读取同一assignment快照，分配不冒称已打开或已加好友。本轮仅mock通知测试，没有额外真实Telegram/Signal消息。
- 末步选WA提交成功后同tab直达；微信自动展示所配QR；电话普通成功。assign失败只重试assign。联系方式前后端必填；空白/null/缺失/错格式400，未入库、未分配、不通知。
- 手机六导航默认可见；首页承诺、services优惠压短；services单对照表；首页团队左文约2/3、右矩形头像约1/3，手机先文后图。About完整简介/十张人像源不改。

证据在 `data/design-review/production-fix-2026-10-23/`。迁移前备份 `data/deployment-private/release-2026-10-23/d1-before-city-routing-publication.sql`，迁移后比对私档 `d1-after-routing-migrations.sql`；均含真实业务，严禁发布或在聊天输出。凭据仍使用原私密文件，无重置。

回滚代码可用 `node data/deployment-private/release-2026-10-23/wrangler-safe.mjs rollback c8276812-542c-43cc-b7eb-a213cfa3f70e --env-file .dev.vars.example`，回到紧邻前一整合版本（含48房源/城市/同消息通知/手机排版）。新增字段向后兼容，不降级/覆盖D1，不重置游标，不删除R2或新客户。回滚会恢复旧UI及关闭房源展示；只有故障时使用。已有正常发送通知不能靠代码回滚撤回。

Cloudflare已能满足本轮功能，不需要迁至Railway；Signal桥接由独立成员准备，当前站点未配置、不声称可用。

## 首次发布历史记录（最新修复以上节为准）

用户明确授权 Sol 部署，随后自行开通 R2，并明确授权一次真实 Telegram 测试。网站已正式上线：`https://eucove.com`，`https://www.eucove.com` 308 跳转到主域并保留路径与查询参数。当前版本 `fd80b143-a1bd-4443-878a-f2a323c9101a`，2026-10-23 13:01:44 UTC 发布100%。账户 `b65685ed0ee606d73747149aff303600`，Zone `1ab5538aa9a868d6268d4accc4875288`，没有操作其他域名/Worker。部署前DNS为空；新增两条由Custom Domains管理的代理AAAA记录，没有覆盖邮件记录。SSL严格、Always Use HTTPS开启，Let's Encrypt证书Active，实际HTTPS和浏览器已验证。

- 已创建 D1 `eucove`，ID `f5f5b5d7-f6d0-4fd7-8aaf-0c58ece47204`，位置提示 OC，实际主区 SYD；0001–0003 迁移已成功。
- 已只迁入 7 个 WhatsApp、6 个微信纯码引用的分流配置，逐条核对 ID、JSON、position、enabled 完全相同，两个游标保留 1/1。正式库没有搬入本地客户、咨询、通知、用户、访问和事件；本地两条咨询及其历史留在本机备份。生产初始管理员由首次真实登录正常创建，现有角色/城市权限检查未绕过。原队列 position 兼容最新 queueOrder，无须改 0003。
- 新随机 SESSION_SECRET、生产管理员初始密码与既有 Telegram 配置通过 Wrangler secrets-file 作为5项secret_text绑定上传，值不输出。私密备份 `data/deployment-private/release-2026-10-23/production-secrets.json`，ACL只允许当前Windows用户与SYSTEM；不复用本地管理员密码。管理员邮箱使用已核实Cloudflare账号邮箱，登录页 `/admin/login`。这是初始生产密码，用户可在本机私密文件查看，不要复制进聊天或公开文档。
- 私有R2桶 `eucove-media` 已创建（OC），只上传已核对的6张纯QR，r2.dev与公共桶访问未开启。线上经Worker读取6图均200且SHA256与本地完全相同，原截图/昵称/头像/地点未上传。真实后台上传测试的临时纯码副本读回成功后已删除，原6图不变。未实扫二维码目标，不虚称验证了微信添加结果。
- 原R2 10042阻塞由用户开通后解除。OAuth账单API不含Billing Read，本轮没有购买/升级付费计划，不对账户实际账单作未经核实的断言。
- 正式 `DISABLE_TELEGRAM=false`，机器人及接收会话已由getMe/getChat/getChatMember核对，机器人为 `@house_form_bot`，正常outbox/每分钟Cron已启用。启用前后远程队列均0，无本地旧任务外发。`TURNSTILE_ENABLED=false` 保持，前端widget未接入，不误开后端验证。
- 唯一真实部署测试：2026-10-23 13:05:12 UTC，官方sendMessage返回 `ok:true`、`message_id:3`、HTTP200，内容明确“桉湾EUCOVE 网站部署测试｜非真实客户”，唯一标记 `EUCOVE-DEPLOY-20261023-a9ddc952-facd-406b-a8d7-09eefabbcc1b`。仅向已有配置私聊发送1条，没有重复、没有真实个人资料或CRM测试客户。当前没有安全内部系统测试入口，因此此条验证Bot API连通和发送，**不是线上表单→outbox完整端到端验收**；后者由本地真实workerd/D1/R2+mock外发测试覆盖。成功不代表用户已读，不要再运行发送脚本重发。
- 上线后第三方公开房源 **0 出租 / 0 成交 / 0 看房视频**；36/12 仍仅本地私有样品，不上传第三方图片或 3D。`/history` 从被关闭的 market API 得不到第三方记录；主站服务、团队、图库和准确标记的装修概念对比正常保留。
- 新增 `public/.assetsignore` 排除废弃立体预览、品牌草稿、data、reference-media、zip、map；Worker 同时明确拒绝这些路径，避免 SPA 回退变成伪成功资源。

本轮证据：`data/deployment-private/release-2026-10-23/`（私密SQL备份/配置/凭据/机器人回执/脱敏Wrangler执行日志），`data/design-review/cloudflare-release-2026-10-23/`（正式域名截图与真实API结果）。已完成61项本地测试、门控变更后19项定向测试、build:cloudflare；线上33项API检查含真实管理员登录/退出、D1会话、跨域403、上传签名400、真实图片上传读回及清理、6纯码哈希、健康、HTTPS/308、安全头、私有404。没有CRM/分流统计测试写入或WhatsApp发送。

首个兼容回滚版本为 `8bd7b71d-6df3-49db-aa69-3ae32f36b919`（同一应用与数据结构，通知暂停），如需回滚代码执行 `npx wrangler rollback 8bd7b71d-6df3-49db-aa69-3ae32f36b919 --env-file .dev.vars.example`；域名触发器与DB/R2独立，不会回滚数据或撤回消息。不要对已开始接收客户的D1重跑完整SQL导入、重置双池游标或用备份覆盖新咨询。发布后SQL备份仅本机 `data/deployment-private/release-2026-10-23/d1-after-release.sql`。任何后续资源删除或数据库恢复需单独审阅。

线上页面验收完成：390/1280各10页共20组，真实浏览器、无API mock、无脚本错误/横溢；首页/关于我们各10张团队照与装修对比已实际decode，完整照片截图为 `data/design-review/cloudflare-release-2026-10-23/production-*-loaded.png`。浏览器TLS1.3，证书subject eucove.com（实测issuer WE1）；Cloudflare另有Active Universal Let's Encrypt证书，二者均为实际查询结果。

本机单独的管理员访问文件为 `data/deployment-private/release-2026-10-23/production-admin.json`，只含登录地址/邮箱/初始生产密码，不含机器人Key；与发布目录同一受限ACL。请仅在本机打开，不要把内容发到聊天。完整终态见 `data/design-review/cloudflare-release-2026-10-23/final-report.md`。

## 架构与兼容

一个 Worker 托管 Vite 的 `dist/` Static Assets，并处理全部 `/api/*`。SPA 深链回退 `index.html`；Worker 先运行，因此 API 404、`www` 跳转、安全响应头不会被 SPA 吞掉。`server/` 的 Express/SQLite 本地开发方式保留，页面和 CSS 不需要改写。

D1 保留 `users/sessions/properties/owners/leads/notifications/audit` 原字段。`migrations/0001_existing_schema.sql` 建立现有结构，`0002_worker_leases_and_limits.sql` 增加通知租约令牌和持久限流表。服务选项及可选表单字段继续存 `leads.data` JSON。新咨询的客户、咨询、通知和结果读取通过一个 D1 `batch` 原子执行；相同 requestId 返回同一编号，修改内容的重放返回 409。关联房源有效性在同一批 SQL 内验证；房源下架后的原咨询重试仍能成功。

通知使用 D1 持久 outbox + `ctx.waitUntil` 快速尝试 + 每分钟 Cron 恢复重试，无需创建 Queues。60 秒租约、12 秒请求超时、唯一通知记录、5 次上限和 Telegram 429 全批延后保留；租约令牌阻止过期工作覆盖新工作结果。外部系统已收到、而确认响应丢失时，Telegram 仍可能重复通知；咨询记录不会重复。通知含编号供人工识别。

新密码使用 Web Crypto PBKDF2-SHA256（100000 次、随机盐），会话使用随机令牌、SHA256 存储、HMAC 签名 Cookie、8 小时有效期、HttpOnly/SameSite=Strict/HTTPS Secure。旧 Node scrypt 哈希可直接验证，成功登录后升级；Node 也能验证新哈希，便于本地开发或恢复。现有城市权限、用户角色、房源草稿、后台筛选、CSV 导出和通知手工重试保持。

普通后台上传图片放私有 R2，通过 Worker 的随机 `/uploads/<uuid>.jpg|png|webp` URL 读取；桶不要开启公共访问。上传最多 8MB，按实际文件头校验。第三方历史房源图片/视频只在本地 `data/viewing-source` / `data/viewing-video`，不导入 D1、不上传 R2、不打包到 Static Assets；Worker 始终拒绝 `/api/viewing-samples` 与 `/api/market-reference`，不能用变量或查询参数绕过。生产看房页显示资料准备中。

生产写请求只接受 `APP_URL` 同源 Origin，不提供跨域开放 CORS。D1 持久限流按 HMAC 隐去后的 IP 和时间窗计数：咨询 15 次/小时、登录 10 次/15 分钟；Cron 清理过期状态。安全头覆盖静态页/API/媒体，包含 CSP、HSTS、nosniff、frame-ancestors。日志只记录事件、错误类型、通知结果，不输出表单内容、Cookie、IP 或带令牌 URL。Traces 已启用但 `persist:false` 且不设外发目的地，避免保存 Telegram Bot API 路径中的凭证；不要未经脱敏评估改为持久保存自动外发 URL spans。

## 先在本地验证

项目锁定 Wrangler 4.152.0；Miniflare 随该版本使用 5.20261019.2-beta，测试使用其兼容转换 API，真实运行 workerd、D1 和 R2。需要 Node 22.13+ 或支持 `node:sqlite` 的当前 Node；本次验证为 Node 24。

```powershell
npm ci
npm test
npm run build
npm run build:cloudflare
```

`build:cloudflare` 生成配置类型、检查 Worker 类型、构建前端，再执行 **仅本地打包** 的 `wrangler deploy --dry-run`，不会上传或创建资源。打包使用 `.dev.vars.example`，不会读取已有 `.env.local` 的真实机器人凭证。资源 ID 目前是全零占位，域名 routes 尚未启用，`workers_dev/preview_urls` 都关闭。

本地 Worker：复制 `.dev.vars.example` 为已忽略的 `.dev.vars`，自行在本机填写不少于 32 字符的 SESSION_SECRET 和测试管理员邮箱/密码，保留 `DISABLE_TELEGRAM="true"`，APP_URL 设为 `http://localhost:8787`。不需要 Cloudflare 登录。

```powershell
npm run cf:migrate:local
npm run cf:dev
```

访问 `http://localhost:8787`；现有 `npm run dev` 仍使用 Vite + Node SQLite。两个开发后端的数据互不共享。Cron 在 Wrangler 本地不会自动触发，可访问 `http://localhost:8787/cdn-cgi/local/scheduled` 验证。不要给本地绑定增加 `remote:true`。

Turnstile 服务端开关默认 `TURNSTILE_ENABLED=false`，基础限流已启用。开启前还需要前端接入对应站点 widget，把 `turnstileToken` 随表单提交，action 固定 `enquiry`，并设置 `TURNSTILE_SECRET`；服务端会校验 success、hostname 和 action。当前前端尚未接 widget，因此部署时保持关闭，避免阻止正常咨询。

## 用户下达上线指令后：账户与资源

先由用户确认 Cloudflare 账户、Workers 的运行计划/密码派生 CPU 预算、D1 数据存放区域偏好、R2 是否可用、管理员身份及通知目标。不把 Token、初始密码或 SESSION_SECRET 发到聊天里，均通过本机交互式 secret 命令输入。以下命令目前均未执行。

```powershell
npx wrangler login
npx wrangler whoami
npx wrangler d1 create eucove
npx wrangler r2 bucket create eucove-media
```

`login` 会启动 OAuth 授权；如需严格权限，用户可按官方说明配置账户 API Token，并仅授予本次 Worker/D1/R2/DNS 所需范围。将创建返回的真实 D1 UUID 写到 `wrangler.jsonc` 的 `database_id`，核对账户与资源后执行：

```powershell
npx wrangler d1 migrations apply DB --remote
```

迁移仅对新 D1 执行。不要把现有完整 SQLite schema 再直接覆盖到已有 D1；后续修改新增编号迁移，保持兼容，D1 不使用手写 BEGIN/COMMIT 包裹运行时请求。

## 现有数据迁移（有业务数据时）

先停止旧站写入及旧通知发送、生成 SQLite 一致性备份，并保存旧代码和 uploads。不要在新旧站同时处理同一批 pending 通知。对备份执行只读导出：

```powershell
npm run cf:export -- --database data/backup.sqlite --out data/cloudflare-import.sql
```

脚本保留客户、咨询、请求哈希、账号密码哈希、房源、通知状态和审计；会话不迁移，用户重新登录；过期服务租约清零。附带 `.media.json` 只列业务房源引用的普通上传图片，不包含第三方样品。输出含客户资料和密码哈希，放已忽略的本地 `data/` 并按敏感备份保护；不会被程序自动上传。脚本拒绝覆盖已有文件，单条 SQL 超过 99KB 时停止而非生成不完整导出。

只向已迁移 schema 的**全新空 D1** 导入，避免与已有记录合并。先在另一份本地 D1 演练，再在用户批准的目标库执行：

```powershell
npx wrangler d1 execute DB --local --file data/cloudflare-import.sql
npx wrangler d1 execute DB --remote --file data/cloudflare-import.sql
```

D1 执行大导入可能分段，不能把这次文件导入当作整个业务事务；失败时重建新的目标库重试，保留旧库不动。核对用户/客户/咨询/通知/房源数量、请求哈希、城市权限、pending 通知状态，再切换正式绑定。`/uploads` 清单中的已获授权自有图片可按原文件名上传，保留数据库 URL；示例命令中的 UUID 和路径由实际清单替换：

```powershell
npx wrangler r2 object put eucove-media/UUID.jpg --file uploads/UUID.jpg --content-type image/jpeg --remote
```

不要把 `data/viewing-source`、`data/viewing-video`、候选图或历史市场清单上传到任何生产资源。

## Secrets、首次 Worker 与域名

首次先保持无 routes、workers.dev 关闭、`DISABLE_TELEGRAM=true`，使创建 Worker 和设置凭证阶段不产生公开站点或发送通知。用户授权后才执行首次部署：

```powershell
npx wrangler deploy
npx wrangler secret put SESSION_SECRET
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
```

ADMIN_PASSWORD 至少 12 字符，建议使用密码管理器生成。首次以该邮箱登录时创建管理员；若迁入库已有该邮箱，secret 不覆盖原账号或密码。设置 secrets 本身也会发布新 Worker 版本；若要先准备新版本而不立刻切换，可用 `wrangler versions secret put/bulk`，再按官方版本部署流程切换。凭证不能放 vars、源代码、文档、命令参数或前端 `VITE_*` 中。WHATSAPP_NUMBER 是公开业务号码，确认后填 vars；不填则按现有前端回退行为处理。

设置完毕，再向 `wrangler.jsonc` 添加：

```json
"routes": [
  { "pattern": "eucove.com", "custom_domain": true },
  { "pattern": "www.eucove.com", "custom_domain": true }
]
```

重新运行完整本地检查后，用户授权的正式发布才执行 `npx wrangler deploy`。同一 Worker 的 www 请求由代码 308 跳转到 apex，保留路径和查询参数。Custom Domains 会管理匹配域名的 DNS 和证书，先检查现有同名 A/AAAA/CNAME/MX，避免覆盖其他业务；不要手工添加虚构的源服务器 IP。确认 Cloudflare Zone 为 Active、域名使用 Cloudflare DNS、Universal SSL 证书已签发，开启 Always Use HTTPS；SSL/TLS 保持 Full (strict)，不使用 Flexible。纯 Worker 没有另一个自建源站证书需要配置。

上线检查：首页/服务深链、语言切换、预约抽屉、一次明确标记的咨询、后台登录/城市权限、普通图片上传、API 错误、安全头、www 跳转，以及样品接口 404。通知先禁用，核对接收 chat 与机器人权限、待发列表后，再经用户指令将 DISABLE_TELEGRAM 设 false 并部署。Cron 随配置生效，失败通知可在后台重排。

## 回滚与备份

发布前记录上一版本 ID，导出 D1，并保留原 SQLite/上传文件：

```powershell
npx wrangler deployments list
npx wrangler d1 export DB --remote --output data/d1-before-release.sql
```

代码回滚使用 `npx wrangler rollback <上一版本ID>`。Worker 回滚不会恢复 D1/R2 数据，也不撤销已经发出的通知；不要用旧数据库覆盖上线后新增咨询。优先使用兼容数据库的代码版本回滚。若必须恢复 D1，先停止写入并保存当前数据，在用户批准的恢复点内使用 `wrangler d1 time-travel info DB` / `restore DB --bookmark <bookmark>`；这是远程恢复，会影响恢复点后的数据，应先导出并计划补回新增咨询。R2 文件单独备份和恢复，不随 Worker 回滚。

## 部署前待用户确认

- 使用哪个 Cloudflare 账户、是否已启用合适的 Workers/D1/R2 计划，是否有数据地域要求。
- 迁移现有业务数据还是空库起步；旧站停写/通知切换时间和恢复责任人。
- 管理员邮箱、初始密码、SESSION_SECRET，由用户在本机设置；Telegram chat/权限及公开 WhatsApp 号码。
- apex 为主域、www 跳转、现有 DNS 是否承载其他业务，正式发布窗口。
- 当前历史房源样品继续仅本地；生产关闭。Turnstile 默认关闭，若要求开启，先安排 widget 接入。

参考：[D1 batch 原子性](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch)、[D1 迁移](https://developers.cloudflare.com/d1/reference/migrations/)、[Static Assets Worker 路由](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)、[Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)、[Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)、[Traces](https://developers.cloudflare.com/workers/observability/traces/)、[回滚限制](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)。


## 本地验收记录（2026-10-23）

`npm test` 54/54 通过；Worker 包含真实 workerd/D1/R2 测试，模拟并发咨询与 outbox 失败回滚、城市/角色权限、scrypt迁移登录、Cookie互通、R2文件头与上传、5次重试/429/租约、服务选项/顾问通知、Turnstile后端开关、Origin/限流和本地导出保真。外发请求全部拦截，未向真实机器人发送。

`npm run build`、`npm run build:cloudflare`（含类型生成与dry-run）通过；两份D1迁移已仅在本地Wrangler执行。390px浏览器在实际Wrangler本地Static Assets/D1上验证 /advisory 深链、URL服务预选、测试咨询入库、管理员登录和咨询列表，以及私有看房生产API关闭。没有连接线上账户；测试用本地Worker已停止，原5173/3001开发服务器保留。

新增主要文件为 `worker/`、`migrations/`、`wrangler.jsonc`、`tsconfig.worker.json`、`.dev.vars.example`、`scripts/export-cloudflare-data.mjs`、`server/cloudflare.test.ts`。Node/Worker共享 `server/policy.ts` 和 `server/notification-message.ts`；Node密码方法移到无数据库副作用的 `server/password.ts`，原auth导出兼容。package.json、锁文件和.gitignore包含本地工具与生成物规则。
2026-10-25 Signal 近实时优化已获明确部署指令并发布：Worker `406a45e3-5ce8-49f9-9e9c-1d7708b780ba` 让新咨询在请求内立即尝试 Signal，不再因未来 2 秒 eligibility 错过 `waitUntil` 后等待分钟 Cron；Railway `689b5bba-f460-4e67-bcf9-7a6e24961c3b` 复用长驻 signal-cli JSON-RPC 进程，保留原设备卷、固定群和幂等 ledger。发布后生产只读健康、设备、固定群及发送开关均为 true，没有发测试消息。完整说明及回退版本见 [Signal云中继与本地验收](Signal云中继与本地验收.md)。
