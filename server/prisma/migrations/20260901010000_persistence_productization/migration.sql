-- 先检查历史大小写冲突。冲突时整体停止，禁止自动合并或删除账号。
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT lower(email) FROM users GROUP BY lower(email) HAVING count(*) > 1)
    OR EXISTS (SELECT lower(username) FROM users GROUP BY lower(username) HAVING count(*) > 1) THEN
    RAISE EXCEPTION '账号存在大小写冲突；请先运行 persistence:audit 并人工处理';
  END IF;
END $$;
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));
CREATE UNIQUE INDEX users_username_lower_key ON users (lower(username));
ALTER TABLE users ADD COLUMN revision INTEGER NOT NULL DEFAULT 1, ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE community_profiles ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE community_posts ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE community_comments ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE system_settings ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE activity_events ADD COLUMN event_key TEXT, ADD COLUMN action_type TEXT, ADD COLUMN entity_type TEXT, ADD COLUMN entity_id TEXT, ADD COLUMN source TEXT NOT NULL DEFAULT 'student-web';
CREATE UNIQUE INDEX activity_events_event_key_key ON activity_events(event_key);
CREATE INDEX users_status_created_at_idx ON users(status,created_at);
CREATE INDEX users_school_id_status_idx ON users(school_id,status);
CREATE INDEX users_registration_source_created_at_idx ON users(registration_source,created_at);
CREATE INDEX users_last_login_at_idx ON users(last_login_at);
CREATE INDEX community_posts_status_visibility_published_at_id_idx ON community_posts(status,visibility,published_at,id);
CREATE INDEX community_posts_author_id_status_published_at_id_idx ON community_posts(author_id,status,published_at,id);
CREATE INDEX community_posts_post_type_status_published_at_id_idx ON community_posts(post_type,status,published_at,id);
CREATE INDEX community_posts_school_id_status_published_at_id_idx ON community_posts(school_id,status,published_at,id);
CREATE INDEX community_posts_content_hash_author_id_status_idx ON community_posts(content_hash,author_id,status);
CREATE INDEX community_posts_deleted_at_idx ON community_posts(deleted_at);
CREATE INDEX community_comments_post_id_status_created_at_id_idx ON community_comments(post_id,status,created_at,id);
CREATE INDEX community_reports_reporter_id_created_at_idx ON community_reports(reporter_id,created_at);
CREATE INDEX user_notifications_entity_type_entity_id_idx ON user_notifications(entity_type,entity_id);
CREATE INDEX activity_events_user_id_action_type_occurred_at_idx ON activity_events(user_id,action_type,occurred_at);
CREATE INDEX activity_events_target_type_target_id_occurred_at_idx ON activity_events(target_type,target_id,occurred_at);
CREATE INDEX activity_events_entity_type_entity_id_occurred_at_idx ON activity_events(entity_type,entity_id,occurred_at);
CREATE TABLE community_post_revisions (
  id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  revision_no INTEGER NOT NULL, editor_id TEXT NOT NULL, editor_type TEXT NOT NULL,
  title_snapshot TEXT, content_blocks_snapshot JSONB NOT NULL, bindings_snapshot JSONB NOT NULL,
  topic_ids_snapshot TEXT[] NOT NULL, visibility_snapshot TEXT NOT NULL, status_snapshot TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '', created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX community_post_revisions_post_id_revision_no_key ON community_post_revisions(post_id,revision_no);
CREATE TABLE request_idempotency (
  id TEXT PRIMARY KEY, principal_key TEXT NOT NULL, scope TEXT NOT NULL, idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL, resource_id TEXT NOT NULL, response_status INTEGER NOT NULL DEFAULT 200,
  response_snapshot JSONB NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'completed',
  expires_at TIMESTAMP(3) NOT NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX request_idempotency_principal_key_scope_idempotency_key_key ON request_idempotency(principal_key,scope,idempotency_key);
CREATE INDEX request_idempotency_expires_at_idx ON request_idempotency(expires_at);
COMMIT;
