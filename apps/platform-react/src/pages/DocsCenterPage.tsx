import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import type { DocumentEntry } from '../../../../packages/platform-contracts/src/index.js';
import { platformApi } from '@/data/platform-api';
import {
  useDocumentManifest,
  useHtmlPageCatalog,
  usePagePrdLinks,
  useProjectManifest,
} from '@/data/use-platform-data';
import { findProject } from '@/features/projects/project-model';
import { MarkdownReader } from '@/features/docs/MarkdownReader';
import { resolveDocumentAssetPath, type MarkdownHeading } from '@/features/docs/markdown';
import { Button, Collapse, Empty, Input, Layout, List, Spin, Tag, Typography } from '@/ui/ant';
import { ArrowLeftOutlined, FileTextOutlined, LinkOutlined } from '@/ui/ant/icons';
import { ThemeControl } from '@/ui/platform/ThemeControl';

const { Text, Title } = Typography;
const { Header, Sider, Content } = Layout;

export function DocsCenterPage() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectQuery = useProjectManifest();
  const htmlCatalogQuery = useHtmlPageCatalog();
  const project = findProject(projectQuery.data?.projects ?? [], projectId);
  const manifestQuery = useDocumentManifest(projectId, project?.docs?.enabled !== false);
  const pagePrdLinksQuery = usePagePrdLinks(projectId, Boolean(project));
  const [filter, setFilter] = useState('');
  const [headings, setHeadings] = useState<MarkdownHeading[]>([]);
  const documents = useMemo(() => manifestQuery.data?.documents ?? [], [manifestQuery.data]);
  const selectedPath = searchParams.get('doc') || searchParams.get('file') || documents[0]?.path || '';
  const selectedAnchor = searchParams.get('anchor') || '';
  const selectedDocument = documents.find((document) => document.path === selectedPath) ?? null;
  const documentQuery = useQuery({
    queryKey: ['platform', 'document', projectId, selectedPath],
    queryFn: () => platformApi.loadDocument(projectId, selectedPath),
    enabled: Boolean(projectId && selectedPath),
  });
  const filteredDocuments = useMemo(
    () =>
      documents.filter((document) =>
        `${document.title || ''}${document.path}`.toLowerCase().includes(filter.toLowerCase()),
      ),
    [documents, filter],
  );
  const associatedPages = useMemo(() => {
    if (!project || !selectedPath) return [];
    const projectPages = htmlCatalogQuery.data?.projects?.[projectId] ?? {};
    return Object.entries(pagePrdLinksQuery.data ?? {}).flatMap(([clientId, links]) =>
      Object.entries(links).flatMap(([pageName, documentPath]) => {
        if (documentPath !== selectedPath) return [];
        const page = projectPages[clientId]?.find((item) => item.name === pageName);
        if (!page) return [];
        return [
          {
            key: `${clientId}:${page.name}`,
            clientName: project.clients.find((client) => client.id === clientId)?.name || clientId,
            title: page.title,
            route: `/p/${projectId}/${clientId}/${page.path}`,
          },
        ];
      }),
    );
  }, [htmlCatalogQuery.data, pagePrdLinksQuery.data, project, projectId, selectedPath]);
  const resolveAssetUrl = useCallback(
    (assetPath: string) =>
      platformApi.getDocumentAssetUrl(projectId, resolveDocumentAssetPath(selectedPath, assetPath)),
    [projectId, selectedPath],
  );
  const openDocument = useCallback(
    (documentPath: string, anchor = '') => {
      setHeadings([]);
      const next = new URLSearchParams({ doc: documentPath });
      if (anchor) next.set('anchor', anchor);
      setSearchParams(next);
    },
    [setSearchParams],
  );
  const resolveDocumentUrl = useCallback(
    (documentPath: string, anchor = '') => {
      const next = new URLSearchParams({ doc: documentPath });
      if (anchor) next.set('anchor', anchor);
      return `/p/${projectId}/docs?${next.toString()}`;
    },
    [projectId],
  );

  useEffect(() => {
    document.title = `${selectedDocument?.title || '产品文档'} - ${project?.name || '项目'}`;
  }, [project?.name, selectedDocument?.title]);

  useEffect(() => {
    const legacyPath = searchParams.get('file');
    if (!legacyPath || searchParams.get('doc')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('file');
    next.set('doc', legacyPath);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  if (projectQuery.isPending)
    return (
      <div className="home-loading">
        <Spin size="large" />
      </div>
    );
  if (!project || project.homepage?.visible === false || project.docs?.enabled === false)
    return <Navigate to={`/unavailable/${projectId}`} replace />;
  if (manifestQuery.isPending)
    return (
      <div className="home-loading">
        <Spin size="large" />
      </div>
    );

  const selectDocument = (document: DocumentEntry) => openDocument(document.path);
  const scrollToHeading = (headingId: string) => {
    document
      .querySelector('.docs-reader')
      ?.querySelector<HTMLElement>(`#${CSS.escape(headingId)}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <Layout className="docs-center">
      <Header className="docs-header">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
          返回首页
        </Button>
        <div className="docs-header__identity">
          <span>
            <FileTextOutlined />
          </span>
          <div>
            <Title level={4}>{project.name}</Title>
            <Text type="secondary">产品文档中心</Text>
          </div>
        </div>
        <div className="docs-header__actions">
          <Tag>{documents.length} 份文档</Tag>
          <ThemeControl />
        </div>
      </Header>
      <Layout className="docs-layout">
        <Sider theme="light" width={292} className="docs-sidebar">
          <div className="docs-sidebar__heading">
            <Text strong>文档目录</Text>
            <Text type="secondary">{filteredDocuments.length}</Text>
          </div>
          <Input.Search
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="搜索文件名或路径"
          />
          {associatedPages.length ? (
            <Collapse
              className="docs-associated-pages"
              ghost
              items={[
                {
                  key: 'pages',
                  label: `关联页面 ${associatedPages.length}`,
                  children: (
                    <List
                      size="small"
                      dataSource={associatedPages}
                      renderItem={(page) => (
                        <List.Item>
                          <Button type="text" icon={<LinkOutlined />} onClick={() => navigate(page.route)}>
                            <span>
                              {page.title}
                              <small>{page.clientName}</small>
                            </span>
                          </Button>
                        </List.Item>
                      )}
                    />
                  ),
                },
              ]}
            />
          ) : null}
          <List
            className="docs-file-list"
            dataSource={filteredDocuments}
            locale={{ emptyText: <Empty description="没有匹配文档" /> }}
            renderItem={(document) => (
              <List.Item className={document.path === selectedPath ? 'is-active' : ''}>
                <Button type="text" block onClick={() => selectDocument(document)}>
                  <strong>{document.title || document.path.split('/').pop()}</strong>
                  <small>{document.path}</small>
                </Button>
              </List.Item>
            )}
          />
        </Sider>
        <Content className="docs-reader">
          {selectedDocument ? (
            <MarkdownReader
              source={documentQuery.data ?? ''}
              loading={documentQuery.isPending}
              error={documentQuery.error instanceof Error ? documentQuery.error.message : undefined}
              onHeadings={setHeadings}
              documentPath={selectedPath}
              resolveAssetUrl={resolveAssetUrl}
              resolveDocumentUrl={resolveDocumentUrl}
              onDocumentNavigate={openDocument}
              activeAnchor={selectedAnchor}
            />
          ) : (
            <Empty description="选择一份文档开始阅读" />
          )}
        </Content>
        <Sider theme="light" width={224} className="docs-outline">
          <div className="docs-outline__heading">
            <Text strong>本文目录</Text>
          </div>
          <List
            size="small"
            dataSource={headings}
            renderItem={(heading) => (
              <List.Item style={{ paddingLeft: (heading.level - 1) * 10 }}>
                <Button type="text" block onClick={() => scrollToHeading(heading.id)}>
                  {heading.text}
                </Button>
              </List.Item>
            )}
          />
        </Sider>
      </Layout>
    </Layout>
  );
}
