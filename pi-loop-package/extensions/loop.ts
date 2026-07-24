import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";

type LoopState = {
	active: boolean;
	prompt: string;
	iteration: number;
	maxIterations: number;
	shouldContinue: boolean;
};

function isLoopState(value: unknown): value is LoopState {
	if (!value || typeof value !== "object") return false;
	const state = value as Partial<LoopState>;
	return typeof state.active === "boolean"
		&& typeof state.prompt === "string"
		&& Number.isInteger(state.iteration)
		&& Number.isInteger(state.maxIterations)
		&& typeof state.shouldContinue === "boolean";
}

export default function loopExtension(pi: ExtensionAPI): void {
	let state: LoopState = {
		active: false,
		prompt: "",
		iteration: 0,
		maxIterations: 100,
		shouldContinue: false,
	};

	function persist(extra: Record<string, unknown> = {}): void {
		pi.appendEntry("loop-state", { ...state, ...extra });
	}

	function stopLoop(reason: string): void {
		state = { ...state, active: false, shouldContinue: false };
		persist({ reason, stoppedAt: Date.now() });
	}

	function startLoop(prompt: string, max?: number): void {
		state = {
			active: true,
			prompt,
			iteration: 0,
			maxIterations: max && max > 0 ? Math.floor(max) : 100,
			shouldContinue: false,
		};
		persist({ startedAt: Date.now() });
	}

	pi.registerTool({
		name: "loop_control",
		label: "Loop Control",
		description: "Stop or continue an active prompt loop",
		parameters: Type.Object({
			action: StringEnum(["stop", "continue"] as const),
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
					details: state,
				};
			}
			if (!state.active) throw new Error("No loop is active");
			state = { ...state, shouldContinue: true };
			persist({ reason: params.reason || "Continuation requested" });
			return {
				content: [{ type: "text", text: "Loop marked to continue." }],
				details: state,
			};
		},
	});

	pi.registerCommand("loop", {
		description: "Start/stop/show autonomous prompt loop: /loop start <prompt> [--max N], /loop stop, /loop status",
		handler: async (args, ctx) => {
			const raw = (args || "").trim();
			if (!raw || raw === "status") {
				ctx.ui.notify(
					state.active
						? `Loop active: iteration ${state.iteration}/${state.maxIterations} | prompt: ${state.prompt}`
						: "Loop is inactive",
					"info",
				);
				return;
			}

			if (raw === "stop") {
				stopLoop("Stopped by user");
				ctx.ui.notify("Loop stopped", "success");
				ctx.ui.setStatus("loop", undefined);
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
			ctx.ui.setStatus("loop", `loop ${state.iteration}/${state.maxIterations}`);
			ctx.ui.notify(`Loop started (max ${state.maxIterations})`, "success");
			pi.sendUserMessage(body);
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		const entries = ctx.sessionManager.getBranch();
		for (let index = entries.length - 1; index >= 0; index -= 1) {
			const entry = entries[index];
			if (entry.type !== "custom" || entry.customType !== "loop-state" || !isLoopState(entry.data)) continue;
			state = entry.data;
			break;
		}
		ctx.ui.setStatus("loop", state.active ? `loop ${state.iteration}/${state.maxIterations}` : undefined);
	});

	pi.on("before_agent_start", async (event) => {
		if (!state.active) return;
		return {
			systemPrompt:
				event.systemPrompt
				+ "\n\nAn autonomous loop is active. At the end of each turn, decide whether to continue or stop by calling loop_control. If objective is complete, call loop_control with action=stop.",
		};
	});

	pi.on("tool_result", async (event, ctx) => {
		if (event.toolName !== "loop_control") return;
		ctx.ui.setStatus("loop", state.active ? `loop ${state.iteration}/${state.maxIterations}` : undefined);
	});

	pi.on("agent_settled", async (_event, ctx) => {
		if (!state.active) return;
		if (!state.shouldContinue) {
			stopLoop("Agent did not request continue");
			ctx.ui.notify("Loop stopped: agent chose not to continue", "info");
			ctx.ui.setStatus("loop", undefined);
			return;
		}
		const nextIteration = state.iteration + 1;
		if (nextIteration >= state.maxIterations) {
			state = { ...state, iteration: nextIteration };
			stopLoop("Reached max iterations");
			ctx.ui.notify(`Loop stopped: reached max iterations (${state.maxIterations})`, "warning");
			ctx.ui.setStatus("loop", undefined);
			return;
		}

		state = { ...state, iteration: nextIteration, shouldContinue: false };
		persist({ continuedAt: Date.now() });
		ctx.ui.setStatus("loop", `loop ${state.iteration}/${state.maxIterations}`);
		pi.sendUserMessage(state.prompt, { deliverAs: "followUp" });
	});
}
