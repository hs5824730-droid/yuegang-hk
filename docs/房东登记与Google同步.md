> 2026-10-29 当前状态：独立后端 OAuth 已连接；新增买房、卖房、置业服务三个工作表与持久同步队列（0020），详见《客户需求登记》。下文“持续授权尚未接通”为原实现阶段记录，不能作为当前连接状态。

# 独立房东登记与 Google 表格

本轮网站只做本地验收，没有发布。用户另明确授权的新 Google 表格已真实创建、美化并设知道链接的人可查看。

## 页面与字段

两站未来使用 `/zh/rental-registration`、`/en/rental-registration`，不替换原短咨询，不强制登录，不自动跳 WA/分配号码。仅房东姓名、有效联系电话和有效邮箱必填。地址/城市、房屋类型、卧卫车位、家具、周租范围、入住时间、出租方式、服务多选和补充说明全部选填。空值不填假数；0车位和未填不同。

`POST /api/rental-registrations` 共享 Node/Worker 校验，首次201、相同 requestId/内容重试200且同回执，改内容复用同ID409。只返回编号与创建时间，不公开查询客户记录。独立限流，不占原短咨询额度。不创建 lead、owner、接待 assignment 或机器人通知。

后台 `/admin/rental-registrations`：管理员可见全部，城市角色仅可见自己的明确城市记录，邮件角色不能访问；未知城市只在管理员侧可见。支持跟进状态/内部备注和同步状态/次数/错误码、管理员重试。跟进有 version 并发检查。内部跟进备注仅保网站，不外传表格；客户自己的补充说明进入表格。

## 已创建的表

名称：桉湾｜房屋出租委托登记表。

- ID：`17qZqF0GvUsK4X9L_31uQvDwC1rUNGyXTgRy8aISddh0`
- [打开 Google 表](https://docs.google.com/spreadsheets/d/17qZqF0GvUsK4X9L_31uQvDwC1rUNGyXTgRy8aISddh0/edit)
- 数据 tab：房东登记，sheetId `270017`；使用与概览 `270018`。
- 真实权限回读：type=anyone、role=reader、allowFileDiscovery=false。没有开放writer、发邀请、发布到web或改别的文件。
- 已应用25列表头、冻结首行/前3关键列、筛选、橘白隔行底色、42px行高、按内容列宽与换行、周租AUD格式、跟进下拉/条件色、Asia/Shanghai时区与汇总公式。只写表头/静态说明/受控统计公式，没有导入客户或虚构登记行。
- 表链接只交用户及鉴权后台，不出现在公开客户登记页。创建/美化不等于持续同步已经获授权。

## 持久同步与安全

0017 独立存储 `rental_registrations` 和唯一 `rental_registration_sync`；入库触发器与 outbox 在同事务内，不依赖 Google 是否在线。每条持久记录编号为表格首列唯一键；不使用 append。每次重试先读编号列核对，移动过的同ID行可找回，重复ID或不同ID占用预定行时停止，不覆盖其他客户或公式。同 requestId 重试不占用新的序号。

写入使用 Sheets values.update + RAW，电话以字符串保存 + 和前导0，客户输入类似 `=IMPORTXML(...)` 作为文字，不执行公式。只允许固定服务器配置的一个表和专用tab，并校验完整表头；代码没有分享/创建其他文件的能力。失去响应后以同编号再次核对并更新原行，不盲 append。初始1000行，超过时只扩展已校验专用tab的行与格式。

同步有原子租约、5次退避、错误状态和管理员可重试；网络结果未知至少等待5分钟再按ID核对，后台重试或改状态不会绕过该等待。后台状态更新提高 revision，旧尝试完成不会把新 revision 误报同步。Node用独立60秒定时任务，Worker仅由Cron执行，Google延迟不占原通知处理的busy锁，也不延长客户提交请求。D1仍是真源，Google是查看副本，表内手动状态编辑不反向修改网站。没有把旧客户自动回灌进来。

## 持续授权尚未接通

项目只有原 Meta 表格**入站 HMAC**配置，不是可供后端刷新 Google access token 的出站授权。Cindy Drive 连接器可代用户创建/美化本表，但其 token/cookie 不得提取或复制到网站。当前并未配置以下独立后端凭据，所以网站真实持续同步仍关闭；本地使用完全隔离的模拟表。

正规接入步骤：

1. 在用户自己管理的 Google Cloud 项目启用 Sheets API，配置适用的 OAuth 同意画面及 Web 应用 OAuth 客户端，不购买额外套餐。客户端必须有用户可控的授权回调。
2. 让用户通过 Google 正规同意流程授权离线访问。可采用 `drive.file` 加 Google Picker 明确授予这一个文件；或用户同意适用的 `spreadsheets` 范围。不能把连接器已登录当此授权，也不能从浏览器取 Cookie/Token。刷新凭据只用正规 authorization-code 交换取得。
3. 将 Client ID、Client Secret、Refresh Token 在本机受限文件或规范 secret 输入中保存，**不要粘贴聊天**；分别配置 `REGISTRATION_GOOGLE_CLIENT_ID`、`REGISTRATION_GOOGLE_CLIENT_SECRET`、`REGISTRATION_GOOGLE_REFRESH_TOKEN`。三个值均不进入前端/日志/公开文档。
4. 固定非敏感目标 `REGISTRATION_SHEETS_ID` 为上面的唯一新表，`REGISTRATION_SHEETS_TAB=房东登记`。只读检查该身份对本表的权限和表头，再经明确发布流程开启 `REGISTRATION_SHEETS_ENABLED=true`。没有授权前保持false，资料仍保存在D1且显示待同步，不丢失。
5. 正式启用前先完整备份D1，只迁缺失0015/16/17（前两份属于前任务），保原MAIL_START_AT/通知/分流。这里只同步这份登记模块的新资料，不导入旧短咨询。真实客户或测试行写入仍按后续用户明确范围执行。

原 com 营销静态保持；新登记路径精确选择当前独立页面 bundle（复用已保护的内部 current-shell 机制），后台用同一身份真源，net继续Service Binding。发布时需要同时打包本模块懒加载chunk与当前壳，不能单独更新backend后遗漏静态页面；不要把net首页覆到com。所有私密数据目录仍404。

官方参考：[values.update](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/update)、[离线OAuth](https://developers.google.com/identity/protocols/oauth2/web-server#offline)、[格式batchUpdate](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request)。当前可执行格式请求已归档到 `data/design-review/rental-registration-2026-10-27/google-format-applied.json`，不要对现表再次执行 addSheet（已创建）。
