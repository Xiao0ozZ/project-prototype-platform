<template>
  <main class="transfer-page platform-page">
    <header class="transfer-header tool-hero">
      <div class="tool-hero__main">
        <RouterLink class="back-link" to="/">
          <el-icon><ArrowLeft /></el-icon>
          返回首页
        </RouterLink>
        <div class="tool-title-row">
          <div class="tool-title-icon">
            <el-icon><Upload /></el-icon>
          </div>
          <div>
            <p class="eyebrow">ENGINEERING TOOL</p>
            <h1>页面导入导出</h1>
            <p class="subtitle">把规范 HTML 接入工程，或把已登记页面整理为独立演示包。</p>
          </div>
        </div>
      </div>
      <div class="tool-hero__context">
        <span class="context-label">当前项目</span>
        <strong>{{ selectedProject?.name || '未选择项目' }}</strong>
        <span class="context-note">{{ isLocalRuntime ? '本机开发服务可用' : '需要在开发服务本机打开' }}</span>
      </div>
    </header>

    <div class="transfer-notices">
      <el-alert
        class="boundary-alert"
        title="导入支持规范 HTML 和本平台导出的可回导 HTML；导出演示区与可编辑源文件区分开。"
        type="info"
        :closable="false"
      />

      <el-alert
        v-if="!isLocalRuntime"
        class="boundary-alert"
        title="页面导入导出仅允许在运行开发服务的本机使用。"
        type="warning"
        :closable="false"
      />
    </div>

    <div class="transfer-mode-switch" role="tablist" aria-label="选择工具模式">
      <button
        type="button"
        class="transfer-mode-option"
        :class="{ 'is-active': activeTab === 'import' }"
        role="tab"
        :aria-selected="activeTab === 'import'"
        @click="activeTab = 'import'"
      >
        <span class="transfer-mode-option__icon"
          ><el-icon><Upload /></el-icon
        ></span>
        <span class="transfer-mode-option__copy">
          <strong>导入 HTML 原型</strong>
          <small>检查模板后登记到项目页面</small>
        </span>
        <el-icon class="transfer-mode-option__arrow"><ArrowLeft /></el-icon>
      </button>
      <button
        type="button"
        class="transfer-mode-option"
        :class="{ 'is-active': activeTab === 'export' }"
        role="tab"
        :aria-selected="activeTab === 'export'"
        @click="activeTab = 'export'"
      >
        <span class="transfer-mode-option__icon"
          ><el-icon><Download /></el-icon
        ></span>
        <span class="transfer-mode-option__copy">
          <strong>导出演示包</strong>
          <small>选择页面生成 HTML 或 ZIP</small>
        </span>
        <el-icon class="transfer-mode-option__arrow"><ArrowLeft /></el-icon>
      </button>
    </div>

    <el-tabs v-model="activeTab" class="transfer-tabs">
      <el-tab-pane label="导入 HTML 原型" name="import">
        <section class="tool-panel">
          <div class="panel-heading">
            <div>
              <h2>导入规范 HTML</h2>
              <p>上传由 templates/html-prototype-page.html 创建的页面，先检查再写入工程。</p>
            </div>
            <el-tag type="info">只支持 templateVersion 1</el-tag>
          </div>

          <div class="project-target-row">
            <span>目标项目</span>
            <el-select v-model="selectedProjectId" class="project-target-select">
              <el-option
                v-for="project in installedProjects"
                :key="project.id"
                :label="project.name"
                :value="project.id"
              />
            </el-select>
          </div>

          <div class="upload-row">
            <label class="file-picker">
              <input type="file" accept=".html,.htm" @change="handleFileChange" />
              <el-icon><Upload /></el-icon>
              <span>{{ sourceFile ? sourceFile.name : '选择 HTML 文件' }}</span>
            </label>
            <el-button
              type="primary"
              :disabled="!sourceHtml || inspectBusy"
              :loading="inspectBusy"
              @click="inspectSource"
            >
              检查模板
            </el-button>
          </div>

          <el-alert
            v-if="importError"
            class="result-alert"
            :title="importError"
            type="error"
            :closable="false"
          />

          <template v-if="inspection">
            <div class="inspection-summary" :class="{ 'is-invalid': !inspection.valid }">
              <div class="inspection-status">
                <el-icon><CircleCheck v-if="inspection.valid" /><CircleClose v-else /></el-icon>
                <strong>{{ inspection.valid ? '模板检查通过' : '模板检查未通过' }}</strong>
              </div>
              <div class="inspection-stats">
                <span>业务区块 {{ inspection.stats.blocks.length }}</span>
                <span>弹窗 {{ inspection.stats.dialogs }}</span>
                <span>抽屉 {{ inspection.stats.drawers }}</span>
                <span>页面逻辑 {{ inspection.stats.logicLength ? '已识别' : '缺失' }}</span>
              </div>
            </div>

            <div v-if="inspection.errors.length" class="message-list is-error">
              <div v-for="message in inspection.errors" :key="message">{{ message }}</div>
            </div>
            <div v-if="inspection.warnings.length" class="message-list is-warning">
              <div v-for="message in inspection.warnings" :key="message">{{ message }}</div>
            </div>

            <div v-if="inspection.valid" class="import-form">
              <div class="form-heading">
                <h3>确认工程登记信息</h3>
                <span>页面内容、弹窗、逻辑和模拟数据会按原型整体导入；替换页面时，原页面会自动备份。</span>
              </div>
              <el-form label-position="top" class="form-grid">
                <el-form-item label="导入方式" class="form-grid__wide">
                  <el-radio-group v-model="importMode">
                    <el-radio-button label="create">新增页面</el-radio-button>
                    <el-radio-button label="replace">替换页面</el-radio-button>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="客户端">
                  <el-select v-model="importForm.client" style="width: 100%">
                    <el-option
                      v-for="client in availableClients"
                      :key="client.id"
                      :label="client.name"
                      :value="client.id"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item v-if="importMode === 'replace'" label="选择原页面" class="form-grid__wide">
                  <el-select
                    v-model="replacePagePath"
                    style="width: 100%"
                    clearable
                    placeholder="选择需要被替换的现有页面"
                  >
                    <el-option
                      v-for="page in replaceCandidates"
                      :key="page.path"
                      :label="`${page.title}（${page.path}）`"
                      :value="page.path"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="路由片段">
                  <el-input v-model="importForm.routePath" placeholder="例如 vehicle-inspection" />
                </el-form-item>
                <el-form-item label="菜单分组">
                  <el-select v-model="importForm.menuSection" style="width: 100%">
                    <el-option
                      v-for="section in importSections"
                      :key="section.id"
                      :label="section.title"
                      :value="section.id"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="菜单名称">
                  <el-input v-model="importForm.menuTitle" placeholder="页面在菜单中显示的名称" />
                </el-form-item>
                <el-form-item label="菜单图标">
                  <el-select v-model="importForm.menuIcon" style="width: 100%">
                    <el-option v-for="icon in allowedIcons" :key="icon" :label="icon" :value="icon" />
                  </el-select>
                </el-form-item>
                <el-form-item label="HTML 文件名" class="form-grid__wide">
                  <el-input
                    v-model="importForm.fileName"
                    placeholder="默认保留上传文件名，例如 dashboard.html"
                    maxlength="160"
                    show-word-limit
                  />
                  <span class="field-hint">导出时将使用这个文件名；不填写扩展名会自动补上 .html。</span>
                </el-form-item>
              </el-form>
              <div class="manifest-preview">
                <span>原型页面</span><strong>{{ inspection.manifest.pageTitle }}</strong> <span>页面类型</span
                ><strong>{{ inspection.manifest.pageType || '未标记' }}</strong> <span>来源标识</span
                ><strong>{{ inspection.manifest.pageKey }}</strong>
              </div>
              <el-alert
                v-if="importMode === 'replace' && !replacePagePath"
                class="result-alert"
                title="请选择要替换的原页面。"
                type="warning"
                :closable="false"
              />
              <el-alert
                v-if="importRouteConflict"
                class="result-alert"
                :title="`路由 ${proposedImportPath} 已存在，请更换路由片段。`"
                type="error"
                :closable="false"
              />
              <div class="action-row">
                <el-button
                  type="primary"
                  :loading="importBusy"
                  :disabled="
                    importRouteConflict || !isLocalRuntime || (importMode === 'replace' && !replacePagePath)
                  "
                  @click="importSource"
                >
                  {{ importMode === 'replace' ? '替换并备份原页面' : '新增到工程' }}
                </el-button>
              </div>
            </div>
          </template>

          <el-result
            v-if="importResult"
            icon="success"
            :title="importResult.result.mode === 'replace' ? '页面已替换，原页面已备份' : '页面已导入工程'"
            sub-title="重新载入开发服务后，路由和菜单会显示最新页面。"
          >
            <template #extra>
              <div class="result-detail">
                <span>{{ importResult.result.routePath }}</span>
                <span>{{ importResult.result.view }}</span>
                <span v-if="importResult.result.backupId"
                  >原页面备份：{{ importResult.result.backupId }}</span
                >
              </div>
              <el-button type="primary" @click="reloadProject">重新载入工程</el-button>
            </template>
          </el-result>
        </section>
      </el-tab-pane>

      <el-tab-pane label="导出演示包" name="export">
        <section class="tool-panel">
          <div class="panel-heading">
            <div>
              <h2>导出独立演示包</h2>
              <p>选择页面后生成独立运行包，并保留可回导的 Vue 页面源文件区。</p>
            </div>
            <div class="panel-heading-tags">
              <el-tag type="success">无需客户安装 Node</el-tag>
              <el-tag type="warning">打开时需要网络</el-tag>
              <el-tag type="info">支持回导</el-tag>
            </div>
          </div>

          <div class="project-target-row">
            <span>导出项目</span>
            <el-select v-model="selectedProjectId" class="project-target-select">
              <el-option
                v-for="project in installedProjects"
                :key="project.id"
                :label="project.name"
                :value="project.id"
              />
            </el-select>
          </div>

          <div class="export-toolbar">
            <el-radio-group v-model="exportClient" size="small">
              <el-radio-button label="all">全部客户端</el-radio-button>
              <el-radio-button v-for="client in availableClients" :key="client.id" :label="client.id">
                {{ client.name }}
              </el-radio-button>
            </el-radio-group>
            <el-input
              v-model="exportSearch"
              class="export-search"
              clearable
              placeholder="搜索页面名称或路由"
            />
            <div class="export-toolbar-actions">
              <span>已选 {{ selectedPaths.length }} 个页面</span>
              <el-button link type="primary" @click="selectVisiblePages">全选当前列表</el-button>
              <el-button link @click="selectedPaths = []">清空</el-button>
            </div>
          </div>

          <div class="page-selection-list">
            <div v-for="group in exportGroups" :key="group.client" class="page-group">
              <div class="page-group-heading">
                <strong>{{ group.clientName }}</strong>
                <span>{{ group.pages.length }} 个页面</span>
              </div>
              <label v-for="page in group.pages" :key="page.fullPath" class="page-option">
                <input v-model="selectedPaths" type="checkbox" :value="page.fullPath" />
                <span class="page-option-copy">
                  <strong>{{ page.title }}</strong>
                  <small>{{ page.fullPath }}</small>
                </span>
              </label>
            </div>
          </div>

          <div class="export-submit-row">
            <el-input
              v-model="packageName"
              class="package-name"
              placeholder="多页 ZIP 文件夹名称（单页按页面名导出）"
            />
            <el-button
              type="primary"
              :loading="exportBusy"
              :disabled="!selectedPaths.length || !isLocalRuntime"
              @click="exportPages"
            >
              <el-icon><Download /></el-icon>
              {{ exportActionLabel }}
            </el-button>
          </div>

          <p v-if="exportBusy" class="export-progress">正在编译页面并整理页面专属样式与脚本...</p>

          <el-alert
            v-if="exportError"
            class="result-alert"
            :title="exportError"
            type="error"
            :closable="false"
          />
          <el-result
            v-if="exportResult"
            icon="success"
            :title="exportResultTitle"
            :sub-title="exportResultSubtitle"
          >
            <template #extra>
              <div class="export-result-actions">
                <el-button type="primary" tag="a" :href="exportResult.result.preview" target="_blank">
                  预览导出页面
                </el-button>
                <el-button
                  v-if="exportResult.result.mode === 'single'"
                  tag="a"
                  :href="downloadUrl(exportResult.result.html)"
                >
                  下载 HTML
                </el-button>
                <el-button v-else tag="a" :href="downloadUrl(exportResult.result.zip)">下载 ZIP</el-button>
              </div>
            </template>
          </el-result>
        </section>
      </el-tab-pane>
    </el-tabs>
  </main>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { ArrowLeft, CircleCheck, CircleClose, Download, Upload } from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus';
