import {
  CreateRunInput,
  Run,
  RunRepository,
} from '../../src/modules/runs/domain/repositories/run.repository.js';

export class FakeRunRepository implements RunRepository {
  readonly runs: Run[] = [];

  async create(input: CreateRunInput): Promise<Run> {
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
