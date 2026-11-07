# 2026-10-30 当前公开联系流程：客户留下联系方式

用户取消公开主动联系，两站统一“留下你的联系方式 / Leave your contact details”。电话、微信号和 WhatsApp 号码仍可作为客户的首选回访方式填写，提交后仅显示成功回执，由团队跟进。手机底栏仅保留一个留资按钮；旧 `/contact/phone`、`/contact/wechat`、`/contact/whatsapp` 链接也显示同一留资表单。新增业务登记、Google 同步及两站各自设计保留。

正式 `.com` Worker 设置 `PUBLIC_DIRECT_CONTACT_ENABLED=false`，Node 示例亦关闭；公共 `/api/reception/assign` 与 `/api/reception/events` POST 返回 410，不创建分配或匿名通知，并暂停原直联通知队列的后续投递。`.net` 经原 Service Binding 使用同一后端设置。原核心分流代码、后台配置、历史快照和通知队列保留，不重算历史客户。若变量缺省，兼容原 API；正式配置不能删除该关闭开关。

`.com` 原版基线仍按 manifest 校验；构建仅对输出副本作有计数检查的两处业务补丁，取消表单自动开聊并统一提交文案，公开入口补丁负责留资按钮。不能拿 `.net` 首页覆盖 `.com`。

以下为已被本节覆盖的历史直联规则。

# 2026-10-26 通知接粉人员（本机待验收）

Telegram 与 Signal 每次通知在“分流名称”后增加“接粉人员”。网站咨询、Meta 即时表单和网站直接联系使用同一规则：

- 已分流：取该次分流目标保存的组名，例如“江鹏组”显示“江鹏”。二维码昵称、原图文件名不作为接粉人员；以后修改配置不改写旧分流归属。
- 未分流或暂无匹配目标：按江承裕 → 江牧 → 江鹏循环分配。两个机器人、失败重试与消息更新共享一次持久分配，同一咨询不会重复消耗轮次。
- 先回访、后选择微信或 WhatsApp：后续通知更新为实际目标组人员。回访轮转独立于微信与 WhatsApp 号码/二维码分流游标。
- 迁移 `0012_notification_recipients.sql` 只创建独立轮转表和游标，不重发历史成功通知，不修改历史客户、号码或二维码。Node 与 D1 共用规则；本地导出保留接粉人员及轮转位置。

本项只负责内部通知中的接粉归属，不代表客户已加好友、已接通或已开始聊天。实际客户联系电话仍来自客户原始提交。

验收用临时数据库和模拟 Telegram/Signal，不发送真实消息。核心验证：三人顺序、并发公平性、同键重试、双渠道一致、迟到分流覆盖、配置快照、Meta 表单、直接联系、重启与导出导入。

# 2026-10-24 WhatsApp进线语

全局设置GET/PUT /api/admin/reception/whatsapp-prefill仅管理员，PUT {zh,en,expectedVersion}，成功返回{zh,en,version,updatedAt}；旧版本保存409。空语言不预填，恢复默认须保存。变量仅{房屋城市}/{city}、{服务类型}/{service}，纯文本500字符，预览与实际草稿按1200编码字符保Unicode截短。

POST /api/reception/assign可选service/language供独立分享；有leadRequestId则从保存lead读取city/service/language，忽略前端服务/语言覆盖，并继续校验city。新assignment带whatsapp_text/version及target snapshot.prefillText/templateVersion。响应target.url是唯一官方目标链接；客户直达/后台/两机器人复用该快照，不用新模板重算旧记录。微信不加text。0009默认设置INSERT OR IGNORE、旧行仅加NULL列，所有cursor不动。

Telegram/Signal正文删除后台提示/网址，保实际目的地链接；UI后台内部deep link照常，旧客户不批量补发。以下城市空值=所有城市、独立双池等规则继续有效。

# 2026-10-24 当前城市与二维码名称规则

