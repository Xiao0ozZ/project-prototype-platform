<template>
  <div
    class="docs-page platform-page"
    :class="{
      'docs-page--embedded': embedded,
      'docs-page--embedded-outline': embedded && outlineVisible,
    }"
  >
    <header class="docs-header">
      <div class="docs-header__brand">
        <RouterLink class="docs-home-link" :to="`/p/${projectId}`" :title="t('home.backToHome')">
          <el-icon><ArrowLeft /></el-icon>
        </RouterLink>
        <div class="docs-header__title">
          <strong>{{ project?.name }}</strong>
          <span>{{ t('docs.title') }}</span>
        </div>
      </div>

      <div class="docs-header__actions">
        <span class="docs-count-chip">
          <span class="docs-count-chip__dot"></span>
          <span class="docs-count">{{ t('docs.documentCount', { count: documents.length }) }}</span>
        </span>
        <el-button class="mobile-directory-button" plain @click="mobileDirectoryVisible = true">
          <el-icon><Menu /></el-icon>
          {{ t('docs.directory') }}
        </el-button>
        <el-button
          circle
          plain
          :title="t('docs.refresh')"
          :loading="manifestLoading"
          @click="refreshManifest(true)"
        >
          <el-icon><Refresh /></el-icon>
        </el-button>
      </div>
    </header>

    <div class="docs-workspace" :class="{ 'docs-workspace--embedded': embedded }">
      <aside class="docs-directory">
        <div class="directory-heading">
          <strong>{{ t('docs.directory') }}</strong>
          <span>{{ t('docs.directoryHint') }}</span>
        </div>
        <el-input v-model="searchKeyword" clearable :placeholder="t('docs.searchPlaceholder')">
          <template #prefix
            ><el-icon><Search /></el-icon
          ></template>
        </el-input>
        <div class="tree-scroll">
          <el-tree
            ref="desktopTreeRef"
            class="document-tree"
            :data="treeData"
            node-key="id"
            highlight-current
            :current-node-key="currentDocument ? `doc:${currentDocument.path}` : ''"
            :default-expanded-keys="defaultExpandedKeys"
            :expand-on-click-node="false"
            :filter-node-method="filterTreeNode"
            @node-click="handleTreeNodeClick"
          >
            <template #default="{ data }">
              <span class="tree-node" :class="{ 'tree-node--archived': data.archived }">
                <el-icon><Folder v-if="data.kind === 'folder'" /><Document v-else /></el-icon>
                <span class="tree-node__label">{{ data.label }}</span>
              </span>
            </template>
          </el-tree>
        </div>
      </aside>

      <main ref="readerScrollRef" class="docs-reader" @scroll.passive="updateActiveHeading">
        <div v-if="manifestError" class="reader-state">
          <el-icon><Warning /></el-icon>
          <h2>{{ t('docs.loadFailed') }}</h2>
          <p>{{ manifestError }}</p>
          <el-button type="primary" @click="refreshManifest(true)">{{ t('docs.retry') }}</el-button>
        </div>

        <div v-else-if="manifestLoading && !documents.length" class="reader-state">
          <el-icon class="is-loading"><Loading /></el-icon>
          <p>{{ t('docs.loadingDirectory') }}</p>
        </div>

        <div v-else-if="!currentDocument" class="reader-state">
          <el-icon><Document /></el-icon>
          <h2>{{ t('docs.emptyTitle') }}</h2>
          <p>{{ t('docs.emptyDescription') }}</p>
        </div>

        <template v-else>
          <div class="document-shell">
            <div class="document-meta">
              <span class="document-path">{{ currentDocument.path }}</span>
              <span>{{ formattedUpdatedAt }}</span>
            </div>
            <div v-if="documentLoading" class="document-loading">
              <el-icon class="is-loading"><Loading /></el-icon>
              {{ t('docs.loadingDocument') }}
            </div>
            <div v-else-if="documentError" class="document-error">
              <strong>{{ t('docs.documentFailed') }}</strong>
              <span>{{ documentError }}</span>
              <el-button size="small" @click="loadCurrentDocument">{{ t('docs.retry') }}</el-button>
            </div>
            <article
              v-else
              ref="articleRef"
              class="markdown-body"
              @click="handleArticleClick"
              v-html="renderedHtml"
            ></article>
          </div>
        </template>
      </main>

      <nav
        v-if="(!embedded || outlineVisible) && (headings.length || associatedPages.length)"
        ref="outlineRef"
        class="docs-outline"
        :aria-label="t('docs.outline')"
      >
        <section v-if="associatedPages.length" class="docs-related-pages" aria-label="关联页面">
          <div class="docs-related-pages__heading">
            <strong>关联页面</strong>
            <button
              type="button"
              class="docs-related-pages__toggle"
              :aria-expanded="relatedPagesExpanded"
              aria-label="展开或收起关联页面"
              @click="relatedPagesExpanded = !relatedPagesExpanded"
            >
              <span>{{ associatedPages.length }}</span>
              <el-icon :class="{ 'is-open': relatedPagesExpanded }"><ArrowDown /></el-icon>
            </button>
          </div>
          <div v-if="relatedPagesExpanded" class="docs-related-pages__list">
            <button
              v-for="page in associatedPages"
              :key="page.id"
              type="button"
              class="docs-related-page"
              :title="`${page.clientName} / ${page.title}`"
              @click="openAssociatedPage(page)"
            >
              <el-icon><ArrowRight /></el-icon>
              <span>
                <strong>{{ page.title }}</strong>
                <small>{{ page.clientName }}</small>
              </span>
            </button>
          </div>
        </section>
        <strong v-if="headings.length">{{ t('docs.outline') }}</strong>
        <button
          v-for="heading in headings"
          :key="heading.id"
          type="button"
          :data-heading-id="heading.id"
          :class="[`outline-level-${heading.level}`, { 'is-active': activeHeadingId === heading.id }]"
          :aria-current="activeHeadingId === heading.id ? 'location' : undefined"
          @click="scrollToHeading(heading.id)"
        >
          {{ heading.text }}
        </button>
      </nav>
    </div>

    <el-drawer v-model="mobileDirectoryVisible" :title="t('docs.directory')" direction="ltr" size="86%">
      <div class="mobile-directory">
        <el-input v-model="searchKeyword" clearable :placeholder="t('docs.searchPlaceholder')">
          <template #prefix
            ><el-icon><Search /></el-icon
          ></template>
        </el-input>
        <el-tree
          ref="mobileTreeRef"
          class="document-tree"
          :data="treeData"
          node-key="id"
          highlight-current
          :current-node-key="currentDocument ? `doc:${currentDocument.path}` : ''"
          :default-expanded-keys="defaultExpandedKeys"
          :filter-node-method="filterTreeNode"
          @node-click="handleTreeNodeClick"
        >
          <template #default="{ data }">
            <span class="tree-node">
              <el-icon><Folder v-if="data.kind === 'folder'" /><Document v-else /></el-icon>
              <span class="tree-node__label">{{ data.label }}</span>
            </span>
          </template>
        </el-tree>
      </div>
    </el-drawer>

    <el-dialog
      v-model="imagePreviewVisible"
      width="min(92vw, 1180px)"
      append-to-body
      class="document-image-dialog"
    >
      <img class="document-image-preview" :src="previewImageUrl" :alt="previewImageAlt" />
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Document,
  Folder,
  Loading,
  Menu,
  Refresh,
  Search,
  Warning,
} from '@element-plus/icons-vue';
import {
  getDocumentAssetUrl,
  loadDocument,
  loadDocumentManifest,
  normalizeDocumentPath,
  onDocumentsChanged,
  resolveDocumentReference,
} from '../../services/prd-documents';
import { getProject } from '../../config/project-packages';

