-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "runs" (
    "run_id" TEXT NOT NULL,
    "cid" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'PROCESSING',
    "finished_count" INTEGER NOT NULL DEFAULT 0,
    "callback_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "runs_pkey" PRIMARY KEY ("run_id")
);
