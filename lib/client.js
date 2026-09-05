/**
 * ds-balance — client bundle (browser half).
 *
 * A minimal pill in the session header (the `conversation.session.header.utilities`
 * slot) showing the DeepSeek account balance. It refreshes every 60s and on click.
 *
 * In a bundle client the `host` / `styles` globals are not available (those are
 * dynamic-plugin closure builtins), so this half fetches the balance from the
 * host HTTP route `/__ds-balance` on its own origin — a plain same-origin fetch
 * that mints no session events (unlike a `/ds-balance` command, whose dispatch
 * writes command/run + command/done records into the conversation on every
 * 60s refresh). Styles are injected directly via `document`.
 *
 * Loader contract (mirrors the shipped bundle format):
 *   window.__ModuleLoader__.load({ id, factory }) — factory returns a module
 *   whose exports carry `inject` (cordis service keys) and `apply` (plugin body).
 */
window.__ModuleLoader__.load({
	id: "@dsh-external/ds-balance",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		let react = require("react");
		const React = react;

		/** Cordis services this client plugin needs. */
		const inject = ["timer"];

		/** Fetch the normalized balance JSON from the host route. */
		async function fetchBalance() {
			const res = await fetch("/__ds-balance", { cache: "no-store" });
			if (!res.ok) throw new Error("HTTP " + res.status);
			return await res.json();
		}

		/** Plugin body. */
		function apply(ctx) {
			const slots = ctx.get("slots");
			if (slots === void 0) return;

			// Inject the widget stylesheet directly (bundle-safe; no `styles` global).
			const CSS_TAG = "@dsh-external/ds-balance/widget.css";
			if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_TAG) + "]") === null) {
				const tag = document.createElement("style");
				tag.dataset.plugin = "@dsh-external/ds-balance";
				tag.dataset.pluginCss = CSS_TAG;
				tag.textContent =
					".ds-balance-widget{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:999px;font-size:12px;line-height:1;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);cursor:pointer;user-select:none;white-space:nowrap}" +
					".ds-balance-widget:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}" +
					".ds-balance-widget .ds-balance-tag{font-weight:600;color:var(--dsw-alias-brand-primary)}" +
					".ds-balance-widget.is-loading{opacity:.65;cursor:default}" +
					".ds-balance-widget.is-error{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}";
				document.head.appendChild(tag);
			}

			let manualRefresh = null;

			function BalanceWidget() {
				const [phase, setPhase] = React.useState("loading");
				const [data, setData] = React.useState(null);
				const [error, setError] = React.useState("");

				React.useEffect(() => {
					let alive = true;
					const run = () => {
						setPhase("loading");
						fetchBalance()
							.then((parsed) => {
								if (!alive) return;
								if (parsed && parsed.ok) {
									setData(parsed);
									setError("");
									setPhase("ok");
								} else {
									setData(null);
									setError((parsed && parsed.error) || "bad response");
									setPhase("error");
								}
							})
							.catch((err) => {
								if (!alive) return;
								setData(null);
								setError(String((err && err.message) || err));
								setPhase("error");
							});
					};
					manualRefresh = run;
					run();
					const dispose = ctx.interval(run, 60000);
					return () => { alive = false; dispose(); };
				}, []);

				let body;
				let title = "DeepSeek 账户余额";
				if (phase === "loading") {
					body = React.createElement("span", null, "…");
				} else if (phase === "error") {
					body = React.createElement("span", null, "余额 —");
					title = "余额获取失败: " + error;
				} else {
					const balances = (data && data.balances) || [];
					if (balances.length === 0) {
						body = React.createElement("span", null, "¥ —");
					} else {
						const parts = [];
						const details = [];
						balances.forEach((b) => {
							parts.push(b.total != null ? b.currency + " " + b.total : b.currency + " —");
							details.push(b.currency + " 总额 " + (b.total || "—") + "（赠送 " + (b.granted || "—") + "，充值 " + (b.toppedUp || "—") + "）");
						});
						body = React.createElement("span", null, parts.join(" · "));
						title = "DeepSeek 账户余额\n" + details.join("\n") + (data.available ? "" : "\n（账户不可用）");
					}
				}

				return React.createElement("div", {
					className: "ds-balance-widget " + (phase === "error" ? "is-error" : phase === "loading" ? "is-loading" : ""),
					title: title,
					onClick: () => { if (manualRefresh) manualRefresh(); }
				}, [
					React.createElement("span", { key: "tag", className: "ds-balance-tag" }, "DS"),
					body
				]);
			}

			slots.inject("conversation.session.header.utilities", () => slots.register(
				{ name: "conversation.session.header.utilities", id: "deepseek-balance", order: 10, label: "DeepSeek 余额" },
				() => React.createElement(BalanceWidget)
			));
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
