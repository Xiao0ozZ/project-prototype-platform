// @vitest-environment node

import { describe, expect, it } from 'vitest';

import {
  applyLegacyTheme,
  applyTemplateFontFamily,
  extractLegacyTheme,
  isIgnoredLegacyDependency,
  stripLegacyBootstrapCalls,
} from '../../scripts/convert-legacy-html-to-template.mjs';

describe('legacy HTML conversion bootstrap cleanup', () => {
  it('extracts the original shell theme and applies it to template variables', () => {
    const theme = extractLegacyTheme('<aside class="w-64 bg-[#00689E] text-white"></aside>');

    expect(theme).toEqual({
      primary: '#00689E',
      hover: '#005B8A',
      active: '#004F78',
      shadow: 'rgb(0 104 158 / 18%)',
    });
    expect(
      applyLegacyTheme(
        ':root { --app-color-primary: #2563eb; --app-color-primary-hover: #1d4ed8; --app-color-primary-active: #1e40af; --app-color-primary-shadow: rgb(37 99 235 / 18%); }',
        theme,
      ),
    ).toContain(
      '--app-color-primary: #00689E; --app-color-primary-hover: #005B8A; --app-color-primary-active: #004F78; --app-color-primary-shadow: rgb(0 104 158 / 18%);',
    );
  });

  it('reuses the template font chain while preserving monospaced declarations', () => {
    const source = `
      body { font-family: 'Noto Sans SC', -apple-system, sans-serif; }
      .code { font-family: ui-monospace, Menlo, monospace; }
    `;

    const normalized = applyTemplateFontFamily(source);

    expect(normalized).toContain('font-family: var(--app-font-family-sans);');
    expect(normalized).toContain('font-family: ui-monospace, Menlo, monospace;');
    expect(normalized).not.toContain('Noto Sans SC');
  });

  it('removes chained app.use(...).mount(...) calls as one bootstrap expression', () => {
    const source = `
      registerIcons(app);
      app.use(ElementPlus, { locale: ElementPlusLocaleZhCn }).mount('#app');
    `;

    expect(stripLegacyBootstrapCalls(source)).toBe('registerIcons(app);');
  });

  it('removes standalone app.use and app.mount calls without touching registrations', () => {
    const source = `
      for (const [key, component] of Object.entries(icons)) app.component(key, component);
      app.use(ElementPlus);
      app.mount('#app');
    `;

    expect(stripLegacyBootstrapCalls(source)).toContain('app.component(key, component)');
    expect(stripLegacyBootstrapCalls(source)).not.toMatch(/app\.(?:use|mount)\s*\(/u);
  });

  it('does not carry the historical cross-client switcher into templateized copies', () => {
    expect(isIgnoredLegacyDependency('client_portal_switcher.js')).toBe(true);
    expect(isIgnoredLegacyDependency('../营运端/client_portal_switcher.js')).toBe(true);
    expect(isIgnoredLegacyDependency('update_sidebar.js')).toBe(false);
  });
});
