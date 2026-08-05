<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ArrowLeft, ArrowRight, Close, Document, Link, Menu, Search } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';

import DocsCenterView from '../views/docs/DocsCenterView.vue';

const props = defineProps({
  projectId: { type: String, required: true },
  documentPath: { type: String, default: '' },
  documentPaths: { type: Array, default: () => [] },
  documentAnchor: { type: String, default: '' },
  pageTitle: { type: String, required: true },
  layoutMode: { type: String, default: 'split' },
});

const emit = defineEmits(['close', 'open-window', 'ready', 'update:layout-mode']);
const router = useRouter();
const outlineVisible = ref(false);
const activeDocumentPath = ref(props.documentPath);
const documentSearch = ref('');
const searchMatchCount = ref(0);
const searchMatchIndex = ref(0);
const readerRef = ref(null);
const panelRef = ref(null);
const isDragging = ref(false);
const isCompactViewport = ref(false);
const overlayPosition = ref({ x: 0, y: 0 });
let dragState = null;

const overlayStyle = computed(() => {
  if (props.layoutMode !== 'overlay' || isCompactViewport.value) return undefined;

  return {
    transform: `translate3d(${overlayPosition.value.x}px, ${overlayPosition.value.y}px, 0)`,
  };
});

const positionStorageKey = computed(() => `prd-review-pane-position:${props.projectId}`);

function handleOutsideOutline(event) {
  if (!outlineVisible.value) return;

  const target = event.target;
  if (target?.closest?.('.docs-outline, .prd-review-pane__directory-action')) return;

  outlineVisible.value = false;
}

function readSavedPosition() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(positionStorageKey.value) || 'null');
    if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return;
    overlayPosition.value = { x: saved.x, y: saved.y };
  } catch {
    // Local storage is optional; a blocked or malformed value should not affect PRD reading.
  }
}

function savePosition() {
  try {
    window.localStorage.setItem(positionStorageKey.value, JSON.stringify(overlayPosition.value));
  } catch {
    // Local storage is optional; the position still works for the current session.
  }
}

function getWorkspaceRect() {
  return panelRef.value?.closest('.page-workspace')?.getBoundingClientRect() || null;
}

function clamp(value, min, max) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return Math.min(Math.max(value, lower), upper);
}

function getPositionBounds(metrics) {
  const workspaceRect = getWorkspaceRect();
  if (!workspaceRect) return null;

  return {
    minX: workspaceRect.left + 10 - metrics.baseLeft,
    maxX: workspaceRect.right - 10 - metrics.width - metrics.baseLeft,
    minY: workspaceRect.top + 10 - metrics.baseTop,
    maxY: workspaceRect.bottom - 10 - metrics.height - metrics.baseTop,
  };
}

function constrainOverlayPosition() {
  if (props.layoutMode !== 'overlay' || isCompactViewport.value || !panelRef.value) return;

  const panelRect = panelRef.value.getBoundingClientRect();
  const metrics = {
    baseLeft: panelRect.left - overlayPosition.value.x,
    baseTop: panelRect.top - overlayPosition.value.y,
    width: panelRect.width,
    height: panelRect.height,
  };
  const bounds = getPositionBounds(metrics);
  if (!bounds) return;

  overlayPosition.value = {
    x: clamp(overlayPosition.value.x, bounds.minX, bounds.maxX),
    y: clamp(overlayPosition.value.y, bounds.minY, bounds.maxY),
  };
}

function updateViewportMode() {
  isCompactViewport.value = window.matchMedia('(max-width: 760px)').matches;
  if (isCompactViewport.value) {
    overlayPosition.value = { x: 0, y: 0 };
    return;
  }

  constrainOverlayPosition();
}

function schedulePositionConstraint() {
  window.requestAnimationFrame(() => constrainOverlayPosition());
}

function handleHeaderPointerDown(event) {
  if (props.layoutMode !== 'overlay' || isCompactViewport.value) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;

  const target = event.target;
  if (target?.closest?.('button, a, input, select, textarea, [role="button"]')) return;

  const panel = panelRef.value;
  const workspaceRect = getWorkspaceRect();
  if (!panel || !workspaceRect) return;

  const panelRect = panel.getBoundingClientRect();
  dragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startPosition: { ...overlayPosition.value },
    baseLeft: panelRect.left - overlayPosition.value.x,
    baseTop: panelRect.top - overlayPosition.value.y,
    width: panelRect.width,
    height: panelRect.height,
  };
  isDragging.value = true;
  event.preventDefault();
  event.currentTarget.setPointerCapture?.(event.pointerId);
}

