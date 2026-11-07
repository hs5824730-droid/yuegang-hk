# Signal 连接设备与咨询通知准备

核实日期：2026-10-23。本项仅在 `data/signal-work` 隔离准备，不改网站、Telegram、Cloudflare、数据库或部署配置；不注册新号、不读取既有聊天/账号密钥、不发送测试或客户消息。

## 真实扫码入口已就绪

2026-10-23 22:06（Asia/Shanghai）由真实signal-cli link生成，状态`waiting-for-scan`，PNG解码回验与客户端原始URI一致。私有路径`data/signal-work/private/signal-link-qr.png`；状态只读`private/link-status.json`，不读取state账号目录。Java客户端PID38056，Python包装进程PID41944（venv启动器PID35728），均为独立后台进程。二维码精确TTL客户端未暴露，以实际进程状态为准；未自动刷新。当前仅待用户手机扫码，不代表生产通知已上线。二维码通过Cindy媒体入口私有导入供本人显示，没有放网站/public/R2。

版本已实测signal-cli0.14.9＋Temurin25.0.4.1；两个官方发布包哈希均校验通过。等待扫码时本机Java工作集约120MiB，仅为本机当前阶段观测，不代表生产持续接收时峰值或Linux环境用量。

## 当前本机盘点

- 已有官方 Signal Desktop 正在运行，不动其应用数据或会话。
- PATH 未安装 signal-cli；Docker CLI 已安装但 Linux engine 未运行；系统 Java17，不能满足当前 signal-cli Java25 要求。
- 采用原维护者 AsamK 的 signal-cli v0.14.9 JVM 发布包，维护者 README 明确 bundled Windows x86_64 native lib，使用 Eclipse Temurin25 独立运行时。仅解压到本项目录，不更改系统 Java/PATH、不启用 Docker。
- JRE25最新发布的 Windows 包尚未齐全，选官方实际可下载的25.0.4.1+1 JRE。发布包由维护者 GitHub release metadata 的 SHA256核验后才执行。完整来源、大小、校验值保留在 `data/signal-work/dependencies.json`；下载脚本不运行第三方安装脚本。
- QR 编码/验证使用独立 venv 中 qrcode8.2、Pillow、zxing-cpp，直接编码真实客户端 provisioning URI，不用图片生成模型重绘。
- `private` 目录关闭ACL继承，仅当前Windows用户和SYSTEM可访问；不放public、R2、网站或未鉴权HTTP端点。

## 本轮扫码行为边界

通过维护者正式 `link -n` 命令连接已有手机账号，不传账号参数、不调用register/SMS。原始 `sgnl://linkdevice` URI仅在子进程内存中流转到二维码编码器，PNG解码验证后才交付；不把URI、公钥/私钥或账号标识写stdout、日志、聊天。客户端自己的设备凭据仅由客户端写入独立 `private/state`，智能体不读取内容。

link进程必须保持运行至手机确认，只有一个活跃二维码，不自动循环刷新。pending URI的准确期限若客户端未给出则标未知，以实际link进程状态为准；进程超时或失败后旧二维码不可继续当有效入口。二维码是授权的临时设备连接凭证，不是普通Signal个人账号二维码。

