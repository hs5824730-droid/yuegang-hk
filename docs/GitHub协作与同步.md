# GitHub 协作与同步

仓库： https://github.com/hs5824730-droid/2026-10-27-EUCOVE

创建日期：2026-10-27。默认分支：`main`。私有仓库，需要使用有访问权限的 GitHub 账号；其他智能体使用相同授权账号或获得仓库协作者权限后即可访问。

## 在另一台电脑或智能体环境接手

```powershell
git clone https://github.com/hs5824730-droid/2026-10-27-EUCOVE.git
cd 2026-10-27-EUCOVE
npm ci
git switch -c agent/your-task
```

先阅读根目录 AGENTS.md 和 README.md。本地运行所需私密配置须另行安全提供；不要把密码放进对话、提交或 PR。数据库和上传文件未纳入 Git。

## 获取最新进度

先检查 `git status`，存在未提交修改时先保存自己的工作。工作目录干净后更新主分支：

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c agent/next-task
```

已有任务分支需要接入主分支更新时，在自己的分支执行 `git merge origin/main`；解决冲突后再继续，不强制覆盖共享历史。

## 将修改同步回 GitHub

获得用户推送授权后，检查差异、运行相关检查，再显式选择本任务的文件提交：

```powershell
git diff
git add <本任务修改的文件路径>
git commit -m "说明本次修改"
git push -u origin HEAD
gh pr create --base main --fill
```

使用 Pull Request 汇总修改和验证结果，审核后合并。其他环境再次拉取即可取得合并后的版本。Git 不会自动实时同步未提交文件；每次改动需要提交、推送，其他环境需要拉取。

## 发布约定

同步代码不触发网站部署。本机验收完成并获得用户明确发布确认后，才可操作线上部署。`com` 与 `net` 的页面设计保持独立。