import { useRoute } from 'vue-router';

import { getProject, installedProjects } from '../../config/project-packages';

const route = useRoute();
const activeTab = ref('import');
const routeProjectId = typeof route.query.project === 'string' ? route.query.project : '';
const selectedProjectId = ref(getProject(routeProjectId)?.id || installedProjects[0]?.id || '');
const sourceFile = ref(null);
const sourceHtml = ref('');
const inspection = ref(null);
const inspectBusy = ref(false);
const importBusy = ref(false);
const importError = ref('');
const importResult = ref(null);
const importMode = ref('create');
const replacePagePath = ref('');
const importForm = reactive({
  client: 'operation',
  routePath: '',
  menuSection: '',
  menuTitle: '',
  menuIcon: 'Document',
  fileName: '',
});
const allowedIcons = [
  'Calendar',
  'CirclePlus',
  'DataBoard',
  'Document',
  'Files',
  'House',
  'List',
  'Location',
  'Lock',
  'Management',
  'Medal',
  'Money',
  'Odometer',
  'Postcard',
  'Setting',
  'Tickets',
  'User',
  'Van',
  'Warning',
];

const exportClient = ref('all');
const exportSearch = ref('');
const selectedPaths = ref([]);
const packageName = ref('页面演示包');
const exportBusy = ref(false);
const exportError = ref('');
const exportResult = ref(null);
const isLocalRuntime = computed(() => ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname));