用户新指令覆盖下文旧规则：WA、微信均按已保存咨询的房产城市进入各自独立城市子池，`cities=[]` 或缺省表示所有城市；非空数组限制到所选城市。没有 city 的分享入口仍走独立全局池。指定城市不在目标范围时不会跨城；重试、历史快照及既有游标不重置。

后台两个渠道都有城市多选。微信增加 `displayName`（可编辑后台名）、`originalName`（原图可见昵称）、`originalFileName`、`fileNameSource`（upload/ archive）及 `note`。六张旧图只有归档文件名可追溯，不能伪称找回用户上传原名；以归档标签显示。新上传接口返回安全 basename 原文件名。纯码公开页与公共分配响应仍不暴露这些后台元数据。新 assignment 固化名称快照，Telegram/Signal与后台读取同一快照；旧记录不补写、不重发。

0008仅替换原子分配 trigger，不更改旧 assignment、target ID、position、enabled、city选择或任何游标；Node使用等价事务升级。配置保存改为按ID upsert，删除仅限管理员确实移除的目标。

---
以下为历史实现记录，遇冲突以上方当前规则为准。

# 独立渠道分流（最新规则，覆盖旧人员配对方案）

仅本地实现，未部署/提交/推送/外部上传。用户最后明确 WhatsApp 号码与微信二维码无人员对应关系；不绑定 ADVISORS/member，也不公开昵称、头像或地理信息。

## 本地入口

- 通用选择页：http://127.0.0.1:5173/contact （只选渠道，零分配）
- WhatsApp：http://127.0.0.1:5173/contact/whatsapp
- 微信：http://127.0.0.1:5173/contact/wechat
- 管理入口：http://127.0.0.1:5173/admin/reception （既有管理员权限）

表单成功内容保留，增加两个入口；提交本身不分配，失败不分配。点击哪条渠道链接，才在该渠道分配；关联成功咨询的 requestId 由浏览器历史状态传递，不暴露在链接查询参数。界面跳转关闭抽屉并保留新页面地址。既有表单幂等、业务负责人、通知和校验不改。

## 真实本地配置

WhatsApp 顺序：江鹏组 +61480821715、+61480821558；江牧组 +61468128870、+61468248159、+61468151128；江承裕组 +61468226012、+61468283812，共7条。

微信独立顺序：江鹏两张码→江牧两张码→江承裕两张码，共6条；不再讨论某号码是否缺码。组名只是后台管理标签，无权重。两个渠道独立持久游标；配置保存不重置游标。按当前启用列表的组顺序、目标顺序展开循环。

配置存于本地数据库 reception_targets，导入依据 `data/reception-source/channel-config.json`。此前人员配对配置标为 `.superseded`，仅保留私下历史，不再读取或导出旧人员队列。原图完整保存在 `data/reception-source/`，该目录不公开；展示图仅写入本地 uploads，不向外部服务上传。

六张 PNG 均严格原像素 extract，无重绘、缩放加工或插值保存；逐像素核对裁切区域相等。保留至少四个二维码模块宽度的白边，CSS 不拉伸比例、不加圆角或遮挡。江鹏图1 488x488、图2 496x496；江牧图1 488x488、图2 744x744；江承裕两张均488x488。裁切坐标、哈希与纯白边核验见 qr-verification.json / jiang-mu-qr-verification.json / jiang-chengyu-qr-verification.json。

未实扫：本机无 cv2/pyzbar/zxingcpp，浏览器 BarcodeDetector 不可用；未安装程序或远程解码。江鹏两码图案高度相似，37x37 模块中心抽样只有1位差异，可能来自压缩/采样，不能认定同一或不同目标。按实际收到两条保留，内部注明待实扫核对。

## 原子性、幂等与统计

