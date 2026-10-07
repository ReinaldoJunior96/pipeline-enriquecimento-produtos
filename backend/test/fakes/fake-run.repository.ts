import {
  CreateRunInput,
  Run,
  RunRepository,
} from '../../src/modules/runs/domain/repositories/run.repository.js';
import { RunAlreadyExistsError } from '../../src/modules/runs/domain/errors/run-already-exists.error.js';

export class FakeRunRepository implements RunRepository {
  readonly runs: Run[] = [];

  async exists(runId: string): Promise<boolean> {
    return this.runs.some((run) => run.runId === runId);
  }

  async create(input: CreateRunInput): Promise<Run> {
    if (this.runs.some(({ runId }) => runId === input.runId)) {
      throw new RunAlreadyExistsError(input.runId);
    }

    const now = new Date();
    const run: Run = {
      ...input,
      status: 'PROCESSING',
      finishedCount: 0,
      callbackSent: false,
      createdAt: now,
      updatedAt: now,
    };

    this.runs.push(run);
    return run;
  }
}
