# Telegram 选择接粉人员后推送 Signal

2026-10-30 用户要求：以后新粉先发到 Telegram 机器人，由本人选择江承裕、江牧或江鹏；选择完成后再推送到 Signal。此要求取代新粉自动轮转及同时发送双渠道。

## 使用方式

新咨询先进入既有 Telegram 私聊。通知写“接粉人员：待你选择”，下方显示三个姓名按钮。用户点击后，归属保存到后台，Signal 原持久队列开始发送；Telegram 原消息更新为所选人员并移除按钮。没有选择时一直等待，不会超时自动分配。

首次有效选择生效；重复点击、Telegram webhook 重试、并发工作进程都不会改派或额外创建 Signal 消息。Signal 失败仍沿用原 outbox、重试上限和 relay 幂等回执；Telegram 消息更新失败单独重试，不丢失已保存的选择。按钮提示“已排队”不冒称 Signal 已送达。

覆盖现有网站咨询、Meta 表单导入和客户来信的通知。已关闭的公开直联入口保持关闭；旧直联队列不恢复发送。独立资料登记原有的 Google Sheets 流程不增加重复通知。

## 持久化与权限

- `0021_manual_lead_dispatch.sql` 创建独立设置和待分配表，默认关闭；只为启用后新入库的记录创建待分配项，不回灌历史。
- 新粉不消耗原轮转游标；历史归属、微信/WhatsApp游标、真实目标快照、旧通知不重写。
- `/api/integrations/telegram-dispatch` 只接受带 `X-Telegram-Bot-Api-Secret-Token` 的 Telegram 回调。密钥使用 Web Crypto 验证；请求体限制 64KB。
- 仅既有 Telegram 私聊本人的 `from.id`、私聊 `chat.id` 均等于 `TELEGRAM_CHAT_ID` 时可选择。回调绑定随机分配ID、三个固定姓名和已保存消息ID；未登记消息回执时可由有效按钮回调补全。
- 密钥 `TELEGRAM_DISPATCH_WEBHOOK_SECRET` 必须随机生成，保存于受限本机私密文件和 Worker secret，不提交到仓库。

## 上线顺序（须已获本次发布授权）

1. 记录当前 Worker 版本、D1 Time Travel 书签并备份当前数据；核对 `lead_dispatch_settings` 尚未启用。
2. 仅对既有 `eucove` D1 应用增量迁移 0021，保持 `enabled=0`。不得导入本地真实数据库覆盖线上。
3. 配置 webhook secret，发布本分支后端；按项目 PR 流程合并，使用 `build:com` / `build:net` 保留两站独立设计。
4. 查询机器人 `getChat`，确认接收会话为本人私聊；查询 `getWebhookInfo`，若已有其他 webhook，先理解其用途，不能直接覆盖。2026-10-30 只读查询时为既有私聊、webhook为空。
5. 用 Bot API `setWebhook` 设置 `https://eucove.com/api/integrations/telegram-dispatch`、同一个 `secret_token`、`allowed_updates=["callback_query"]`，保留待处理更新，不使用 `drop_pending_updates=true`。密钥不放进URL或日志。
6. 验证未签名请求拒绝、webhook地址正确、部署已可读取新增表后，原子将 `lead_dispatch_settings.enabled` 从0改成1；记录实际切点。从此仅处理未来新粉。
7. 真实频道测试须另有用户授权；本次隔离测试未向真实 Telegram/Signal 发送消息，不能把模拟结果当真实送达。

## 回退

停用未来待分配入库可将 `enabled=0`，但已等待的分配项仍必须完成选择；Signal 发送门禁不能删除。不要直接回退到不认识待分配表的旧发送代码，否则可能提前发送等待中的客户。需要暂停时先关闭 Signal 发送开关并保留 outbox、分配表及 relay ledger，修复后继续处理。不得删表、回灌旧库或重发成功消息。

## 验证

新增 SQLite 和真实 workerd/D1 测试覆盖：未来切点、历史保护、未选择零次 Signal 请求、本人权限、错误密钥/消息绑定、并发及重复点击、持久归属、独立 Telegram 编辑失败、Signal 重试身份、邮件分配、webhook 的 Origin 例外及正常写入仍受 Origin 保护。

参考：[Telegram Bot API](https://core.telegram.org/bots/api#setwebhook)、[Cloudflare D1 CLI](https://developers.cloudflare.com/d1/wrangler-commands/)。
