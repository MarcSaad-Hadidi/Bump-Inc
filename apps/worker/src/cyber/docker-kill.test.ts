import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { setTimeout as delay } from 'node:timers/promises';
import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  commands: [] as string[][],
  children: [] as { stdout: PassThrough; kill: (signal: string) => boolean }[],
}));
vi.mock('node:child_process', () => ({
  spawn: (_exe: string, args: string[]) => {
    state.commands.push(args);
    const child = new EventEmitter() as EventEmitter & {
      stdout: PassThrough;
      stderr: PassThrough;
      kill: (signal: string) => boolean;
    };
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    let closed = false;
    child.kill = (signal: string) => {
      if (signal === 'SIGKILL' && !closed) {
        closed = true;
        setImmediate(() => child.emit('close', 137));
      }
      return true;
    };
    state.children.push(child);
    if (args.includes('rm')) setImmediate(() => child.emit('close', 0));
    return child;
  },
}));

import { dockerCommand } from './docker.js';

beforeEach(() => {
  state.commands = [];
  state.children = [];
});
it('kills an unresponsive CLI and requests container removal on cancellation', async () => {
  const controller = new AbortController();
  const pending = dockerCommand(
    ['run', 'synthetic'],
    controller.signal,
    100,
    'bump-cyber-synthetic',
  );
  controller.abort();
  const outcome = await Promise.race([
    pending.then(
      () => 'resolved',
      () => 'rejected',
    ),
    delay(150).then(() => 'hung'),
  ]);
  expect(outcome).toBe('rejected');
  expect(
    state.commands.some(
      (c) => c.includes('rm') && c.includes('--force') && c.includes('bump-cyber-synthetic'),
    ),
  ).toBe(true);
});
it('forces container removal on output overflow without waiting for cooperative exit', async () => {
  const pending = dockerCommand(
    ['run', 'synthetic'],
    new AbortController().signal,
    8,
    'bump-cyber-synthetic',
  );
  state.children[0]!.stdout.write(Buffer.alloc(9));
  const outcome = await Promise.race([
    pending.then(
      () => 'resolved',
      () => 'rejected',
    ),
    delay(150).then(() => 'hung'),
  ]);
  expect(outcome).toBe('rejected');
  expect(state.commands.some((c) => c.includes('rm'))).toBe(true);
});
