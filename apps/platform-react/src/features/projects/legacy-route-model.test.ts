import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../../../../packages/platform-contracts/src/index.js';
import { resolveLegacyClientPath, resolveLegacyProjectEntry } from './legacy-route-model';

const projects = [
  {
    id: 'demo',
    name: 'Demo',
    schemaVersion: 1,
    compatibility: { legacyRoutes: true },
    clients: [{ id: 'admin', name: 'Admin' }],
    docs: { enabled: true },
    mobile: { enabled: true },
  },
] as ProjectManifest[];

describe('legacy route compatibility', () => {
  it('resolves legacy client paths without exposing hidden projects', () => {
    expect(resolveLegacyClientPath(projects, 'admin', 'orders/detail')).toBe('/p/demo/admin/orders/detail');
    expect(resolveLegacyClientPath(projects, 'missing', '')).toBeNull();
    expect(
      resolveLegacyClientPath(
        [{ ...projects[0], homepage: { visible: false } }] as ProjectManifest[],
        'admin',
        '',
      ),
    ).toBeNull();
  });

  it('resolves legacy document and mobile entries', () => {
    expect(resolveLegacyProjectEntry(projects, 'docs')).toBe('/p/demo/docs');
    expect(resolveLegacyProjectEntry(projects, 'mobile')).toBe('/p/demo/mobile');
  });
});
