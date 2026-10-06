import {
  EnrichmentRateLimitError,
  EnrichmentTransientError,
} from '../../domain/errors/enrichment.errors.js';
import {
  PROCESSING_JOB_BACKOFF_MS,
  PROCESSING_JOB_BACKOFF_TYPE,
} from '../queues/processing-queue.constants.js';

export function processingBackoffStrategy(
  attemptsMade: number,
  type?: string,
  error?: Error,
): number {
  if (
    type === PROCESSING_JOB_BACKOFF_TYPE &&
    error instanceof EnrichmentRateLimitError
  ) {
    return error.retryAfterSeconds * 1_000;
  }

  if (
    type === PROCESSING_JOB_BACKOFF_TYPE &&
    error instanceof EnrichmentTransientError
  ) {
    return PROCESSING_JOB_BACKOFF_MS * 2 ** (attemptsMade - 1);
  }

  return -1;
}
