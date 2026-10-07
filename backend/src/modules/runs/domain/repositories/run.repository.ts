export type RunStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface CreateRunInput {
  runId: string;
  cid: string;
  total: number;
  startedAt: Date;
}

export interface Run extends CreateRunInput {
  status: RunStatus;
  finishedCount: number;
  callbackSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RunRepository {
  create(input: CreateRunInput): Promise<Run>;
  exists(runId: string): Promise<boolean>;
  findById(runId: string): Promise<Run | null>;
}
