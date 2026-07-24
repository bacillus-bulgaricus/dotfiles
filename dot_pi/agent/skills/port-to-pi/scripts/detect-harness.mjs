#!/usr/bin/env node
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const rootArg = args.find((arg) => !arg.startsWith("--"));

if (!rootArg || args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: node scripts/detect-harness.mjs [--json] <source-path>\n\nStatically inspects an agent artifact and suggests Pi migration targets.`);
  process.exit(rootArg ? 0 : 1);
}

const root = path.resolve(process.cwd(), rootArg);
const maxDepth = 7;
const maxFiles = 2500;
const maxReadBytes = 256 * 1024;
const skipDirs = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "target",
  "coverage",
  ".next",
  ".turbo",
  ".cache",
]);

const files = [];
const dirs = new Set();

async function walk(abs, rel = "", depth = 0) {
  if (files.length >= maxFiles || depth > maxDepth) return;

  let st;
  try {
    st = await lstat(abs);
  } catch {
    return;
  }

  if (st.isSymbolicLink()) return;

  if (st.isDirectory()) {
    const base = path.basename(abs);
    if (rel && skipDirs.has(base)) return;
    if (rel) dirs.add(rel.split(path.sep).join("/"));

    let entries;
    try {
      entries = await readdir(abs, { withFileTypes: true });
    } catch {
      return;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const childRel = rel ? path.join(rel, entry.name) : entry.name;
      await walk(path.join(abs, entry.name), childRel, depth + 1);
      if (files.length >= maxFiles) break;
    }
    return;
  }

  if (st.isFile()) {
    files.push({
      rel: rel.split(path.sep).join("/"),
      abs,
      size: st.size,
    });
  }
}

function signal(signals, type, rel, detail) {
  signals.push({ type, path: rel, detail });
}

function hasPathPrefix(rel, prefixes) {
  return prefixes.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`));
}

async function readSmall(file) {
  if (file.size > maxReadBytes) return undefined;
  try {
    return await readFile(file.abs, "utf8");
  } catch {
    return undefined;
  }
}

await walk(root);

const signals = [];
const harnesses = new Set();
const sourceFeatures = new Set();

for (const dir of dirs) {
  const lower = dir.toLowerCase();
  if ([".claude", "dot_claude"].includes(lower) || lower.startsWith(".claude/") || lower.startsWith("dot_claude/")) {
    harnesses.add("claude-code");
    signal(signals, "claude-directory", dir, "Claude Code directory convention");
  }
  if ([".codex", "dot_codex"].includes(lower) || lower.startsWith(".codex/") || lower.startsWith("dot_codex/")) {
    harnesses.add("codex");
    signal(signals, "codex-directory", dir, "OpenAI Codex directory convention");
  }
  if (lower === ".cursor" || lower.startsWith(".cursor/")) {
    harnesses.add("cursor");
    signal(signals, "cursor-directory", dir, "Cursor directory convention");
  }
  if (lower === ".windsurf" || lower.startsWith(".windsurf/")) {
    harnesses.add("windsurf");
    signal(signals, "windsurf-directory", dir, "Windsurf directory convention");
  }
  if (lower === ".gemini" || lower.startsWith(".gemini/")) {
    harnesses.add("gemini");
    signal(signals, "gemini-directory", dir, "Gemini directory convention");
  }
}

