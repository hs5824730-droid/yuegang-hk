> 2026-10-25 近实时发送优化已正式发布：Railway 中继部署 `689b5bba-f460-4e67-bcf9-7a6e24961c3b` 将每条消息单独启动 Java/signal-cli 改为容器启动后复用单个 JSON-RPC 进程，并保持 `receive-mode=manual`、不下载附件/头像/贴纸/动态；原 `/data` 设备卷、固定“做大做强”群及幂等 ledger 均保留。Cloudflare Worker `406a45e3-5ce8-49f9-9e9c-1d7708b780ba` 将 Signal 新咨询 `next_attempt` 从未来 2 秒改为立即可处理，避免本次 `waitUntil` 跳过后等待下一分钟 Cron。95/95 项目测试、2/2 Relay 测试、Cloudflare 构建与 dry-run 通过；发布后只读核验 `healthy/stateLoaded/targetVerified/sendEnabled=true`，网站健康 200。没有造假客户或发送真实测试消息，因此不声称已测得群内端到端秒数；分钟 Cron、持久 outbox、固定目标、签名鉴权、失败重试与不确定状态保护均保留。旧 Railway 回退版本为 `a344dc9b-2f95-4a6f-ab04-72773e982372`，旧 Worker 回退版本为 `d8719b3f-50a3-4ef7-8f2e-6a2d2bd2f1eb`。

> 2026-10-24 最新通知口径：Cloudflare `d8719b3f-50a3-4ef7-8f2e-6a2d2bd2f1eb` 已发布精简共享模板。TG/Signal仅显示客户姓名、联系电话、房产城市、分组、类型、联系方式种类、分流渠道、分配目标、分流名称、北京时间；不再带标题/优惠/编号/任何链接。北京时间固定Asia/Shanghai，取咨询原始created_at；微信只有ID时电话写未提供，ID放同一联系方式种类行。完整分流链接仍在后台快照，WA进线语独立保留。旧sent不重发。本批80/80测试及Cloudflare构建通过，只读验收完成，没有新增真实测试消息或Railway变更。证据：data/design-review/notification-compact-2026-10-24/。下方较早批次格式/测试记录仅为历史，不代表当前通知正文。

# Signal 中继与本地验收

## 2026-10-24 最新授权：两频道新版通知模板各1条

用户明确“都发一次测试看看”后，于北京时间11:20:15向原Telegram会话、11:20:47.725向固定“做大做强”Signal群各发送1条完全相同的新版示例通知，均获真实发送回执；不是重放10:52连通测试。文本明确“模板测试／非真实客户”，虚构测试客户、ACMA官方创作保留号码、Sydney及模拟接待WA预填链接，没有后台网址。没有打开/发送WA或造生产lead/assignment/outbox。

消息/每渠道唯一intent与真实回执、同文hash、发送前后13业务表与原session不变的审计，私有保存于data/deployment-private/signal-cloud/both-template-tests-20261024/。Telegram是官方Bot API运维直发，Signal是HMAC生产Relay→CLI→固定群；不声称走了伪造客户的Worker outbox E2E。发送成功不代表成员已读。网站仍881bae3a-0fac-4c83-a414-c18c291b69c4，无部署/资源/secret/接待配置或cutover修改。以下无额外测试等表述均为各历史批次当时状态。

## 2026-10-24 当前通知正文

网站现版本881bae3a-0fac-4c83-a414-c18c291b69c4。按用户明确要求，Signal与Telegram新咨询共用客户通知模板，已删除后台提示和后台网址，保真实已分配WA/QR链接、姓名/有效联系方式/房产城市等。WA进线语是另一项客户聊天草稿设置；不会替客户发消息。旧咨询不因正文调整重发，本轮没有额外真群测试，既有Signal启用cutover/Relay/设备均保持。完整证据见data/design-review/wa-prefill-2026-10-24/report.md。

## 2026-10-24 用户授权的一条真实群测试

用户明确“在群里发个消息”后，仅向固定“做大做强”群发送一条非客户连通测试。北京时间10:52:48.218获得正式Relay `200 / ok:true`及真实Signal timestamp；不是mock或accepted队列，不等于群成员已读。Worker→Railway签名健康链真实核实；本条发送从受控本机运维HMAC脚本→生产Relay→Signal，没有创建假lead，因此不声称走了Worker咨询outbox自动发送全链。

唯一intent/幂等ID/原文/真实回执及前后D1业务表比对保存在 `data/deployment-private/signal-cloud/single-group-test-20261024/`。没有发Telegram、其他群或客户资料；既有咨询/目标/城市/游标/通知配置保持，无发布或迁移。旧节“未发真群测试”仅是当时历史状态。

