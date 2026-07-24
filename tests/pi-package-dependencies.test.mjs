import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function pkg(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const SUPERPOWERS_SOURCE = 'git:github.com/obra/superpowers@v6.2.0';

test('local pi extension packages declare runtime peer dependencies they import', () => {
  const expected = {
    'pi-worktree-core/package.json': ['@earendil-works/pi-coding-agent', '@earendil-works/pi-tui'],
    'pi-worktree-manager/package.json': ['@earendil-works/pi-coding-agent', '@earendil-works/pi-tui'],
    'pi-task/package.json': ['@earendil-works/pi-ai', '@earendil-works/pi-coding-agent', '@earendil-works/pi-tui', 'typebox'],
    'pi-loop-package/package.json': ['@earendil-works/pi-ai', '@earendil-works/pi-coding-agent', 'typebox'],
    'pi-claude-bridge/package.json': ['@earendil-works/pi-coding-agent', '@earendil-works/pi-tui'],
  };

  for (const [path, deps] of Object.entries(expected)) {
    const peers = pkg(path).peerDependencies ?? {};
    for (const dep of deps) {
      assert.equal(peers[dep], '*', `${path} should declare ${dep} as a peerDependency`);
    }
  }
});

test('packages with TypeScript-importing tests declare jiti as a dev dependency', () => {
  for (const path of [
    'pi-worktree-core/package.json',
    'pi-worktree-manager/package.json',
    'pi-task/package.json',
    'pi-loop-package/package.json',
    'pi-claude-bridge/package.json',
  ]) {
    const devDeps = pkg(path).devDependencies ?? {};
    assert.equal(devDeps.jiti, '*', `${path} should declare jiti for tests that import TypeScript`);
  }
});

test('package-local node_modules directories are ignored', () => {
  const gitignore = readFileSync('.gitignore', 'utf8');

  assert.match(gitignore, /^node_modules\/$/m, 'package dependency installs should not dirty git with node_modules');
});

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
  assert.match(
    script,
    /SUPERPOWERS_PACKAGE="git:github\.com\/obra\/superpowers@v6\.2\.0"/,
    'installer should declare pinned upstream Superpowers separately',
  );
  assert.match(script, /npm install --omit=dev/, 'installer should install local package dependencies');
  assert.match(script, /--package-lock=false/, 'installer should avoid package-lock files');
  assert.match(script, /for pkg in "\$\{LOCAL_PACKAGES\[@\]\}"/, 'local loops should only receive local package paths');
  assert.match(
    script,
    /pi install "\$SUPERPOWERS_PACKAGE"/,
    'installer should reconcile the configured git package even when pi list already reports it',
  );

  const npmLoop = script.match(/for pkg in "\$\{LOCAL_PACKAGES\[@\]\}"; do([\s\S]*?)done/)?.[1] ?? '';
  assert.doesNotMatch(npmLoop, /superpowers/, 'upstream git source must not be passed to npm --prefix');
});

test('shell environment disables optional Superpowers visual telemetry', () => {
  const shell = readFileSync('.chezmoitemplates/zshrc', 'utf8');

  assert.match(shell, /^export SUPERPOWERS_DISABLE_TELEMETRY=1$/m);
});
