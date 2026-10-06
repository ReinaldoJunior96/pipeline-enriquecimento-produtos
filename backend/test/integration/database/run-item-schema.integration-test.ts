import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';

interface ColunaRunItem {
  column_name: string;
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
  data_type: string;
  udt_name: string;
}

describe('Modelagem PostgreSQL dos itens do lote', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('deve possuir as colunas e os defaults esperados', async () => {
    const colunas = await prisma.$queryRaw<ColunaRunItem[]>`
      SELECT column_name, is_nullable, column_default, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'run_items'
      ORDER BY ordinal_position
    `;

    expect(colunas).toEqual([
      expect.objectContaining({
        column_name: 'id',
        is_nullable: 'NO',
        data_type: 'integer',
        column_default: expect.stringContaining('nextval'),
      }),
      expect.objectContaining({ column_name: 'run_id', is_nullable: 'NO' }),
      expect.objectContaining({
        column_name: 'seq',
        is_nullable: 'NO',
        data_type: 'integer',
      }),
      expect.objectContaining({ column_name: 'sku', is_nullable: 'NO' }),
      expect.objectContaining({ column_name: 'price', is_nullable: 'YES' }),
      expect.objectContaining({ column_name: 'stock', is_nullable: 'YES' }),
      expect.objectContaining({
        column_name: 'status',
        is_nullable: 'NO',
        udt_name: 'RunItemStatus',
        column_default: expect.stringContaining('PENDING'),
      }),
      expect.objectContaining({
        column_name: 'attempts',
        is_nullable: 'NO',
        column_default: '0',
      }),
      expect.objectContaining({
        column_name: 'error_code',
        is_nullable: 'YES',
      }),
      expect.objectContaining({
        column_name: 'error_message',
        is_nullable: 'YES',
      }),
      expect.objectContaining({
        column_name: 'created_at',
        is_nullable: 'NO',
        column_default: expect.stringContaining('CURRENT_TIMESTAMP'),
      }),
      expect.objectContaining({
        column_name: 'updated_at',
        is_nullable: 'NO',
        column_default: expect.stringContaining('CURRENT_TIMESTAMP'),
      }),
    ]);
  });

  it('deve possuir os estados previstos para o processamento', async () => {
    const estados = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel
      FROM pg_enum
      JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
      WHERE pg_type.typname = 'RunItemStatus'
      ORDER BY pg_enum.enumsortorder
    `;

    expect(estados.map(({ enumlabel }) => enumlabel)).toEqual([
      'PENDING',
      'PROCESSING',
      'SUCCESS',
      'ERROR',
    ]);
  });

  it('deve relacionar run_id a runs e garantir unicidade por run_id e seq', async () => {
    const restricoes = await prisma.$queryRaw<Array<{ definition: string }>>`
      SELECT pg_get_constraintdef(pg_constraint.oid) AS definition
      FROM pg_constraint
      JOIN pg_class ON pg_class.oid = pg_constraint.conrelid
      WHERE pg_class.relname = 'run_items'
    `;
    const definicoes = restricoes.map(({ definition }) => definition);

    expect(definicoes).toContain(
      'FOREIGN KEY (run_id) REFERENCES runs(run_id) ON UPDATE CASCADE ON DELETE RESTRICT',
    );
    expect(definicoes).toContain('UNIQUE (run_id, seq)');
  });
});