## 最新：2026-10-23 验收后已获部署指令并正式启用

用户在本机验收阶段后明确回复“部署”，以下正式状态覆盖下文保留的暂停期记录：

- 网站 **https://eucove.com**，当前 Worker **`78f99e43-82a6-4e53-bdaa-1e488c15cc9a`**。先以 Signal 关闭状态发布 `110f5a68-1a10-4621-8711-41244b7a753e`，核验真实认证链后才启用。
- Railway 修正版 `ec7defde-80ba-43e8-ada7-380e2e597dcb` 已部署且真实重启后核验设备/固定群记录保留。启用发送后的部署为 **`a344dc9b-2f95-4a6f-ab04-72773e982372`**，SUCCESS，状态 `stateLoaded=true, targetVerified=true, sendEnabled=true`。目标仅“做大做强”，群 ID 不公开。本机真实客户端0，freeze保留，网站不依赖电脑运行。
- 0007 已应用，Worker 秘密已安全配置，正式鉴权 `/api/admin/signal/status` 已核验 Worker→Railway HTTPS/HMAC 链，`enabled/healthy/targetVerified/sendEnabled` 均 true。
- **未来咨询启用点 `2026-10-23T15:14:35.948Z`，北京时间 2026-10-23 23:14:35.948**。此前那1条咨询没有生成 Signal outbox。没有回灌历史；没有真群测试消息，没有假客户提交。只对之后正常新咨询自动处理。真实 Signal 群送达/已读尚未测试，不能把健康核验当成群送达。
- 后台咨询详情已补每条 Signal `status/syncStatus`，旧咨询显示此咨询未启用；Telegram及分流快照原逻辑保留。WA7/微信6，真实 WA cities 仍全部未配置；没有凭姓名号码猜城，也未导入覆盖现配置。
- Claude 本轮唯一手机 header 修复随本版上线：≤1023px 六导航默认可见、header 随页面滚走、目录顶端定位，桌面保留。实际390/1280中英首页/services/在线看房/admin登录检查通过。
- 线上36租/12售、182房间、0视频保持；新检查48套封面及缩略图96个哈希、6个纯二维码哈希均通过。私有素材/Signal state/RPC路径仍拒绝；三种方法空联系方式400，不新增咨询。

备份过程存在执行顺序疏漏，已记录而不掩盖：常规D1导出接口先返回10000；自制一致性查询又遇compound SELECT限制7500。0007只增表/触发器先执行，完整业务快照在其后才补齐；已额外保存迁移前 `2026-10-23T15:06:00Z` 的 D1 Time Travel 恢复书签。JSON私密一致性快照、启用前后备份在 `data/deployment-private/signal-cloud/`，不公开。之后比对 owner/lead/targets/assignment/events/两个cursor表完全相同；只新增频道配置/schema及正常管理员登录审核信息，未覆盖真实记录。回退不能直接恢复旧书签覆盖后续业务。

本轮 `npm test` 71/71、relay2/2、`build:cloudflare`通过。正式检查证据及当前状态在 `data/design-review/signal-cloud-2026-10-23/`。既有Pro无套餐升级，单副本0.75GB/0.2vCPU；卷容量50GB，平台元数据含实际占用约1.057GB，按实际占用计费，预估仍约US$5–12/月，非账单承诺。官方已核实旧railway.json目前仍支持至2026-12-01，不以未来弃用阻塞本轮，迁移IaC安排后续维护。

代码回退优先关闭 Signal 新入队/发送，再回到关闭版 Worker `110f5a68-1a10-4621-8711-41244b7a753e`，保留新UI与数据库、outbox、设备卷和ledger；需要整站旧版才用 `ac88e9e6-98ec-4341-aa0b-a003f73c5c2c`。不得清ledger或历史队列重发，不能解除本机freeze双活。

---

截至 2026-10-23，用户最新要求是先本机验收、之后明确确认再部署。本文件区分已发生的云操作和待发布代码，不代表启用许可。

## 当前状态

