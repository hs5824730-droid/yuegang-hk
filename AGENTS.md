# 桉湾 EUCOVE 协作约定

本项目的 GitHub 仓库为 https://github.com/hs5824730-droid/2026-10-27-EUCOVE ，默认分支 `main`。开始修改前先阅读 README.md、本文及相关 docs 文档。

## 多智能体协作

- 开始工作先运行 `git status`、`git fetch origin`，确认当前修改及远程进度；保留其他人尚未提交的工作。
- 新任务从最新 `origin/main` 创建独立分支，例如 `agent/任务名`。多个智能体同时工作时使用独立克隆或 Git worktree，避免共用同一目录切换分支。
- 完成后检查差异，运行与改动相关的检查，提交并推送自己的分支，通过 Pull Request 合并。推送须有用户指令授权；本次首次同步不等于永久自动发布授权。
- 不强制推送，不覆盖他人提交。出现冲突应理解双方意图后解决，不直接丢弃任一方工作。
- 用户于 2026-10-27 要求启用 GitHub → Cloudflare 自动部署。`main` 为正式发布入口，推送或合并到 `main` 会发布 `.com` 和 `.net`；先完成本机验收并确认具体任务已获发布授权。任务分支不自动发布。保持已有线上服务运行。

## 必须保留的产品约定

- `eucove.com` 保留原版 UI，`eucove.net` 保留独立新版 UI；共享业务功能时不得串用页面设计。
- 品牌为桉湾 / EUCOVE，2025 年成立，服务城市不限于六城。不得使用未经核实的团队人数。
- 公开房源页面不展示来源名称、原页链接或核实日期；内部审核证据和真实入住、成交日期保留。
- 电话、微信、WhatsApp 是独立直联动作；微信公开展示仅二维码本体。城市留空的接待配置适用于所有城市。
- Telegram / Signal 通知保持精简、接粉人员归属及北京时间一致；真实通知、邮件和广告操作按用户授权范围执行。

## 本地配置与验证

- 需要 Node.js 24+。用 `npm ci` 安装锁定依赖，按 README.md 配置本地环境后运行 `npm run dev`。
- `.env.local`、`.dev.vars`、数据库、uploads、data 目录和任何真实凭证不得提交。仓库里的 example 文件只保留示例。
- 按改动范围运行 `npm test`、`npm run build`、`npm run test:signal-relay` 或 Worker 检查；不要为了检查而部署。
- 数据、上传素材、私密配置和线上云资源不随 Git 自动复制，必须另行安全配置。
- Cloudflare 正式构建分别使用 `npm run build:com` 和 `npm run build:net`，详见 `docs/Cloudflare自动部署.md`。`.com` 必须合入 `site/com` 原版页面基线，不能直接以普通 `npm run build` 的输出覆盖线上前台。