const props = defineProps({
  projectId: { type: String, required: true },
  embedded: { type: Boolean, default: false },
  outlineVisible: { type: Boolean, default: false },
  documentPath: { type: String, default: '' },
  documentAnchor: { type: String, default: '' },
});
const project = computed(() => getProject(props.projectId));

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const markdown = new MarkdownIt({ html: true, linkify: true, typographer: false, breaks: false });

const documents = ref([]);
const manifestLoading = ref(false);
const manifestError = ref('');
const currentDocument = ref(null);
const documentLoading = ref(false);
const documentError = ref('');
const renderedHtml = ref('');
const headings = ref([]);
const searchKeyword = ref('');
const desktopTreeRef = ref(null);
const mobileTreeRef = ref(null);
const readerScrollRef = ref(null);
const articleRef = ref(null);
const outlineRef = ref(null);
const activeHeadingId = ref('');
const mobileDirectoryVisible = ref(false);
const relatedPagesExpanded = ref(false);
const imagePreviewVisible = ref(false);
const previewImageUrl = ref('');
const previewImageAlt = ref('');
const embeddedDocumentPath = ref(props.documentPath);
let documentSearchMarks = [];
const embeddedDocumentAnchor = ref(props.documentAnchor);
let activeRenderId = 0;
let stopDocumentsChanged = () => {};
let anchorHighlightFrame = 0;
let anchorHighlightTimer = 0;
let outlineScrollFrame = 0;
let pendingOutlineHeadingId = '';
let mermaidApi;

function sortTree(nodes) {
  nodes.sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
    return a.label.localeCompare(b.label, 'zh-Hans-CN', { numeric: true });
  });
  nodes.forEach((node) => node.children && sortTree(node.children));
  return nodes;
}

function buildDocumentTree(items) {
  const roots = [];
  const foldersByPath = new Map();
  for (const document of items) {
    let children = roots;
    let folderPath = '';
    document.folders.forEach((folderName) => {
      folderPath = folderPath ? `${folderPath}/${folderName}` : folderName;
      let folder = foldersByPath.get(folderPath);
      if (!folder) {
        folder = {
          id: `folder:${folderPath}`,
          label: folderName,
          kind: 'folder',
          path: folderPath,
          archived: folderName === '归档' || folderName === '存档' || folderPath.includes('/存档'),
          children: [],
        };
        foldersByPath.set(folderPath, folder);
        children.push(folder);
      }
      children = folder.children;
    });
    children.push({
      id: `doc:${document.path}`,
      label: document.title,
      kind: 'document',
      document,
      archived: document.archived,
    });
  }
  return sortTree(roots);
}

