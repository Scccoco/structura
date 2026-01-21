-- ============================================
-- ZMK Sync Migration
-- Добавление полей для синхронизации со Speckle
-- ============================================

-- 1. Добавить поля в zmk.assemblies
ALTER TABLE zmk.assemblies 
ADD COLUMN IF NOT EXISTS speckle_object_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'active' CHECK (sync_status IN ('active', 'deleted', 'migrated'));

-- Индекс для быстрого поиска по speckle_object_id
CREATE INDEX IF NOT EXISTS idx_assemblies_speckle_object_id ON zmk.assemblies(speckle_object_id);
CREATE INDEX IF NOT EXISTS idx_assemblies_sync_status ON zmk.assemblies(sync_status);

COMMENT ON COLUMN zmk.assemblies.speckle_object_id IS 'ID объекта в Speckle';
COMMENT ON COLUMN zmk.assemblies.sync_status IS 'Статус синхронизации: active/deleted/migrated';

-- 2. Таблица снимков синхронизации
CREATE TABLE IF NOT EXISTS zmk.sync_snapshots (
    id SERIAL PRIMARY KEY,
    speckle_stream_id VARCHAR(100) NOT NULL,
    speckle_commit_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'system',
    elements_added INT DEFAULT 0,
    elements_removed INT DEFAULT 0,
    elements_unchanged INT DEFAULT 0,
    elements_total INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sync_snapshots_commit_id ON zmk.sync_snapshots(speckle_commit_id);
CREATE INDEX IF NOT EXISTS idx_sync_snapshots_created_at ON zmk.sync_snapshots(created_at DESC);

COMMENT ON TABLE zmk.sync_snapshots IS 'История синхронизаций с Speckle';

-- 3. Таблица маппинга GUID
CREATE TABLE IF NOT EXISTS zmk.guid_mappings (
    id SERIAL PRIMARY KEY,
    old_mainpart_guid VARCHAR(100) NOT NULL,
    new_mainpart_guid VARCHAR(100) NOT NULL,
    mapped_at TIMESTAMP DEFAULT NOW(),
    mapped_by VARCHAR(100) DEFAULT 'manual',
    snapshot_id INT REFERENCES zmk.sync_snapshots(id)
);

CREATE INDEX IF NOT EXISTS idx_guid_mappings_old_guid ON zmk.guid_mappings(old_mainpart_guid);
CREATE INDEX IF NOT EXISTS idx_guid_mappings_new_guid ON zmk.guid_mappings(new_mainpart_guid);

COMMENT ON TABLE zmk.guid_mappings IS 'История маппинга GUID при изменениях в модели';

-- 4. Права доступа
GRANT SELECT, INSERT, UPDATE ON zmk.sync_snapshots TO zmk_user;
GRANT SELECT, INSERT ON zmk.guid_mappings TO zmk_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA zmk TO zmk_user;

-- Готово!
SELECT 'ZMK sync migration completed!' AS status;
