import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  PLATFORM_SERVER_USAGE,
  installPlatformServerSignalHandlers,
  parsePlatformServerOptions,
  startPlatformServerRuntime,
} from '../packages/platform-server/src/runtime.js';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

try {
  const options = parsePlatformServerOptions(process.argv.slice(2), process.env, repositoryRoot);
  if (options.help) {
    console.log(PLATFORM_SERVER_USAGE);
  } else {
    const runtime = await startPlatformServerRuntime(options);
    installPlatformServerSignalHandlers(runtime);
  }
} catch (error) {
  console.error(`平台本地服务启动失败：${error.message}`);
  if (error.code) console.error(`错误代码：${error.code}`);
  process.exitCode = 1;
}
