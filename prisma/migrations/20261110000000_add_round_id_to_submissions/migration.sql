-- AlterTable
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "round_id" VARCHAR(36) DEFAULT NULL;
ALTER TABLE "submissions" ALTER COLUMN "round_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_submissions_round" ON "submissions"("round_id");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'submissions_round_id_fkey' AND table_name = 'submissions'
  ) THEN
    ALTER TABLE "submissions" ADD CONSTRAINT "submissions_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "event_rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
