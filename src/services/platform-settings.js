import { reactive } from 'vue';

import { platformApi } from './platform-api';

export const canPersistPlatformSettings = import.meta.env.DEV;

export const platformSettings = reactive({
  developerMode: false,
  loaded: false,
});

let loadingPromise;

function applySettings(value) {
  platformSettings.developerMode = Boolean(value?.developerMode);
  platformSettings.loaded = true;
  return platformSettings;
}

export function loadPlatformSettings() {
  if (platformSettings.loaded) return Promise.resolve(platformSettings);
  if (loadingPromise) return loadingPromise;

  loadingPromise = platformApi
    .loadPlatformSettings()
    .then(applySettings)
    .finally(() => {
      loadingPromise = undefined;
    });

  return loadingPromise;
}

export async function setPlatformDeveloperMode(enabled) {
  if (!canPersistPlatformSettings) {
    throw new Error('静态部署不支持在线修改共享开发模式，请修改 platform-settings.json 后重新打包。');
  }

  return applySettings(await platformApi.savePlatformSettings({ developerMode: Boolean(enabled) }));
}

if (import.meta.hot) {
  import.meta.hot.on('platform-settings:changed', (payload) => {
    applySettings(payload);
  });
}