const treeData = computed(() => buildDocumentTree(documents.value));
const requestedDocumentPath = computed(() =>
  normalizeDocumentPath(props.embedded ? embeddedDocumentPath.value : route.query.file),
);
const defaultExpandedKeys = computed(() =>
  treeData.value.filter((node) => !node.archived).map((node) => node.id),
);
const requestedDocumentAnchor = computed(() =>
  String(props.embedded ? embeddedDocumentAnchor.value : route.query.anchor || '').trim(),
);
const formattedUpdatedAt = computed(() => {
  if (!currentDocument.value?.updatedAt) return '';
  return new Intl.DateTimeFormat(locale.value === 'en-US' ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(currentDocument.value.updatedAt));
});
const associatedPages = computed(() => {
  const documentPath = normalizeDocumentPath(currentDocument.value?.path);
  if (!documentPath) return [];
  const pages = [];
  for (const client of project.value?.clients || []) {
    for (const page of client.definition?.pages || []) {
      const rawLink = project.value?.pagePrdLinks?.[client.id]?.[page.name];
      const linkedDocument = typeof rawLink === 'string' ? rawLink : rawLink?.path || rawLink?.file || '';
      if (normalizeDocumentPath(linkedDocument) !== documentPath) continue;
      pages.push({
        id: `${client.id}:${page.name}`,
        title: page.title,
        clientName: client.name,
        route: `/p/${props.projectId}/${client.id}/${page.path}`,
      });
    }
  }
  return pages;
});

function filterTreeNode(keyword, data) {
  if (!keyword) return true;
  return `${data.label} ${data.path || data.document?.path || ''}`
    .toLowerCase()
    .includes(keyword.toLowerCase());
}

function syncTreeFilter() {
  desktopTreeRef.value?.filter(searchKeyword.value);
  mobileTreeRef.value?.filter(searchKeyword.value);
}

watch(searchKeyword, () => nextTick(syncTreeFilter));
watch(
  () => currentDocument.value?.path,
  () => {
    relatedPagesExpanded.value = false;
  },
);

function handleTreeNodeClick(data) {
  if (data.kind !== 'document') return;
  mobileDirectoryVisible.value = false;
  openDocument(data.document.path);
}

function openDocument(documentPath, replace = false) {
  if (props.embedded) {
    embeddedDocumentPath.value = normalizeDocumentPath(documentPath);
    if (documents.value.length) selectCurrentDocument(documentPath);
    return;
  }
  const method = replace ? router.replace : router.push;
  method({ path: route.path, query: { file: documentPath } });
}

function openAssociatedPage(page) {
  router.push(page.route);
}

async function refreshManifest(preserveSelection = true) {
  manifestLoading.value = true;
  manifestError.value = '';
  try {
    const manifest = await loadDocumentManifest(props.projectId);
    documents.value = manifest.documents || [];
    const requestedPath = requestedDocumentPath.value;
    const selectedPath = preserveSelection ? currentDocument.value?.path : '';
    const nextDocument =
      documents.value.find((item) => item.path === requestedPath) ||
      documents.value.find((item) => item.path === selectedPath) ||
      documents.value.find((item) => !item.archived) ||
      documents.value[0];
    if (nextDocument && nextDocument.path !== requestedPath) openDocument(nextDocument.path, true);
    else if (nextDocument) await selectCurrentDocument(nextDocument.path);
  } catch (error) {
    manifestError.value = error.message;
  } finally {
    manifestLoading.value = false;
  }
}

async function selectCurrentDocument(documentPath) {
  const normalizedPath = normalizeDocumentPath(documentPath);
  const nextDocument = documents.value.find((item) => item.path === normalizedPath);
  if (!nextDocument) return;
  if (currentDocument.value?.path === nextDocument.path && renderedHtml.value) return;
  currentDocument.value = nextDocument;
  await nextTick(() => {
    desktopTreeRef.value?.setCurrentKey(`doc:${nextDocument.path}`);
    mobileTreeRef.value?.setCurrentKey(`doc:${nextDocument.path}`);
  });
  await loadCurrentDocument();
}

function createHeadingId(text, usedIds) {
  const base =
    text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '') || 'section';
  let id = base;
  let index = 2;
  while (usedIds.has(id)) id = `${base}-${index++}`;
  usedIds.add(id);
  return id;
}

function prepareRenderedHtml(source, documentPath) {
  const sanitized = DOMPurify.sanitize(markdown.render(source), {
    ADD_ATTR: ['target', 'rel', 'data-doc-path'],
  });
  const parsed = new DOMParser().parseFromString(`<div id="document-root">${sanitized}</div>`, 'text/html');
  const root = parsed.getElementById('document-root');
  const nextHeadings = [];
  const usedIds = new Set();

  root.querySelectorAll('h1, h2, h3').forEach((heading) => {
    const id = createHeadingId(heading.textContent || '', usedIds);
    heading.id = id;
    nextHeadings.push({ id, text: heading.textContent || '', level: Number(heading.tagName.slice(1)) });
  });

  root.querySelectorAll('img[src]').forEach((image) => {
    const sourceUrl = image.getAttribute('src');
    if (!sourceUrl || /^(?:[a-z]+:|\/\/|data:)/i.test(sourceUrl)) return;
    const resolved = resolveDocumentReference(documentPath, sourceUrl).split(/[?#]/u)[0];
    image.setAttribute('src', getDocumentAssetUrl(props.projectId, resolved));
    image.setAttribute('loading', 'lazy');
    image.setAttribute('data-previewable', 'true');
  });

  root.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    if (/^(?:https?:|mailto:|tel:|\/\/)/i.test(href)) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      return;
    }
    const resolved = resolveDocumentReference(documentPath, href);
    const pathOnly = resolved.split(/[?#]/u)[0];
    if (/\.md$/i.test(pathOnly)) {
      link.setAttribute('href', router.resolve({ path: route.path, query: { file: pathOnly } }).href);
      link.setAttribute('data-doc-path', pathOnly);
    } else {
      link.setAttribute('href', getDocumentAssetUrl(props.projectId, pathOnly));
      link.setAttribute('target', '_blank');
    }
  });

  headings.value = nextHeadings;
  return root.innerHTML;
}

async function renderMermaidBlocks(renderId) {
  const blocks = Array.from(articleRef.value?.querySelectorAll('pre > code.language-mermaid') || []);
  if (!blocks.length || renderId !== activeRenderId) return;
  if (!mermaidApi) {
    const module = await import('mermaid');
    mermaidApi = module.default;
    mermaidApi.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'default' });
  }
  for (const [index, code] of blocks.entries()) {
    if (renderId !== activeRenderId) return;
    const container = document.createElement('div');
    container.className = 'mermaid-diagram';
    code.parentElement.replaceWith(container);
    try {
      const result = await mermaidApi.render(`prd-mermaid-${renderId}-${index}`, code.textContent || '');
      container.innerHTML = result.svg;
      result.bindFunctions?.(container);
    } catch (error) {
      container.className = 'mermaid-error';
      container.textContent = `${t('docs.diagramFailed')}：${error.message}`;
    }
  }
}

