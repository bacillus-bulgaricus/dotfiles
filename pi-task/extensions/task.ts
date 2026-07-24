import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { complete } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { Key, matchesKey, truncateToWidth } from "@earendil-works/pi-tui";
import {
	discoverRepositories,
	ensureWorktree,
	errorText,
	parseWorktreeManagerConfig,
	slugify,
	tmuxPiLaunchCommand,
	type RepoCandidate,
} from "../../pi-worktree-core/src/index";

export type TaskConfig = { model?: string; tool?: { requireConfirmation?: boolean }; warnings: string[] };
export type InferredTask = {
	repoAlias: string;
	goal: string;
	worktreeName: string;
	kickoffPrompt: string;
	baseRef?: string;
};
export type TaskArgs = { request: string; split: boolean };
export type TaskToolParams = {
	description: string;
	split?: boolean;
	repoAlias?: string;
	worktreeName?: string;
	kickoffPrompt?: string;
	baseRef?: string;
	requireConfirmation?: boolean;
};

type MinimalTaskContext = {
	cwd: string;
	hasUI?: boolean;
	model?: any;
	modelRegistry: {
		find?: (provider: string, model: string) => any;
		getApiKeyAndHeaders: (model: any) => Promise<{ ok: true; apiKey?: string; headers?: Record<string, string> } | { ok: false; error: string }>;
	};
	ui: {
		notify: (message: string, level?: "info" | "success" | "warning" | "error") => void;
		confirm?: (title: string, message: string) => Promise<boolean>;
		custom: <T>(factory: (tui: { requestRender: () => void }, theme: any, keybindings: unknown, done: (value: T) => void) => any) => Promise<T>;
		input: (title: string, placeholder?: string) => Promise<string | undefined>;
	};
};

export function parseTaskConfig(raw: string): TaskConfig {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { warnings: ["task config is not valid JSON"] };
	}
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		return { warnings: ["task config must be an object"] };
	}

	const warnings: string[] = [];
	const config: TaskConfig = { warnings };
	const input = parsed as { model?: unknown; tool?: unknown };
	if (input.model !== undefined) {
		if (typeof input.model !== "string" || !input.model.includes("/")) {
			warnings.push("model must be a provider/model string");
		} else {
			config.model = input.model;
		}
	}
	if (input.tool !== undefined) {
		if (!input.tool || typeof input.tool !== "object" || Array.isArray(input.tool)) {
			warnings.push("tool must be an object");
		} else {
			const tool = input.tool as { requireConfirmation?: unknown };
			if (tool.requireConfirmation !== undefined && typeof tool.requireConfirmation !== "boolean") {
				warnings.push("tool.requireConfirmation must be a boolean");
			} else if (tool.requireConfirmation !== undefined) {
				config.tool = { requireConfirmation: tool.requireConfirmation };
			}
		}
	}
	return config;
}