function handleHeaderPointerMove(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;

  event.preventDefault();
  const bounds = getPositionBounds(dragState);
  if (!bounds) return;

  overlayPosition.value = {
    x: clamp(dragState.startPosition.x + event.clientX - dragState.startX, bounds.minX, bounds.maxX),
    y: clamp(dragState.startPosition.y + event.clientY - dragState.startY, bounds.minY, bounds.maxY),
  };
}

function finishHeaderDrag(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;

  if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
  dragState = null;
  isDragging.value = false;
  savePosition();
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideOutline);
  readSavedPosition();
  updateViewportMode();
  window.addEventListener('resize', updateViewportMode);
  emit('ready');
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideOutline);
  window.removeEventListener('resize', updateViewportMode);
});

watch(
  () => props.layoutMode,
  (mode) => {
    if (mode === 'overlay') {
      schedulePositionConstraint();
    } else {
      dragState = null;
      isDragging.value = false;
    }
  },
);

function normalizeDocument(entry) {
  const path = typeof entry === 'string' ? entry : entry?.path || entry?.file || '';
  if (!path) return null;
  const title =
    typeof entry === 'object' && entry?.title ? entry.title : path.split('/').pop().replace(/\.md$/i, '');
  return { path, title };
}

const availableDocuments = computed(() => {
  const entries = props.documentPaths.length ? props.documentPaths : [props.documentPath];
  return entries.map(normalizeDocument).filter(Boolean);
});
const activeDocument = computed(
  () => availableDocuments.value.find((document) => document.path === activeDocumentPath.value) || null,
);

watch(
  availableDocuments,
  (documents) => {
    if (!documents.some((document) => document.path === activeDocumentPath.value)) {
      activeDocumentPath.value = documents[0]?.path || '';
    }
  },
  { immediate: true },
);

watch(
  () => props.documentPath,
  (documentPath) => {
    if (!availableDocuments.value.some((document) => document.path === activeDocumentPath.value)) {
      activeDocumentPath.value = documentPath || '';
    }
  },
);

watch(activeDocumentPath, () => {
  documentSearch.value = '';
  searchMatchCount.value = 0;
  searchMatchIndex.value = 0;
  readerRef.value?.clearDocumentSearch();
});

const documentUrl = computed(
  () =>
    router.resolve({
      path: `/p/${props.projectId}/docs`,
      query: { file: activeDocumentPath.value, ...(props.documentAnchor ? { anchor: props.documentAnchor } : {}) },
    }).href,
);
function openDocumentWindow() {
  emit('open-window', documentUrl.value);
}

function setLayoutMode(mode) {
  emit('update:layout-mode', mode);
}

function updateDocumentSearch() {
  const result = readerRef.value?.searchDocument(documentSearch.value) || { count: 0, index: 0 };
  searchMatchCount.value = result.count;
  searchMatchIndex.value = result.index;
}

function moveSearchMatch(step) {
  if (!searchMatchCount.value) return;
  const nextIndex = (searchMatchIndex.value - 1 + step + searchMatchCount.value) % searchMatchCount.value;
  searchMatchIndex.value = nextIndex + 1;
  readerRef.value?.focusSearchMatch(nextIndex);
}
</script>

