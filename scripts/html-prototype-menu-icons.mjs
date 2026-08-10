import path from 'node:path';

const MENU_ICON_NAMES = new Set([
  'Calendar',
  'CirclePlus',
  'DataBoard',
  'Document',
  'Files',
  'House',
  'List',
  'Location',
  'Lock',
  'Management',
  'Medal',
  'Money',
  'Odometer',
  'Platform',
  'Postcard',
  'Setting',
  'Tickets',
  'User',
  'Van',
  'Warning',
]);

export const PROTOTYPE_MENU_ICON_RENDERER = `<script data-prototype-menu-icon-renderer>
      (() => {
        const renderMenuIcons = () => {
          if (!window.Vue || !window.ElementPlusIconsVue) return;
          document.querySelectorAll('[data-prototype-menu-icon]').forEach((host) => {
            if (host.dataset.prototypeMenuIconReady === 'true') return;
            const iconName = host.getAttribute('data-prototype-menu-icon') || 'Document';
            const icon = window.ElementPlusIconsVue[iconName] || window.ElementPlusIconsVue.Document;
            if (!icon) return;
            window.Vue.render(window.Vue.h(icon), host);
            host.dataset.prototypeMenuIconReady = 'true';
          });
        };
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(renderMenuIcons), {
            once: true,
          });
        } else {
          requestAnimationFrame(renderMenuIcons);
        }
      })();
    </script>`;

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function normalizeMenuIconName(iconName) {
  const candidate = String(iconName || '').trim();
  return MENU_ICON_NAMES.has(candidate) ? candidate : 'Document';
}

export function createMenuIconMarkup(iconName) {
  const normalized = normalizeMenuIconName(iconName);
  return `<span class="prototype-menu-icon" data-prototype-menu-icon="${normalized}" aria-hidden="true"></span>`;
}

function menuTargetFile(attributes) {
  const href = String(attributes || '').match(/\bhref=["']([^"']+)["']/iu)?.[1] || '';
  if (!href || href.startsWith('#') || /^(?:[a-z]+:|\/\/)/iu.test(href)) return '';
  const cleanPath = decodeURIComponent(href.split(/[?#]/u)[0]).replaceAll('\\', '/');
  return path.posix.basename(cleanPath).toLowerCase();
}

export function applyMenuIcons(source, iconByFile = new Map()) {
  return String(source || '').replace(
    /<a\b([^>]*\bclass=["'][^"']*\bprototype-menu-item\b[^"']*["'][^>]*)>([\s\S]*?)<\/a>/giu,
    (match, attributes, body) => {
      const label = String(body || '')
        .replace(/<[^>]+>/gu, '')
        .trim();
      if (!label) return match;
      const iconName = iconByFile.get(menuTargetFile(attributes)) || 'Document';
      return `<a${attributes}>${createMenuIconMarkup(iconName)}<span>${escapeHtml(label)}</span></a>`;
    },
  );
}
