# Testing Checklist

Use this checklist before declaring a port complete.

## General

- [ ] Source path/repository inspected.
- [ ] Source harness and artifact type identified.
- [ ] License and attribution preserved.
- [ ] No unreviewed third-party code executed.
- [ ] Every source behavior has a Pi mapping or documented gap.
- [ ] User-facing install/load/test instructions are included.

## Pi skill

- [ ] `SKILL.md` exists.
- [ ] Frontmatter contains `name` and `description`.
- [ ] `name` is lowercase hyphenated, max 64 chars, no leading/trailing/consecutive hyphens.
- [ ] `description` is specific and max 1024 chars.
- [ ] Relative links to references/scripts/assets are valid.
- [ ] Detailed docs are in `references/` when appropriate.
- [ ] Helper scripts are documented and not required to run automatically.

Suggested validation:

```bash
node scripts/validate-pi-skill.mjs <skill-dir-or-SKILL.md>
```

## Pi extension

- [ ] Extension exports a default function receiving `ExtensionAPI`.
- [ ] Commands have clear descriptions.
- [ ] Tools have strict TypeBox schemas.
- [ ] String enums use `StringEnum` from `@earendil-works/pi-ai`.
- [ ] File-mutating tools use `withFileMutationQueue()`.
- [ ] Large outputs are truncated.
- [ ] Tool failures throw errors.
- [ ] UI interactions check `ctx.hasUI` or provide non-interactive fallbacks.
- [ ] Runtime dependencies are declared.
- [ ] State is reconstructed safely on `session_start` when needed.
- [ ] Cleanup happens on `session_shutdown` when needed.

Suggested smoke test:

```bash
pi -e ./extension.ts
```

or:

```bash
pi -e ./extension-dir
```

## Pi package

- [ ] `package.json` exists.
- [ ] `keywords` includes `pi-package` if intended for sharing.
- [ ] `pi` manifest paths are correct, or conventional directories are used.
- [ ] Pi core packages are peer dependencies, not bundled dependencies.
- [ ] Runtime dependencies are in `dependencies`.
- [ ] Package can be loaded temporarily with `pi -e ./package`.
- [ ] Install instructions mention `pi install ./package` when appropriate.

## Prompt templates

- [ ] Prompt file is static and does not require runtime behavior.
- [ ] Variables/arguments are documented.
- [ ] Prompt does not assume unavailable tools.
- [ ] If the source was a slash command with side effects, those side effects were moved to an extension or removed with a documented gap.

## Final report

Include:

```markdown
## Port report

Source: `<path-or-url>`
Detected harness: `<harness>`
Pi target: `<skill | extension | prompt | package>`

Created/changed:
- `<file>` — `<purpose>`

Behavior mapping:
- `<source feature>` → `<Pi feature>`

Known gaps:
- `<gap or none>`

How to load/test:
```bash
<commands>
```
```