const selectedProject = computed(() => getProject(selectedProjectId.value));
const availableClients = computed(() => selectedProject.value?.clients || []);
const activeClient = computed(() => availableClients.value.find((client) => client.id === importForm.client));
const importSections = computed(() => activeClient.value?.definition.sections || []);
const replaceCandidates = computed(() => activeClient.value?.definition.pages || []);
const selectedReplacement = computed(
  () => replaceCandidates.value.find((page) => page.path === replacePagePath.value) || null,
);

const exportGroups = computed(() => {
  const clients =
    exportClient.value === 'all'
      ? availableClients.value
      : availableClients.value.filter((client) => client.id === exportClient.value);
  const keyword = exportSearch.value.trim().toLowerCase();
  return clients
    .map((client) => {
      const definition = client.definition;
      return {
        client: client.id,
        clientName: client.name,
        pages: definition.pages
          .filter((page) => page.menu !== false && page.sourceType !== 'html-direct')
          .map((page) => ({
            ...page,
            fullPath: `/p/${selectedProjectId.value}/${client.id}/${page.path}`,
          }))
          .filter((page) => !keyword || `${page.title} ${page.fullPath}`.toLowerCase().includes(keyword)),
      };
    })
    .filter((group) => group.pages.length > 0);
});

const proposedImportPath = computed(() => {
  const routePath = importForm.routePath.trim().replace(/^\/+|\/+$/g, '');
  return routePath ? `/p/${selectedProjectId.value}/${importForm.client}/${routePath}` : '';
});
const importRouteConflict = computed(() =>
  Boolean(
    activeClient.value?.definition.pages.some(
      (page) =>
        page.path !== selectedReplacement.value?.path &&
        `/p/${selectedProjectId.value}/${importForm.client}/${page.path}` === proposedImportPath.value,
    ),
  ),
);
const exportActionLabel = computed(() =>
  selectedPaths.value.length === 1 ? '导出单页 HTML' : '生成多页 ZIP',
);
const exportResultTitle = computed(() =>
  exportResult.value?.result?.mode === 'single' ? '单页 HTML 已生成' : '多页演示包已生成',
);
const exportResultSubtitle = computed(() =>
  exportResult.value?.result?.mode === 'single'
    ? '已生成一个可直接打开且可重新上传导入的 HTML 文件，公共依赖通过 CDN 加载。'
    : '已生成仅包含所选页面的 ZIP，每个 HTML 均可打开、互相跳转并保留回导源文件。公共依赖通过 CDN 加载。',
);