<template>
  <section
    ref="panelRef"
    class="prd-review-pane"
    :class="[`prd-review-pane--${layoutMode}`, { 'is-dragging': isDragging }]"
    :style="overlayStyle"
  >
    <header
      class="prd-review-pane__header"
      :class="{ 'is-draggable': layoutMode === 'overlay' && !isCompactViewport }"
      :title="layoutMode === 'overlay' && !isCompactViewport ? '拖动标题栏移动 PRD 浮层' : undefined"
      @pointerdown="handleHeaderPointerDown"
      @pointermove="handleHeaderPointerMove"
      @pointerup="finishHeaderDrag"
      @pointercancel="finishHeaderDrag"
    >
      <div class="prd-review-pane__leading">
        <span class="prd-review-pane__document-icon"
          ><el-icon><Document /></el-icon
        ></span>
        <div class="prd-review-pane__identity">
          <span class="prd-review-pane__eyebrow">PRD REVIEW</span>
          <div class="prd-review-pane__title-line">
            <strong>{{ pageTitle }}</strong>
            <span class="prd-review-pane__path" :title="activeDocumentPath">
              {{ activeDocument?.title || activeDocumentPath }}
            </span>
          </div>
        </div>
      </div>
      <div class="prd-review-pane__actions">
        <button
          type="button"
          class="prd-review-pane__icon-button"
          title="新窗口打开"
          aria-label="新窗口打开"
          @click="openDocumentWindow"
        >
          <el-icon><Link /></el-icon>
        </button>
        <button
          type="button"
          class="prd-review-pane__icon-button"
          title="关闭 PRD"
          aria-label="关闭 PRD"
          @click="emit('close')"
        >
          <el-icon><Close /></el-icon>
        </button>
      </div>
    </header>

    <div class="prd-review-pane__toolbar">
      <div class="prd-review-pane__mode-group">
        <span>显示方式</span>
        <div class="prd-review-pane__modes" role="group" aria-label="PRD 查看方式">
          <button
            v-for="mode in [
              { value: 'split', label: '固定分屏' },
              { value: 'overlay', label: '浮层' },
            ]"
            :key="mode.value"
            type="button"
            :class="{ 'is-active': layoutMode === mode.value }"
            :aria-pressed="layoutMode === mode.value"
            @click="setLayoutMode(mode.value)"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>
      <button
        type="button"
        class="prd-review-pane__window-action prd-review-pane__directory-action"
        :title="outlineVisible ? '关闭目录' : '查看目录'"
        :aria-expanded="outlineVisible"
        @click="outlineVisible = !outlineVisible"
      >
        <el-icon><Menu /></el-icon>
        {{ outlineVisible ? '关闭目录' : '查看目录' }}
      </button>
    </div>

    <div class="prd-review-pane__searchbar">
      <el-select
        v-if="availableDocuments.length > 1"
        v-model="activeDocumentPath"
        class="prd-review-pane__document-select"
        size="small"
        aria-label="关联文档"
      >
        <el-option
          v-for="document in availableDocuments"
          :key="document.path"
          :label="document.title"
          :value="document.path"
        />
      </el-select>
      <el-input
        v-model="documentSearch"
        class="prd-review-pane__search-input"
        size="small"
        clearable
        placeholder="搜索本文"
        @input="updateDocumentSearch"
        @clear="updateDocumentSearch"
      >
        <template #prefix
          ><el-icon><Search /></el-icon
        ></template>
      </el-input>
      <span v-if="documentSearch" class="prd-review-pane__search-count">
        {{ searchMatchIndex }} / {{ searchMatchCount }}
      </span>
      <button
        type="button"
        class="prd-review-pane__search-action"
        :disabled="!searchMatchCount"
        title="上一个匹配"
        aria-label="上一个匹配"
        @click="moveSearchMatch(-1)"
      >
        <el-icon><ArrowLeft /></el-icon>
      </button>
      <button
        type="button"
        class="prd-review-pane__search-action"
        :disabled="!searchMatchCount"
        title="下一个匹配"
        aria-label="下一个匹配"
        @click="moveSearchMatch(1)"
      >
        <el-icon><ArrowRight /></el-icon>
      </button>
    </div>

    <div class="prd-review-pane__reader">
      <DocsCenterView
        ref="readerRef"
        :project-id="projectId"
        :embedded="true"
        :outline-visible="outlineVisible"
        :document-path="activeDocumentPath"
        :document-anchor="documentAnchor"
      />
    </div>
  </section>
</template>

<style scoped>
.prd-review-pane {
  display: grid;
  grid-column: 2;
  grid-row: 1;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex: 0 0 min(42%, 560px);
  grid-template-rows: auto auto auto minmax(0, 1fr);
  align-self: stretch;
  overflow: hidden;
  border-left: 1px solid var(--border);
  background: #fff;
  box-shadow: -8px 0 24px rgb(16 24 40 / 6%);
  translate: 0 0;
}

.prd-review-pane--split {
  width: 100%;
  flex: none;
}

.prd-review-pane--overlay {
  grid-column: 1 / -1;
  position: absolute;
  z-index: 20;
  inset: 0 0 0 auto;
  width: min(560px, 100%);
  box-shadow: -16px 0 32px rgb(16 24 40 / 16%);
}

.prd-review-pane__header,
.prd-review-pane__toolbar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
}

.prd-review-pane__header {
  justify-content: space-between;
  gap: 16px;
  min-height: 76px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}