手机入口按 [Signal官方说明](https://support.signal.org/hc/en-us/articles/360007320551-Linked-Devices)：Signal 设置 → 已连接设备 → 连接新设备，用应用内相机扫描。若手机出现历史记录选项，可选择不传输。本轮仅确认已连接，不执行receive、daemon或读取无关聊天。Signal支持最多5个已连接设备，客户端会报告容量等实际问题，不自动移除其它设备。

群名原话“叫做大做强”待用户扫码后确认，不能擅自推断为“做大做强”或自动选群。连接成功后先等用户给出明确群名，再用最小化元数据核对实际group ID；之后仍需明确授权才发送测试或客户通知。

## 本机与生产中继的区别

本轮二维码首先连接的是本机隔离客户端，**不是生产咨询通知已上线**。本机运行模式要求电脑和中继保持在线。选择Railway常驻后可只迁Signal中继，主站继续Cloudflare，不必搬站/迁库/DNS。

若未来从本机转云端，设备状态含加密密钥，不能偷偷上传；应在生产部署/安全配置获准后决定安全迁移并验证，或在云端生成最终设备二维码重新配对。本次不承诺本地配对状态已迁移或可无验证跨系统复用。

## Railway最小可行方案（尚未创建/部署）

只读检查：Railway CLI5.57.0已登录，有8个既有项目，包括au-property-monitor；未读取变量、Key或账号凭据文件，未改任何项目。现有工作区套餐/余量/费用尚未核实，不把已有登录视作新增费用授权。

技术上可独立运行一个长期容器：signal-cli Linux客户端＋小型鉴权通知适配器，单副本、起步512MiB–1GiB内存、1GiB持久卷保存客户端独立状态。准确内存应按实际进程测量调整，不宣称固定最小RSS。无需GPU或新Signal号码；不要把客户端状态放临时磁盘，不用多副本同时写账号数据库。

主站服务器 → HTTPS鉴权适配器 → 同容器stdio/本地JSON-RPC signal-cli → 用户核实的唯一目标群。原始signal-cli RPC、二维码和设备状态不可直接公开；适配器需HMAC/强token鉴权、群ID白名单、事件幂等、限流和不含客户正文的审计。Cloudflare在Railway私网外，不能直接使用`*.railway.internal`；跨平台入口必须鉴权，不能误称私网可直接互通。

Signal协议需要持续接收来更新会话/群状态；这属于后续生产中继设计，不能在本轮扫码准备中静默读取聊天。未来适配器必须将非授权群消息排除在日志、模型和业务流程外。

费用按 [Railway官方计划](https://docs.railway.com/pricing/plans) 核实：Hobby最低US$5/月，含US$5资源额度，不能再把套餐费和同额度资源费重复相加；容器RAM约US$10/GB/月、CPU约US$20/vCPU/月、卷约US$0.15/GB/月、出站流量另计。以平均0.5–1GB内存估算，中继资源约US$5–12/月，实际以CPU/内存实耗和既有套餐剩余额度为准，不是报价或免费保证。若已有付费工作区和闲置额度，增量可能更低，但本次未验证。没有新增收费服务、云主机、升级或自动充值；由主控确认必要预算后才可部署。

依据：[signal-cli维护者README](https://github.com/AsamK/signal-cli/tree/v0.14.9)、[维护者配对文档](https://github.com/AsamK/signal-cli/wiki/Linking-other-devices-%28Provisioning%29)、[官方Java独立安装与校验](https://adoptium.net/installation/archives/)、[Railway持久卷](https://docs.railway.com/volumes)、[Railway私网边界](https://docs.railway.com/networking/private-networking)。signal-cli是第三方客户端，本方案不冒称Signal官方Bot API。


### 2026-10-23 扫码与目标群核实

本次隔离 linked device 已成功绑定（wrapper 状态 connected、退出码 0）。用户明确目标群名为「做大做强」。在确认无残留本次 Java/link 进程后，用维护者支持的 `listGroups` 非 detailed 文本模式完成一次有界查询，正常退出，唯一精确匹配该群。稳定群 ID 仅保存在私有 `data/signal-work/private/target-group.json`，不在本文输出。未运行 receive、daemon、sendSyncRequest，未读取聊天或发送任何群消息。

前次 45 秒超时不能解释为无群。维护者 v0.14.9 源码表明 `SignalAccountFiles.initManagerFromAccount` 在执行命令前调用 `ManagerImpl.checkAccountState`，会联网更新账号属性/检查预密钥；单账号由 CLI 自动选择，不需要把账号号码写进命令。此次正常查询证实不必启动消息接收即可获取目标元数据；前次具体网络延迟原因未确证，不归因于群不存在或缺少 receive。

安全脚本 `data/signal-work/check_target_groups.py` 仅保存脱敏诊断类别与唯一目标字段，不保存原始 stdout/stderr 或其他群/成员清单；超时会终止自身子进程。此次结束后无残留隔离 Java 进程。生产发送仍关闭。当前绑定仅在本机状态目录，未来若运行本机中继需电脑在线；尚未迁移 Railway，也未创建收费资源或改网站通知代码。


### 2026-10-23 Railway 单设备私有迁移交接

用户已批准单独 Signal 中继预计 US$5–12/月，Railway 服务创建、上传与部署由 Sol 负责；本技术 owner 未创建第二套服务或执行收费部署。

本机无独立 signal-cli Java/link/receive/daemon 进程，无需停止 Signal Desktop。仅枚举独立 state 的文件类型，没有查看账号配置、SQLite 行或密钥内容。必要结构为 `state/data/accounts.json`、一个设备配置文件、对应设备目录下的 `account.db` 与 `storage-manifest`。`state/avatars` 为缓存，未迁移；无 msg-cache。客户端数据库可能保存联系人/群协议资料，属于设备运行依赖，不等同授权读取其中内容。

私有成果：

- `data/signal-work/private/signal-device-migration.tar.gz`：804589 bytes，SHA256 `eb8aa927ee6f16d43d9091dd4585addcc630aff9406ac8b440bbcc4986bd4a95`，内含必要 data 树、目标群映射及完整性清单。文件 ACL 仅当前用户与 SYSTEM。归档包含设备秘密，未加独立文件密码；安全性依赖该 ACL、鉴权 TLS 传输和私有卷，绝不可作为普通下载附件或公开地址提供。
- `data/signal-work/private/target-group.json`：唯一精确目标「做大做强」的稳定 `groupId`，sendingEnabled=false，不在聊天或本文输出 ID。
- `data/signal-work/private/migration-freeze.json`：本地安全群检查脚本遇此标志停止，避免与云同时使用同设备。此为脚本防护，并非 OS 级锁；部署成员不得自行启动第二个本地客户端。
- `data/signal-work/migration_bundle.py`：pack/verify/restore，读取设备字节仅为封装，不解析密钥/数据库。pack 检查本次隔离 Java 进程与 link 锁；restore 验证版本/逐文件 SHA、拒绝链接/路径穿越/重复项/非空目标，Linux 目录700、文件600。合成无秘密数据测试已验证恢复、拒绝覆盖与拒绝越界；未克隆运行真实设备。

版本与平台依据：本机 signal-cli 0.14.9，隔离 Temurin JRE25.0.4.1+1。Linux 使用同版 signal-cli 及对应 Linux x64 native/JRE25，不复制 Windows JRE/native。维护者 v0.14.9 `PathConfig.createDefault` 将 data/avatars/attachments/stickers 以配置根目录相对定位；`SignalAccount.getFileName/getUserPath/getDatabaseFile` 将设备配置、`.d` 与 SQLite 相对定位。未发现本次必要文件名依赖 Windows 绝对路径，支持先尝试同版本迁移，但跨 OS 尚未实测，不能宣称已成功或擅自解绑重扫。

维护者证据：

- https://github.com/AsamK/signal-cli/blob/v0.14.9/lib/src/main/java/org/asamk/signal/manager/internal/PathConfig.java
- https://github.com/AsamK/signal-cli/blob/v0.14.9/lib/src/main/java/org/asamk/signal/manager/storage/SignalAccount.java
- https://github.com/AsamK/signal-cli/blob/v0.14.9/lib/src/main/java/org/asamk/signal/manager/SignalAccountFiles.java
- https://github.com/AsamK/signal-cli/wiki/Linking-other-devices-%28Provisioning%29

Sol 安全部署顺序：

1. 本地设备保持停止，原 `private/state` 不改不删，作为回滚。绝不能把 private/state、tar、群映射放 Docker build context/层、Git、环境变量内容、R2 或公共 HTTP。Docker build context 必须是单独干净目录，启动日志禁止输出敏感变量或原始 CLI 输出。
2. 在已批准的单个 Railway 服务私有持久卷上传归档。仅用用户已登录且认证的管理通道，或精确认证、禁请求体日志、有限大小、仅一次使用的 HTTPS runtime 上传端点；不开放原始 JSON-RPC。此处不猜 Railway 卷上传 API，通道由实际部署成员核实。归档不应经过构建阶段。
3. 用已知 SHA 先 `python migration_bundle.py verify --archive <private-runtime-archive> --sha256 <sha>`，再 `restore --archive <private-runtime-archive> --sha256 <sha> --destination <existing-empty-private-volume-root>`。CLI 的 `--data-dir` 指向该 root，其下有 data；目标 JSON 同 root。
4. 只读云验证：signal-cli 0.14.9 + Java25，参数 `--enable-native-access=ALL-UNNAMED -Xmx256m -cp <Linux-cli-lib/*> org.asamk.signal.Main --data-dir <volume-root> --scrub-log --output plain-text listGroups`；账号自动选择，原始 stdout/stderr仅内存，精确核对 target-group.json 的 name/ID，只报告一致布尔值，不打印成员/账号/群 ID。列表命令初始化可能联网检查账号，不运行 receive/daemon/send。一次单实例验证，禁止本机同设备并行。
5. 云验证成功再由主控确认自动通知整合和生产生命周期；Railway 仅一实例，不休眠，持久卷保护身份。仅复制状态不是已完成自动通知。若跨平台验证出现结构/身份错误，保留证据的脱敏类别，不立即解绑、删 state 或重新注册；先向 owner/root说明是否确需云端私有新扫码。回滚须云进程已停止后才可解除本地冻结并运行旧设备，避免双活。上传临时归档在校验恢复成功后由 Sol 删除其云 runtime 临时副本，本地受限备份保留待确认。

当前状态：迁移包与校验工具就绪；未上传云端、未运行云验证、未运行收件/发送、未启用正式通知。直接 send_to_worker 给提供的 Sol session 返回 NOT_FOUND，已请求主控转交私有路径与说明。
