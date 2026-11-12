-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_otp" VARCHAR(6) DEFAULT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_otp_expires" TIMESTAMP DEFAULT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_users_reset_otp" ON "users"("reset_otp");
