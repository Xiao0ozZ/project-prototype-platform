import { config } from '@vue/test-utils';
import '@testing-library/jest-dom/vitest';
import ElementPlus from 'element-plus';

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

config.global.plugins = [ElementPlus];
