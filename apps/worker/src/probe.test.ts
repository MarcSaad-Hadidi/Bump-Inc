import { randomUUID } from 'node:crypto';
import type { createDatabase } from '@bump/db';
import { UnrecoverableError } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';
import { createProbeProcessor } from './probe.js';

describe('system probe validation', () => {
  it.each([
    { name: 'unknown', data: { id: randomUUID() } },
    { name: 'probe', data: { id: 'invalid' } },
    { name: 'probe', data: { id: randomUUID(), command: 'unexpected' } },
  ])('rejects invalid jobs before accessing the database: $name', async (job) => {
    const insert = vi.fn();
    const database = { db: { insert } } as unknown as ReturnType<typeof createDatabase>;
    await expect(createProbeProcessor(database)(job)).rejects.toBeInstanceOf(UnrecoverableError);
    expect(insert).not.toHaveBeenCalled();
  });

  it('keeps database failures retryable without persisting driver details in Redis', async () => {
    const database = {
      db: {
        insert: () => ({
          values: () => ({
            onConflictDoNothing: vi.fn().mockRejectedValue(new Error('postgres://secret')),
          }),
        }),
      },
    } as unknown as ReturnType<typeof createDatabase>;
    const result = createProbeProcessor(database)({ name: 'probe', data: { id: randomUUID() } });
    await expect(result).rejects.toThrow('System probe persistence failed');
    await expect(result).rejects.not.toBeInstanceOf(UnrecoverableError);
  });
});
