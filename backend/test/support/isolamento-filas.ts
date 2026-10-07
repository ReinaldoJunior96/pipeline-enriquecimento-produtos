import { randomUUID } from 'node:crypto';

process.env.BULLMQ_PREFIX = `test-${randomUUID()}`;
