-- CreateEnum
CREATE TYPE "CommunityPostType" AS ENUM ('question', 'note', 'lab_result', 'project', 'frontier_discussion', 'achievement', 'general');

-- CreateEnum
CREATE TYPE "CommunityPostStatus" AS ENUM ('draft', 'published', 'limited', 'hidden', 'removed');

-- CreateEnum
CREATE TYPE "CommunityVisibility" AS ENUM ('public', 'school');

-- CreateEnum
CREATE TYPE "CommunityReactionType" AS ENUM ('like', 'useful');

-- AlterTable
ALTER TABLE "activity_events" ADD COLUMN     "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "position" INTEGER,
ADD COLUMN     "request_id" TEXT,
ADD COLUMN     "session_id" TEXT,
ADD COLUMN     "surface" TEXT;

-- 旧学习行为保留真实发生时间，不将升级时刻误作新行为。
UPDATE "activity_events" SET "occurred_at" = "created_at";

-- CreateTable
CREATE TABLE "community_profiles" (
    "user_id" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "headline" TEXT NOT NULL DEFAULT '',
    "verified_type" TEXT NOT NULL DEFAULT 'none',
    "expertise_topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allow_achievement_drafts" BOOLEAN NOT NULL DEFAULT false,
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "follower_count" INTEGER NOT NULL DEFAULT 0,
    "following_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "post_type" "CommunityPostType" NOT NULL,
    "status" "CommunityPostStatus" NOT NULL DEFAULT 'draft',
    "visibility" "CommunityVisibility" NOT NULL DEFAULT 'public',
    "school_id" TEXT,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "content_blocks" JSONB NOT NULL,
    "plain_text" TEXT NOT NULL,
    "source_type" TEXT,
    "source_id" TEXT,
    "content_hash" TEXT NOT NULL,
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published_at" TIMESTAMP(3),
    "edited_at" TIMESTAMP(3),
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "useful_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "bookmark_count" INTEGER NOT NULL DEFAULT 0,
    "impression_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_bindings" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "title_snapshot" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_question_states" (
    "post_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "accepted_comment_id" TEXT,
    "solved_at" TIMESTAMP(3),

    CONSTRAINT "community_question_states_pkey" PRIMARY KEY ("post_id")
);

-- CreateTable
CREATE TABLE "community_comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "root_id" TEXT,
    "body" TEXT NOT NULL,
    "content_blocks" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_reactions" (
    "user_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "reaction_type" "CommunityReactionType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_reactions_pkey" PRIMARY KEY ("user_id","post_id","reaction_type")
);

-- CreateTable
CREATE TABLE "community_comment_reactions" (
    "user_id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "reaction_type" "CommunityReactionType" NOT NULL DEFAULT 'like',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_comment_reactions_pkey" PRIMARY KEY ("user_id","comment_id","reaction_type")
);

-- CreateTable
CREATE TABLE "community_bookmarks" (
    "user_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_bookmarks_pkey" PRIMARY KEY ("user_id","post_id")
);

-- CreateTable
CREATE TABLE "community_user_follows" (
    "follower_id" TEXT NOT NULL,
    "followee_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_user_follows_pkey" PRIMARY KEY ("follower_id","followee_id")
);

-- CreateTable
CREATE TABLE "community_topics" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "accent" TEXT NOT NULL DEFAULT 'purple',
    "theme_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "follower_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "community_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_topics" (
    "post_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,

    CONSTRAINT "community_post_topics_pkey" PRIMARY KEY ("post_id","topic_id")
);

-- CreateTable
CREATE TABLE "community_topic_follows" (
    "user_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_topic_follows_pkey" PRIMARY KEY ("user_id","topic_id")
);

-- CreateTable
CREATE TABLE "community_feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "feedback_type" TEXT NOT NULL,
    "post_type" "CommunityPostType",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "post_id" TEXT,
    "comment_id" TEXT,
    "target_key" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "handled_by" TEXT,
    "handled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_moderation_actions" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_feed_impressions" (
    "request_id" TEXT NOT NULL,
    "viewer_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "candidate_source" TEXT NOT NULL,
    "policy_version" TEXT NOT NULL,
    "reason_codes" TEXT[],
    "score_bucket" INTEGER NOT NULL,
    "impressed_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "dwell_ms" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "community_feed_impressions_pkey" PRIMARY KEY ("request_id","post_id")
);

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "notification_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "actor_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_feed_signal_snapshots" (
    "user_id" TEXT NOT NULL,
    "topic_affinity" JSONB NOT NULL DEFAULT '{}',
    "author_affinity" JSONB NOT NULL DEFAULT '{}',
    "post_type_affinity" JSONB NOT NULL DEFAULT '{}',
    "learning_content_affinity" JSONB NOT NULL DEFAULT '{}',
    "negative_feedback" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "event_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_feed_signal_snapshots_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "community_feed_sessions" (
    "id" TEXT NOT NULL,
    "viewer_id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "policy_version" TEXT NOT NULL,
    "entries" JSONB NOT NULL,
    "context" JSONB NOT NULL,
    "degraded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_feed_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_posts_status_published_at_id_idx" ON "community_posts"("status", "published_at", "id");

-- CreateIndex
CREATE INDEX "community_posts_author_id_status_published_at_idx" ON "community_posts"("author_id", "status", "published_at");

-- CreateIndex
CREATE INDEX "community_posts_school_id_status_published_at_idx" ON "community_posts"("school_id", "status", "published_at");