async function loadCurrentDocument() {
  if (!currentDocument.value) return;
  const renderId = ++activeRenderId;
  documentLoading.value = true;
  documentError.value = '';
  headings.value = [];
  clearDocumentSearch();
  try {
    const source = await loadDocument(props.projectId, currentDocument.value.path);
    if (renderId !== activeRenderId) return;
    renderedHtml.value = prepareRenderedHtml(source, currentDocument.value.path);
    // 文章节点由 documentLoading 控制显示；先让它挂载，再让 Mermaid 查询代码块并替换为 SVG。
    documentLoading.value = false;
    await nextTick();
    scrollToDocumentAnchor(requestedDocumentAnchor.value);
    readerScrollRef.value?.scrollTo({ top: 0 });
    await renderMermaidBlocks(renderId);
    updateActiveHeading();
  } catch (error) {
    if (renderId === activeRenderId) documentError.value = error.message;
  } finally {
    if (renderId === activeRenderId) documentLoading.value = false;
  }
}

function updateActiveHeading() {
  const reader = readerScrollRef.value;
  const article = articleRef.value;
  if (!reader || !article) {
    activeHeadingId.value = '';
    return;
  }
  const headingElements = Array.from(article.querySelectorAll('h1, h2, h3'));
  if (!headingElements.length) {
    activeHeadingId.value = '';
    return;
  }
  const readingLine = reader.getBoundingClientRect().top + 92;
  let currentHeading = headingElements[0];
  headingElements.forEach((heading) => {
    if (heading.getBoundingClientRect().top <= readingLine) currentHeading = heading;
  });
  if (activeHeadingId.value === currentHeading.id) return;
  activeHeadingId.value = currentHeading.id;
  scheduleActiveOutlineVisibility(currentHeading.id);
}

function handleArticleClick(event) {
  const link = event.target.closest('a[data-doc-path]');
  if (link) {
    event.preventDefault();
    openDocument(link.dataset.docPath);
    return;
  }
  const image = event.target.closest('img[data-previewable="true"]');
  if (image) {
    previewImageUrl.value = image.currentSrc || image.src;
    previewImageAlt.value = image.alt || currentDocument.value?.title || '';
    imagePreviewVisible.value = true;
  }
}
function scrollToDocumentAnchor(anchor) {
  if (!anchor || !articleRef.value) return false;
  const target = articleRef.value.querySelector('#' + CSS.escape(anchor));
  if (!target) return false;

  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  activeHeadingId.value = target.id;
  target.classList.remove('is-prd-anchor-target');
  window.cancelAnimationFrame(anchorHighlightFrame);
  window.clearTimeout(anchorHighlightTimer);
  anchorHighlightFrame = window.requestAnimationFrame(() => {
    target.classList.add('is-prd-anchor-target');
    anchorHighlightTimer = window.setTimeout(() => target.classList.remove('is-prd-anchor-target'), 1800);
  });
  return true;
}

