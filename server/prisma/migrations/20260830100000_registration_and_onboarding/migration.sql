ALTER TABLE "users"
  ADD COLUMN "email_verified_at" TIMESTAMP(3),
  ADD COLUMN "agreement_version" TEXT,
  ADD COLUMN "agreement_accepted_at" TIMESTAMP(3),
  ADD COLUMN "registration_source" TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN "onboarding_completed_at" TIMESTAMP(3),
  ADD COLUMN "username_changed_at" TIMESTAMP(3);
-- 旧账号保留现有使用流程，只有新注册账号进入首次引导。
UPDATE "users" SET "onboarding_completed_at" = CURRENT_TIMESTAMP;
CREATE TABLE "password_reset_tokens" (
  "id" TEXT PRIMARY KEY, "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" TEXT NOT NULL UNIQUE, "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "password_reset_tokens_user_id_expires_at_idx" ON "password_reset_tokens"("user_id", "expires_at");
CREATE TABLE "email_verification_tokens" (
  "id" TEXT PRIMARY KEY, "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" TEXT NOT NULL UNIQUE, "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "email_verification_tokens_user_id_expires_at_idx" ON "email_verification_tokens"("user_id", "expires_at");
CREATE TABLE "registration_throttles" (
  "identity_key" TEXT PRIMARY KEY, "attempts" INTEGER NOT NULL DEFAULT 1, "expires_at" TIMESTAMP(3) NOT NULL
);
INSERT INTO "system_settings"("id", "key", "value", "sensitive", "updated_at")
VALUES ('registration-settings', 'registration', '{"mode":"open","emailVerification":false,"agreementVersion":"2026-08-30","passwordMinLength":8,"schoolRequired":false}', false, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
