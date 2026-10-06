-- CreateEnum
CREATE TYPE "RunItemStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'ERROR');

-- CreateTable
CREATE TABLE "run_items" (
    "id" SERIAL NOT NULL,
    "run_id" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "stock" INTEGER,
    "status" "RunItemStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "run_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "run_items_run_id_seq_key" ON "run_items"("run_id", "seq");

-- AddForeignKey
ALTER TABLE "run_items" ADD CONSTRAINT "run_items_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("run_id") ON DELETE RESTRICT ON UPDATE CASCADE;
