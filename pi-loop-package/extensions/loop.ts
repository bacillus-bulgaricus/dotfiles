import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function loopExtension(pi: ExtensionAPI): void {
	let active = false;
	let prompt = "";
	let iteration = 0;
	let maxIterations = 100;
	let shouldContinue = false;

	function stopLoop(reason: string): void {
		active = false;
		shouldContinue = false;
		pi.appendEntry("loop-state", { active, prompt, iteration, maxIterations, reason, stoppedAt: Date.now() });
	}

	function startLoop(nextPrompt: string, max?: number): void {
		active = true;
		prompt = nextPrompt;
		iteration = 0;
		maxIterations = max && max > 0 ? Math.floor(max) : 100;
		shouldContinue = false;
		pi.appendEntry("loop-state", { active, prompt, iteration, maxIterations, startedAt: Date.now() });
	}

	pi.registerTool({
		name: "loop_control",
		label: "Loop Control",
		description: "Stop or continue an active prompt loop",
		parameters: Type.Object({
			action: Type.Union([Type.Literal("stop"), Type.Literal("continue")]),
			reason: Type.Optional(Type.String()),
		}),
		promptSnippet: "Stop or continue the automated loop when appropriate",
		promptGuidelines: [
			"When loop goals are satisfied, call loop_control with action=stop.",
			"If more loop iterations are needed, call loop_control with action=continue.",
		],
		async execute(_toolCallId, params) {
			if (params.action === "stop") {
				stopLoop(params.reason || "Stopped by agent");
				return {
					content: [{ type: "text", text: `Loop stopped. ${params.reason || ""}`.trim() }],
					details: { active, prompt, iteration, maxIterations },
				};
			}
			shouldContinue = true;
			return {
				content: [{ type: "text", text: "Loop marked to continue." }],
				details: { active, prompt, iteration, maxIterations },
			};
		},
	});

	pi.registerCommand("loop", {
		description: "Start/stop/show autonomous prompt loop: /loop start <prompt> [--max N], /loop stop, /loop status",
		handler: async (args, ctx) => {
			const raw = (args || "").trim();
			if (!raw || raw === "status") {
				ctx.ui.notify(
					active
						? `Loop active: iteration ${iteration}/${maxIterations} | prompt: ${prompt}`
						: "Loop is inactive",
					"info",
				);
				return;
			}

			if (raw === "stop") {
				stopLoop("Stopped by user");
				ctx.ui.notify("Loop stopped", "success");
				return;
			}

			const match = raw.match(/^start\s+(.+)$/);
			if (!match) {
				ctx.ui.notify("Usage: /loop start <prompt> [--max N] | /loop stop | /loop status", "warning");
				return;
			}

			let body = match[1].trim();
			let max = 100;
			const maxMatch = body.match(/\s--max\s+(\d+)$/);
			if (maxMatch) {
				max = Number(maxMatch[1]);
				body = body.slice(0, maxMatch.index).trim();
			}
			if (!body) {
				ctx.ui.notify("Prompt cannot be empty", "warning");
				return;
			}

			startLoop(body, max);
			ctx.ui.notify(`Loop started (max ${maxIterations})`, "success");
			pi.sendUserMessage(body);
		},
	});

	pi.on("before_agent_start", async (event) => {
		if (!active) return;
		return {
			systemPrompt:
				event.systemPrompt +
				"\n\nAn autonomous loop is active. At the end of each turn, decide whether to continue or stop by calling loop_control. If objective is complete, call loop_control with action=stop.",
		};
	});

	pi.on("tool_result", async (event, ctx) => {
		if (event.toolName !== "loop_control") return;
		ctx.ui.setStatus("loop", active ? `loop ${iteration}/${maxIterations}` : undefined);
	});

	pi.on("agent_end", async (_event, ctx) => {
		if (!active) return;
		if (!shouldContinue) {
			stopLoop("Agent did not request continue");
			ctx.ui.notify("Loop stopped: agent chose not to continue", "info");
			ctx.ui.setStatus("loop", undefined);
			return;
		}
		iteration += 1;
		if (iteration >= maxIterations) {
			stopLoop("Reached max iterations");
			ctx.ui.notify(`Loop stopped: reached max iterations (${maxIterations})`, "warning");
			ctx.ui.setStatus("loop", undefined);
			return;
		}

		shouldContinue = false;
		ctx.ui.setStatus("loop", `loop ${iteration}/${maxIterations}`);
		pi.sendUserMessage(prompt, { deliverAs: "followUp" });
	});
}
