// Synthetic crash-test worker. Receives only isolated runtime URLs, never operator credentials.
import { createDatabase } from '@bump/db';
import { Redis } from 'ioredis';
import { createExecutionWorker } from '../dist/execution.js';

const database = createDatabase(process.env.DATABASE_URL);
const connection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
connection.on('error', () => {});
const worker = createExecutionWorker({ connection, database, concurrency: 1 });
worker.on('error', () => {});
await worker.waitUntilReady();
process.send?.('ready');
