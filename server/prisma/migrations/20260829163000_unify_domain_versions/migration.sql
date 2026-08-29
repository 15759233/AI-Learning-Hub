ALTER TABLE "learning_themes"
  ADD COLUMN "current_draft_version_id" TEXT,
  ADD COLUMN "published_version_id" TEXT;

ALTER TABLE "resources"
  ADD COLUMN "current_draft_version_id" TEXT,
  ADD COLUMN "published_version_id" TEXT;

ALTER TABLE "challenges"
  ADD COLUMN "current_draft_version_id" TEXT,
  ADD COLUMN "published_version_id" TEXT;

CREATE TABLE "challenge_versions" (
  "id" TEXT NOT NULL,
  "challenge_id" TEXT NOT NULL,
  "version_no" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "challenge_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "challenge_versions_challenge_id_version_no_key"
  ON "challenge_versions"("challenge_id", "version_no");

ALTER TABLE "challenge_versions"
  ADD CONSTRAINT "challenge_versions_challenge_id_fkey"
  FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "resource_versions" AS "version"
SET "snapshot" = "version"."snapshot" || jsonb_build_object(
  'category', "resource"."category",
  'format', "resource"."format",
  'visibility', "resource"."visibility",
  'fileId', "resource"."file_id",
  'data', COALESCE("version"."snapshot"->'data', "version"."snapshot"->'payload', "resource"."payload")
)
FROM "resources" AS "resource"
WHERE "version"."resource_id" = "resource"."id";

UPDATE "learning_theme_versions" AS "version"
SET "snapshot" = "version"."snapshot" || jsonb_build_object(
  'data', COALESCE("version"."snapshot"->'data', "version"."snapshot"->'payload', "theme"."payload"),
  'paths', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', "path"."id",
        'themeId', "path"."theme_id",
        'name', "path"."name",
        'description', "path"."description",
        'status', "path"."status",
        'sortOrder', "path"."sort_order",
        'stages', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', "stage"."id",
              'pathId', "stage"."path_id",
              'stageKey', "stage"."stage_key",
              'name', "stage"."name",
              'stageType', "stage"."stage_type",
              'description', "stage"."description",
              'sortOrder', "stage"."sort_order",
              'unlockRule', "stage"."unlock_rule_json",
              'contents', COALESCE((
                SELECT jsonb_agg(to_jsonb("content") ORDER BY "content"."sort_order")
                FROM "learning_path_contents" AS "content"
                WHERE "content"."stage_id" = "stage"."id"
              ), '[]'::jsonb)
            )
            ORDER BY "stage"."sort_order"
          )
          FROM "learning_path_stages" AS "stage"
          WHERE "stage"."path_id" = "path"."id"
        ), '[]'::jsonb)
      )
      ORDER BY "path"."sort_order"
    )
    FROM "learning_paths" AS "path"
    WHERE "path"."theme_id" = "theme"."id"
  ), '[]'::jsonb)
)
FROM "learning_themes" AS "theme"
WHERE "version"."theme_id" = "theme"."id";

INSERT INTO "challenge_versions" ("id", "challenge_id", "version_no", "snapshot")
SELECT CONCAT('challenge-version-', "id"), "id", 1,
  jsonb_build_object(
    'title', "title",
    'summary', "summary",
    'data', "payload",
    'challengeType', "challenge_type",
    'targetScore', "target_score",
    'rewardPoints', "reward_points",
    'questionBankId', "question_bank_id",
    'paperId', "paper_id",
    'rules', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('ruleKey', "rule_key", 'config', "config") ORDER BY "rule_key")
      FROM "challenge_rules" WHERE "challenge_id" = "challenges"."id"
    ), '[]'::jsonb)
  )
FROM "challenges";

UPDATE "learning_themes" AS "theme"
SET "current_draft_version_id" = (
      SELECT "id" FROM "learning_theme_versions"
      WHERE "theme_id" = "theme"."id"
      ORDER BY "version_no" DESC LIMIT 1
    ),
    "published_version_id" = CASE WHEN "theme"."status" = 'published' THEN (
      SELECT "id" FROM "learning_theme_versions"
      WHERE "theme_id" = "theme"."id"
      ORDER BY "version_no" DESC LIMIT 1
    ) ELSE NULL END;

UPDATE "resources" AS "resource"
SET "current_draft_version_id" = (
      SELECT "id" FROM "resource_versions"
      WHERE "resource_id" = "resource"."id"
      ORDER BY "version_no" DESC LIMIT 1
    ),
    "published_version_id" = CASE WHEN "resource"."status" = 'published' THEN (
      SELECT "id" FROM "resource_versions"
      WHERE "resource_id" = "resource"."id"
      ORDER BY "version_no" DESC LIMIT 1
    ) ELSE NULL END;

UPDATE "challenges"
SET "current_draft_version_id" = CONCAT('challenge-version-', "id"),
    "published_version_id" = CASE WHEN "status" = 'published' THEN CONCAT('challenge-version-', "id") ELSE NULL END;

ALTER TABLE "learning_themes"
  ADD CONSTRAINT "learning_themes_current_draft_version_id_fkey"
  FOREIGN KEY ("current_draft_version_id") REFERENCES "learning_theme_versions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "learning_themes_published_version_id_fkey"
  FOREIGN KEY ("published_version_id") REFERENCES "learning_theme_versions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "resources"
  ADD CONSTRAINT "resources_current_draft_version_id_fkey"
  FOREIGN KEY ("current_draft_version_id") REFERENCES "resource_versions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "resources_published_version_id_fkey"
  FOREIGN KEY ("published_version_id") REFERENCES "resource_versions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "challenges"
  ADD CONSTRAINT "challenges_current_draft_version_id_fkey"
  FOREIGN KEY ("current_draft_version_id") REFERENCES "challenge_versions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "challenges_published_version_id_fkey"
  FOREIGN KEY ("published_version_id") REFERENCES "challenge_versions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
