<template>
  <main class="packages-page platform-page">
    <header class="packages-header tool-hero">
      <div class="tool-hero__main">
        <RouterLink to="/" class="packages-back back-link">
          <el-icon><ArrowLeft /></el-icon>
          返回首页
        </RouterLink>
        <div class="tool-title-row">
          <div class="tool-title-icon">
            <el-icon><FolderOpened /></el-icon>
          </div>
          <div class="tool-title-copy">
            <p class="eyebrow">PROJECT LIBRARY</p>
            <h1>项目包状态</h1>
            <p class="subtitle">管理本地项目资料、首页入口和项目能力；新增项目会从模板生成初始化包。</p>
          </div>
        </div>
      </div>
      <div class="packages-header__actions">
        <el-button v-if="canManageProjects" type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          新建项目
        </el-button>
        <el-button v-if="canManageProjects" @click="$router.push('/tools/project-routes')">
          路由菜单管理
        </el-button>
        <el-button :loading="loading" @click="loadPackages">
          <el-icon><Refresh /></el-icon>
          重新扫描
        </el-button>
      </div>
    </header>

    <div class="packages-feedback">
      <el-alert v-if="error" :title="error" type="error" :closable="false" />
      <el-alert v-if="notice" :title="notice" type="success" :closable="true" @close="notice = ''" />
    </div>

    <section class="packages-overview" aria-label="项目包概览">
      <div class="packages-overview__lead">
        <span class="overview-kicker">LOCAL PROJECT PACKAGES</span>
        <h2>项目资料总览</h2>
        <p>首页、客户端入口、文档和移动端内容都来自本地项目包。</p>
      </div>
      <div class="overview-metrics">
        <div class="overview-metric">
          <span>可用项目</span>
          <strong>{{ projects.length }}</strong>
          <small>已通过完整性检查</small>
        </div>
        <div class="overview-metric" :class="{ 'is-warning': invalidProjects.length }">
          <span>异常项目</span>
          <strong>{{ invalidProjects.length }}</strong>
          <small>{{ invalidProjects.length ? '需要处理后才能使用' : '当前没有异常' }}</small>
        </div>
        <div class="overview-metric">
          <span>当前权限</span>
          <strong>{{ canManageProjects ? '可管理' : '只读' }}</strong>
          <small>{{ canManageProjects ? '可编辑项目包配置' : '仅查看生产构建内容' }}</small>
        </div>
      </div>
    </section>

    <section class="packages-section">
      <div class="packages-section__heading">
        <div>
          <span class="section-kicker">PROJECT INDEX</span>
          <h2>项目清单</h2>
        </div>
        <span>{{ projects.length }} 个项目</span>
      </div>
      <el-table :data="projects" border empty-text="尚未发现有效项目包">
        <el-table-column prop="name" label="项目名称" min-width="180" />
        <el-table-column prop="id" label="项目 ID" min-width="160" />
        <el-table-column prop="version" label="版本" width="110" />
        <el-table-column label="客户端" min-width="220">
          <template #default="{ row }">{{
            row.clients.map((client) => client.name).join('、') || '-'
          }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default><el-tag type="success">可用</el-tag></template>
        </el-table-column>
        <el-table-column label="首页显示" width="110">
          <template #default="{ row }">
            <el-tag :type="row.homepage?.visible !== false ? 'success' : 'info'">
              {{ row.homepage?.visible !== false ? '显示' : '隐藏' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="canManageProjects" label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEditDialog(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section v-if="invalidProjects.length" class="packages-section">
      <div class="packages-section__heading">
        <h2>无效项目包</h2>
        <span>{{ invalidProjects.length }} 个</span>
      </div>
      <el-table :data="invalidProjects" border>
        <el-table-column prop="folder" label="文件夹" width="220" />
        <el-table-column label="问题">
          <template #default="{ row }">{{ row.errors.join('；') }}</template>
        </el-table-column>
      </el-table>
    </section>

    <ProjectConfigDialog
      v-model="dialogVisible"
      :mode="dialogMode"
      :project="editingProject"
      @saved="handleDialogSaved"
    />
  </main>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { ArrowLeft, Edit, FolderOpened, Plus, Refresh } from '@element-plus/icons-vue';
import { useRoute } from 'vue-router';

import ProjectConfigDialog from '../../components/ProjectConfigDialog.vue';
import { onProjectPackagesChanged } from '../../services/project-assets';

const projects = ref([]);
const invalidProjects = ref([]);
const loading = ref(false);
const error = ref('');
const notice = ref('');
const dialogVisible = ref(false);
const dialogMode = ref('create');
const editingProject = ref(null);
const canManageProjects = import.meta.env.DEV;
const route = useRoute();
let stopWatching = () => {};

async function loadPackages() {
  loading.value = true;
  error.value = '';
  try {
    const response = await fetch('/__projects/manifest', { cache: 'no-store' });
    if (!response.ok) throw new Error(`项目包扫描失败（${response.status}）`);
    const payload = await response.json();
    projects.value = payload.projects || [];
    invalidProjects.value = payload.invalidProjects || [];
  } catch (loadError) {
    error.value = loadError.message;
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  dialogMode.value = 'create';
  editingProject.value = null;
  dialogVisible.value = true;
}

function openEditDialog(project) {
  dialogMode.value = 'edit';
  editingProject.value = project;
  dialogVisible.value = true;
}

function handleDialogSaved({ message }) {
  notice.value = `${message} 开发服务正在重新载入项目配置。`;
}

onMounted(async () => {
  await loadPackages();
  const projectId = typeof route.query.project === 'string' ? route.query.project : '';
  if (canManageProjects && route.query.edit === '1' && projectId) {
    const project = projects.value.find((item) => item.id === projectId);
    if (project) openEditDialog(project);
  }
  stopWatching = onProjectPackagesChanged(loadPackages);
});
onBeforeUnmount(() => stopWatching());
</script>

<style scoped>
.packages-page {
  width: min(var(--platform-content-max), calc(100% - 64px));
  min-height: 100svh;
  margin: 0 auto;
  padding: 40px 0 64px;
}
.packages-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 28px;
}
.tool-hero__main {
  min-width: 0;
  flex: 1 1 auto;
}
.tool-title-row {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 14px;
}
.tool-title-copy {
  min-width: 0;
  flex: 1 1 auto;
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
.eyebrow {
  margin: 0 0 8px;
  color: var(--app-color-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
}
.packages-header h1 {
  margin: 0;
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.2;
}
.packages-header .subtitle {
  margin: 10px 0 0;
  color: var(--app-color-text-muted);
  font-size: 15px;
  line-height: 1.6;
}
.packages-header__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}
.packages-back {
  margin-bottom: 14px;
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
.packages-feedback {
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
}
.packages-feedback :deep(.el-alert) {
  border-radius: 12px;
}
.packages-overview {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
  padding: 24px 28px;
  border: 0.5px solid rgb(0 0 0 / 9%);
  border-radius: var(--platform-radius-surface);
  background: var(--platform-color-surface);
  box-shadow: var(--platform-shadow-surface);
}
.packages-overview__lead {
  display: flex;
  min-width: 230px;
  flex-direction: column;
  justify-content: center;
}
.overview-kicker,
.section-kicker {
  color: var(--app-color-text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.packages-overview h2 {
  margin: 8px 0 0;
  font-size: 22px;
  letter-spacing: -0.025em;
}
.packages-overview p {
  margin: 8px 0 0;
  color: var(--app-color-text-muted);
  font-size: 13px;
  line-height: 1.55;
}
.overview-metrics {
  display: grid;
  min-width: min(100%, 540px);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-left: 1px solid rgb(0 0 0 / 7%);
}
.overview-metric {
  display: grid;
  align-content: center;
  gap: 4px;
  padding: 0 22px;
  border-right: 1px solid rgb(0 0 0 / 7%);
}
.overview-metric:last-child {
  border-right: 0;
}
.overview-metric span,
.overview-metric small {
  color: var(--app-color-text-muted);
  font-size: 12px;
}
.overview-metric strong {
  color: var(--app-color-text-primary);
  font-size: 24px;
  letter-spacing: -0.035em;
}
.overview-metric.is-warning strong {
  color: var(--app-color-warning-text);
}
.packages-section {
  margin-top: 24px;
  padding: 24px;
  border: 0.5px solid rgb(0 0 0 / 10%);
  border-radius: var(--platform-radius-surface);
  background: var(--platform-color-surface);
  box-shadow: var(--platform-shadow-surface);
}
.packages-section__heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
}
.packages-section__heading > div {
  display: grid;
  gap: 5px;
}
.packages-section__heading .section-kicker {
  letter-spacing: 0.1em;
}
.packages-section__heading h2 {
  margin: 0;
  font-size: 20px;
  letter-spacing: -0.02em;
}
.packages-section__heading span {
  color: var(--app-color-text-muted);
  font-size: 12px;
}
.packages-section :deep(.el-table) {
  overflow: hidden;
  border-radius: 12px;
  --el-table-border-color: rgb(0 0 0 / 7%);
}
.packages-section :deep(.el-table .el-table__cell) {
  padding-top: 13px;
  padding-bottom: 13px;
}
.packages-section :deep(.el-table th.el-table__cell) {
  background: #f7f7fa;
  color: var(--app-color-text-secondary);
  font-weight: 600;
}
.packages-section :deep(.el-table tr:hover > td.el-table__cell) {
  background: #f2f2f7;
}
.packages-page :deep(.packages-header__actions .el-button),
.packages-page :deep(.packages-section .el-button:not(.is-link)) {
  min-height: 38px;
  border-radius: 10px;
  font-weight: 550;
}
@media (max-width: 1080px) {
  .packages-header {
    align-items: start;
    flex-wrap: wrap;
  }
  .packages-header__actions {
    width: 100%;
    justify-content: flex-start;
    padding-left: 60px;
  }
}
@media (max-width: 920px) {
  .packages-overview {
    flex-direction: column;
    padding: 20px;
  }
  .overview-metrics {
    min-width: 0;
    border-top: 1px solid rgb(0 0 0 / 7%);
    border-left: 0;
    padding-top: 16px;
  }
  .overview-metric {
    padding: 0 12px;
  }
}
@media (max-width: 760px) {
  .packages-page {
    width: calc(100% - 32px);
  }
  .packages-header {
    align-items: start;
    flex-direction: column;
    gap: 14px;
  }
  .packages-header__actions {
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
    padding-left: 0;
  }
  .packages-overview {
    flex-direction: column;
    padding: 20px;
  }
  .overview-metrics {
    min-width: 0;
    border-top: 1px solid rgb(0 0 0 / 7%);
    border-left: 0;
    padding-top: 16px;
  }
  .overview-metric {
    padding: 0 12px;
  }
}
</style>
