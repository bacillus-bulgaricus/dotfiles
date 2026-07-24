#!/usr/bin/env node
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const targetArg = args.find((arg) => !arg.startsWith("--"));

if (!targetArg || args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: node scripts/validate-pi-skill.mjs <SKILL.md-or-skill-directory>\n\nValidates the Pi/Agent Skills frontmatter and common relative links.`);
  process.exit(targetArg ? 0 : 1);
}

const target = path.resolve(process.cwd(), targetArg);
let skillPath = target;

try {
  const st = await stat(target);
  if (st.isDirectory()) skillPath = path.join(target, "SKILL.md");
} catch (error) {
  console.error(`Error: cannot stat ${target}: ${error.message}`);
  process.exit(1);
}

const errors = [];
const warnings = [];
let text = "";

try {
  text = await readFile(skillPath, "utf8");
} catch (error) {
  console.error(`Error: cannot read ${skillPath}: ${error.message}`);
  process.exit(1);
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return undefined;

  const data = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon === -1) {
      warnings.push(`Could not parse frontmatter line: ${rawLine}`);
      continue;
    }
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return data;
}

const fm = parseFrontmatter(text);
if (!fm) {
  errors.push("Missing YAML frontmatter delimited by --- at the top of SKILL.md.");
} else {
  const name = fm.name;
  const description = fm.description;

  if (!name) {
    errors.push("Missing required frontmatter field: name.");
  } else {
    if (name.length > 64) errors.push("name exceeds 64 characters.");
    if (!/^[a-z0-9-]+$/.test(name)) errors.push("name must contain only lowercase letters, numbers, and hyphens.");
    if (name.startsWith("-") || name.endsWith("-")) errors.push("name must not start or end with a hyphen.");
    if (name.includes("--")) errors.push("name must not contain consecutive hyphens.");
  }

  if (!description) {
    errors.push("Missing required frontmatter field: description.");
  } else if (description.length > 1024) {
    errors.push("description exceeds 1024 characters.");
  } else if (description.length < 20) {
    warnings.push("description is very short; make it specific so the agent knows when to load the skill.");
  }

  if (fm["user_invocable"] !== undefined) {
    warnings.push("user_invocable is not a Pi Agent Skills frontmatter field; Pi ignores unknown fields.");
  }
}

const skillDir = path.dirname(skillPath);
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
for (const match of text.matchAll(linkPattern)) {
  const raw = match[1].trim();
  if (!raw || raw.startsWith("#")) continue;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;

  const withoutTitle = raw.split(/\s+/)[0];
  const [linkPath] = withoutTitle.split("#", 1);
  if (!linkPath) continue;

  if (path.isAbsolute(linkPath)) {
    warnings.push(`Absolute local link should usually be relative: ${raw}`);
    continue;
  }

  const resolved = path.resolve(skillDir, linkPath);
  try {
    await access(resolved);
  } catch {
    warnings.push(`Linked local file does not exist: ${raw}`);
  }
}

console.log(`Validated: ${skillPath}`);
if (errors.length) {
  console.log("\nErrors:");
  for (const error of errors) console.log(`- ${error}`);
}
if (warnings.length) {
  console.log("\nWarnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
if (!errors.length && !warnings.length) {
  console.log("No issues found.");
}

process.exit(errors.length ? 1 : 0);
