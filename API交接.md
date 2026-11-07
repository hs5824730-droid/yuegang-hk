# Claude 前端交接

用户明确所有 UI 和交互由 Claude 负责。阅读《网站建设计划.md》后直接实现，不再提问已经确定的需求。你负责 src/**、index.html 及前端资源；主代理负责 server/**、package.json、vite.config.ts、环境配置和测试。不要写任何凭证。

技术：React 19 + TypeScript + Vite + react-router-dom + lucide-react，无需额外安装 UI 框架。请完成响应式中文/英文前台及可用管理后台。品牌未定，用 .env 对应的可配置中性名称，不创造正式公司身份。团队资料待补，不虚构人物。真实房源初始为空，可通过后台录入；不要虚构成交。历史列表空态要有完整设计；可在独立标注的演示页展示交互式3D示意户型（不是实际房源）。UI 方向由你决定。

## API（同源 /api，JSON；错误 {error:string}）

- GET /api/config → {brand:{zh,en},whatsappNumber:string,telegramConfigured:boolean,cities:string[],promotion:{endMonth:'2027-02'}}
- GET /api/properties?city=&status=&type=&q=&minPrice=&maxPrice=&beds= → {properties:Property[]}，只返回已发布。
- GET /api/properties/:id → {property:Property}，只返回已发布。
- POST /api/leads → {id:string}，请求 {name,contact,city,service:'letting'|'management'|'selling'|'buying'|'moving',language:'zh'|'en',message?,propertyId?,propertyAddress?,currentlyManaged?:boolean|null,consent:true,website?:'' (honeypot),requestId:string}。公开表单不再询问是否由其他中介管理，也不发送 currentlyManaged；省略时存为 null（待助理确认），后台显示“待确认”。不承接转中介的政策不变：显式 currentlyManaged=true 的出租/托管委托仍返回 422，旧请求的 false 继续兼容。contact 仅接受电话 / WhatsApp：可选前导 +，数字间可有空格、括号、短横线，7–15 位数字；邮箱及含字母的输入返回 400（历史邮箱咨询与团队登录邮箱不受影响）。requestId 每次新咨询 crypto.randomUUID，重试保持相同值。只在服务器确认后显示成功。
- GET /api/admin/session → {user:{id,name,email,role:'admin'|'manager'|'assistant',city:string|null}|null}
- POST /api/admin/login {email,password} → {user}，HttpOnly cookie；POST /api/admin/logout → {ok:true}
- GET /api/admin/stats → {totalLeads,newLeads,activeProperties,pendingNotifications}
- GET /api/admin/leads → {leads:Lead[]}，按权限过滤；Lead 包含 id,name,contact,currentlyManaged(boolean|null，旧数据可能缺省),city,service,language,message,propertyId,propertyAddress,status,assignedTo,createdAt,notes,nextFollowUp,notificationStatus,commissionOrdinal,movingStatus
- PATCH /api/admin/leads/:id {status?,assignedTo?,notes?,nextFollowUp?,commissionOrdinal?,movingStatus?} → {lead}；status:'new'|'contacted'|'following'|'completed'|'closed'；movingStatus:'none'|'requested'|'scheduled'|'completed'
- GET /api/admin/users → {users:User[]}；POST /api/admin/users {name,email,password,role,city?} → {user}（admin专属）
- GET /api/admin/properties → {properties:Property[]}；POST /api/admin/properties PropertyInput → {property}；PUT /api/admin/properties/:id PropertyInput → {property}（完整对象覆盖）
- POST /api/admin/uploads multipart file → {url}，最大8MB，JPEG/PNG/WebP
- POST /api/admin/notifications/retry → {queued:number}（admin专属，只重新排队，不需UI自动触发）
- GET /api/admin/export/leads → CSV下载（按权限过滤）

PropertyInput：{title:{zh,en},description:{zh,en},address,city,suburb,postcode,type:'house'|'apartment'|'townhouse'|'land',status:'sale'|'rent'|'sold'|'leased',price:number|null,priceLabel:{zh,en},beds:number,baths:number,cars:number,area:number|null,images:string[],floorplan:string, tourUrl:string,tourKind:'none'|'real'|'illustration',published:boolean,events:{id?:string,date:string,type:'listed'|'price_changed'|'sold'|'leased',price:number|null,note:{zh,en}}[]}；Property 另有 id,createdAt,updatedAt。所有文字必须使用对应语言，允许资料尚未翻译时显示另一语言。图片可上传或使用 HTTPS URL。tourUrl只接受 HTTPS；展示 iframe 前建议服务端白名单许可（主代理实现），示意内容必须明示。

五城 id/display 用 Melbourne、Sydney、Perth、Adelaide、Canberra；前台自己映射中文名称。管理后台页面也要中英文切换，权限不足控制操作入口但服务端同样校验。真实 WhatsApp 未提供时不生成虚假号码，引导表单。

提供功能：房东首页、服务说明、优惠（2027年2月，具体日未定、不含销售佣金）、房源和历史筛选及详情时间线、海外买家3D演示、联系表单、关于/五城服务、隐私说明、后台登录/概览/房源维护/咨询编辑/团队账号。首单免出租佣金、第二单半价，不擅自宣称免长期管理费。免费搬家房东或租客可用，具体范围待确认。不承诺未确认速度和收益。所有主要路由直达及手机端可用。完成后运行 npm run build 并反馈；不要接触 .env.local。