-- CreateIndex
CREATE INDEX "community_posts_post_type_status_published_at_idx" ON "community_posts"("post_type", "status", "published_at");

-- CreateIndex
CREATE INDEX "community_posts_content_hash_status_idx" ON "community_posts"("content_hash", "status");

-- CreateIndex
CREATE INDEX "community_post_bindings_target_type_target_id_idx" ON "community_post_bindings"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_post_bindings_post_id_target_type_target_id_key" ON "community_post_bindings"("post_id", "target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_question_states_accepted_comment_id_key" ON "community_question_states"("accepted_comment_id");

-- CreateIndex
CREATE INDEX "community_comments_post_id_created_at_idx" ON "community_comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "community_comments_author_id_created_at_idx" ON "community_comments"("author_id", "created_at");

-- CreateIndex
CREATE INDEX "community_user_follows_followee_id_idx" ON "community_user_follows"("followee_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_topics_slug_key" ON "community_topics"("slug");

-- CreateIndex
CREATE INDEX "community_post_topics_topic_id_idx" ON "community_post_topics"("topic_id");

-- CreateIndex
CREATE INDEX "community_feedback_user_id_feedback_type_idx" ON "community_feedback"("user_id", "feedback_type");

-- CreateIndex
CREATE INDEX "community_feedback_target_id_feedback_type_idx" ON "community_feedback"("target_id", "feedback_type");

-- CreateIndex
CREATE UNIQUE INDEX "community_feedback_user_id_target_id_feedback_type_key" ON "community_feedback"("user_id", "target_id", "feedback_type");

-- CreateIndex
CREATE INDEX "community_reports_status_created_at_idx" ON "community_reports"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "community_reports_reporter_id_target_key_key" ON "community_reports"("reporter_id", "target_key");

-- CreateIndex
CREATE INDEX "community_moderation_actions_target_type_target_id_created__idx" ON "community_moderation_actions"("target_type", "target_id", "created_at");

-- CreateIndex
CREATE INDEX "community_feed_impressions_viewer_id_impressed_at_idx" ON "community_feed_impressions"("viewer_id", "impressed_at");

-- CreateIndex
CREATE INDEX "community_feed_impressions_post_id_impressed_at_idx" ON "community_feed_impressions"("post_id", "impressed_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_notifications_dedupe_key_key" ON "user_notifications"("dedupe_key");

-- CreateIndex
CREATE INDEX "user_notifications_recipient_id_read_at_created_at_idx" ON "user_notifications"("recipient_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "community_feed_sessions_expires_at_idx" ON "community_feed_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "activity_events_user_id_occurred_at_idx" ON "activity_events"("user_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "community_profiles" ADD CONSTRAINT "community_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_bindings" ADD CONSTRAINT "community_post_bindings_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_question_states" ADD CONSTRAINT "community_question_states_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_question_states" ADD CONSTRAINT "community_question_states_accepted_comment_id_fkey" FOREIGN KEY ("accepted_comment_id") REFERENCES "community_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "community_comments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_reactions" ADD CONSTRAINT "community_post_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_reactions" ADD CONSTRAINT "community_post_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comment_reactions" ADD CONSTRAINT "community_comment_reactions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "community_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comment_reactions" ADD CONSTRAINT "community_comment_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_bookmarks" ADD CONSTRAINT "community_bookmarks_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_bookmarks" ADD CONSTRAINT "community_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_user_follows" ADD CONSTRAINT "community_user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_user_follows" ADD CONSTRAINT "community_user_follows_followee_id_fkey" FOREIGN KEY ("followee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_topics" ADD CONSTRAINT "community_post_topics_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_topics" ADD CONSTRAINT "community_post_topics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "community_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_topic_follows" ADD CONSTRAINT "community_topic_follows_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "community_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_topic_follows" ADD CONSTRAINT "community_topic_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_feedback" ADD CONSTRAINT "community_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "community_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_moderation_actions" ADD CONSTRAINT "community_moderation_actions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_feed_impressions" ADD CONSTRAINT "community_feed_impressions_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feed_signal_snapshots" ADD CONSTRAINT "user_feed_signal_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_feed_sessions" ADD CONSTRAINT "community_feed_sessions_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 业务不变量由数据库兜底，应用仍提供友好校验消息。
ALTER TABLE "community_posts" ADD CONSTRAINT "community_post_nonnegative_counts" CHECK ("like_count" >= 0 AND "useful_count" >= 0 AND "comment_count" >= 0 AND "bookmark_count" >= 0 AND "impression_count" >= 0);
ALTER TABLE "community_posts" ADD CONSTRAINT "community_school_scope_required" CHECK ("visibility" <> 'school' OR "school_id" IS NOT NULL);
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comment_nonnegative_likes" CHECK ("like_count" >= 0);
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comment_root_consistent" CHECK (("parent_id" IS NULL AND "root_id" IS NULL) OR ("parent_id" IS NOT NULL AND "root_id" = "parent_id" AND "id" <> "parent_id"));
ALTER TABLE "community_user_follows" ADD CONSTRAINT "community_follow_not_self" CHECK ("follower_id" <> "followee_id");
ALTER TABLE "community_reports" ADD CONSTRAINT "community_report_one_target" CHECK (("post_id" IS NOT NULL)::int + ("comment_id" IS NOT NULL)::int = 1);