for (const file of files) {
  const rel = file.rel;
  const lower = rel.toLowerCase();
  const base = path.basename(lower);

  if (base === "skill.md") {
    harnesses.add("agent-skills");
    sourceFeatures.add("skill");
    signal(signals, "skill", rel, "Agent Skill entrypoint");
  }

  if (base === "claude.md") {
    harnesses.add("claude-code");
    sourceFeatures.add("rules");
    signal(signals, "claude-instructions", rel, "Claude instruction file");
  }

  if (base === "agents.md") {
    harnesses.add("codex");
    sourceFeatures.add("rules");
    signal(signals, "agents-instructions", rel, "Agent instruction file");
  }

  if (base === ".cursorrules" || lower.includes(".cursor/rules")) {
    harnesses.add("cursor");
    sourceFeatures.add("rules");
    signal(signals, "cursor-rules", rel, "Cursor rules");
  }

  if (lower.includes(".windsurf/rules")) {
    harnesses.add("windsurf");
    sourceFeatures.add("rules");
    signal(signals, "windsurf-rules", rel, "Windsurf rules");
  }

  if (base === "gemini.md") {
    harnesses.add("gemini");
    sourceFeatures.add("rules");
    signal(signals, "gemini-instructions", rel, "Gemini instruction file");
  }

  if (hasPathPrefix(lower, [".claude/commands", "dot_claude/commands", "commands"]) && lower.endsWith(".md")) {
    harnesses.add("claude-code");
    sourceFeatures.add("command-prompt");
    signal(signals, "slash-command", rel, "Markdown command prompt");
  }

  if (hasPathPrefix(lower, [".claude/hooks", "dot_claude/hooks", "hooks"])) {
    harnesses.add("claude-code");
    sourceFeatures.add("hook");
    signal(signals, "hook-file", rel, "Hook script or config");
  }

  if (base === "settings.json" || base === "settings.json.tmpl") {
    const text = await readSmall(file);
    if (text && /"hooks"\s*:/.test(text)) {
      harnesses.add("claude-code");
      sourceFeatures.add("hook");
      signal(signals, "hooks-config", rel, "Settings file declares hooks");
    }
    if (text && /"skills"\s*:/.test(text)) {
      sourceFeatures.add("skill-config");
      signal(signals, "skills-config", rel, "Settings file declares skill paths");
    }
  }

  if (base === "package.json") {
    const text = await readSmall(file);
    if (text) {
      try {
        const pkg = JSON.parse(text);
        if (pkg.pi) {
          harnesses.add("pi");
          signal(signals, "pi-package", rel, "Package already declares Pi resources");
        }
        const keywords = Array.isArray(pkg.keywords) ? pkg.keywords : [];
        if (keywords.includes("pi-package")) {
          harnesses.add("pi");
          signal(signals, "pi-keyword", rel, "Package keyword includes pi-package");
        }
        const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies, ...pkg.optionalDependencies };
        const depNames = Object.keys(deps || {});
        if (depNames.some((name) => name.includes("modelcontextprotocol"))) {
          harnesses.add("mcp");
          sourceFeatures.add("mcp");
          signal(signals, "mcp-dependency", rel, "Package depends on MCP libraries");
        }
        if (depNames.some((name) => name.includes("claude") || name.includes("anthropic"))) {
          signal(signals, "claude-or-anthropic-dependency", rel, "Package references Claude/Anthropic dependencies");
        }
        if (pkg.bin || pkg.main || pkg.exports) {
          sourceFeatures.add("runtime-code");
          signal(signals, "package-entrypoint", rel, "Package has executable/runtime entrypoints");
        }
      } catch {
        signal(signals, "invalid-package-json", rel, "Could not parse package.json");
      }
    }
  }

  if (/\.(ts|tsx|js|jsx|mjs|cjs|py|sh)$/.test(lower)) {
    const text = await readSmall(file);
    if (!text) continue;

    if (/registerTool|createTool|tool\s*\(/i.test(text)) {
      sourceFeatures.add("tool");
      signal(signals, "tool-like-code", rel, "Code appears to define a tool");
    }
    if (/registerCommand|slash command|commands?\s*[:=]/i.test(text)) {
      sourceFeatures.add("runtime-command");
      signal(signals, "command-like-code", rel, "Code appears to define commands");
    }
    if (/PreToolUse|PostToolUse|UserPromptSubmit|SubagentStop|Stop\b|Notification/i.test(text)) {
      harnesses.add("claude-code");
      sourceFeatures.add("hook");
      signal(signals, "claude-hook-code", rel, "Code references Claude hook events");
    }
    if (/modelcontextprotocol|MCPServer|McpServer/i.test(text)) {
      harnesses.add("mcp");
      sourceFeatures.add("mcp");
      signal(signals, "mcp-code", rel, "Code references MCP");
    }
  }
}

const recommendations = [];
if (sourceFeatures.has("skill")) {
  recommendations.push("Pi skill: likely directly loadable if SKILL.md frontmatter is valid; validate before rewriting.");
}
if (sourceFeatures.has("rules")) {
  recommendations.push("Pi skill or project context: port static instruction/rules files without an extension unless dynamic injection is needed.");
}
if (sourceFeatures.has("command-prompt")) {
  recommendations.push("Pi prompt template or Pi skill: markdown slash commands are usually static prompts.");
}
if (sourceFeatures.has("runtime-command")) {
  recommendations.push("Pi extension command: runtime command code should map to pi.registerCommand().");
}
if (sourceFeatures.has("tool")) {
  recommendations.push("Pi extension tool: model-callable tool behavior should map to pi.registerTool().");
}
if (sourceFeatures.has("hook")) {
  recommendations.push("Pi extension events: hook behavior should map to input, before_agent_start, tool_call, tool_result, turn_end, agent_end, or session events.");
}
if (sourceFeatures.has("mcp")) {
  recommendations.push("MCP review needed: wrap approved tools in a Pi extension or document the external MCP/CLI dependency.");
}
if (sourceFeatures.has("runtime-code") && recommendations.length === 0) {
  recommendations.push("Runtime package: inspect entrypoints and consider a Pi extension or Pi package.");
}
if (recommendations.length > 1 || sourceFeatures.has("runtime-code")) {
  recommendations.push("Pi package: use when distributing multiple converted resources together.");
}
if (recommendations.length === 0) {
  recommendations.push("No strong agent-harness signals found; inspect README and source manually.");
}

const report = {
  root,
  scannedFiles: files.length,
  truncated: files.length >= maxFiles,
  detectedHarnesses: [...harnesses].sort(),
  sourceFeatures: [...sourceFeatures].sort(),
  signals,
  recommendations,
};

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Source: ${report.root}`);
  console.log(`Scanned files: ${report.scannedFiles}${report.truncated ? " (truncated)" : ""}`);
  console.log(`Detected harnesses: ${report.detectedHarnesses.join(", ") || "none"}`);
  console.log(`Source features: ${report.sourceFeatures.join(", ") || "none"}`);
  console.log("\nSignals:");
  for (const item of report.signals) {
    console.log(`- ${item.type}: ${item.path} — ${item.detail}`);
  }
  console.log("\nRecommendations:");
  for (const item of report.recommendations) {
    console.log(`- ${item}`);
  }
}