.prd-review-pane__identity {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.prd-review-pane__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--app-color-primary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.prd-review-pane__identity strong {
  overflow: hidden;
  color: var(--text);
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prd-review-pane__path {
  overflow: hidden;
  color: var(--muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prd-review-pane__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
}

.prd-review-pane__icon-button,
.prd-review-pane__window-action,
.prd-review-pane__modes button {
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font: inherit;
}

.prd-review-pane__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 6px;
}

.prd-review-pane__icon-button:hover,
.prd-review-pane__window-action:hover {
  background: var(--surface-muted);
  color: var(--app-color-primary);
}

.prd-review-pane__toolbar {
  gap: 10px;
  min-height: 42px;
  padding: 0 18px;
  border-bottom: 1px solid var(--border);
  color: var(--muted);
  font-size: 12px;
}

.prd-review-pane__modes {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 6px;
  background: var(--surface-muted);
}

.prd-review-pane__modes button {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.prd-review-pane__modes button.is-active {
  background: #fff;
  color: var(--app-color-primary);
  box-shadow: 0 1px 2px rgb(16 24 40 / 10%);
}

.prd-review-pane__window-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 4px 0;
  color: var(--app-color-primary);
  font-size: 12px;
}
.prd-review-pane__directory-action {
  margin-left: auto;
}
.prd-review-pane__directory-action + .prd-review-pane__window-action {
  margin-left: 0;
}

.prd-review-pane__searchbar {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 46px;
  padding: 0 18px;
  border-bottom: 1px solid var(--border);
}

.prd-review-pane__document-select {
  flex: 0 0 150px;
}

.prd-review-pane__search-input {
  min-width: 0;
  flex: 1 1 auto;
}

.prd-review-pane__search-count {
  flex: 0 0 auto;
  color: var(--muted);
  font-size: 11px;
  white-space: nowrap;
}

.prd-review-pane__search-action {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 4px;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
}

.prd-review-pane__search-action:hover:not(:disabled) {
  color: var(--app-color-primary);
  background: var(--surface-muted);
}

.prd-review-pane__search-action:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.prd-review-pane__reader {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.prd-review-pane__reader :deep(.docs-page--embedded) {
  height: 100%;
}

@media (max-width: 900px) {
  .prd-review-pane {
    flex-basis: min(48%, 480px);
  }
}

@media (max-width: 760px) {
  .prd-review-pane {
    position: absolute;
    z-index: 20;
    inset: 0;
    width: 100%;
    flex-basis: auto;
  }
}

/* Apple-inspired PRD reader */
.prd-review-pane {
  flex: 0 0 clamp(440px, 44%, 620px);
  border-left: 0.5px solid rgb(0 0 0 / 12%);
  background: #f5f5f7;
  color: #1d1d1f;
  box-shadow: -10px 0 30px rgb(0 0 0 / 7%);
}

.prd-review-pane--overlay {
  inset: 10px 10px 10px auto;
  width: min(620px, calc(100% - 20px));
  height: auto;
  border: 0.5px solid rgb(0 0 0 / 12%);
  border-radius: 18px;
  box-shadow: 0 24px 70px rgb(0 0 0 / 22%);
  will-change: transform;
}

.prd-review-pane__header.is-draggable {
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.prd-review-pane__header.is-draggable:active,
.prd-review-pane.is-dragging .prd-review-pane__header {
  cursor: grabbing;
}

.prd-review-pane.is-dragging {
  box-shadow: 0 28px 82px rgb(0 0 0 / 26%);
}

.prd-review-pane__header {
  min-height: 66px;
  padding: 10px 16px;
  border-bottom: 0.5px solid rgb(0 0 0 / 9%);
  background: rgb(255 255 255 / 92%);
  backdrop-filter: blur(18px) saturate(135%);
}

.prd-review-pane__leading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.prd-review-pane__document-icon {
  display: inline-flex;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: #e5f0ff;
  color: var(--app-color-primary);
  font-size: 19px;
}

.prd-review-pane__identity {
  gap: 2px;
}

.prd-review-pane__eyebrow {
  color: #6e6e73;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.prd-review-pane__title-line {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 8px;
}

.prd-review-pane__identity strong {
  min-width: 0;
  overflow: hidden;
  flex: 1 1 auto;
  color: #1d1d1f;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.018em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prd-review-pane__path {
  min-width: 0;
  flex: 0 0 auto;
  color: #86868b;
  font-size: 11px;
  white-space: nowrap;
}

.prd-review-pane__path::before {
  margin-right: 8px;
  color: #c7c7cc;
  content: '·';
}

.prd-review-pane__actions {
  gap: 6px;
}

.prd-review-pane__icon-button {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: #6e6e73;
  transition:
    color 160ms ease,
    background-color 160ms ease;
}

.prd-review-pane__icon-button:hover {
  background: #f2f2f7;
  color: #1d1d1f;
}

.prd-review-pane__icon-button:focus-visible,
.prd-review-pane__window-action:focus-visible,
.prd-review-pane__modes button:focus-visible,
.prd-review-pane__search-action:focus-visible {
  outline: 3px solid rgb(var(--app-color-primary-rgb) / 20%);
  outline-offset: 2px;
}

.prd-review-pane__toolbar {
  min-height: 52px;
  gap: 12px;
  padding: 7px 16px;
  border-bottom: 0.5px solid rgb(0 0 0 / 8%);
  background: #f5f5f7;
}

.prd-review-pane__mode-group {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  color: #6e6e73;
  font-size: 11px;
}

.prd-review-pane__modes {
  gap: 2px;
  padding: 3px;
  border-radius: 10px;
  background: #e9e9ee;
}

.prd-review-pane__modes button {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  color: #6e6e73;
  font-size: 11px;
  font-weight: 550;
  transition:
    color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.prd-review-pane__modes button.is-active {
  background: #fff;
  color: #1d1d1f;
  box-shadow: 0 1px 4px rgb(0 0 0 / 10%);
}

.prd-review-pane__window-action,
.prd-review-pane__directory-action {
  min-height: 32px;
  margin-left: auto;
  padding: 0 10px;
  border-radius: 9px;
  color: #515154;
  font-size: 11px;
  font-weight: 550;
  transition:
    color 160ms ease,
    background-color 160ms ease;
}

.prd-review-pane__window-action:hover {
  background: #e9e9ee;
  color: #1d1d1f;
}

.prd-review-pane__searchbar {
  min-height: 56px;
  gap: 7px;
  padding: 8px 16px;
  border-bottom: 0.5px solid rgb(0 0 0 / 8%);
  background: rgb(255 255 255 / 92%);
}

.prd-review-pane__document-select {
  flex-basis: 172px;
}

.prd-review-pane__searchbar :deep(.el-input__wrapper),
.prd-review-pane__searchbar :deep(.el-select__wrapper) {
  min-height: 36px;
  border-radius: 10px;
  background: #f5f5f7;
  box-shadow: 0 0 0 0.5px rgb(0 0 0 / 12%) inset;
}

.prd-review-pane__searchbar :deep(.el-input__wrapper.is-focus),
.prd-review-pane__searchbar :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 3px rgb(var(--app-color-primary-rgb) / 15%);
}

.prd-review-pane__search-count {
  min-width: 34px;
  color: #86868b;
  text-align: center;
}

.prd-review-pane__search-action {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: #6e6e73;
  transition:
    color 160ms ease,
    background-color 160ms ease;
}

.prd-review-pane__search-action:hover:not(:disabled) {
  color: #1d1d1f;
  background: #f2f2f7;
}

.prd-review-pane__reader {
  background: #f5f5f7;
}

.prd-review-pane__reader :deep(.docs-page--embedded),
.prd-review-pane__reader :deep(.docs-reader) {
  background: #f5f5f7;
}

.prd-review-pane__reader :deep(.docs-page--embedded .document-shell) {
  width: calc(100% - 24px);
  min-height: calc(100% - 24px);
  margin: 12px;
  padding: 30px 32px 64px;
  border: 0.5px solid rgb(0 0 0 / 9%);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 3px 16px rgb(0 0 0 / 5%);
}

.prd-review-pane__reader :deep(.document-meta) {
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom-color: rgb(0 0 0 / 7%);
  color: #86868b;
  font-size: 11px;
}

.prd-review-pane__reader :deep(.reader-state),
.prd-review-pane__reader :deep(.document-loading),
.prd-review-pane__reader :deep(.document-error) {
  min-height: 260px;
  margin: 12px;
  border: 0.5px solid rgb(0 0 0 / 8%);
  border-radius: 16px;
  background: #fff;
  color: #6e6e73;
}

.prd-review-pane__reader :deep(.reader-state h2) {
  color: #1d1d1f;
  font-size: 19px;
  letter-spacing: -0.02em;
}

.prd-review-pane__reader :deep(.docs-page--embedded-outline .docs-outline) {
  inset: 10px 10px 10px auto;
  width: min(250px, calc(100% - 20px));
  padding: 18px 14px;
  border: 0.5px solid rgb(0 0 0 / 10%);
  border-radius: 14px;
  background: rgb(255 255 255 / 94%);
  box-shadow: 0 18px 48px rgb(0 0 0 / 18%);
  backdrop-filter: blur(18px) saturate(130%);
}

.prd-review-pane__reader :deep(.docs-outline strong) {
  margin: 0 8px 10px;
  color: #1d1d1f;
  font-size: 13px;
}

.prd-review-pane__reader :deep(.docs-outline button) {
  padding: 7px 9px;
  border-radius: 8px;
  color: #6e6e73;
  line-height: 1.45;
  transition:
    color 160ms ease,
    background-color 160ms ease;
}

.prd-review-pane__reader :deep(.docs-outline button:hover) {
  background: #f2f2f7;
  color: #1d1d1f;
}

.prd-review-pane__reader :deep(.markdown-body) {
  color: #3a3a3c;
  font-size: 14px;
  line-height: 1.78;
}

.prd-review-pane__reader :deep(.markdown-body h1) {
  color: #1d1d1f;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.035em;
}

.prd-review-pane__reader :deep(.markdown-body h2) {
  margin-top: 38px;
  border-bottom-color: rgb(0 0 0 / 8%);
  color: #1d1d1f;
  font-size: 21px;
  letter-spacing: -0.025em;
}

.prd-review-pane__reader :deep(.markdown-body h3) {
  color: #1d1d1f;
  font-size: 17px;
  letter-spacing: -0.015em;
}

.prd-review-pane__reader :deep(.markdown-body blockquote) {
  border-left-color: var(--app-color-primary);
  border-radius: 0 10px 10px 0;
  background: #f5f9ff;
  color: #515154;
}

.prd-review-pane__reader :deep(.markdown-body code) {
  border-radius: 6px;
  background: #f2f2f7;
  color: #9c2f2f;
}

.prd-review-pane__reader :deep(.markdown-body pre),
.prd-review-pane__reader :deep(.markdown-body .mermaid-diagram) {
  border-color: rgb(0 0 0 / 9%);
  border-radius: 12px;
  background: #f8f8fa;
}

.prd-review-pane__reader :deep(.markdown-body th) {
  background: #f5f5f7;
  color: #3a3a3c;
}

.prd-review-pane__reader :deep(.markdown-body img) {
  border-color: rgb(0 0 0 / 9%);
  border-radius: 12px;
  box-shadow: 0 4px 18px rgb(0 0 0 / 6%);
}

.prd-review-pane__reader :deep(.document-search-hit) {
  border-radius: 4px;
  background: #ffe58f;
}

.prd-review-pane__reader :deep(.docs-reader) {
  scrollbar-color: rgb(0 0 0 / 22%) transparent;
  scrollbar-width: thin;
}

.prd-review-pane__reader :deep(.docs-reader)::-webkit-scrollbar {
  width: 10px;
}

.prd-review-pane__reader :deep(.docs-reader)::-webkit-scrollbar-thumb {
  border: 3px solid transparent;
  border-radius: 999px;
  background: rgb(0 0 0 / 22%);
  background-clip: padding-box;
}

@media (max-width: 1100px) {
  .prd-review-pane {
    flex-basis: min(48%, 520px);
  }
}

@media (max-width: 760px) {
  .prd-review-pane,
  .prd-review-pane--overlay {
    inset: 8px;
    width: auto;
    height: auto;
    flex-basis: auto;
    border: 0.5px solid rgb(0 0 0 / 12%);
    border-radius: 16px;
    box-shadow: 0 18px 56px rgb(0 0 0 / 22%);
  }

  .prd-review-pane__header {
    min-height: 74px;
    padding: 12px;
  }

  .prd-review-pane__document-icon {
    width: 36px;
    height: 36px;
  }

  .prd-review-pane__toolbar {
    flex-wrap: wrap;
    padding: 7px 12px;
  }

  .prd-review-pane__searchbar {
    flex-wrap: wrap;
    padding: 8px 12px;
  }

  .prd-review-pane__document-select {
    flex: 1 0 100%;
  }

  .prd-review-pane__reader :deep(.docs-page--embedded .document-shell) {
    width: calc(100% - 16px);
    min-height: calc(100% - 16px);
    margin: 8px;
    padding: 24px 20px 54px;
    border-radius: 14px;
  }
}

@media (max-width: 480px) {
  .prd-review-pane__mode-group > span {
    display: none;
  }

  .prd-review-pane__window-action {
    padding: 0 8px;
  }

  .prd-review-pane__identity strong {
    max-width: 190px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .prd-review-pane *,
  .prd-review-pane :deep(*) {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