function taskConfigPath(): string {
	return join(process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent"), "task.json");
}

function worktreeConfigPath(): string {
	return join(process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent"), "worktree-manager.json");
}

export function parseTaskArgs(args: string): TaskArgs {
	const pieces = args.trim().split(/\s+/).filter(Boolean);
	const split = pieces.includes("--split");
	return {
		split,
		request: pieces.filter((piece) => piece !== "--split").join(" "),
	};
}

export function taskToolRequiresConfirmation(config: TaskConfig, params: { requireConfirmation?: boolean }): boolean {
	return params.requireConfirmation ?? config.tool?.requireConfirmation ?? true;
}

export function explicitTaskFromToolParams(params: Partial<TaskToolParams>): InferredTask | undefined {
	if (!params.description || !params.repoAlias || !params.worktreeName || !params.kickoffPrompt) return undefined;
	return {
		repoAlias: params.repoAlias.trim(),
		goal: params.description.trim(),
		worktreeName: slugify(params.worktreeName.trim()),
		kickoffPrompt: params.kickoffPrompt.trim(),
		...(params.baseRef?.trim() ? { baseRef: params.baseRef.trim() } : {}),
	};
}

function loadTaskConfig(): TaskConfig {
	const path = taskConfigPath();
	if (!existsSync(path)) return { warnings: [] };
	return parseTaskConfig(readFileSync(path, "utf8"));
}

function loadWorktreeConfig(): { repoSearchRoots: string[]; warnings: string[] } {
	const path = worktreeConfigPath();
	if (!existsSync(path)) return { repoSearchRoots: [], warnings: [] };
	return parseWorktreeManagerConfig(readFileSync(path, "utf8"));
}

export function buildTaskInferencePrompt(request: string, repos: RepoCandidate[]): string {
	const repoList = repos.map((repo) => `- ${repo.alias}: ${repo.root}`).join("\n") || "- none";
	return `You turn a user's task request into a concise Pi task handoff.\n\nUser request:\n${request}\n\nCandidate repositories:\n${repoList}\n\nChoose exactly one repoAlias from the candidate repositories. Choose a short kebab-case-ish worktreeName that describes the task. Write a kickoffPrompt for a fresh Pi session with the goal, useful context, and constraints. Omit baseRef unless the user explicitly asks to base the task on a specific branch, tag, commit, or the current branch.\n\nReturn only JSON with this shape:\n{"repoAlias":"repo-alias","goal":"one sentence goal","worktreeName":"short task name","kickoffPrompt":"detailed kickoff prompt","baseRef":"optional explicit branch/tag/commit"}`;
}

function stripJsonFence(text: string): string {
	const trimmed = text.trim();
	const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
	return (fenced?.[1] ?? trimmed).trim();
}

export function parseTaskInference(text: string): InferredTask {
	const parsed = JSON.parse(stripJsonFence(text)) as Partial<InferredTask>;
	for (const key of ["repoAlias", "goal", "worktreeName", "kickoffPrompt"] as const) {
		if (typeof parsed[key] !== "string" || !parsed[key]?.trim()) {
			throw new Error(`Task inference missing ${key}`);
		}
	}
	return {
		repoAlias: parsed.repoAlias.trim(),
		goal: parsed.goal.trim(),
		worktreeName: slugify(parsed.worktreeName.trim()),
		kickoffPrompt: parsed.kickoffPrompt.trim(),
		...(typeof parsed.baseRef === "string" && parsed.baseRef.trim() ? { baseRef: parsed.baseRef.trim() } : {}),
	};
}

export function buildKickoffPrompt(input: {
	originalRequest: string;
	repo: RepoCandidate;
	goal: string;
	kickoffPrompt: string;
	baseRef?: string;
}): string {
	const baseLine = input.baseRef ? `\nBase ref: ${input.baseRef}` : "";
	return `Goal: ${input.goal}\n\nRepository: ${input.repo.alias}\nPath: ${input.repo.root}\nOriginal request: ${input.originalRequest}${baseLine}\n\nContext and constraints:\n${input.kickoffPrompt}\n\nUse the relevant Pi skills before coding. Start by inspecting the repository context, clarify only if the goal is ambiguous, and verify changes with the appropriate tests before reporting completion.`;
}

export function buildTaskLaunchCommand(
	worktree: { name: string; path: string },
	prompt: string,
	options: { split: boolean; insideTmux: boolean },
): ReturnType<typeof tmuxPiLaunchCommand> {
	return tmuxPiLaunchCommand({
		name: worktree.name,
		path: worktree.path,
		prompt,
		insideTmux: options.insideTmux,
		split: options.split,
		autoCleanup: true,
	});
}

export function reviewInputAction(data: string): { type: "launch" | "edit" | "cancel" } | undefined {
	if (matchesKey(data, Key.enter)) return { type: "launch" };
	if (data === "E") return { type: "edit" };
	if (matchesKey(data, Key.escape)) return { type: "cancel" };
	return undefined;
}

function extractText(content: unknown): string {
	if (!Array.isArray(content)) return "";
	return content
		.filter((part): part is { type: "text"; text: string } => Boolean(part) && typeof part === "object" && (part as any).type === "text" && typeof (part as any).text === "string")
		.map((part) => part.text)
		.join("\n");
}

function resolveConfiguredModel(configModel: string | undefined, ctx: MinimalTaskContext): any | undefined {
	if (!configModel) return ctx.model;
	const slash = configModel.indexOf("/");
	const provider = configModel.slice(0, slash);
	const id = configModel.slice(slash + 1);
	return ctx.modelRegistry.find?.(provider, id);
}

async function inferTask(request: string, repos: RepoCandidate[], config: TaskConfig, ctx: MinimalTaskContext): Promise<InferredTask> {
	const model = resolveConfiguredModel(config.model, ctx);
	if (!model) throw new Error(config.model ? `Configured model not found: ${config.model}` : "No active model");
	const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
	if (!auth.ok) throw new Error(auth.error);
	if (!auth.apiKey) throw new Error("No API key available for task model");

	const response = await complete(
		model,
		{
			messages: [
				{
					role: "user" as const,
					content: [{ type: "text" as const, text: buildTaskInferencePrompt(request, repos) }],
					timestamp: Date.now(),
				},
			],
		},
		{ apiKey: auth.apiKey, headers: auth.headers, reasoningEffort: "low" },
	);
	return parseTaskInference(extractText(response.content));
}

async function reviewTask(ctx: MinimalTaskContext, task: InferredTask, repo: RepoCandidate, kickoffPrompt: string): Promise<"launch" | "edit" | "cancel"> {
	return ctx.ui.custom((tui, theme, _keybindings, done) => ({
		invalidate(): void {},
		render(width: number): string[] {
			const lines: string[] = [];
			lines.push(new DynamicBorder((s: string) => theme.fg("accent", s)).render(width)[0] ?? "");
			lines.push(truncateToWidth(theme.fg("accent", theme.bold("Start task?")), width));
			lines.push(truncateToWidth(`Repo: ${repo.alias} — ${repo.root}`, width));
			lines.push(truncateToWidth(`Worktree: ${task.worktreeName}`, width));
			lines.push(truncateToWidth(`Base: ${task.baseRef ?? "latest default branch"}`, width));
			lines.push(truncateToWidth(`Goal: ${task.goal}`, width));
			lines.push("");
			for (const line of kickoffPrompt.split("\n").slice(0, 12)) lines.push(truncateToWidth(line, width));
			lines.push("");
			lines.push(truncateToWidth(theme.fg("dim", "Enter launch • E edit name/prompt • Esc cancel"), width));
			lines.push(new DynamicBorder((s: string) => theme.fg("accent", s)).render(width)[0] ?? "");
			return lines;
		},
		handleInput(data: string): void {
			const action = reviewInputAction(data);
			if (!action) return;
			done(action.type);
		},
	}));
}

async function maybeEditTask(ctx: MinimalTaskContext, task: InferredTask, kickoffPrompt: string): Promise<{ task: InferredTask; kickoffPrompt: string } | undefined> {
	const name = (await ctx.ui.input("Worktree name", task.worktreeName))?.trim();
	if (!name) return undefined;
	const prompt = (await ctx.ui.input("Kickoff prompt", kickoffPrompt))?.trim();
	if (!prompt) return undefined;
	return { task: { ...task, worktreeName: slugify(name) }, kickoffPrompt: prompt };
}

function applyTaskToolOverrides(task: InferredTask, params: TaskToolParams): InferredTask {
	return {
		repoAlias: params.repoAlias?.trim() || task.repoAlias,
		goal: task.goal,
		worktreeName: params.worktreeName ? slugify(params.worktreeName) : task.worktreeName,
		kickoffPrompt: params.kickoffPrompt?.trim() || task.kickoffPrompt,
		...(params.baseRef?.trim() ? { baseRef: params.baseRef.trim() } : task.baseRef ? { baseRef: task.baseRef } : {}),
	};
}

async function discoverTaskRepositories(ctx: MinimalTaskContext): Promise<{ config: TaskConfig; repos: RepoCandidate[] }> {
	const taskConfig = loadTaskConfig();
	for (const warning of taskConfig.warnings) ctx.ui.notify(warning, "warning");
	const worktreeConfig = loadWorktreeConfig();
	for (const warning of worktreeConfig.warnings) ctx.ui.notify(warning, "warning");
	const discovered = discoverRepositories({ cwd: ctx.cwd, config: worktreeConfig });
	for (const warning of discovered.warnings) ctx.ui.notify(warning, "warning");
	return { config: taskConfig, repos: discovered.repos };
}

async function launchResolvedTask(input: {
	request: string;
	split: boolean;
	task: InferredTask;
	repos: RepoCandidate[];
	ctx: MinimalTaskContext;
}): Promise<{ repo: RepoCandidate; worktree: { name: string; path: string; branch: string; created: boolean }; launchDescription: string; kickoffPrompt: string }> {
	const repo = input.repos.find((candidate) => candidate.alias === input.task.repoAlias);
	if (!repo) throw new Error(`Inferred repo not found: ${input.task.repoAlias}`);
	const kickoffPrompt = buildKickoffPrompt({ originalRequest: input.request, repo, goal: input.task.goal, kickoffPrompt: input.task.kickoffPrompt, baseRef: input.task.baseRef });
	const worktree = ensureWorktree(repo.root, input.task.worktreeName, { baseRef: input.task.baseRef, defaultBase: "remoteDefault" });
	const launch = buildTaskLaunchCommand(worktree, kickoffPrompt, { split: input.split, insideTmux: Boolean(process.env.TMUX) });
	execFileSync(launch.command, launch.args, { encoding: "utf8" });
	return { repo, worktree, launchDescription: launch.description, kickoffPrompt };
}

async function runTaskCommand(args: string, ctx: MinimalTaskContext): Promise<void> {
	const parsedArgs = parseTaskArgs(args);
	const request = parsedArgs.request;
	if (!request) {
		ctx.ui.notify("Usage: /task <task description>", "warning");
		return;
	}

	const discovered = await discoverTaskRepositories(ctx);
	if (discovered.repos.length === 0) {
		ctx.ui.notify("No repos found. Configure ~/.pi/agent/worktree-manager.json or run /task from a git repo.", "error");
		return;
	}

	let inferred: InferredTask;
	try {
		ctx.ui.notify("Inferring task handoff...", "info");
		inferred = await inferTask(request, discovered.repos, discovered.config, ctx);
	} catch (error) {
		ctx.ui.notify(`Task inference failed: ${errorText(error)}`, "error");
		return;
	}

	const repo = discovered.repos.find((candidate) => candidate.alias === inferred.repoAlias);
	if (!repo) {
		ctx.ui.notify(`Inferred repo not found: ${inferred.repoAlias}`, "error");
		return;
	}

	let kickoffPrompt = buildKickoffPrompt({ originalRequest: request, repo, goal: inferred.goal, kickoffPrompt: inferred.kickoffPrompt, baseRef: inferred.baseRef });
	while (true) {
		const action = await reviewTask(ctx, inferred, repo, kickoffPrompt);
		if (action === "cancel") return;
		if (action === "edit") {
			const edited = await maybeEditTask(ctx, inferred, kickoffPrompt);
			if (!edited) return;
			inferred = edited.task;
			kickoffPrompt = edited.kickoffPrompt;
			continue;
		}
		break;
	}

	try {
		const worktree = ensureWorktree(repo.root, inferred.worktreeName, { baseRef: inferred.baseRef, defaultBase: "remoteDefault" });
		const launch = buildTaskLaunchCommand(worktree, kickoffPrompt, { split: parsedArgs.split, insideTmux: Boolean(process.env.TMUX) });
		execFileSync(launch.command, launch.args, { encoding: "utf8" });
		ctx.ui.notify(`${worktree.created ? "Created" : "Using"} ${repo.alias} / ${worktree.name}. ${launch.description}`, "success");
	} catch (error) {
		ctx.ui.notify(`Task launch failed: ${errorText(error)}`, "error");
	}
}

async function runTaskTool(params: TaskToolParams, ctx: MinimalTaskContext): Promise<{ text: string; details: Record<string, unknown> }> {
	const request = params.description.trim();
	if (!request) throw new Error("description is required");

	const discovered = await discoverTaskRepositories(ctx);
	if (discovered.repos.length === 0) throw new Error("No repos found. Configure ~/.pi/agent/worktree-manager.json or run from a git repo.");

	let task = explicitTaskFromToolParams(params);
	if (!task) {
		task = applyTaskToolOverrides(await inferTask(request, discovered.repos, discovered.config, ctx), params);
	}

	const repo = discovered.repos.find((candidate) => candidate.alias === task.repoAlias);
	if (!repo) throw new Error(`Task repo not found: ${task.repoAlias}`);
	const kickoffPrompt = buildKickoffPrompt({ originalRequest: request, repo, goal: task.goal, kickoffPrompt: task.kickoffPrompt, baseRef: task.baseRef });
	if (taskToolRequiresConfirmation(discovered.config, params)) {
		if (!ctx.hasUI || !ctx.ui.confirm) throw new Error("Task launch requires UI confirmation");
		const ok = await ctx.ui.confirm("Launch task?", `Repo: ${repo.alias}\nWorktree: ${task.worktreeName}\nBase: ${task.baseRef ?? "latest default branch"}\nGoal: ${task.goal}`);
		if (!ok) return { text: "Task launch cancelled", details: { cancelled: true } };
	}

	const launched = await launchResolvedTask({ request, split: params.split === true, task, repos: discovered.repos, ctx });
	return {
		text: `${launched.worktree.created ? "Created" : "Using"} ${launched.repo.alias} / ${launched.worktree.name}. ${launched.launchDescription}`,
		details: {
			repo: launched.repo,
			worktree: launched.worktree,
			launchDescription: launched.launchDescription,
		},
	};
}

export default function taskExtension(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "task",
		label: "Task",
		description: "Start a fresh Pi task session in a Pi-managed git worktree",
		promptSnippet: "Start a fresh Pi task session in a new Pi-managed worktree for handoff work",
		promptGuidelines: [
			"Use the task tool when handing off a separable task to a fresh Pi session instead of asking the user to run /task manually.",
		],
		parameters: Type.Object({
			description: Type.String({ description: "Freeform task description to hand off" }),
			split: Type.Optional(Type.Boolean({ description: "Open in a tmux split pane when already inside tmux" })),
			repoAlias: Type.Optional(Type.String({ description: "Optional known repo alias to use directly" })),
			worktreeName: Type.Optional(Type.String({ description: "Optional worktree name to use directly" })),
			kickoffPrompt: Type.Optional(Type.String({ description: "Optional detailed prompt for the new Pi session" })),
			baseRef: Type.Optional(Type.String({ description: "Optional explicit branch, tag, or commit to base the task worktree on. If omitted, the latest remote default branch is used." })),
			requireConfirmation: Type.Optional(Type.Boolean({ description: "Override task.json tool.requireConfirmation for this call" })),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const result = await runTaskTool(params as TaskToolParams, ctx as MinimalTaskContext);
			return {
				content: [{ type: "text", text: result.text }],
				details: result.details,
			};
		},
	});

	pi.registerCommand("task", {
		description: "Infer a task, create a Pi worktree, and launch a fresh Pi tmux session",
		handler: async (args, ctx) => {
			await runTaskCommand(args || "", ctx as MinimalTaskContext);
		},
	});
}
