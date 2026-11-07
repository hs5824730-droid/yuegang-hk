# Meta 即时表单 → Google 表格 → TG / Signal

配置日期：2026-10-25。用户明确同意部署后，接收接口已正式发布，Google 每分钟同步已开启。

正式 Worker 版本：`60d1194d-5dcc-4940-a2f1-0c751d163c77`，100% 流量。上线前版本：`406a45e3-5ce8-49f9-9e9c-1d7708b780ba`。专用签名密钥随版本添加，原有 secrets、页面静态资源与 Signal 即时发送功能保留，无数据库迁移。

启用时间：北京时间 **2026-10-25 21:44:39**（`2026-10-25T13:44:39.376Z`）。`SYNC_ENABLED=true`，已安装 1 个每分钟触发器。21:45:09—21:45:11 首次手动执行成功，Google 表格已追加四个状态列，两条原有记录均标记“启用前记录未自动导入”。

线上核验：健康接口 200；未签名请求 401；正确签名但无客户内容的空对象请求 422，证明线上签名接入已配置而未创建假客户。TG 配置正常；Signal configured/enabled/healthy/stateLoaded/targetVerified/sendEnabled 全为 true。未发送真实群测试消息，不声称已经验证新客户到群的端到端延迟。

部署证据与 D1 上线前只读导出保存在 `data/meta-sheets-20261025/`（git 忽略）。如需暂停，先将 Google 脚本属性 `SYNC_ENABLED` 改为 `false`；不要删除表格记录或修改原有通知渠道。回退网站前先处理或暂停新增 Meta 队列，避免旧版本使用旧文案处理尚未发送的记录。

## 已绑定

- 比特浏览器 198；Meta 广告账户 `1691000435871525`。
- 主页「澳洲置业顾问」；即时表单「桉湾 EUCOVE｜出租与托管咨询-copy」，ID `1582715546500811`。
- Google 表格：[3008房产中介](https://docs.google.com/spreadsheets/d/1bag155UA73syn8urkLisBSjQ6SwG5y2CL3h8ninS7UI/edit?pli=1&gid=0#gid=0)，工作表「工作表1」。用户已手动连接 Meta。
- [Apps Script：EUCOVE｜Meta表单到TG与Signal](https://script.google.com/u/1/home/projects/1yxlrvBuWa_MQG0yxEz62yQ3FMoPWy65IpPIMORoaWtm7qflDPdUCMPbo/edit)，Google 账户 `hs5824730@gmail.com`。
- 脚本与本地 `scripts/meta-leads-sheets.gs` 内容逐字核对一致；8 个脚本属性已保存，已启用自动同步和每分钟定时触发器，没有发送真实测试通知。

## 收集和通知规则

继续使用现有表单，不增加姓名或短信验证。读取 `id`、`created_time`、`form_id`、`phone_number`、`📍_房屋所在城市`、`🏠_您需要的服务`，保留城市和服务的全部多选答案。处理 Meta 原生 `l:`、`f:`、`p:` 前缀，不猜测缺失时区或科学计数法编号。

TG 和 Signal 使用同一份原有 10 项通知格式。姓名未收集时显示“未提供”；分流渠道显示“未自动分流”，分配目标显示“等待主动分配”，分流名称显示“未设置”。时间取客户提交时间，转换为北京时间。不额外添加标题、线索编号、优惠或链接。

新线索写入现有后台及两个通知队列；不调用接待分配，不占用城市轮流接待顺序。按 Meta 线索编号去重，重试不会重复创建咨询。相同编号内容冲突需要人工核对。

## 本机验收

执行 `npx tsx scripts/meta-leads-local-review.ts`，打开 `http://127.0.0.1:5191/review`。本次局域网入口为 `http://192.168.100.110:5191/review`，是否可从其他设备访问取决于本机防火墙。

验收使用内存独立数据库和虚构联系方式，真实表格、线上数据库、TG 和 Signal 不被写入。预览展示首次导入、重复导入和双渠道模拟发送结果。静态回执保存于 `data/meta-sheets-20261025/local-review.txt`。

已完成 101 项项目测试、TypeScript 检查、Cloudflare 类型检查及构建 dry-run；后续原生编号前缀修正的专项测试通过。真实 Worker/D1 本机模拟验证：签名接口可接收无浏览器 Origin 的请求，普通网站表单仍保留 Origin 校验。

## 已执行的发布流程及后续运维

1. 将签名接收接口随当前网站代码部署。先复核本次发布范围，避免携带无关网站改动；不改 Meta 广告投放状态。
2. 网站配置 `META_SHEETS_SPREADSHEET_ID` 为上述表格 ID，`META_LEAD_FORM_IDS=1582715546500811`。专用 `META_SHEETS_IMPORT_SECRET` 与 Google 脚本属性 `IMPORT_SECRET` 一致；不复用其他密钥，不写入表格、提交记录或日志。
3. 核实网站现有 TG 和 Signal 启用状态及 Signal 的启用时间。保持原有发送凭据和队列。
4. 将 Google 的 `SYNC_START_AT` 更新为正式启用时间，避免处理现有历史客户和 Meta 测试行。完成 Apps Script 首次必要授权，再运行一次 `installEucoveMetaTrigger` 创建每分钟触发器，最后将 `SYNC_ENABLED` 改为 `true`。
5. 仅在用户同意真实群测试后，以新建的虚构 Meta 测试线索验证全链路，不重放真实历史客户。

脚本每次最多导入 20 条、运行约 50 秒；原生同步延迟另计。网络或后台暂不可用时等待至少 5 分钟重试。成功写入后追加 4 列：`EUCOVE接入状态`、`EUCOVE咨询编号`、`EUCOVE更新时间`、`EUCOVE下次重试`，不覆盖 Meta 的原有列和 CAPI 状态。

“后台已接收”只表示咨询已存入后台和通知队列，不代表两个群实际收到。真实发送结果以原有后台通知状态为准。关闭 `SYNC_ENABLED` 可暂停导入，已有后台通知仍按原有队列处理。
