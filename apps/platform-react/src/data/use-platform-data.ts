import { useQuery } from '@tanstack/react-query';

import { platformApi } from './platform-api';

export const platformQueryKeys = {
  projects: ['platform', 'projects'] as const,
  htmlPages: ['platform', 'html-pages'] as const,
  documents: (projectId: string) => ['platform', 'documents', projectId] as const,
  pagePrdLinks: (projectId: string) => ['platform', 'page-prd-links', projectId] as const,
  prdBindings: (projectId: string) => ['platform', 'prd-bindings', projectId] as const,
  settings: ['platform', 'settings'] as const,
};

export function useProjectManifest() {
  return useQuery({
    queryKey: platformQueryKeys.projects,
    queryFn: () => platformApi.loadProjectManifest(),
  });
}

export function useHtmlPageCatalog() {
  return useQuery({
    queryKey: platformQueryKeys.htmlPages,
    queryFn: () => platformApi.loadHtmlPageCatalog(),
  });
}

export function useDocumentManifest(projectId: string, enabled = true) {
  return useQuery({
    queryKey: platformQueryKeys.documents(projectId),
    queryFn: () => platformApi.loadDocumentManifest(projectId),
    enabled: Boolean(projectId && enabled),
  });
}

export function usePagePrdLinks(projectId: string, enabled = true) {
  return useQuery({
    queryKey: platformQueryKeys.pagePrdLinks(projectId),
    queryFn: () => platformApi.loadPagePrdLinks(projectId),
    enabled: Boolean(projectId && enabled),
  });
}

export function usePrdBindings(projectId: string, enabled = true) {
  return useQuery({
    queryKey: platformQueryKeys.prdBindings(projectId),
    queryFn: () => platformApi.loadPrdBindings(projectId),
    enabled: Boolean(projectId && enabled),
  });
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: platformQueryKeys.settings,
    queryFn: () => platformApi.loadPlatformSettings(),
  });
}
