import { describe, expect, it } from 'vitest';

import {
  getClientDefaultPagePath,
  getClientEntryMode,
  getClientEntryPagePath,
  getClientLayoutType,
  getProjectClientEntryPath,
} from '../../src/services/project-navigation.js';

function client(defaultPage, pages) {
  return { defaultPage, definition: { pages } };
}

describe('project navigation', () => {
  it('uses the configured default page when it exists', () => {
    expect(
      getClientDefaultPagePath(
        client('dashboard', [
          { path: 'orders', menu: true },
          { path: 'dashboard', menu: false },
        ]),
      ),
    ).toBe('dashboard');
  });

  it('falls back to the first menu page when defaultPage is empty', () => {
    expect(
      getClientDefaultPagePath(
        client('', [
          { path: 'imported-page', menu: true },
          { path: 'hidden-page', menu: false },
        ]),
      ),
    ).toBe('imported-page');
  });

  it('falls back to any route when all pages are hidden', () => {
    expect(getClientDefaultPagePath(client('missing', [{ path: 'hidden-page', menu: false }]))).toBe(
      'hidden-page',
    );
  });

  it('keeps legacy clients on the platform login and sidebar shell', () => {
    const legacyClient = client('dashboard', [{ path: 'dashboard', menu: true }]);
    legacyClient.id = 'admin';

    expect(getClientEntryMode(legacyClient)).toBe('platform-login');
    expect(getClientLayoutType(legacyClient)).toBe('sidebar');
    expect(getProjectClientEntryPath('sample', legacyClient)).toBe('/p/sample/admin/login');
  });

  it('opens the default page directly when configured', () => {
    const directClient = {
      ...client('dashboard', [{ path: 'dashboard', menu: true }]),
      id: 'admin',
      entry: { mode: 'direct' },
      layout: { type: 'none' },
    };

    expect(getClientEntryPagePath(directClient)).toBe('dashboard');
    expect(getClientLayoutType(directClient)).toBe('none');
    expect(getProjectClientEntryPath('sample', directClient)).toBe('/p/sample/admin/dashboard');
  });

  it('supports top navigation and safely rejects unknown layout values', () => {
    const topNavigationClient = {
      ...client('dashboard', [{ path: 'dashboard', menu: true }]),
      layout: { type: 'topnav' },
    };

    expect(getClientLayoutType(topNavigationClient)).toBe('topnav');
    topNavigationClient.layout.type = 'bare';
    expect(getClientLayoutType(topNavigationClient)).toBe('bare');
    topNavigationClient.layout.type = 'unknown-layout';
    expect(getClientLayoutType(topNavigationClient)).toBe('sidebar');
  });

  it('opens a valid custom entry page and falls back safely when it is missing', () => {
    const customClient = {
      ...client('dashboard', [
        { path: 'dashboard', menu: true },
        { path: 'welcome', menu: false },
      ]),
      id: 'admin',
      entry: { mode: 'custom-page', page: 'welcome' },
    };

    expect(getClientEntryPagePath(customClient)).toBe('welcome');
    customClient.entry.page = 'missing';
    expect(getClientEntryPagePath(customClient)).toBe('dashboard');
  });
});