| 项目 | 真实状态 |
| --- | --- |
| eucove.com | 保持原正式版本 `ac88e9e6-98ec-4341-aa0b-a003f73c5c2c`，本轮未发布 Worker |
| Railway | 新建隔离 `eucove-signal` 项目、同名服务和私有卷，新加坡单副本；未更改其他项目或账号套餐 |
| 已部署容器 | `6b5b2028-e0e0-49c2-85f1-55a69ffa0f59`，在暂停指令前部署 |
| 设备迁移 | 暂停指令前经 Railway 鉴权 TLS 文件接口上传至卷，Linux 设备资料和唯一确认群记录可读取，容器重启后再次核实成功 |
| 云端发送 | 始终 `RELAY_SEND_ENABLED=false`；没有发送真实 Signal 消息 |
| Cloudflare Signal | 未设置新秘密、未应用 0007、未切换开关，未与 Railway 接通正式通知 |
| 本机真实设备 | `migration-freeze.json` 保留，没有解除；未运行本机真实 Signal CLI，不得双活 |
| 本地验收 | 独立 SQLite + 模拟 Signal relay + 模拟 Telegram，网站当前源码，全部外发消息被阻止 |

云端设备核验是读取迁移状态和指定群记录，不等同真群发送、对方收取或已读验证。未进行真实群消息测试。暂停后仅核对已发起操作的结果，没有继续云发布或启用。

## 给用户的本地入口

- 局域网：`http://192.168.100.110:5180/__local`
- 本机：`http://127.0.0.1:5180/__local`
- 网站及委托咨询：`http://192.168.100.110:5180/?service=rent`
- 后台：`http://192.168.100.110:5180/admin/leads`
- 接待城市多选：`http://192.168.100.110:5180/admin/reception`
- 独立启动：`npm run review:local`。与原 5173/3001 预览分开；已启动时不要重复启动。

**仅本地模拟账号**：`review@example.test` / `LocalReviewOnly2026!`，不是正式管理员。必须先到后台登录，通知预览才可读取。只填写虚构姓名和联系方式，不要把测试账号用于生产。

实际数据目录 `data/local-review/signal-acceptance-2026-10-23/`，旧试跑目录保留，不覆盖生产 SQLite/D1。重启后本地咨询、分流游标和模拟回执保留。验收脚本不读取生产秘密、真实 Signal 设备包或真实接待目标。

### 可操作的验收步骤

1. 打开网站，中英切换，选择服务及城市，最后一步不填联系方式应阻止提交；电话、WA、微信均必填自己的联系方式。
2. Melbourne 的两条**虚构** WA 目标轮流分配；Sydney 只匹配模拟 A；其他未配城市不跨城。后台可自行多选城市，调整只作用于本地。
3. 选 WA 后直接到本机“直达已拦截”回执页，没有打开真实 WA；选微信直接显示明确写着 `NOT A WECHAT QR` 的演示图，没有真实可加好友二维码；电话只保存回访。
4. 在后台看同一咨询的目标快照、链接及事件状态。返回 `/__local`，看 Telegram 和 Signal 两个模拟通知，包含姓名、联系方式、房屋城市与实际分流结果。
5. 切换 Signal 模拟 `network`、`429`、`unavailable`，再填一个虚构咨询：咨询保存和 Telegram 预览不受影响。恢复 `ok`，点“立即处理可重试队列”。
6. `uncertain` 表示无法确认是否已发出，**不会自动重发，也不会因新分流修订绕过保护**。这是防止重复通知的人工核查状态；不要把它当作可反复重试的网络错误。

本地截图与证据在 `data/design-review/signal-cloud-2026-10-23/`。桌面和 390px 实际运行页面已检查。模拟通知成功只证明本地链路，不冒充真实群发送。

## 实现及安全边界

- `signal-relay/` 是唯一 Docker 构建上下文。Dockerfile 只复制中继源码与安全恢复脚本；`.dockerignore`/`.railwayignore` 排除设备包、数据库、私密资料。
- 运行 Node 24 + Linux Java 25 + pinned `signal-cli 0.14.9`；下载包 SHA256 固定。signal-cli 是 GPL-3.0 的第三方非官方客户端，不是 Signal 官方 Bot API。镜像保留其授权资料，维护时提供对应上游源码地址。
- `/health` 仅返回健康布尔值。`/v1/status`、`/v1/verify`、`/v1/messages` 使用 HMAC-SHA256，包含时间戳、随机 nonce、方法、路径和请求体哈希；90 秒有效窗，nonce 持久防重放；固定时间比较。
- 调用者只提交 outbox ID、revision、文本，不能指定群、账号、收件人、CLI 命令。群 ID 只从私有卷目标文件读取；仅确认的“做大做强”。没有公开 RPC、收信、扫码、状态下载或通用命令接口。
- 不运行 daemon，不主动 receive 历史消息。Java 操作按需串行运行，原始输出只在内存校验后丢弃，不输出账号、群 ID、客户内容或密钥。
- 私有卷持久保存设备状态及幂等 SQLite；发送前写 intent。明确成功返回同一 receipt，后续修订编辑原消息；中途崩溃/无法确认的发送停在 uncertain，不盲目重复。Signal 协议没有由应用提供的绝对 exactly-once 保证。
- Worker 使用 Web Crypto HMAC，只访问 HTTPS Railway 域名，不跟随重定向。Node/Worker 共用消息 formatter、保存的客户资料和持久分流快照。
- `signal_notifications` 与 `notifications` 分表、独立租约、五次上限和重试。初次信号通知延迟至少两秒聚合快速分流，cron 后备最长通常约一分钟；分流或展示事件晚到时，以 revision 更新原条消息。
- 生产启用需运行时开关和 D1 `notification_channels` 启用时间双门控。只对启用后新入库咨询建 Signal outbox，旧客户没有回灌或回发。
- 鉴权后台 `/api/admin/signal/status` 可验证 Worker 到中继的认证健康链，不会发消息。`Lead.signalNotification` 含 status、syncStatus、attempts、revision、deliveredRevision、editAttempts、receipt、sentAt、error；旧记录为 null。原 Telegram 状态字段保留。
- Telegram/Signal 错误隔离；意外工作器错误只记录渠道和通用事件，不记录客户内容或原始远端错误。Signal 的不确定/编辑失败可在鉴权数据中辨识，不用“已读/聊天成功”冒充回执。

