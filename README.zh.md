# ds-balance

**[English](README.md) | 简体中文**

一个极简的 **DeepSeek 账户余额小组件**，运行在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）Web 界面里：会话头部右侧显示一个胶囊，展示 DeepSeek 账户余额，每 60 秒自动刷新，点击立即刷新。

![ds-balance 在会话头部的效果](assets/widget-screenshot.png)

## 功能

- **会话头部实时余额胶囊**（右侧）：显示币种与总余额，例如 `DS CNY 3.65`。
- **自动刷新**：每 60 秒一次；**点击立即手动刷新**。
- **悬停看明细**：总额 / 赠送余额 / 充值余额，支持多币种。
- **密钥安全**：通过 DSH 凭据层读取 `DEEPSEEK_API_KEY`（`~/.dsh/.credentials.yaml` 或环境变量），密钥只放在子进程环境变量里，不进入命令行、不写入源码或浏览器。
- **只读且幂等**：仅一次对余额接口的 HTTPS GET。

## 安装

```bash
dsh plugin --profile web add github:JovanHE/ds-balance
```

或从本地 checkout：

```bash
dsh plugin --profile web add /path/to/ds-balance
```

安装后需重启 `dsh web`（客户端插件发现只在进程启动时运行）。

## 使用

无需任何设置。只要配置了 `DEEPSEEK_API_KEY`（DSH 凭据库、`.env` 或环境变量），小组件就会出现在每个会话头部右侧。

- 点击胶囊立即刷新。
- 悬停查看完整明细。
- 若密钥缺失或请求失败，胶囊变红并在悬停提示里给出原因。

## 工作原理

```
客户端（浏览器）                        宿主（dsh 进程）
─────────────────                        ─────────────────
头部胶囊  ── ctx.remote.commands ──>  /ds-balance 命令
   │                                             │
   └── 解析 JSON  <── 结果文本 ──────────────────┘
                                             解析 DEEPSEEK_API_KEY（ctx.get("credentials")）
                                             GET https://api.deepseek.com/user/balance
                                             （ctx.shell / pwsh Invoke-RestMethod）
```

- **宿主半部**（`lib/index.js`）：通过 `ctx.get("credentials")` 解析密钥，再经 `ctx.shell` 调用余额接口——该接口需要 `Authorization` 头，而 fetch 通道无法携带，因此以子进程 `Invoke-RestMethod` 执行，并显式使用 `danger-full-access` 策略（部署默认的 `workspace-write` 沙箱在 Windows 上无可用后端，且此调用只读）。它注册一个 `/ds-balance` 命令。
- **客户端半部**（`lib/client.js`）：在 `conversation.session.header.utilities` 槽位注册胶囊，并透过 `ctx.remote.commands` 调用宿主命令、解析返回的 JSON。bundle 客户端里没有动态插件才有的 `host`/`styles` 全局，因此用 `document` 注入样式、走 `ctx.remote` —— 与官方 bundle 惯例一致。

## 项目结构

```
lib/
  index.js          Host 半部：解析密钥 → 调用余额接口 → 注册 /ds-balance 命令
  client.js         客户端半部：会话头部胶囊小组件（bundle loader 契约）
assets/
  widget-screenshot.png   小组件在 GUI 里的效果截图
package.json        声明 dsh.bundle + dsh.client
cordis.patch.yml    插入 host 插件行
```

## 依赖要求

- DeepSeek Harness（`dsh`）web profile
- Node.js ≥ 20
- 已配置的 `DEEPSEEK_API_KEY` 凭据

## License

[MIT](LICENSE)
