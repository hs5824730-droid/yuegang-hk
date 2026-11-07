# Cloudflare 连接 GitHub 自动部署

用户于 2026-10-27 要求连接 GitHub，启用 Cloudflare 自动部署。仓库为 `hs5824730-droid/2026-10-27-EUCOVE`，两个已有 Worker 分别连接同一仓库的 `main` 分支。

| 网站 | Cloudflare Worker | 构建命令 | 部署命令 |
| --- | --- | --- | --- |
| eucove.com | eucove | `npm run build:com` | `npm run deploy:com` |
| eucove.net | eucove-net | `npm run build:net` | `npm run deploy:net` |

项目根目录 `/`，Node.js 24（`.node-version`，构建变量可设置 `NODE_VERSION=24`）。保留构建所需 devDependencies，不将构建环境的 `NODE_ENV` 设为 `production`。Cloudflare 自动安装锁定依赖后执行构建、部署。仅 `main` 触发正式部署，禁用其他分支的自动部署。

2026-10-27 已在 Cloudflare 为两个现有 Worker 连接上述仓库，分别保存表内构建、部署命令，设置 `NODE_VERSION=24`，关闭 Preview builds。GitHub App 只授权本仓库。两站使用各自的 `--config` 参数，不接受将根目录 `wrangler.jsonc` 的 Worker 名改为 `eucove-net` 的自动修复建议。

## 协作和发布

任务分支完成相关本机检查和验收后，再按用户授权合并或推送 `main`。**推送或合并到 `main` 就会发布两个线上网站**，应把它当作正式发布动作；任务分支继续用于开发。Cloudflare 中的两次构建独立运行，跨前后端改动应保持兼容。

此授权用于本项目的 GitHub 自动部署，不代表允许无关智能体擅自推送；仍须遵守用户对具体任务的同步和发布指令。

## 构建保持两站独立

`build:com` 先编译当前后台和独立表单，再合入 `site/com` 的原版公开页面；`build:net` 独立构建新版前台。两个命令都会运行 TypeScript 检查并执行 Wrangler dry-run。不要把普通 `npm run build` 直接当作 `.com` 正式构建命令。

现有 D1、R2、域名和运行时 Secrets 继续绑定已有 Worker。构建不读取本机 `.env.local` 或私有 data；真实密码和令牌不提交 GitHub，不复制到前端构建变量。数据库迁移不在部署脚本中自动执行，涉及 schema 的改动需单独审查和安排兼容迁移。

## 查看结果和恢复

在 Cloudflare 中进入对应 Worker 的 Builds / Deployments 查看提交、构建日志和发布状态。构建失败不会发布该次代码，修复后重新推送或在 Cloudflare 重试。若已发布代码需要回退，从 Worker 的 Deployments 回退已知可用版本；数据库和 R2 不会随代码回退。

参考：[Cloudflare GitHub 集成](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)、[构建设置](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)。