watch(
  selectedProjectId,
  () => {
    const firstClient = availableClients.value[0];
    importForm.client = firstClient?.id || '';
    exportClient.value = 'all';
    selectedPaths.value = [];
    exportResult.value = null;
  },
  { immediate: true },
);

watch(
  () => importForm.client,
  () => {
    if (!importSections.value.some((section) => section.id === importForm.menuSection)) {
      importForm.menuSection = importSections.value[0]?.id || '';
    }
    if (
      replacePagePath.value &&
      !replaceCandidates.value.some((page) => page.path === replacePagePath.value)
    ) {
      replacePagePath.value = '';
    }
  },
  { immediate: true },
);

watch(replacePagePath, (pagePath) => {
  if (importMode.value !== 'replace') return;
  const page = replaceCandidates.value.find((item) => item.path === pagePath);
  if (!page) return;
  importForm.routePath = page.path;
  importForm.menuSection = page.section || importSections.value[0]?.id || '';
  importForm.menuTitle = page.title || '';
  importForm.menuIcon = page.icon || 'Document';
  if (!importForm.fileName.trim() || importForm.fileName === sourceFile.value?.name) {
    importForm.fileName =
      page.prototype?.fileName ||
      page.prototype?.htmlFileName ||
      page.prototype?.sourceFile ||
      (page.title ? `${page.title}.html` : `${page.path}.html`);
  }
});

