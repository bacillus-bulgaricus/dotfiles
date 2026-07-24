import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function pkg(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('local pi extension packages declare runtime peer dependencies they import', () => {
  const expected = {
    'pi-worktree-manager/package.json': ['@earendil-works/pi-coding-agent', '@earendil-works/pi-tui'],
    'pi-task/package.json': ['@earendil-works/pi-ai', '@earendil-works/pi-coding-agent', '@earendil-works/pi-tui', 'typebox'],
    'pi-loop-package/package.json': ['@earendil-works/pi-coding-agent', 'typebox'],
    'pi-claude-bridge/package.json': ['@earendil-works/pi-coding-agent', '@earendil-works/pi-tui'],
    'pi-superpowers-package/package.json': ['@earendil-works/pi-coding-agent'],
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

test('pi local package installer installs local package peer dependencies before pi loads them', () => {
  const script = readFileSync('run_onchange_after_06-install-pi-packages.sh.tmpl', 'utf8');

  assert.match(script, /npm install --omit=dev/, 'installer should run npm install for local package dependencies');
  assert.match(script, /--package-lock=false/, 'installer should avoid writing package-lock.json files into dotfiles packages');
  assert.match(script, /for pkg in "\$\{PACKAGES\[@\]\}"/, 'installer should install dependencies for every local Pi package');
});
