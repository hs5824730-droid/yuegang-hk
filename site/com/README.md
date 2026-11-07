# eucove.com 原版页面基线

此目录保存 2026-10-27 已在线使用的原版首页 HTML、主脚本、样式及其字体依赖。主脚本和样式已与线上文件逐字节核对；HTML 的线上响应由 Worker 动态追加 Pixel 内容，因此按入口资源核对。

`npm run build:com` 将当前 React 前端构建为 `admin-shell.html`，用于后台和独立联系、房东登记页面，再将本目录原版首页及资源合入 `dist`。原版首页继续引用 `scripts/com-contact-email.js` 的联系补丁，并加载 `public/eucove-meta-lead.js`。咨询成功面板出现后，它把测量框架换成只含 Lead 的文档；原版主脚本不会调用 `trackSavedLead`，也不依赖 postMessage。`npm run build:net` 使用当前 React 前端生成独立 `dist-net`。

`manifest.json` 记录基线文件的 SHA-256。修改原版页面时须同步更新对应哈希，并在本机检查 `.com` 和 `.net` 页面设计。此目录不包含私密数据或配置；不要从 `data/` 批量复制其他发布材料。
