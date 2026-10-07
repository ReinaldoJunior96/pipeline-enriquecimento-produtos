import { CallbackHttpError } from '../../domain/errors/callback.errors.js';
import {
  CALLBACK_JOB_BACKOFF_MS,
  CALLBACK_JOB_BACKOFF_TYPE,
} from '../queues/callback-queue.constants.js';

export function callbackBackoffStrategy(
  attemptsMade: number,
  type?: string,
  error?: Error,
): number {
  if (
    type !== CALLBACK_JOB_BACKOFF_TYPE ||
    !(error instanceof CallbackHttpError)
  ) {
    return -1;
  }

  if (error.status === 429) {
    return (error.retryAfterSeconds ?? CALLBACK_JOB_BACKOFF_MS / 1_000) * 1_000;
  }

  if (error.status >= 500) {
    return CALLBACK_JOB_BACKOFF_MS * 2 ** (attemptsMade - 1);
  }

  return -1;
}
