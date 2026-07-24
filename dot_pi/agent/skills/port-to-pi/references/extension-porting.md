# Extension Porting Guide

Use this reference when source behavior cannot be represented as a pure Pi skill or prompt template.

## Porting questions

Before writing an extension, answer:

1. What runtime behavior is required?
2. Who invokes it: user, model, or lifecycle event?
3. Does it need UI?
4. Does it mutate files or external systems?
5. Does it need persistent state?
6. Does it need non-Pi dependencies?
7. What should happen in print/JSON/RPC mode without a TUI?

If the answers are all static instructions, do not write an extension.

## Source behavior to Pi APIs

| Source behavior | Pi API |
|---|---|
| User slash command | `pi.registerCommand()` |
| Model-callable tool | `pi.registerTool()` |
| Tool permission check | `pi.on("tool_call", ...)` |
| Tool result post-processing | `pi.on("tool_result", ...)` |
| Inject dynamic rules | `pi.on("before_agent_start", ...)` |
| Rewrite provider payload | `pi.on("before_provider_request", ...)` |
| Status/footer/widget UI | `ctx.ui.setStatus()`, `ctx.ui.setWidget()`, `ctx.ui.setFooter()` |
| Modal prompt/select/confirm | `ctx.ui.input()`, `ctx.ui.select()`, `ctx.ui.confirm()`, `ctx.ui.custom()` |
| File watcher or external trigger | Extension-managed watcher + `pi.sendMessage()` or `pi.sendUserMessage()` |
| Model provider/proxy | `pi.registerProvider()` |
| Toggle active tools | `pi.setActiveTools()` |
| Persist opaque state | `pi.appendEntry()` |

## Commands

Commands are best for user-invoked actions. They can wait for idle and can switch sessions.

```typescript
pi.registerCommand("port-status", {
  description: "Show current porting status",
  handler: async (args, ctx) => {
    await ctx.waitForIdle();
    ctx.ui.notify(args || "No status", "info");
  },
});
```

Avoid long-running command handlers without cancellation or progress messages.

## Tools

Tools are best for model-invoked deterministic operations.

Checklist:

- Clear `description` for the model.
- Strict `parameters` schema using TypeBox.
- `prepareArguments()` only for backward compatibility with old sessions.
- Abort-aware subprocesses/fetches using `signal`.
- Output truncation for large data.
- Error signaling by throwing.
- `details` for structured state/rendering.

## Events

`tool_call` can block or mutate tool input.

```typescript
pi.on("tool_call", async (event, ctx) => {
  if (event.toolName !== "bash") return;
  const input = event.input as { command?: string };
  if (input.command?.includes("forbidden")) {
    return { block: true, reason: "Forbidden command" };
  }
});
```

`tool_result` can return a partial patch:

```typescript
pi.on("tool_result", async (event, ctx) => {
  if (event.toolName !== "my_tool") return;
  return {
    content: [...event.content, { type: "text", text: "\nPost-processed." }],
  };
});
```

`before_agent_start` can append system prompt guidance for one turn:

```typescript
pi.on("before_agent_start", (event) => {
  return {
    systemPrompt: event.systemPrompt + "\n\nExtra project guidance for this turn.",
  };
});
```

## UI compatibility

Extensions may run in interactive, RPC, JSON, or print mode.

- Use `ctx.hasUI` before requiring UI interactions.
- Provide a safe non-interactive fallback.
- Avoid blocking automation with unanswerable dialogs.

Example:

```typescript
if (!ctx.hasUI) {
  return { block: true, reason: "Confirmation required but no UI is available" };
}
const ok = await ctx.ui.confirm("Proceed?", "This mutates files.");
```

## Dependencies

For a local extension with dependencies:

```text
my-extension/
├── package.json
├── node_modules/
└── index.ts
```

Runtime dependencies go in `dependencies`. Pi core packages should be `peerDependencies` in distributable packages:

```json
{
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*",
    "@earendil-works/pi-ai": "*",
    "@earendil-works/pi-tui": "*",
    "typebox": "*"
  }
}
```

## Testing extensions

For a single local extension:

```bash
pi -e ./path/to/extension.ts
```

For a package:

```bash
pi -e ./path/to/package
pi install ./path/to/package
pi list
```

For TypeScript syntax/type checks, use the package's existing tooling if present. If not, at minimum inspect imports and run any safe tests the user approves.

## Migration notes to include

Every ported extension should document:

- Source feature and file.
- Pi API used.
- Any changed matching semantics.
- Any security hardening added.
- Dependencies and setup.
- Non-interactive behavior.
