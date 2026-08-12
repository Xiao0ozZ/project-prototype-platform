import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

import { prdContentPlugin } from './plugins/prd-content-plugin.js';
import { pageTransferPlugin } from './plugins/page-transfer-plugin.js';
import { htmlPrototypePlugin } from './plugins/html-prototype-plugin.js';
import { projectPackagesPlugin } from './plugins/project-packages-plugin.js';
import { platformSettingsPlugin } from './plugins/platform-settings-plugin.js';
import { loadProjectMounts } from './packages/project-core/src/index.js';

const projectsRoot = fileURLToPath(new URL('./projects/', import.meta.url));
const projectMountsPath = fileURLToPath(new URL('./project-mounts.local.json', import.meta.url));
const platformSettingsPath = fileURLToPath(new URL('./platform-settings.json', import.meta.url));
const loadMounts = () => loadProjectMounts(projectMountsPath);

export default defineConfig({
  base: process.env.VITE_VUE_BASE_PATH || '/',
  plugins: [
    vue(),
    platformSettingsPlugin({ settingsPath: platformSettingsPath }),
    projectPackagesPlugin({ projectsRoot, mountsPath: projectMountsPath, loadMounts }),
    htmlPrototypePlugin({ projectsRoot, mountsPath: projectMountsPath, loadMounts }),
    prdContentPlugin({ projectsRoot, mountsPath: projectMountsPath, loadMounts }),
    pageTransferPlugin({ loadMounts }),
  ],
  server: {
    host: '127.0.0.1',
    port: 5189,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/', import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL('./dist-vue/', import.meta.url)),
    emptyOutDir: true,
  },
});
