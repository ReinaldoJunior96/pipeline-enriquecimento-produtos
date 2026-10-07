export interface PlatformAuthContext {
  cid: string;
  token: string;
}

export interface PlatformAuthContextInput extends PlatformAuthContext {
  runId: string;
}

export interface PlatformAuthContextStore {
  saveForRun(input: PlatformAuthContextInput): Promise<void>;
  getForRun(runId: string): Promise<PlatformAuthContext | null>;
  deleteForRun(runId: string): Promise<void>;
}

export const PLATFORM_AUTH_CONTEXT_STORE = Symbol(
  'PLATFORM_AUTH_CONTEXT_STORE',
);
