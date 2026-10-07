import {
  PlatformAuthContext,
  PlatformAuthContextInput,
  PlatformAuthContextStore,
} from '../../src/modules/platform-auth/application/contracts/platform-auth-context.store.js';

export class FakePlatformAuthContextStore implements PlatformAuthContextStore {
  readonly credenciaisPorRun = new Map<string, PlatformAuthContext>();

  async saveForRun(input: PlatformAuthContextInput): Promise<void> {
    const { runId, cid, token } = input;
    this.credenciaisPorRun.set(runId, { cid, token });
  }

  async getForRun(runId: string): Promise<PlatformAuthContext | null> {
    return this.credenciaisPorRun.get(runId) ?? null;
  }

  async deleteForRun(runId: string): Promise<void> {
    this.credenciaisPorRun.delete(runId);
  }
}
