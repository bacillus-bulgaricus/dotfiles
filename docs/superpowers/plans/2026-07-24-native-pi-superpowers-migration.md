# Native Pi Superpowers Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vendored Superpowers v5.1.0 Pi port with the native upstream v6.2.0 Pi package pinned by git source.

**Architecture:** Pi settings will reference the immutable upstream tag directly while the bootstrap installer keeps npm dependency installation restricted to local packages. A shell environment overlay disables the optional visual-companion network request, and contract tests prevent the removed local package or duplicate native source from returning.

**Tech Stack:** chezmoi templates, Bash, JSON, Node.js built-in test runner, Pi package/RPC interfaces

---

### Task 1: Add migration contract tests

**Files:**
- Modify: `tests/pi-package-dependencies.test.mjs`
- Test: `tests/pi-package-dependencies.test.mjs`

- [ ] **Step 1: Remove the obsolete local peer-dependency expectation**

Delete this entry from the `expected` object:

```js
'pi-superpowers-package/package.json': ['@earendil-works/pi-coding-agent'],
```

- [ ] **Step 2: Replace the local installer test and add native-package settings and telemetry tests**

Replace the existing `pi local package installer installs local package peer dependencies before pi loads them` test with:

```js
const SUPERPOWERS_SOURCE = 'git:github.com/obra/superpowers@v6.2.0';

test('pi settings load the pinned native Superpowers package exactly once', () => {
  const settings = pkg('dot_pi/agent/settings.json.tmpl');

  assert.equal(
    settings.packages.filter((source) => source === SUPERPOWERS_SOURCE).length,
    1,
    'settings should contain the pinned upstream package exactly once',
  );
  assert.equal(
    settings.packages.some((source) => source.includes('pi-superpowers-package')),
    false,
    'settings should not load the removed local port',
  );
});

test('pi package installer separates local npm packages from managed git packages', () => {
  const script = readFileSync('run_onchange_after_06-install-pi-packages.sh.tmpl', 'utf8');

  assert.match(script, /LOCAL_PACKAGES=\(/, 'installer should declare local packages separately');
  assert.match(script, /PI_PACKAGES=\(/, 'installer should declare all Pi packages');
  assert.match(script, /git:github\.com\/obra\/superpowers@v6\.2\.0/, 'installer should register pinned upstream Superpowers');
  assert.match(script, /npm install --omit=dev/, 'installer should install local package dependencies');
  assert.match(script, /--package-lock=false/, 'installer should avoid package-lock files');
  assert.match(script, /for pkg in "\$\{LOCAL_PACKAGES\[@\]\}"/, 'npm loop should only receive local package paths');
  assert.match(script, /for pkg in "\$\{PI_PACKAGES\[@\]\}"/, 'Pi registration loop should receive all packages');

  const npmLoop = script.match(/for pkg in "\$\{LOCAL_PACKAGES\[@\]\}"; do([\s\S]*?)done/)?.[1] ?? '';
  assert.doesNotMatch(npmLoop, /superpowers/, 'upstream git source must not be passed to npm --prefix');
});

test('shell environment disables optional Superpowers visual telemetry', () => {
  const shell = readFileSync('.chezmoitemplates/zshrc', 'utf8');

  assert.match(shell, /^export SUPERPOWERS_DISABLE_TELEMETRY=1$/m);
});
```

Place `SUPERPOWERS_SOURCE` after the `pkg()` helper and before the first test.

- [ ] **Step 3: Run the contract tests and verify RED**

Run:

```bash
node --test tests/pi-package-dependencies.test.mjs
```

Expected: failures report that settings still contain the local port, the installer lacks `LOCAL_PACKAGES`/`PI_PACKAGES`, and the telemetry export is absent.

### Task 2: Switch configuration to native upstream Superpowers

**Files:**
- Modify: `dot_pi/agent/settings.json.tmpl`
- Modify: `run_onchange_after_06-install-pi-packages.sh.tmpl`
- Modify: `.chezmoitemplates/zshrc`
- Delete: `pi-superpowers-package/`
- Test: `tests/pi-package-dependencies.test.mjs`

