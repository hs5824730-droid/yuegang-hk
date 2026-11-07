# 已上线：咨询直达与城市分流合同

权威类型：`src/reception-types.ts`；API：`src/api.ts`。

`createLead` 返回 `{id,city}`，city是后端保存的房产城市。`POST /api/reception/assign` 接收 `{requestId,channel,leadRequestId?,city?}`；带lead时数据库城市权威，冲突409。请求ID按channel幂等并绑定城市/lead，重试不换人。WA有city/lead即严格按 `cities`，每city独立原子游标；cities空数组不等于所有城市。全城市由显式勾选七项存实际ID数组，不使用`*`。微信本轮独立global；无city分享保原global。

响应 `{id,channel,city,scope,outcome,target:{id,value,url}|null}`，outcome为assigned/no_city_match/unconfigured。无匹配HTTP200，咨询已保存；不跨城、不重复POST lead。WA同tab `location.assign` 官方wa.me，微信直接显示QR；phone不分流。事件只记录打开意图/图片load，不声称聊天/加好友。

后台 `lead.routing={state,assignments[]}`。state为phone_callback/awaiting_assignment/assigned/no_city_match/unconfigured/not_requested。每个assignment带id/channel/city/scope/outcome/assignedAt/不可变target快照及whatsappOpenAttempted/wechatQrDisplayed。target为id/value/url/groupId/groupName；group只是后台标签。QR为本站验证过的固定上传路径，绝非再次轮询的/contact入口。已鉴权列表、详情与Telegram使用相同持久事实。

通知新行sync_enabled=1；旧行默认0不补发。保存message_id，revision变化调用editMessageText更新原消息，租约token栅栏、每轮五次上限、429重试、并发与晚到事件均有SQLite和真实workerd/D1 mock测试。管理员可看notificationSyncStatus，失败更新重试不会再发一条新咨询消息。Signal未配置关闭。
