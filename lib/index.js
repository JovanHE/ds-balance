/**
 * ds-balance — host half.
 *
 * Resolves the `DEEPSEEK_API_KEY` credential from the DSH credential seam and
 * calls the DeepSeek balance endpoint (`GET https://api.deepseek.com/user/balance`)
 * through the shell service. The call needs the `Authorization` header, which the
 * `web.fetch` seam cannot carry, so it goes through `ctx.shell` (pwsh on win32).
 *
 * The deployment's default `workspace-write` confinement has no usable sandbox
 * backend on this host, so each call resolves an explicit `danger-full-access`
 * policy — the command only performs a read-only HTTPS GET. The API key travels
 * in the subprocess environment, never inside the command string.
 *
 * @module ds-balance/host
 */

const name = "ds-balance";

const inject = ["commands", "shell", "credentials", "sandboxPolicy"];

/** Resolve the DEEPSEEK_API_KEY credential once per operation. */
async function resolveApiKey(ctx) {
	const credentials = ctx.get("credentials");
	if (credentials === undefined) return "";
	try {
		const resolved = await credentials.resolve("DEEPSEEK_API_KEY");
		if (resolved && resolved.value) return resolved.value;
		return "";
	} catch (err) {
		console.error("[ds-balance] credential resolve failed:", err);
		return "";
	}
}

/** Build the unconfined sandbox policy the shell call runs under. */
function unconfinedPolicy(ctx) {
	const sandboxPolicy = ctx.get("sandboxPolicy");
	if (sandboxPolicy !== undefined) return sandboxPolicy.resolve({ mode: "danger-full-access" });
	return { mode: "danger-full-access", workspaceRoot: "" };
}

/** Fetch and normalize the balance; returns JSON-safe data or an error object. */
async function getBalance(ctx) {
	const key = await resolveApiKey(ctx);
	if (!key) return { ok: false, error: "NO_API_KEY", detail: "DEEPSEEK_API_KEY is not configured" };

	const command = [
		'$ErrorActionPreference = "Stop"',
		'$h = @{ Authorization = "Bearer $env:DS_BALANCE_KEY" }',
		'$r = Invoke-RestMethod -Uri "https://api.deepseek.com/user/balance" -Headers $h -Method Get -TimeoutSec 20',
		'if ($null -eq $r) { throw "empty response" }',
		'$r | ConvertTo-Json -Depth 6 -Compress'
	].join("; ");

	const spec = ctx.shell.resolve({
		command,
		timeoutMs: 30000,
		stdoutMaxBytes: 256 * 1024,
		env: { DS_BALANCE_KEY: key },
		sandboxPolicy: unconfinedPolicy(ctx)
	});

	const result = await ctx.shell.run(spec);
	const out = ((result.stdout && result.stdout.text) || "").trim();
	if (result.exitCode !== 0 || !out) {
		const detail = ((result.stderr && result.stderr.text) || "").trim();
		return { ok: false, error: "FETCH_FAILED", detail: detail.slice(0, 500) || "no output" };
	}

	try {
		const data = JSON.parse(out);
		const infos = Array.isArray(data.balance_infos) ? data.balance_infos : [];
		const balances = infos.map((b) => ({
			currency: typeof b.currency === "string" ? b.currency : "?",
			total: b.total_balance != null ? String(b.total_balance) : null,
			granted: b.granted_balance != null ? String(b.granted_balance) : null,
			toppedUp: b.topped_up_balance != null ? String(b.topped_up_balance) : null
		}));
		return { ok: true, available: data.is_available !== false, balances };
	} catch (err) {
		return { ok: false, error: "BAD_RESPONSE", detail: String(out).slice(0, 500) };
	}
}

/**
 * Cordis plugin body for the host half.
 *
 * Registers `/ds-balance`, a command the bundle client reaches through the
 * `remote.commands` face. The command returns the normalized balance object as
 * JSON text so the browser widget does not need a separate Remote service.
 */
export function apply(ctx) {
	const commands = ctx.get("commands");
	if (commands === undefined) return;

	commands.register({
		name: "ds-balance",
		description: "Show the DeepSeek account balance (JSON)",
		recordInput: false,
		handler: async () => {
			const data = await getBalance(ctx);
			return JSON.stringify(data);
		}
	});
}

export { name, inject };
