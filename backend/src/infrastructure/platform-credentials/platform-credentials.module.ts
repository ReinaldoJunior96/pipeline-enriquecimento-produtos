import { Global, Module } from '@nestjs/common';
import { CREDENCIAIS_LOTE_STORE } from '../../modules/runs/application/contracts/credenciais-lote.store.js';
import { InMemoryCredenciaisLoteStore } from './in-memory-credenciais-lote.store.js';

@Global()
@Module({
  providers: [
    InMemoryCredenciaisLoteStore,
    {
      provide: CREDENCIAIS_LOTE_STORE,
      useExisting: InMemoryCredenciaisLoteStore,
    },
  ],
  exports: [CREDENCIAIS_LOTE_STORE],
})
export class PlatformCredentialsModule {}
