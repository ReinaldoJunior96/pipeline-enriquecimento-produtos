import { bullBoardEstaAtivado } from './bull-board.module.js';

describe('Configuração do Bull Board', () => {
  it('deve ativar somente com o valor true', () => {
    expect(bullBoardEstaAtivado('true')).toBe(true);
    expect(bullBoardEstaAtivado('false')).toBe(false);
    expect(bullBoardEstaAtivado(undefined)).toBe(false);
  });
});
