import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const extensionDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = dirname(extensionDir);
const usingSuperpowersPath = join(packageRoot, "skills", "using-superpowers", "SKILL.md");
const piToolsPath = join(packageRoot, "skills", "using-superpowers", "references", "pi-tools.md");

function readBootstrap(): string {
  const usingSuperpowers = readFileSync(usingSuperpowersPath, "utf8");
  const piTools = readFileSync(piToolsPath, "utf8");

  return `<EXTREMELY_IMPORTANT>\nYou have Superpowers for Pi.\n\nBelow is the full content of the 'using-superpowers' skill plus Pi-specific tool mapping. Follow it before responding to coding tasks.\n\nIn Pi, there is no Claude Code Skill tool. To invoke a skill, use the read tool on the skill's SKILL.md path from the available_skills list, or follow the skill content already provided by /skill:name.\n\n${usingSuperpowers}\n\n${piTools}\n</EXTREMELY_IMPORTANT>`;
}

export default function (pi: ExtensionAPI) {
  let bootstrap = readBootstrap();
  let injected = false;

  pi.on("session_start", (_event, ctx) => {
    // Re-read on /reload so local edits to the vendored skills take effect.
    bootstrap = readBootstrap();
    injected = ctx.sessionManager.getBranch().some((entry) => {
      return entry.type === "custom_message" && entry.customType === "superpowers-bootstrap";
    });
  });

  pi.on("session_compact", () => {
    // Claude/Cursor run the upstream hook after compaction. Re-inject on the next turn.
    injected = false;
  });

  pi.on("before_agent_start", (event) => {
    const systemPrompt = `${event.systemPrompt}\n\nSuperpowers for Pi is installed. Before responding to coding tasks, check available skills and load any relevant Superpowers skill with the read tool. In Pi, adapt Claude Code tool names using skills/using-superpowers/references/pi-tools.md.`;

    if (injected) return { systemPrompt };

    injected = true;
    return {
      systemPrompt,
      message: {
        customType: "superpowers-bootstrap",
        content: bootstrap,
        display: false,
        details: {
          source: "https://github.com/obra/superpowers",
          upstreamVersion: "5.1.0",
        },
      },
    };
  });
}