watch(importMode, (mode) => {
  if (mode === 'create') replacePagePath.value = '';
});

async function handleFileChange(event) {
  const [file] = event.target.files || [];
  if (!file) return;
  sourceFile.value = file;
  sourceHtml.value = await file.text();
  importForm.fileName = file.name;
  inspection.value = null;
  importResult.value = null;
  importError.value = '';
  await inspectSource();
}

async function inspectSource() {
  if (!sourceHtml.value) return;
  inspectBusy.value = true;
  importError.value = '';
  importResult.value = null;
  try {
    const response = await fetch('/__page-transfer/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: sourceHtml.value }),
    });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '模板检查失败。');
    inspection.value = payload;
    if (payload.manifest) {
      const manifest = payload.manifest;
      importForm.client = availableClients.value.some((client) => client.id === manifest.client)
        ? manifest.client
        : availableClients.value[0]?.id || '';
      importForm.routePath =
        String(manifest.routePath || '')
          .split('/')
          .filter(Boolean)
          .at(-1) || '';
      importForm.menuSection = importSections.value.some((section) => section.id === manifest.menuSection)
        ? manifest.menuSection
        : importSections.value[0]?.id || '';
      importForm.menuTitle = manifest.menuTitle || manifest.pageTitle || '';
      importForm.menuIcon = manifest.menuIcon || 'Document';
      if (!importForm.fileName.trim()) {
        importForm.fileName = manifest.fileName || sourceFile.value?.name || '';
      }
    }
  } catch (error) {
    importError.value = error.message;
    inspection.value = null;
  } finally {
    inspectBusy.value = false;
  }
}

