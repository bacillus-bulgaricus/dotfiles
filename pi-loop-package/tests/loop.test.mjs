import test from 'node:test';
import assert from 'node:assert/strict';
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url);
const loop = await jiti.import('../extensions/loop.ts');

function setup() {
  const commands = new Map();
  const events = new Map();
  const entries = [];
  const messages = [];
  let tool;
  loop.default({
    registerTool(definition) { tool = definition; },
    registerCommand(name, definition) { commands.set(name, definition.handler); },
    on(name, handler) { events.set(name, handler); },
    appendEntry(customType, data) { entries.push({ type: 'custom', customType, data }); },
    sendUserMessage(message, options) { messages.push({ message, options }); },
  });
  return { commands, events, entries, messages, tool };
}

function context(entries = []) {
  const notifications = [];
  const statuses = [];
  return {
    ctx: {
      sessionManager: { getBranch() { return entries; } },
      ui: {
        notify(message, level) { notifications.push({ message, level }); },
        setStatus(name, value) { statuses.push({ name, value }); },
      },
    },
    notifications,
    statuses,
  };
}

test('loop_control uses a Google-compatible string enum schema', () => {
  const { tool } = setup();

  assert.deepEqual(tool.parameters.properties.action, {
    type: 'string',
    enum: ['stop', 'continue'],
  });
});

test('loop_control rejects continue when no loop is active', async () => {
  const { tool } = setup();

  await assert.rejects(
    () => tool.execute('call', { action: 'continue' }),
    /No loop is active/,
  );
});

test('session_start restores the latest persisted loop state', async () => {
  const stateEntries = [
    { type: 'custom', customType: 'loop-state', data: { active: false, prompt: 'old', iteration: 1, maxIterations: 3 } },
    { type: 'custom', customType: 'loop-state', data: { active: true, prompt: 'keep going', iteration: 2, maxIterations: 7, shouldContinue: false } },
  ];
  const { commands, events } = setup();
  const state = context(stateEntries);

  assert.ok(events.has('session_start'));
  await events.get('session_start')({ reason: 'startup' }, state.ctx);
  await commands.get('loop')('status', state.ctx);

  assert.match(state.notifications.at(-1).message, /iteration 2\/7/);
  assert.match(state.notifications.at(-1).message, /keep going/);
});

test('loop continuation waits for agent_settled', async () => {
  const { commands, events, messages, tool } = setup();
  const state = context();

  assert.equal(events.has('agent_end'), false);
  assert.ok(events.has('agent_settled'));
  await commands.get('loop')('start inspect failures --max 3', state.ctx);
  await tool.execute('call', { action: 'continue' });
  await events.get('agent_settled')({}, state.ctx);

  assert.deepEqual(messages, [
    { message: 'inspect failures', options: undefined },
    { message: 'inspect failures', options: { deliverAs: 'followUp' } },
  ]);
});
