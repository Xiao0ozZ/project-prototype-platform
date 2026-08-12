import type { ProjectManifest } from '../../../../../packages/platform-contracts/src/index.js';

function legacyProject(projects: ProjectManifest[]) {
  const project = projects.find((item) => item.compatibility?.legacyRoutes);
  return project?.homepage?.visible === false ? null : project;
}

export function resolveLegacyClientPath(projects: ProjectManifest[], clientId: string, legacyPath: string) {
  const project = legacyProject(projects);
  if (!project?.clients.some((client) => client.id === clientId)) return null;
  const suffix = legacyPath.replace(/^\/+|\/+$/gu, '');
  return suffix ? `/p/${project.id}/${clientId}/${suffix}` : `/p/${project.id}/${clientId}`;
}

export function resolveLegacyProjectEntry(projects: ProjectManifest[], kind: 'docs' | 'mobile') {
  const project = legacyProject(projects);
  const enabled = project && (kind === 'docs' ? project.docs?.enabled : project.mobile?.enabled);
  return enabled ? `/p/${project.id}/${kind}` : null;
}
