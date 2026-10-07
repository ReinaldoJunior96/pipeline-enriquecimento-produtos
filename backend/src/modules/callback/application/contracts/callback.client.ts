import { CallbackRunPayload } from '../use-cases/consolidar-resultado-run.use-case.js';

export interface SendCallbackInput {
  token: string;
  payload: CallbackRunPayload;
}

export interface CallbackClient {
  sendCallback(input: SendCallbackInput): Promise<void>;
}

export const CALLBACK_CLIENT = Symbol('CALLBACK_CLIENT');
