import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { scanProjectPackages } from '../packages/project-core/src/index.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = await scanProjectPackages(path.join(projectRoot, 'projects'));

for (const project of result.projects) {
  console.log(`项目包通过：${project.id}（${project.name}）`);
}

if (result.invalidProjects.length) {
  console.error(`项目包校验失败：${result.invalidProjects.length} 个项目包不可用。`);
  for (const project of result.invalidProjects) {
    console.error(`\n${project.folder}`);
    for (const error of project.errors) console.error(`  - ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`项目包校验通过：共 ${result.projects.length} 个有效项目包。`);
}
