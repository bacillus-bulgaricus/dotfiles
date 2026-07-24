#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const force = args.includes("--force");
const positional = args.filter((arg) => !arg.startsWith("--"));
const targetArg = positional[0];
const rawName = positional[1];

if (!targetArg || args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: node scripts/scaffold-pi-extension.mjs [--force] <target-dir> [extension-name]\n\nCreates a minimal Pi extension package skeleton.`);
  process.exit(targetArg ? 0 : 1);
}

function kebab(input) {
  return input
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-") || "ported-extension";
}

const targetDir = path.resolve(process.cwd(), targetArg);
const extensionName = kebab(rawName || path.basename(targetDir));
const commandName = extensionName;
const toolName = extensionName.replace(/-/g, "_");

const packageJson = `${JSON.stringify({
  name: extensionName,
  private: true,
  keywords: ["pi-package"],
  peerDependencies: {
    "@earendil-works/pi-coding-agent": "*",
    "@earendil-works/pi-ai": "*",
    "@earendil-works/pi-tui": "*",
    typebox: "*",
  },
  pi: {
    extensions: ["./index.ts"],
  },
}, null, 2)}\n`;

const indexTs = `import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("${commandName}", {
    description: "Run the ${extensionName} command",
    handler: async (args, ctx) => {
      if (ctx.hasUI) {
        ctx.ui.notify(\`${extensionName}: \${args || "no arguments"}\`, "info");
      }
    },
  });

  pi.registerTool({
    name: "${toolName}",
    label: "${extensionName}",
    description: "TODO: describe the ported model-callable behavior",
    parameters: Type.Object({
      input: Type.String({ description: "TODO: describe input" }),
    }),
    async execute(_toolCallId, params, signal) {
      if (signal?.aborted) {
        return { content: [{ type: "text", text: "Cancelled" }] };
      }

      return {
        content: [{ type: "text", text: \`TODO: handle input: \${params.input}\` }],
        details: { input: params.input },
      };
    },
  });
}
`;

async function writeNew(filePath, content) {
  if (existsSync(filePath) && !force) {
    throw new Error(`${filePath} already exists; pass --force to overwrite`);
  }
  await writeFile(filePath, content, "utf8");
}

await mkdir(targetDir, { recursive: true });
await writeNew(path.join(targetDir, "package.json"), packageJson);
await writeNew(path.join(targetDir, "index.ts"), indexTs);

console.log(`Created Pi extension scaffold in ${targetDir}`);
console.log(`- Command: /${commandName}`);
console.log(`- Tool: ${toolName}`);
console.log("Next: replace TODOs, then test with: pi -e .");