- [ ] **Step 1: Replace the package source in Pi settings**

Replace:

```json
"{{ .chezmoi.sourceDir }}/pi-superpowers-package"
```

with:

```json
"git:github.com/obra/superpowers@v6.2.0"
```

- [ ] **Step 2: Separate local dependencies from Pi-managed git packages**

Replace the package arrays and loops in `run_onchange_after_06-install-pi-packages.sh.tmpl` with:

```bash
LOCAL_PACKAGES=(
  "{{ .chezmoi.sourceDir }}/pi-worktree-core"
  "{{ .chezmoi.sourceDir }}/pi-worktree-manager"
  "{{ .chezmoi.sourceDir }}/pi-task"
  "{{ .chezmoi.sourceDir }}/pi-loop-package"
  "{{ .chezmoi.sourceDir }}/pi-claude-bridge"
)

PI_PACKAGES=(
  "${LOCAL_PACKAGES[@]}"
  "git:github.com/obra/superpowers@v6.2.0"
)

for pkg in "${LOCAL_PACKAGES[@]}"; do
  npm install --omit=dev --package-lock=false --ignore-scripts --prefix "$pkg"
done

installed="$(pi list 2>/dev/null || true)"
for pkg in "${PI_PACKAGES[@]}"; do
  if ! grep -Fq -- "$pkg" <<<"$installed"; then
    pi install "$pkg" || true
  fi
done
```

This keeps the existing best-effort Pi registration policy while ensuring npm `--prefix` only receives filesystem paths.

- [ ] **Step 3: Add the separate privacy overlay**

Add this block to `.chezmoitemplates/zshrc` after the pipx exports and before the SSH agent section:

```bash
# Disable the optional remote logo request in Superpowers' visual companion.
export SUPERPOWERS_DISABLE_TELEMETRY=1
```

- [ ] **Step 4: Remove the vendored port**

Run:

```bash
rm -rf pi-superpowers-package
```

Expected: all vendored v5.1.0 skills, the compatibility bootstrap extension, local mapping, copied license/README, and port report are removed.

- [ ] **Step 5: Run the contract tests and verify GREEN**

Run:

```bash
node --test tests/pi-package-dependencies.test.mjs
```

Expected: all tests pass.

- [ ] **Step 6: Run template and shell checks**

Run:

```bash
make check
bash -n run_onchange_after_05-install-pi.sh.tmpl
bash -n run_onchange_after_06-install-pi-packages.sh.tmpl
```

Expected: rendered JSON is valid and both scripts pass Bash syntax checking.

### Task 3: Validate the reviewed upstream package and clean Pi discovery

**Files:**
- Verify: `/tmp/superpowers-upstream.SSoe2B/`
- Verify: `dot_pi/agent/skills/port-to-pi/scripts/validate-pi-skill.mjs`
- Verify: repository configuration and tests

- [ ] **Step 1: Verify the inspected checkout is the pinned release**

Run:

```bash
test "$(git -C /tmp/superpowers-upstream.SSoe2B rev-parse HEAD)" = "3dcbd5c4b48e02263fbf4a3c01e3fe4f81d584d9"
test "$(git -C /tmp/superpowers-upstream.SSoe2B describe --tags --exact-match)" = "v6.2.0"
```

Expected: both commands exit zero.

- [ ] **Step 2: Validate all upstream skills**

Run:

```bash
for skill in /tmp/superpowers-upstream.SSoe2B/skills/*; do
  node dot_pi/agent/skills/port-to-pi/scripts/validate-pi-skill.mjs "$skill"
done
```

Expected: all 14 skill directories validate successfully.

- [ ] **Step 3: Run upstream's reviewed native Pi tests**

Run:

```bash
node --experimental-strip-types --test /tmp/superpowers-upstream.SSoe2B/tests/pi/test-pi-extension.mjs
```

