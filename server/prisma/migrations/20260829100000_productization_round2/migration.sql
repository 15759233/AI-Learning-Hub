ALTER TABLE "learning_path_stages"
  ADD COLUMN "stage_key" TEXT;

UPDATE "learning_path_stages"
SET "stage_key" = CONCAT('stage-', "sort_order", '-', "id")
WHERE "stage_key" IS NULL;

ALTER TABLE "learning_path_stages"
  ALTER COLUMN "stage_key" SET NOT NULL;

DROP INDEX IF EXISTS "learning_path_stages_path_id_stage_type_key";
CREATE UNIQUE INDEX "learning_path_stages_path_id_stage_key_key"
  ON "learning_path_stages"("path_id", "stage_key");
CREATE INDEX "learning_path_stages_path_id_sort_order_idx"
  ON "learning_path_stages"("path_id", "sort_order");

ALTER TABLE "learning_notes"
  ADD COLUMN "lesson_id" TEXT,
  ADD COLUMN "scope_key" TEXT NOT NULL DEFAULT 'course';

DROP INDEX IF EXISTS "learning_notes_user_id_course_id_key";
CREATE UNIQUE INDEX "learning_notes_user_id_course_id_scope_key_key"
  ON "learning_notes"("user_id", "course_id", "scope_key");
CREATE INDEX "learning_notes_user_id_updated_at_idx"
  ON "learning_notes"("user_id", "updated_at");
ALTER TABLE "learning_notes"
  ADD CONSTRAINT "learning_notes_lesson_id_fkey"
  FOREIGN KEY ("lesson_id") REFERENCES "course_lessons"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lesson_progress"
  ADD COLUMN "position_seconds" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "lab_runs"
  ADD COLUMN "next_event_sequence" INTEGER NOT NULL DEFAULT 1;

UPDATE "lab_runs" AS "run"
SET "next_event_sequence" = COALESCE((
  SELECT MAX("event"."sequence")
  FROM "lab_run_events" AS "event"
  WHERE "event"."run_id" = "run"."id"
), 0);

WITH "ranked_growth_points" AS (
  SELECT "id",
    ROW_NUMBER() OVER (
      PARTITION BY "user_id", "event_type", "reference"
      ORDER BY "created_at", "id"
    ) AS "duplicate_rank"
  FROM "growth_points"
  WHERE "reference" IS NOT NULL
)
DELETE FROM "growth_points"
WHERE "id" IN (
  SELECT "id" FROM "ranked_growth_points" WHERE "duplicate_rank" > 1
);

CREATE UNIQUE INDEX "growth_points_user_id_event_type_reference_key"
  ON "growth_points"("user_id", "event_type", "reference");

DELETE FROM "user_knowledge_stats" AS "stat"
WHERE NOT EXISTS (
  SELECT 1 FROM "knowledge_points" AS "point"
  WHERE "point"."id" = "stat"."knowledge_key"
);

ALTER TABLE "user_knowledge_stats"
  RENAME COLUMN "knowledge_key" TO "knowledge_point_id";
ALTER INDEX "user_knowledge_stats_user_id_knowledge_key_key"
  RENAME TO "user_knowledge_stats_user_id_knowledge_point_id_key";
ALTER TABLE "user_knowledge_stats"
  ADD CONSTRAINT "user_knowledge_stats_knowledge_point_id_fkey"
  FOREIGN KEY ("knowledge_point_id") REFERENCES "knowledge_points"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "idempotency_keys_key_key";
CREATE UNIQUE INDEX "idempotency_keys_scope_key_key"
  ON "idempotency_keys"("scope", "key");

CREATE TABLE "challenge_best_scores" (
  "user_id" TEXT NOT NULL,
  "challenge_id" TEXT NOT NULL,
  "attempt_id" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "challenge_best_scores_pkey" PRIMARY KEY ("user_id", "challenge_id"),
  CONSTRAINT "challenge_best_scores_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "challenge_best_scores_challenge_id_fkey"
    FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "challenge_best_scores_attempt_id_fkey"
    FOREIGN KEY ("attempt_id") REFERENCES "assessment_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "challenge_best_scores_challenge_id_score_idx"
  ON "challenge_best_scores"("challenge_id", "score");

CREATE TABLE "login_throttles" (
  "identity_key" TEXT NOT NULL,
  "failures" INTEGER NOT NULL DEFAULT 0,
  "blocked_until" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "login_throttles_pkey" PRIMARY KEY ("identity_key")
);
CREATE INDEX "login_throttles_expires_at_idx"
  ON "login_throttles"("expires_at");