async function importSource() {
  if (!importForm.fileName.trim()) {
    importError.value = '请填写 HTML 文件名。';
    return;
  }
  if (importMode.value === 'replace' && !replacePagePath.value) {
    importError.value = '请选择要替换的原页面。';
    return;
  }
  if (importRouteConflict.value) {
    importError.value = `路由 ${proposedImportPath.value} 已存在，请更换路由片段。`;
    return;
  }
  try {
    await ElMessageBox.confirm(
      importMode.value === 'replace'
        ? `确认替换 ${selectedReplacement.value?.title || replacePagePath.value}？原页面会备份后再写入。`
        : `确认将页面写入 ${proposedImportPath.value} 并登记到菜单吗？`,
      importMode.value === 'replace' ? '确认替换页面' : '确认新增页面',
      {
        confirmButtonText: importMode.value === 'replace' ? '确认替换' : '确认导入',
        cancelButtonText: '取消',
        type: 'warning',
        customClass: 'apple-confirm-dialog',
        modalClass: 'apple-tool-overlay',
      },
    );
  } catch {
    return;
  }
  importBusy.value = true;
  importError.value = '';
  try {
    const response = await fetch('/__page-transfer/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: sourceHtml.value,
        target: {
          ...importForm,
          mode: importMode.value,
          replacePagePath: replacePagePath.value,
          projectId: selectedProjectId.value,
          sourceFile: sourceFile.value?.name || null,
          fileName: importForm.fileName.trim(),
        },
      }),
    });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '导入失败。');
    importResult.value = payload;
  } catch (error) {
    importError.value = error.message;
  } finally {
    importBusy.value = false;
  }
}

function selectVisiblePages() {
  const visible = exportGroups.value.flatMap((group) => group.pages.map((page) => page.fullPath));
  selectedPaths.value = [...new Set([...selectedPaths.value, ...visible])];
}

async function exportPages() {
  exportBusy.value = true;
  exportError.value = '';
  exportResult.value = null;
  try {
    const response = await fetch('/__page-transfer/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: selectedProjectId.value,
        selectedPaths: selectedPaths.value,
        packageName: packageName.value,
      }),
    });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '导出失败。');
    exportResult.value = payload;
  } catch (error) {
    exportError.value = error.message;
  } finally {
    exportBusy.value = false;
  }
}

function downloadUrl(url) {
  if (!url) return '#';
  return `/__page-transfer/download?path=${encodeURIComponent(url.replace(/^\//, ''))}`;
}

function reloadProject() {
  window.location.reload();
}
</script>

<style scoped>
.transfer-page {
  width: min(var(--platform-content-max), calc(100% - 64px));
  min-height: 100svh;
  margin: 0 auto;
  padding: 40px 0 64px;
  color: var(--app-color-text-primary);
}
.transfer-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 28px;
}
.tool-hero__main {
  min-width: 0;
}
.tool-title-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.tool-title-icon {
  display: inline-flex;
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--app-color-primary) 11%, white);
  color: var(--app-color-primary);
  font-size: 22px;
}
.tool-hero__context {
  display: grid;
  min-width: 190px;
  gap: 5px;
  padding: 14px 16px;
  border: 0.5px solid rgb(0 0 0 / 8%);
  border-radius: 16px;
  background: rgb(255 255 255 / 82%);
  box-shadow: var(--platform-shadow-surface);
  backdrop-filter: blur(18px) saturate(145%);
}
.context-label,
.context-note {
  color: var(--app-color-text-muted);
  font-size: 12px;
}
.tool-hero__context strong {
  overflow: hidden;
  color: var(--app-color-text-primary);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  width: fit-content;
  padding: 6px 0;
  color: var(--app-color-text-secondary);
  font-size: 13px;
  transition: color 160ms ease;
}
.back-link:hover {
  color: var(--app-color-primary);
}
.eyebrow {
  margin: 0 0 8px;
  color: var(--app-color-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
}
.transfer-header h1 {
  margin: 0;
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.2;
}
.subtitle {
  margin: 10px 0 0;
  color: var(--app-color-text-muted);
  font-size: 15px;
  line-height: 1.6;
}
.boundary-alert {
  margin-bottom: 14px;
  border-radius: 12px;
}
.transfer-notices {
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
}
.transfer-notices .boundary-alert {
  margin-bottom: 0;
}
.transfer-mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}
.transfer-mode-option {
  display: flex;
  min-width: 0;
  min-height: 84px;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 0.5px solid rgb(0 0 0 / 10%);
  border-radius: var(--platform-radius-surface);
  background: var(--platform-color-surface);
  color: var(--app-color-text-primary);
  text-align: left;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}
