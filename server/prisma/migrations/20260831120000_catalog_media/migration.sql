CREATE TYPE "MediaAssetKind" AS ENUM ('cover', 'hero', 'illustration', 'icon_preview');
CREATE TYPE "MediaAssetSource" AS ENUM ('upload', 'image2_seed', 'system');
CREATE TYPE "MediaAssetStatus" AS ENUM ('active', 'archived');

CREATE TABLE media_assets (
  id TEXT PRIMARY KEY,
  asset_key TEXT NOT NULL UNIQUE,
  file_id TEXT NOT NULL UNIQUE REFERENCES files(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  kind "MediaAssetKind" NOT NULL DEFAULT 'cover',
  source "MediaAssetSource" NOT NULL DEFAULT 'upload',
  content_type TEXT NOT NULL DEFAULT 'global',
  category_key TEXT NOT NULL DEFAULT 'generic',
  alt_text TEXT NOT NULL DEFAULT '',
  width INTEGER NOT NULL CHECK (width > 0 AND width <= 8192),
  height INTEGER NOT NULL CHECK (height > 0 AND height <= 8192),
  focal_x DOUBLE PRECISION NOT NULL DEFAULT 0.5 CHECK (focal_x >= 0 AND focal_x <= 1),
  focal_y DOUBLE PRECISION NOT NULL DEFAULT 0.5 CHECK (focal_y >= 0 AND focal_y <= 1),
  status "MediaAssetStatus" NOT NULL DEFAULT 'active',
  created_by TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL,
  deleted_at TIMESTAMP(3)
);
CREATE INDEX media_assets_status_kind_content_type_category_key_idx ON media_assets(status,kind,content_type,category_key);

CREATE TABLE media_default_rules (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  category_key TEXT NOT NULL,
  asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL,
  UNIQUE(content_type,category_key)
);

CREATE TABLE media_gc_jobs (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE learning_themes ADD COLUMN cover_asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL, ADD COLUMN data_origin TEXT NOT NULL DEFAULT 'admin_created';
ALTER TABLE courses ADD COLUMN cover_asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL, ADD COLUMN data_origin TEXT NOT NULL DEFAULT 'admin_created';
ALTER TABLE labs ADD COLUMN cover_asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL, ADD COLUMN data_origin TEXT NOT NULL DEFAULT 'admin_created';
ALTER TABLE resources ADD COLUMN cover_asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL, ADD COLUMN data_origin TEXT NOT NULL DEFAULT 'admin_created';
ALTER TABLE articles ADD COLUMN cover_asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL, ADD COLUMN data_origin TEXT NOT NULL DEFAULT 'admin_created';
ALTER TABLE challenges ADD COLUMN cover_asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL, ADD COLUMN data_origin TEXT NOT NULL DEFAULT 'admin_created';
