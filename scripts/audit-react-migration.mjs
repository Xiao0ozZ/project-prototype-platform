import path from 'node:path';

import { scanHtmlPrototypePages } from '../plugins/html-prototype-plugin.js';
import { loadProjectMounts, scanProjectPackages } from '../packages/project-core/src/index.js';

const repositoryRoot = process.cwd();
const projectsRoot = path.join(repositoryRoot, 'projects');
const mounts = await loadProjectMounts(path.join(repositoryRoot, 'project-mounts.local.json'));
const [projectScan, htmlCatalog] = await Promise.all([
  scanProjectPackages(projectsRoot, { mounts }),
  scanHtmlPrototypePages(projectsRoot, { mounts }),
]);

const rows = [];
for (const project of projectScan.projects) {
  for (const client of project.clients || []) {
    const runtime = project.pageRuntime?.clients?.[client.id] || { htmlTemplate: 0, vueSfc: 0 };
    const htmlPages = htmlCatalog.projects?.[project.id]?.[client.id] || [];
    const directHtml = htmlPages.filter((page) => page.sourceType === 'html-direct').length;
    const managedHtml = htmlPages.filter((page) => page.sourceType === 'html-template').length;
    const state = htmlPages.length
      ? runtime.vueSfc
        ? 'READY_WITH_UNUSED_VUE'
        : 'READY'
      : runtime.htmlTemplate
        ? 'INDEX_MISSING'
        : runtime.vueSfc
          ? 'UNUSED_VUE_ONLY'
          : 'EMPTY';
    rows.push({
      project: project.id,
      client: client.id,
      state,
      html: htmlPages.length,
      directHtml,
      managedHtml,
      vueSfc: runtime.vueSfc,
    });
  }
}

console.table(rows);

if (projectScan.invalidProjects.length) {
  console.error('\n无效项目包：');
  for (const project of projectScan.invalidProjects) {
    console.error(`- ${project.folder}: ${(project.errors || []).join('；')}`);
  }
}

const blockers = rows.filter((row) => row.state === 'INDEX_MISSING');
if (blockers.length || projectScan.invalidProjects.length) {
  console.error(
    `\nReact 正式切换检查未通过：${blockers.length} 个客户端存在 HTML 运行时阻断，${projectScan.invalidProjects.length} 个项目包无效。`,
  );
  process.exitCode = 1;
} else {
  console.log('\nReact 正式切换检查通过：没有 HTML 索引缺失；旧 Vue SFC 仅作信息记录，不属于迁移范围。');
}
