# ds-balance

一个极简的 DeepSeek 账户余额小组件，运行在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）Web 界面里：会话头部右侧显示一个胶囊，展示 DeepSeek 账户余额，每 60 秒自动刷新，点击立即刷新，失败时变红并附原因。

## 功能

- 显示 DeepSeek 账户总余额（支持多币种，如 `CNY ¥6.44`）。
- 悬停可见明细：总额 / 赠送余额 / 充值余额。
- 每 60 秒自动刷新；点击立即手动刷新。
- 读取 DSH 凭据库中的 `DEEPSEEK_API_KEY`（`~/.dsh/.credentials.yaml` 或环境变量），密钥通过子进程环境变量传入，不进入命令行、不写入源码或浏览器。
- 幂等：查询为只读 HTTPS GET，使用显式的 `danger-full-access` 执行策略（余额接口需要 `Authorization` 头，DSH 默认的 `workspace-write` 沙箱在 Windows 上无可用后端）。

## 安装

```bash
dsh plugin --profile web add github:<your-name>/ds-balance
```

或从本地 checkout：

```bash
dsh plugin --profile web add /path/to/ds-balance
```

安装后需重启 `dsh web`（客户端插件发现只在进程启动时运行）。

## 使用

无需任何设置。只要配置了 `DEEPSEEK_API_KEY`，小组件就会出现在每个会话头部右侧。

## 结构

```
lib/
  index.js    Host 半部：解析密钥 → 调用余额接口 → 注册 /ds-balance 命令
  client.js   客户端半部：会话头部胶囊小组件（bundle loader 契约）
package.json  声明 dsh.bundle + dsh.client
cordis.patch.yml  插入 host 插件行
```

## 工作原理

Host 半部通过 `ctx.get("credentials")` 解析 `DEEPSEEK_API_KEY`，再经 `ctx.shell`（Windows 下 pwsh）调用 `GET https://api.deepseek.com/user/balance`。客户端通过 `ctx.remote.commands` 调用宿主 `/ds-balance` 命令拿到 JSON，渲染成胶囊。

## License

[MIT](LICENSE)
