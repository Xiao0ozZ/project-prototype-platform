import { createPlatformClient } from '../../../../packages/platform-client/src/index.js';

export const platformApi = createPlatformClient({
  baseUrl: import.meta.env.BASE_URL,
  development: import.meta.env.DEV,
});