## 用户本机验收后，仍待明确批准的发布动作

1. 对当时最新正式 D1 做私密只读备份，核对新增生产客户及原接待配置/游标；不导入本地测试客户。
2. 发布已本地修复的 relay 版本，包括跨 revision 不确定状态保护、严格群成员标记校验；仅单实例挂原卷，不重新导入或重复创建资源。
3. 安全设置 Worker 的 `SIGNAL_RELAY_URL` 和 `SIGNAL_RELAY_SECRET`，应用只增表/触发器的 `0007_signal_outbox.sql`，先保持 `SIGNAL_ENABLED=false`。
4. 发布后通过鉴权后台只读核验 Cloudflare→Railway HTTPS 链；目前只做了本机调用和 workerd 模拟，不能称这条正式链已验收。
5. 确认唯一群、认证和幂等状态后，设置明确的未来启用时间，再启用服务和 Worker 开关。无历史回灌，不发送额外测试消息。用户若要求真群测试，必须单独取得明确指令。
6. 正式前端要与 Claude 当时验收通过的版本一起协调。原正式前端另有私密冻结备份，不能把本次构建当作已获准的新 UI 发布。

## 费用、运维与回退

已经核实目标账号为用户既有 Pro workspace，没有新开更高套餐。新服务硬上限已设 **0.75 GB RAM、0.2 vCPU、单副本、无休眠**。授权预估仍约 **US$5–12/月按实际用量**，不是账单保证；无真群发送负载测量。计费依据为 Railway 当时官方 RAM $10/GB/月、CPU $20/vCPU/月、存储 $0.15/GB/月及流量。既有 Pro 账号最低套餐费用另属原账号，不是本次新增升级。

Pro 新卷平台默认容量 50 GB，平台不支持缩小；**不是写满/按 50 GB 数据量计费**，按实际用量含文件系统元数据计费。本服务无头像、附件、消息缓存，设备资料很小；计划目标约 1 GB 实际占用以内，持续观察真实账单。未自行增加付费套餐。

回退时先关闭 Worker 新入队开关及频道配置，再关闭云 relay 发送；不删 D1/R2/既有业务，不删除设备卷。数据库新表可保留，回退旧 Worker 不需要回滚迁移。中继代码回滚需保留原 ledger 和设备卷；uncertain 必须人工核查，不清 ledger 重发。

需要恢复本机真实设备时，必须先确保云实例完全停用并形成迁移计划，不能仅删除本机 freeze。保留原始状态和受 ACL 保护的包；本机模拟验收永远不解除 freeze。断线/Signal 版本失效时先只读诊断，必要时经过用户扫码重新绑定。signal-cli 要持续跟随上游，不能承诺长期不升级。

Railway CLI 提示旧 `railway.json` 将于 2026-12-01 停用；再次发布前须按官方 IaC 迁移流程准备 `.railway/railway.ts`，只管理此独立项目、保留 secrets、审查 plan 后再应用。当前暂停阶段未执行任何云 IaC 迁移。

官方依据：[Railway 费用](https://docs.railway.com/pricing/plans)、[卷与单实例限制](https://docs.railway.com/volumes/reference)、[IaC 迁移](https://docs.railway.com/infrastructure-as-code)、[signal-cli 0.14.9 源码与运行要求](https://github.com/AsamK/signal-cli/tree/v0.14.9)。