Expected: six tests pass, covering the package manifest, lifecycle hooks, skill discovery, bootstrap injection, compaction reinjection, and Pi tool mapping.

- [ ] **Step 4: Run an isolated Pi skill-discovery smoke test**

Run:

```bash
tmp_config="$(mktemp -d)"
printf '%s\n' '{"type":"get_commands"}' |
  PI_CODING_AGENT_DIR="$tmp_config" \
  pi --offline --no-session --mode rpc -e /tmp/superpowers-upstream.SSoe2B \
  > "$tmp_config/rpc.jsonl"
node - "$tmp_config/rpc.jsonl" <<'NODE'
const { readFileSync } = require('node:fs');
const lines = readFileSync(process.argv[2], 'utf8').trim().split('\n').map(JSON.parse);
const errors = lines.filter((entry) => entry.type === 'extension_error');
if (errors.length) throw new Error(JSON.stringify(errors));
const response = lines.find((entry) => entry.type === 'response' && entry.command === 'get_commands');
if (!response?.success) throw new Error('get_commands did not succeed');
const skills = response.data.commands.filter((command) => command.source === 'skill' && command.sourceInfo?.path?.includes('/superpowers-upstream.SSoe2B/skills/'));
const names = skills.map((command) => command.name);
if (skills.length !== 14) throw new Error(`expected 14 Superpowers skills, got ${skills.length}`);
if (new Set(names).size !== 14) throw new Error('duplicate Superpowers skills discovered');
if (skills.some((command) => command.sourceInfo.path.includes('pi-superpowers-package'))) throw new Error('local port discovered');
console.log(`ok: ${skills.length} unique native Superpowers skills`);
NODE
rm -rf "$tmp_config"
```

Expected: `ok: 14 unique native Superpowers skills` and no extension errors.

- [ ] **Step 5: Run the complete repository checks**

Run:

```bash
node --test tests/*.test.mjs
for pkg in pi-claude-bridge pi-task pi-worktree-core pi-worktree-manager; do
  (cd "$pkg" && npm test)
done
make check
git diff --check
```

Expected: all tests pass, templates render, and no whitespace errors are reported.

- [ ] **Step 6: Verify obsolete references and duplicate copies are absent**

Run:

```bash
if rg -n 'pi-superpowers-package' \
  --glob '!docs/superpowers/specs/2026-07-24-native-pi-superpowers-migration-design.md' \
  --glob '!docs/superpowers/plans/2026-07-24-native-pi-superpowers-migration.md' \
  --glob '!tests/pi-package-dependencies.test.mjs' \
  .; then
  echo 'obsolete runtime reference remains' >&2
  exit 1
fi
find . -path './.git' -prune -o -path './.pi' -prune -o -path '*/node_modules' -prune -o -path '*/using-superpowers/SKILL.md' -print
```

Expected: no obsolete runtime references and no repository-local `using-superpowers` copy.

- [ ] **Step 7: Commit the migration with behavior and rollback details**

Run:

```bash
git add .chezmoitemplates/zshrc dot_pi/agent/settings.json.tmpl \
  run_onchange_after_06-install-pi-packages.sh.tmpl \
  tests/pi-package-dependencies.test.mjs pi-superpowers-package
git commit -m "chore(pi): use native upstream Superpowers" \
  -m "Replace the vendored v5.1.0 Pi port and compatibility bootstrap with obra/superpowers v6.2.0's native Pi package, pinned at tag v6.2.0 (commit 3dcbd5c4b48e02263fbf4a3c01e3fe4f81d584d9). Preserve the independent Pi task/worktree packages and disable the optional visual-companion remote logo request. Upstream is MIT licensed, copyright Jesse Vincent." \
  -m "Behavior changes: Pi now uses upstream user-context bootstrap injection and v6.2.0 skill workflows instead of the local system-prompt adapter. Rollback: revert this commit, apply chezmoi, and reload Pi to restore the vendored port."
```

Expected: one migration commit containing configuration, tests, overlay, and complete port deletion.
