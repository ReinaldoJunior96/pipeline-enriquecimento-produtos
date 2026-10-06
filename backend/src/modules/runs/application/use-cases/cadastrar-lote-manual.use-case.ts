import {
  CreateRunInput,
  Run,
  RunRepository,
} from '../../domain/repositories/run.repository.js';

export class CadastrarLoteManualUseCase {
  constructor(private readonly runRepository: RunRepository) {}

  execute(input: CreateRunInput): Promise<Run> {
    return this.runRepository.create(input);
  }
}
