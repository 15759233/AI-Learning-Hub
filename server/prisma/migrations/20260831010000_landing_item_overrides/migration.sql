-- 仅追加可空字段，保留旧首页模块、草稿和发布版本。
ALTER TABLE "homepage_items" ADD COLUMN "summary_override" TEXT;
ALTER TABLE "homepage_items" ADD COLUMN "cover_override" TEXT;
