import { CURRENT_PROJECT_SCHEMA_VERSION } from './constants.js';

const migrations = new Map();

export function migrateProjectManifest(manifest, targetVersion = CURRENT_PROJECT_SCHEMA_VERSION) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new TypeError('project.json 根节点必须是对象。');
  }
  let current = JSON.parse(JSON.stringify(manifest));
  let version = Number(current.schemaVersion);
  if (!Number.isInteger(version) || version < 1) {
    throw new Error('project.json 缺少有效的 schemaVersion。');
  }
  if (version > targetVersion) {
    throw new Error(`项目包 schemaVersion ${version} 高于当前支持版本 ${targetVersion}。`);
  }
  while (version < targetVersion) {
    const migrate = migrations.get(version);
    if (!migrate) throw new Error(`缺少 schemaVersion ${version} → ${version + 1} 的迁移器。`);
    current = migrate(current);
    version += 1;
    current.schemaVersion = version;
  }
  return current;
}

export function registerProjectMigration(fromVersion, migrate) {
  if (!Number.isInteger(fromVersion) || fromVersion < 1 || typeof migrate !== 'function') {
    throw new TypeError('迁移器必须提供有效的起始版本和迁移函数。');
  }
  migrations.set(fromVersion, migrate);
}
