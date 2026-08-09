export const CURRENT_PROJECT_SCHEMA_VERSION = 1;

export const PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
export const PAGE_PATH_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ENTRY_KINDS = new Set(['client', 'docs', 'mobile']);
export const CLIENT_ENTRY_MODES = new Set(['direct', 'platform-login', 'custom-page']);
export const CLIENT_LAYOUT_TYPES = new Set(['sidebar', 'topnav', 'none', 'bare']);
export const HTML_SHELL_MODES = new Set(['auto', 'full']);
export const HTML_EXTENSIONS = new Set(['.html', '.htm']);

export const PROJECT_PUBLIC_DIRECTORIES = new Set(['.platform', 'assets', 'data', 'mobile']);
export const DEFAULT_SCAN_IGNORES = new Set(['node_modules', 'dist', 'exports', '.git']);