.transfer-mode-option:hover {
  border-color: rgb(var(--app-color-primary-rgb) / 28%);
  box-shadow: 0 8px 24px rgb(0 0 0 / 6%);
  transform: translateY(-1px);
}
.transfer-mode-option:focus-visible {
  outline: 3px solid rgb(var(--app-color-primary-rgb) / 22%);
  outline-offset: 2px;
}
.transfer-mode-option.is-active {
  border-color: rgb(var(--app-color-primary-rgb) / 34%);
  background: color-mix(in srgb, var(--app-color-primary) 9%, white);
  box-shadow: 0 8px 24px rgb(0 113 227 / 8%);
}
.transfer-mode-option__icon {
  display: inline-flex;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: #f2f2f7;
  color: var(--app-color-primary);
  font-size: 18px;
}
.transfer-mode-option.is-active .transfer-mode-option__icon {
  background: #d7e9ff;
}
.transfer-mode-option__copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}
.transfer-mode-option__copy strong {
  font-size: 14px;
  font-weight: 650;
}
.transfer-mode-option__copy small {
  overflow: hidden;
  color: var(--app-color-text-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.transfer-mode-option__arrow {
  margin-left: auto;
  color: var(--app-color-text-muted);
  transform: rotate(180deg);
}
.transfer-tabs :deep(.el-tabs__header) {
  display: none;
}
.transfer-tabs :deep(.el-tabs__item) {
  height: 42px;
  color: var(--app-color-text-muted);
  font-size: 14px;
}
.transfer-tabs :deep(.el-tabs__item.is-active) {
  color: var(--app-color-primary);
  font-weight: 600;
}
.transfer-tabs :deep(.el-tabs__content) {
  overflow: visible;
}
.tool-panel {
  padding: 28px;
  border: 0.5px solid rgb(0 0 0 / 10%);
  border-radius: var(--platform-radius-surface);
  background: var(--platform-color-surface);
  box-shadow: var(--platform-shadow-surface);
}
.panel-heading,
.export-toolbar,
.export-submit-row,
.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.panel-heading {
  margin-bottom: 24px;
}
.panel-heading-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
.panel-heading h2 {
  margin: 0;
  font-size: 20px;
  letter-spacing: -0.02em;
}
.panel-heading p {
  margin: 8px 0 0;
  color: var(--app-color-text-muted);
  font-size: 14px;
  line-height: 1.55;
}
.project-target-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f5f5f7;
  color: var(--app-color-text-secondary);
  font-size: 13px;
}
.project-target-select {
  width: 260px;
  margin-left: auto;
}
.upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}
.file-picker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 300px;
  height: 44px;
  flex: 1;
  padding: 0 14px;
  border: 1px dashed var(--app-color-border);
  border-radius: 10px;
  color: var(--app-color-text-secondary);
  font-size: 13px;
  cursor: pointer;
}
.file-picker:hover {
  border-color: var(--app-color-primary);
  color: var(--app-color-primary);
}
.file-picker input {
  display: none;
}
.result-alert {
  margin: 14px 0;
}
.inspection-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 16px;
  border: 1px solid #b8e1c4;
  border-radius: 10px;
  color: #166534;
  background: #f0fdf4;
}
.inspection-summary.is-invalid {
  border-color: #fecaca;
  color: #991b1b;
  background: #fef2f2;
}
.inspection-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.inspection-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  color: var(--app-color-text-muted);
  font-size: 12px;
}
.message-list {
  display: grid;
  gap: 4px;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
}
.message-list.is-error {
  color: #991b1b;
  background: #fef2f2;
}
.message-list.is-warning {
  color: #92400e;
  background: #fffbeb;
}
.import-form {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--app-color-border-light);
}
.form-heading {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
}
.form-heading h3 {
  margin: 0;
  font-size: 16px;
}
.form-heading span {
  color: var(--app-color-text-muted);
  font-size: 12px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 20px;
}
.form-grid__wide {
  grid-column: 1 / -1;
}
.field-hint {
  display: block;
  margin-top: 6px;
  color: var(--app-color-text-muted);
  font-size: 12px;
  line-height: 1.5;
}
.manifest-preview {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr) 80px minmax(0, 1fr) 80px minmax(0, 1fr);
  gap: 8px 12px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--app-color-surface-muted);
  font-size: 12px;
}
.manifest-preview span {
  color: var(--app-color-text-muted);
}
.manifest-preview strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.action-row {
  justify-content: flex-end;
  margin-top: 18px;
}
.result-detail {
  display: grid;
  gap: 4px;
  margin-bottom: 14px;
  color: var(--app-color-text-muted);
  font-size: 12px;
}
.export-toolbar {
  padding: 14px;
  border: 0;
  border-radius: 12px;
  background: #f5f5f7;
}
.export-search {
  width: min(300px, 100%);
}
.export-toolbar-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--app-color-text-muted);
  font-size: 12px;
}
.page-selection-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  max-height: 520px;
  padding: 20px 0;
  overflow-y: auto;
}
.page-group {
  min-width: 0;
  border: 1px solid var(--app-color-border-light);
  border-radius: 12px;
  overflow: hidden;
}
.page-group-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: #f7f7fa;
  font-size: 13px;
}
.page-group-heading span {
  color: var(--app-color-text-muted);
  font-size: 12px;
}
.page-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 14px;
  border-top: 1px solid var(--app-color-border-subtle);
  cursor: pointer;
}
.page-option:hover {
  background: #f2f2f7;
}
.page-option input {
  margin-top: 3px;
  accent-color: var(--app-color-primary);
}
.page-option-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.page-option-copy strong {
  font-size: 13px;
  font-weight: 600;
}
.page-option-copy small {
  overflow: hidden;
  color: var(--app-color-text-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.export-submit-row {
  justify-content: flex-end;
  padding-top: 18px;
  border-top: 1px solid var(--app-color-border-light);
}
.transfer-page :deep(.el-button:not(.is-link)) {
  min-height: 38px;
  border-radius: 10px;
  font-weight: 550;
}
.transfer-page :deep(.upload-row .el-button) {
  min-height: 44px;
}
.transfer-page :deep(.el-input__wrapper),
.transfer-page :deep(.el-select__wrapper) {
  min-height: 40px;
  border-radius: 10px;
}
.package-name {
  width: 260px;
}
.export-progress {
  margin: 12px 0 0;
  color: var(--app-color-text-muted);
  font-size: 12px;
  text-align: right;
}
.export-result-actions {
  display: flex;
  gap: 10px;
}
@media (max-width: 800px) {
  .transfer-page {
    width: calc(100% - 32px);
    padding-top: 28px;
  }
  .transfer-header {
    align-items: stretch;
    flex-direction: column;
    gap: 18px;
  }
  .tool-hero__context {
    width: 100%;
  }
  .transfer-mode-switch {
    grid-template-columns: 1fr;
  }
  .tool-panel {
    padding: 18px;
  }
  .project-target-row,
  .upload-row {
    align-items: stretch;
    flex-direction: column;
  }
  .project-target-select {
    width: 100%;
    margin-left: 0;
  }
  .panel-heading,
  .export-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
  .page-selection-list {
    grid-template-columns: 1fr;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .manifest-preview {
    grid-template-columns: 70px minmax(0, 1fr);
  }
  .manifest-preview strong {
    margin-bottom: 5px;
  }
  .export-submit-row {
    align-items: stretch;
    flex-direction: column;
  }
  .package-name {
    width: 100%;
  }
}
</style>