function scrollToHeading(headingId) {
  activeHeadingId.value = headingId;
  scheduleActiveOutlineVisibility(headingId);
  articleRef.value
    ?.querySelector(`#${CSS.escape(headingId)}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scheduleActiveOutlineVisibility(headingId) {
  pendingOutlineHeadingId = headingId;
  if (outlineScrollFrame) return;

  outlineScrollFrame = window.requestAnimationFrame(() => {
    outlineScrollFrame = 0;
    const currentHeadingId = pendingOutlineHeadingId;
    pendingOutlineHeadingId = '';
    if (!currentHeadingId || !outlineRef.value) return;

    outlineRef.value
      .querySelector(`[data-heading-id="${CSS.escape(currentHeadingId)}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
}

function clearDocumentSearch() {
  documentSearchMarks.forEach((mark) => {
    mark.replaceWith(document.createTextNode(mark.textContent || ''));
  });
  documentSearchMarks = [];
  articleRef.value?.normalize();
}

function searchDocument(keyword) {
  clearDocumentSearch();
  const value = String(keyword || '').trim();
  if (!value || !articleRef.value) return { count: 0, index: 0 };

  const lowerValue = value.toLocaleLowerCase();
  const walker = document.createTreeWalker(articleRef.value, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let currentNode = walker.nextNode();
  while (currentNode) {
    if (!currentNode.parentElement?.closest('script, style, mark')) textNodes.push(currentNode);
    currentNode = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const text = textNode.nodeValue || '';
    const lowerText = text.toLocaleLowerCase();
    let cursor = 0;
    let matchIndex = lowerText.indexOf(lowerValue, cursor);
    if (matchIndex < 0) return;

    const fragment = document.createDocumentFragment();
    while (matchIndex >= 0) {
      fragment.append(text.slice(cursor, matchIndex));
      const mark = document.createElement('mark');
      mark.className = 'document-search-hit';
      mark.textContent = text.slice(matchIndex, matchIndex + value.length);
      fragment.append(mark);
      documentSearchMarks.push(mark);
      cursor = matchIndex + value.length;
      matchIndex = lowerText.indexOf(lowerValue, cursor);
    }
    fragment.append(text.slice(cursor));
    textNode.replaceWith(fragment);
  });

  if (documentSearchMarks.length)
    documentSearchMarks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  return { count: documentSearchMarks.length, index: documentSearchMarks.length ? 1 : 0 };
}

function focusSearchMatch(index) {
  const mark = documentSearchMarks[index];
  if (!mark) return;
  mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

defineExpose({ clearDocumentSearch, focusSearchMatch, searchDocument });

watch(
  () => route.query.file,
  (documentPath) => {
    if (!props.embedded && documents.value.length && documentPath) selectCurrentDocument(documentPath);
  },
);

watch(
  () => props.documentPath,
  (documentPath) => {
    if (!props.embedded) return;
    embeddedDocumentPath.value = documentPath;
    if (documents.value.length && documentPath) selectCurrentDocument(documentPath);
  },
);
watch(
  () => props.documentAnchor,
  (anchor) => {
    if (!props.embedded) return;
    embeddedDocumentAnchor.value = anchor || '';
    nextTick(() => scrollToDocumentAnchor(embeddedDocumentAnchor.value));
  },
);

onMounted(async () => {
  await refreshManifest(false);
  stopDocumentsChanged = onDocumentsChanged(props.projectId, () => refreshManifest(true));
});

onBeforeUnmount(() => {
  stopDocumentsChanged();
  activeRenderId += 1;
  window.cancelAnimationFrame(anchorHighlightFrame);
  window.clearTimeout(anchorHighlightTimer);
  window.cancelAnimationFrame(outlineScrollFrame);
  outlineScrollFrame = 0;
  pendingOutlineHeadingId = '';
});
</script>

<style scoped>
.docs-page {
  --app-color-primary: var(--platform-color-accent);
  --app-color-primary-rgb: var(--platform-color-accent-rgb);
  --docs-page-bg: #f5f5f7;
  --docs-surface: #fff;
  --docs-surface-soft: #f2f2f7;
  --docs-ink: #1d1d1f;
  --docs-secondary: #6e6e73;
  --docs-tertiary: #86868b;
  --docs-primary: var(--platform-color-accent);
  --docs-border: rgb(0 0 0 / 9%);
  height: 100vh;
  min-height: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 90% 0, rgb(147 197 253 / 24%), transparent 28rem),
    radial-gradient(circle at 4% 90%, rgb(196 181 253 / 18%), transparent 30rem), var(--docs-page-bg);
  color: var(--docs-ink);
  font-family: var(--app-font-family-sans);
  font-optical-sizing: auto;
  -webkit-font-smoothing: antialiased;
}
.docs-page--embedded {
  height: 100%;
  position: relative;
}
.docs-header {
  position: relative;
  z-index: 20;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  padding: 0 clamp(16px, 2.4vw, 32px);
  border-bottom: 0.5px solid rgb(0 0 0 / 8%);
  background: rgb(255 255 255 / 78%);
  box-shadow: 0 4px 18px rgb(0 0 0 / 4%);
  backdrop-filter: blur(24px) saturate(160%);
}
.docs-header__brand,
.docs-header__actions {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.docs-header__title {
  display: flex;
  align-items: baseline;
  gap: 11px;
  min-width: 0;
}
.docs-header__title strong {
  overflow: hidden;
  color: var(--docs-ink);
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.025em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.docs-header__title span {
  color: var(--docs-secondary);
  font-size: 13px;
  white-space: nowrap;
}
.docs-home-link {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 0.5px solid rgb(0 0 0 / 12%);
  border-radius: 12px;
  background: rgb(255 255 255 / 74%);
  color: var(--docs-secondary);
  transition:
    border-color 160ms ease,
    color 160ms ease,
    background-color 160ms ease,
    transform 120ms ease;
}
.docs-home-link:hover {
  border-color: rgb(var(--app-color-primary-rgb) / 36%);
  background: #fff;
  color: var(--docs-primary);
}
.docs-home-link:active {
  transform: scale(0.96);
}
.docs-count-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  padding: 0 11px;
  border: 0.5px solid rgb(0 0 0 / 9%);
  border-radius: 999px;
  background: rgb(255 255 255 / 68%);
  color: var(--docs-secondary);
  font-size: 13px;
}
.docs-count-chip__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--docs-primary);
  box-shadow: 0 0 0 3px rgb(var(--app-color-primary-rgb) / 12%);
}
.docs-count {
  color: inherit;
}
.docs-header__actions :deep(.el-button) {
  min-height: 38px;
  border-radius: 11px;
  border-color: rgb(0 0 0 / 11%);
  background: rgb(255 255 255 / 70%);
  color: var(--docs-secondary);
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease,
    transform 120ms ease;
}
.docs-header__actions :deep(.el-button:hover) {
  border-color: rgb(var(--app-color-primary-rgb) / 32%);
  background: #fff;
  color: var(--docs-primary);
}
.docs-header__actions :deep(.el-button:active) {
  transform: scale(0.97);
}
.docs-workspace {
  height: calc(100vh - 72px);
  min-height: 0;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) 240px;
  gap: 12px;
  padding: 12px;
  background: transparent;
}
.docs-workspace--embedded {
  height: 100%;
  position: relative;
  display: block;
  padding: 0;
}
.docs-page--embedded .docs-header,
.docs-page--embedded .docs-directory,
.docs-page--embedded:not(.docs-page--embedded-outline) .docs-outline {
  display: none;
}
.docs-page--embedded-outline .docs-outline {
  position: absolute;
  z-index: 10;
  inset: 0 0 0 auto;
  width: 240px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: 18px 0 0 18px;
  box-shadow: -12px 0 28px rgb(0 0 0 / 12%);
}
.docs-page--embedded-outline .docs-outline strong,
.docs-page--embedded-outline .docs-outline button {
  flex: 0 0 auto;
  min-width: 0;
}
.docs-page--embedded-outline .docs-outline button {
  width: 100%;
  white-space: normal;
}
.docs-directory {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 16px 16px;
  overflow: hidden;
  border: 0.5px solid rgb(0 0 0 / 8%);
  border-radius: 18px;
  background: rgb(255 255 255 / 74%);
  box-shadow: 0 8px 28px rgb(0 0 0 / 5%);
  backdrop-filter: blur(18px) saturate(140%);
}
.directory-heading {
  display: grid;
  gap: 3px;
  padding: 2px 4px 0;
}
.directory-heading strong {
  color: var(--docs-ink);
  font-size: 17px;
  letter-spacing: -0.015em;
}
.directory-heading span {
  color: var(--docs-tertiary);
  font-size: 12px;
}
.docs-directory :deep(.el-input__wrapper),
.mobile-directory :deep(.el-input__wrapper) {
  min-height: 42px;
  border-radius: 12px;
  background: rgb(255 255 255 / 86%);
  box-shadow: 0 0 0 0.5px rgb(0 0 0 / 12%) inset;
  transition:
    box-shadow 160ms ease,
    background-color 160ms ease;
}
.docs-directory :deep(.el-input__wrapper:focus-within),
.mobile-directory :deep(.el-input__wrapper:focus-within) {
  background: #fff;
  box-shadow: 0 0 0 3px rgb(var(--app-color-primary-rgb) / 14%);
}
.tree-scroll {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 2px 4px 2px 0;
  scrollbar-color: rgb(0 0 0 / 18%) transparent;
  scrollbar-width: thin;
}
.tree-scroll::-webkit-scrollbar,
.docs-outline::-webkit-scrollbar,
.docs-reader::-webkit-scrollbar {
  width: 8px;
}
.tree-scroll::-webkit-scrollbar-thumb,
.docs-outline::-webkit-scrollbar-thumb,
.docs-reader::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgb(0 0 0 / 18%);
}
.document-tree {
  background: transparent;
  --el-tree-node-hover-bg-color: rgb(118 118 128 / 10%);
}
.tree-node {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #3a3a3c;
  font-size: 13px;
}
.tree-node .el-icon {
  flex: 0 0 auto;
  color: var(--docs-primary);
}
.tree-node--archived {
  color: var(--docs-tertiary);
}
.tree-node--archived .el-icon {
  color: var(--docs-tertiary);
}
.tree-node__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.docs-reader {
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: auto;
  border: 0.5px solid rgb(0 0 0 / 7%);
  border-radius: 20px;
  background: var(--docs-surface);
  box-shadow: 0 8px 28px rgb(0 0 0 / 5%);
  scroll-behavior: smooth;
}
.docs-page--embedded .document-shell {
  width: 100%;
  padding: 32px 36px 64px;
}
.docs-page--embedded .docs-reader {
  overflow-x: hidden;
  overflow-y: scroll;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
.document-shell {
  width: min(100%, 1040px);
  margin: 0 auto;
  padding: 38px 56px 96px;
}
.document-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 0.5px solid rgb(0 0 0 / 8%);
  color: var(--docs-tertiary);
  font-size: 12px;
}
.document-path {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.document-loading,
.document-error {
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--docs-secondary);
}
.document-error {
  flex-direction: column;
}
.reader-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: var(--docs-secondary);
  text-align: center;
}
.reader-state > .el-icon {
  font-size: 30px;
  color: var(--docs-primary);
}
.reader-state h2 {
  margin: 0;
  color: var(--docs-ink);
  font-size: 20px;
}
.reader-state p {
  max-width: 560px;
  margin: 0;
  line-height: 1.7;
}
.docs-outline {
  min-height: 0;
  overflow: auto;
  padding: 24px 14px;
  border: 0.5px solid rgb(0 0 0 / 8%);
  border-radius: 18px;
  background: rgb(255 255 255 / 72%);
  box-shadow: 0 8px 28px rgb(0 0 0 / 5%);
  backdrop-filter: blur(18px) saturate(140%);
}
.docs-related-pages {
  margin: -2px 0 20px;
  padding: 0 0 16px;
  border-bottom: 0.5px solid rgb(0 0 0 / 9%);
}
.docs-related-pages__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 8px 10px;
  padding-left: 10px;
  border-left: 3px solid var(--docs-primary);
}
.docs-related-pages__heading strong {
  margin: 0;
  padding: 0;
  border: 0;
}
.docs-related-pages__heading span {
  min-width: 20px;
  padding: 2px 6px;
  border-radius: 999px;
  color: var(--docs-primary);
  background: color-mix(in srgb, var(--docs-primary) 10%, white);
  font-size: 11px;
  text-align: center;
}
.docs-related-page {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 7px;
  min-height: 40px;
  padding: 7px 8px;
  border: 0;
  border-radius: 9px;
  color: var(--docs-secondary);
  background: transparent;
  text-align: left;
  transition:
    color 160ms ease,
    background-color 160ms ease,
    transform 120ms ease;
}
.docs-related-page:hover {
  color: var(--docs-primary);
  background: rgb(118 118 128 / 10%);
}
.docs-related-page:active {
  transform: scale(0.985);
}
.docs-related-page > .el-icon {
  flex: 0 0 auto;
  margin-top: 2px;
  color: var(--docs-primary);
}
.docs-related-page > span {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.docs-related-page strong,
.docs-related-page small {
  overflow: hidden;
  margin: 0;
  padding: 0;
  border: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.docs-related-page strong {
  color: inherit;
  font-size: 12px;
  font-weight: 600;
}
.docs-related-page small {
  color: var(--docs-tertiary);
  font-size: 11px;
}
.docs-outline strong {
  display: block;
  margin: 0 8px 14px;
  padding-left: 10px;
  border-left: 3px solid var(--docs-primary);
  color: var(--docs-ink);
  font-size: 13px;
  letter-spacing: 0.01em;
}
.docs-outline button {
  width: 100%;
  display: block;
  min-height: 32px;
  padding: 6px 10px;
  border: 0;
  border-radius: 9px;
  color: var(--docs-secondary);
  background: transparent;
  font-size: 12px;
  line-height: 1.45;
  text-align: left;
  transition:
    color 160ms ease,
    background-color 160ms ease,
    transform 120ms ease;
}
.docs-outline button:hover {
  color: var(--docs-primary);
  background: rgb(118 118 128 / 10%);
}
.docs-outline button:active {
  transform: scale(0.985);
}
.docs-outline button.is-active {
  color: var(--docs-primary);
  background: color-mix(in srgb, var(--docs-primary) 10%, white);
  font-weight: 600;
}
.docs-outline .outline-level-2 {
  padding-left: 20px;
}
.docs-outline .outline-level-3 {
  padding-left: 30px;
  color: var(--docs-tertiary);
}
.docs-outline .docs-related-pages__heading strong {
  margin: 0;
  padding: 0;
  border: 0;
}
.docs-outline button.docs-related-page {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  min-height: 40px;
  padding: 7px 8px;
  line-height: 1.45;
}
.docs-outline button.docs-related-pages__toggle {
  width: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 0;
  padding: 0;
  border-radius: 8px;
  text-align: center;
}
.docs-related-pages__toggle .el-icon {
  color: var(--docs-tertiary);
  transition: transform 160ms ease;
}
.docs-related-pages__toggle .el-icon.is-open {
  transform: rotate(180deg);
}
.mobile-directory-button {
  display: none;
}
.mobile-directory {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.mobile-directory .document-tree {
  min-height: 0;
  overflow: auto;
}
.document-image-preview {
  display: block;
  max-width: 100%;
  max-height: 78vh;
  margin: 0 auto;
  object-fit: contain;
}

:deep(.el-tree-node__content) {
  height: 36px;
  border-radius: 10px;
  transition:
    color 160ms ease,
    background-color 160ms ease;
}
:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content) {
  background: color-mix(in srgb, var(--docs-primary) 11%, white);
}
:deep(.el-tree--highlight-current .el-tree-node.is-current .tree-node) {
  color: var(--docs-primary);
  font-weight: 600;
}
:deep(.markdown-body) {
  color: #3a3a3c;
  font-size: 16px;
  line-height: 1.85;
}
:deep(.markdown-body .is-prd-anchor-target) {
  border-radius: 10px;
  background: rgb(var(--app-color-primary-rgb) / 9%);
  box-shadow: 0 0 0 6px rgb(var(--app-color-primary-rgb) / 5%);
  transition:
    background-color 180ms ease,
    box-shadow 180ms ease;
}

@media (prefers-reduced-motion: reduce) {
  :deep(.markdown-body .is-prd-anchor-target) {
    transition: none;
  }
}
:deep(.markdown-body h1) {
  margin: 0 0 28px;
  color: var(--docs-ink);
  font-size: clamp(30px, 3.2vw, 38px);
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.18;
}
:deep(.markdown-body h2) {
  margin: 52px 0 18px;
  padding-bottom: 11px;
  border-bottom: 0.5px solid rgb(0 0 0 / 10%);
  color: var(--docs-ink);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.35;
  scroll-margin-top: 28px;
}
:deep(.markdown-body h3) {
  margin: 36px 0 13px;
  color: var(--docs-ink);
  font-size: 19px;
  font-weight: 650;
  letter-spacing: -0.015em;
  line-height: 1.45;
  scroll-margin-top: 28px;
}
:deep(.markdown-body h4) {
  margin: 24px 0 10px;
  color: var(--docs-ink);
  font-size: 16px;
}
:deep(.markdown-body p) {
  margin: 0 0 15px;
}
:deep(.markdown-body ul),
:deep(.markdown-body ol) {
  margin: 0 0 18px;
  padding-left: 26px;
  list-style: revert;
}
:deep(.markdown-body li) {
  margin: 5px 0;
}
:deep(.markdown-body a) {
  color: var(--app-color-primary);
  text-decoration: underline;
  text-underline-offset: 3px;
}
:deep(.markdown-body strong) {
  color: var(--docs-ink);
}
:deep(.markdown-body blockquote) {
  margin: 24px 0;
  padding: 15px 18px;
  border-left: 3px solid var(--docs-primary);
  border-radius: 0 12px 12px 0;
  background: color-mix(in srgb, var(--docs-primary) 7%, white);
  color: var(--docs-secondary);
}
:deep(.markdown-body blockquote p:last-child) {
  margin-bottom: 0;
}
:deep(.markdown-body code) {
  padding: 2px 5px;
  border-radius: 6px;
  background: #f2f2f7;
  color: #9f2d42;
  font-family: var(--app-font-family-mono);
  font-size: 0.9em;
}
:deep(.markdown-body pre) {
  margin: 24px 0;
  overflow: auto;
  padding: 18px 20px;
  border: 0.5px solid rgb(0 0 0 / 10%);
  border-radius: 14px;
  background: #f5f5f7;
}
:deep(.markdown-body pre code) {
  padding: 0;
  background: transparent;
  color: #1d1d1f;
}
:deep(.markdown-body table) {
  width: 100%;
  margin: 24px 0;
  border-collapse: collapse;
  font-size: 14px;
}
:deep(.markdown-body th),
:deep(.markdown-body td) {
  padding: 11px 13px;
  border: 0.5px solid #dfe2e7;
  text-align: left;
  vertical-align: top;
}
:deep(.markdown-body th) {
  background: #f5f5f7;
  color: #3a3a3c;
  font-weight: 700;
}
:deep(.markdown-body tr:nth-child(even) td) {
  background: #fafafa;
}
:deep(.markdown-body img) {
  display: block;
  max-width: min(100%, 760px);
  max-height: 560px;
  margin: 28px auto;
  border: 0.5px solid rgb(0 0 0 / 10%);
  border-radius: 14px;
  box-shadow: 0 8px 22px rgb(0 0 0 / 8%);
  cursor: zoom-in;
  object-fit: contain;
}
:deep(.markdown-body hr) {
  margin: 38px 0;
  border: 0;
  border-top: 0.5px solid rgb(0 0 0 / 10%);
}
:deep(.markdown-body .mermaid-diagram) {
  margin: 28px 0;
  overflow: auto;
  padding: 20px;
  border: 0.5px solid rgb(0 0 0 / 10%);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 6px 18px rgb(0 0 0 / 5%);
  text-align: center;
}
:deep(.markdown-body .mermaid-diagram svg) {
  max-width: 100%;
  height: auto;
}
:deep(.markdown-body .mermaid-error) {
  margin: 20px 0;
  padding: 14px;
  border: 0.5px solid #f3c7c7;
  border-radius: 12px;
  background: #fff5f5;
  color: #b42318;
  white-space: pre-wrap;
}
:deep(.document-search-hit) {
  padding: 1px 2px;
  border-radius: 4px;
  background: #ffe69a;
  color: inherit;
}

@media (max-width: 1180px) {
  .docs-workspace {
    grid-template-columns: 276px minmax(0, 1fr);
    gap: 10px;
    padding: 10px;
  }
  .docs-outline {
    display: none;
  }
}

@media (max-width: 760px) {
  .docs-header {
    height: 64px;
    padding: 0 16px;
  }
  .docs-header__title span,
  .docs-count-chip {
    display: none;
  }
  .docs-header__title strong {
    max-width: 48vw;
    font-size: 18px;
  }
  .docs-workspace {
    height: calc(100vh - 64px);
    display: block;
    padding: 8px;
  }
  .docs-directory {
    display: none;
  }
  .mobile-directory-button {
    display: inline-flex;
  }
  .docs-reader {
    border-radius: 16px;
  }
  .document-shell {
    padding: 28px 22px 64px;
  }
  .document-meta {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 22px;
  }
  :deep(.markdown-body h1) {
    font-size: 28px;
  }
  :deep(.markdown-body h2) {
    margin-top: 34px;
    font-size: 21px;
  }
  :deep(.markdown-body table) {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
}

@media (prefers-reduced-motion: reduce) {
  .docs-page,
  .docs-page * {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .docs-header,
  .docs-directory,
  .docs-outline,
  .docs-count-chip,
  .docs-home-link,
  .docs-header__actions :deep(.el-button) {
    background: #fff;
    backdrop-filter: none;
  }
}

@media (prefers-contrast: more) {
  .docs-header,
  .docs-directory,
  .docs-reader,
  .docs-outline,
  .docs-home-link,
  .docs-count-chip {
    border: 1px solid #6e6e73;
    background: #fff;
    backdrop-filter: none;
  }
}
</style>
