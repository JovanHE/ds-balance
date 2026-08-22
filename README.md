# ds-balance

A minimal DeepSeek account balance widget for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) web GUI. A pill in the session header shows your DeepSeek account balance, auto-refreshes every 60 seconds, refreshes on click, and turns red with a reason on failure.

## Features

- Shows the DeepSeek account total balance (multi-currency aware, e.g. `CNY ¥6.44`).
- Hover for a breakdown: total / granted / topped-up balance.
- Auto-refresh every 60s; click to refresh immediately.
- Reads `DEEPSEEK_API_KEY` from the DSH credential store (`~/.dsh/.credentials.yaml` or the environment). The key travels in the subprocess environment — never in the command line, source, or browser.
- Idempotent: a read-only HTTPS GET, run under an explicit `danger-full-access` policy (the balance endpoint needs an `Authorization` header, and DSH's default `workspace-write` sandbox has no usable backend on Windows).

## Install

```bash
dsh plugin --profile web add github:<your-name>/ds-balance
```

Or from a local checkout:

```bash
dsh plugin --profile web add /path/to/ds-balance
```

Restart `dsh web` after installing (client plugin discovery only runs at process start).

## Usage

Zero configuration. As long as `DEEPSEEK_API_KEY` is configured, the widget appears at the right of every session header.

## Layout

```
lib/
  index.js    Host half: resolve key → call the balance API → register /ds-balance command
  client.js   Client half: header pill widget (bundle loader contract)
package.json  declares dsh.bundle + dsh.client
cordis.patch.yml  inserts the host plugin row
```

## How it works

The host half resolves `DEEPSEEK_API_KEY` via `ctx.get("credentials")`, then calls `GET https://api.deepseek.com/user/balance` through `ctx.shell` (pwsh on Windows), invoking `Invoke-RestMethod`. The client reaches the host `/ds-balance` command through `ctx.remote.commands` and renders the JSON as a pill.

## License

[MIT](LICENSE)
