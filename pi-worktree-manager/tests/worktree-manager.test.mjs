import test from 'node:test';
import assert from 'node:assert/strict';
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url);
const mod = await jiti.import('../extensions/worktree-manager.ts');

test('parseWorktreeList returns selectable worktree entries with names from paths', () => {
  const porcelain = `worktree /repo\nHEAD abc123\nbranch refs/heads/main\n\nworktree /repo/.pi/worktrees/feature-auth\nHEAD def456\nbranch refs/heads/worktree-feature-auth\n\nworktree /repo/.pi/worktrees/fix-bug\nHEAD fedcba\ndetached\n`;

  assert.deepEqual(mod.parseWorktreeList(porcelain), [
    { path: '/repo', name: 'repo', branch: 'main' },
    { path: '/repo/.pi/worktrees/feature-auth', name: 'feature-auth', branch: 'worktree-feature-auth' },
    { path: '/repo/.pi/worktrees/fix-bug', name: 'fix-bug', branch: undefined },
  ]);
});

test('tmuxLaunchCommand creates a new window when already inside tmux', () => {
  assert.deepEqual(mod.tmuxLaunchCommand({ name: 'feature-auth', path: '/repo/.pi/worktrees/feature-auth', insideTmux: true }), {
    command: 'tmux',
    args: ['new-window', '-n', 'feature-auth', '-c', '/repo/.pi/worktrees/feature-auth', 'pi -c'],
    description: 'Started tmux window feature-auth',
  });
});

test('tmuxLaunchCommand creates a detached session when outside tmux', () => {
  assert.deepEqual(mod.tmuxLaunchCommand({ name: 'feature-auth', path: '/repo/.pi/worktrees/feature-auth', insideTmux: false }), {
    command: 'tmux',
    args: ['new-session', '-d', '-s', 'pi-feature-auth', '-c', '/repo/.pi/worktrees/feature-auth', 'pi -c'],
    description: 'Started tmux session pi-feature-auth. Attach with: tmux attach -t pi-feature-auth',
  });
});

test('identifyPiManagedWorktree accepts only .pi/worktrees paths on matching worktree branches', () => {
  assert.deepEqual(mod.identifyPiManagedWorktree('/repo/.pi/worktrees/feature-auth', 'worktree-feature-auth'), {
    name: 'feature-auth',
    path: '/repo/.pi/worktrees/feature-auth',
    branch: 'worktree-feature-auth',
  });

  assert.equal(mod.identifyPiManagedWorktree('/repo/.pi/worktrees/feature-auth', 'feature-auth'), undefined);
  assert.equal(mod.identifyPiManagedWorktree('/repo/other/feature-auth', 'worktree-feature-auth'), undefined);
  assert.equal(mod.identifyPiManagedWorktree('/repo/.pi/worktrees/feature-auth/nested', 'worktree-feature-auth'), undefined);
});

test('worktreeRemovalCommands uses safe remove first and force only after failure confirmation', () => {
  assert.deepEqual(mod.worktreeRemovalCommands('/repo/.pi/worktrees/feature-auth'), {
    safe: ['worktree', 'remove', '/repo/.pi/worktrees/feature-auth'],
    force: ['worktree', 'remove', '--force', '/repo/.pi/worktrees/feature-auth'],
  });
});

test('force removal prompt names the worktree path and the failed safe-removal output', () => {
  const prompt = mod.forceRemovalPrompt('/repo/.pi/worktrees/feature-auth', 'contains modified files');

  assert.match(prompt, /Force-remove this worktree\?/);
  assert.match(prompt, /\/repo\/\.pi\/worktrees\/feature-auth/);
  assert.match(prompt, /contains modified files/);
  assert.match(prompt, /git worktree remove --force/);
});
