import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

export const systemProbes = pgTable('system_probes', {
  id: uuid('id').primaryKey(),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
});