每个浏览器历史条目保存不可预测访问 UUID，不保存轮询计数。刷新、返回该条目、StrictMode/网络重试复用 UUID。新链接访问生成新 UUID；唯一键为 (channel, request_id)，同 UUID 跨渠道不会串池。仅 GET/HEAD、普通分享预览和不执行页面脚本的预取不消耗轮次，实际页面 POST 才分配。

SQLite 与 D1 共用 SQL 触发器、服务端游标与核心逻辑。只有成功插入新分配行才原子推进相应渠道游标；不影响另一渠道。无配置返回 null，不显示假号码/二维码。配置修改不改写历史快照。普通新访问与表单选择渠道均按访问计数，成功表单仅关联已有咨询。

WhatsApp 固定官方 wa.me 域名，由用户主动点击打开，不自动发送消息。官方格式依据：https://faq.whatsapp.com/5913398998672934 。微信只显示二维码，图片实际加载后记录展示；不声称任意微信号可直接打开加好友。

后台按渠道、组、目标 ID、时间查看访问分配、WhatsApp 按钮点击或微信二维码展示，并关联已有 lead。全量总数、最近200条明细；所有计数不是实际聊天、好友或加粉量。分流记录不保存访客 IP；既有限流用于反滥用。前端事件记录为尽力发送，断网或拦截可能漏记，不能当作转化事实。

## 接口与迁移

- POST /api/reception/assign：{requestId,channel,leadRequestId?} -> {id,channel,target:{id,value}|null}。公共响应不包含组标签、人员姓名或其他渠道。
- POST /api/reception/events：{requestId,assignmentId,channel,type}，type 为 whatsapp_click 或 wechat_qr_view；同动作重试复用 ID。拒绝跨渠道、无目标及错误动作。
- GET/PUT /api/admin/reception：仅管理员，PUT {targets}。号码必须含 +国家码；微信只接受本地安全上传 UUID 图片路径；最多100条。二维码上传复用现有8MB、文件签名及权限检查，禁 SVG/任意外链。
- 新表 reception_targets、reception_channel_cursor、reception_channel_assignments、reception_channel_events；未来 D1 在既有迁移后应用 0003_reception.sql，本次不执行部署/远程迁移。未发布的0003已整理为最新独立渠道表；本地开发阶段遗留的人员配对表不再读取或导出。
- 本地导出适配新渠道表、两个游标、历史二维码引用；先导入分配后导入 targets 避免导入推进游标，不导出废弃配对表。未导出真实数据库。

## 验证

相关 Node/真实本地 workerd+D1/既有表单与通知 mock 检查23项通过。包含20并发分配、12同键重试、跨渠道同键隔离、启停/零配置、组/目标统计、动作幂等、鉴权/同源、成功咨询关联及本地导出再导入。

390/1280中英四组浏览器 mock 通过：五号码与四码独立顺序；通用/成功页不分配；选择后正确关联；刷新/返回幂等；仅QR、不泄露身份；后台渠道配置排序保存/统计；无横溢/浏览器错误。首次真实数据库配置核对为5+4；第三组追加后为7+6，原目标ID/设置、两个游标及历史统计逐项/哈希核对不变，没有用真实配置产生咨询或测试轮转。第三组390/1280中英mock与临时库完整7/6循环、非零游标保留/启停测试通过；见routing-third-group-*。所有测试咨询/外链均拦截，无真实WhatsApp跳转或消息。

最新证据仅使用 `data/design-review/routing-*`、`routing-browser-results.json`。此前 `reception-*` 截图属于已被纠正的中间方案，不作为本次验收依据。

## 后台简表排序补充

最新后台支持每渠道跨组自由拖行；组仅标签。可选queueOrder字段写入既有position列，无新迁移。无queueOrder的旧配置仍按组序/组内序兼容，不能用旧导入脚本无意覆盖手动顺序。当前批次只用临时库或mock验收保存，没有更改实际业务库7WA/6QR的顺序、游标和事件。详见 `后台UI与交互改版方案.md`。
