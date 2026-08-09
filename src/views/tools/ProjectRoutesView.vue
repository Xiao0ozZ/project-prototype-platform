<template>
  <main class="routes-page platform-page">
    <header class="routes-header tool-hero platform-hero">
      <div class="tool-hero__main">
        <RouterLink to="/tools/projects" class="back-link">
          <el-icon><ArrowLeft /></el-icon>
          返回项目包状态
        </RouterLink>
        <div class="tool-title-row">
          <div class="tool-title-icon">
            <el-icon><Menu /></el-icon>
          </div>
          <div class="tool-title-copy">
            <p class="eyebrow">PROJECT ROUTES</p>
            <h1>路由菜单管理</h1>
            <p class="subtitle">管理每个项目客户端的页面路由和菜单登记；删除或替换前会保留可恢复备份。</p>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-select v-model="selectedProjectId" class="project-select" placeholder="选择项目">
          <el-option
            v-for="project in installedProjects"
            :key="project.id"
            :label="project.name"
            :value="project.id"
          />
        </el-select>
        <el-button :loading="loading" @click="loadRoutes">
          <el-icon><Refresh /></el-icon>
          重新读取
        </el-button>
      </div>
    </header>

    <el-alert
      title="路由新增会同时生成一个可运行的占位页面；页面内容可继续通过“页面导入导出”中的替换页面功能更新。"
      type="info"
      :closable="false"
      class="routes-alert"
    />
    <el-alert v-if="error" :title="error" type="error" :closable="false" class="routes-alert" />

    <section v-if="routeData" class="routes-overview platform-surface" aria-label="路由工作区概览">
      <div class="routes-overview__lead">
        <span class="overview-kicker">ROUTE WORKSPACE</span>
        <h2>{{ routeData.project.name }}</h2>
        <p>{{ routeData.project.id }} · {{ routeData.project.version || '未设置版本' }}</p>
      </div>
      <div class="overview-metrics">
        <div class="overview-metric">
          <span>客户端</span>
          <strong>{{ routeData.clients.length }}</strong>
          <small>已登记入口</small>
        </div>
        <div class="overview-metric">
          <span>页面路由</span>
          <strong>{{ routeData.clients.reduce((total, client) => total + client.pages.length, 0) }}</strong>
          <small>当前项目总数</small>
        </div>
        <div class="overview-metric">
          <span>可恢复备份</span>
          <strong>{{ (routeData.backups?.length || 0) + (routeData.sectionBackups?.length || 0) }}</strong>
          <small>页面与分组修改记录</small>
        </div>
      </div>
    </section>

    <section v-if="routeData" class="routes-panel platform-surface">
      <div class="panel-heading">
        <div>
          <span class="section-kicker">CLIENT ROUTES</span>
          <h2>客户端路由</h2>
          <p>按客户端查看页面登记，新增路由会同时生成可运行的占位页面。</p>
        </div>
        <el-tag type="info">{{ routeData.clients.length }} 个客户端</el-tag>
      </div>

      <el-tabs v-model="activeClientId" class="client-tabs">
        <el-tab-pane
          v-for="client in routeData.clients"
          :key="client.id"
          :label="client.name"
          :name="client.id"
        >
          <div class="client-toolbar">
            <div class="client-summary">
              <strong>{{ client.name }}</strong>
              <span>{{ client.basePath }} · {{ client.pages.length }} 个路由</span>
            </div>
            <div class="client-actions">
              <el-button @click="openSectionManager(client)">
                <el-icon><Edit /></el-icon>
                编辑分组
              </el-button>
              <el-button
                :type="isRouteOrderDirty(client) ? 'primary' : 'default'"
                :loading="orderSavingClientId === client.id"
                :disabled="!isRouteOrderDirty(client)"
                @click="saveRouteOrder(client)"
              >
                <el-icon><Menu /></el-icon>
                保存菜单顺序
              </el-button>
              <el-button type="primary" @click="openCreateRoute(client)">
                <el-icon><Plus /></el-icon>
                新增路由
              </el-button>
            </div>
          </div>

          <div class="route-order-hint">
            <span><b>01</b> 分组顺序对应客户端菜单顺序</span>
            <span><b>01</b> 组内序号对应分组内菜单顺序</span>
            <span>调整后点击“保存菜单顺序”</span>
          </div>

          <div v-if="routeGroups(client).length" class="route-groups">
            <article
              v-for="(group, groupIndex) in routeGroups(client)"
              :key="`${client.id}-${group.id}`"
              class="route-group-card"
              :class="{ 'is-collapsed': isGroupCollapsed(client, group) }"
            >
              <header class="route-group-header">
                <button
                  type="button"
                  class="route-group-toggle"
                  :aria-expanded="!isGroupCollapsed(client, group)"
                  :aria-label="`${isGroupCollapsed(client, group) ? '展开' : '收起'}${group.title}`"
                  @click="toggleGroup(client, group)"
                >
                  <span class="route-group-heading">
                    <span class="route-order-badge">{{ formatOrder(groupIndex) }}</span>
                    <span class="route-group-heading__copy">
                      <span class="route-group-title-line">
                        <strong>{{ group.title }}</strong>
                        <el-tag size="small" type="info">{{ group.pages.length }} 个路由</el-tag>
                      </span>
                      <span v-if="group.isUngrouped" class="route-group-note"
                        >这些页面当前没有匹配到已登记的菜单分组</span
                      >
                      <span v-else class="route-group-note">{{ group.id }}</span>
                    </span>
                  </span>
                  <el-icon
                    class="route-group-toggle__icon"
                    :class="{ 'is-expanded': !isGroupCollapsed(client, group) }"
                    aria-hidden="true"
                  >
                    <ArrowRight />
                  </el-icon>
                </button>
                <div
                  v-if="!group.isUngrouped"
                  class="order-button-group"
                  aria-label="调整分组顺序"
                  @click.stop
                >
                  <el-button
                    circle
                    text
                    size="small"
                    :disabled="group.sectionIndex === 0"
                    title="上移分组"
                    @click="moveSection(client, group.sectionIndex, -1)"
                  >
                    <el-icon><ArrowUp /></el-icon>
                  </el-button>
                  <el-button
                    circle
                    text
                    size="small"
                    :disabled="group.sectionIndex === client.sections.length - 1"
                    title="下移分组"
                    @click="moveSection(client, group.sectionIndex, 1)"
                  >
                    <el-icon><ArrowDown /></el-icon>
                  </el-button>
                </div>
              </header>

              <div v-if="!isGroupCollapsed(client, group)" class="route-group-content">
                <el-table
                  :data="group.pages"
                  row-key="name"
                  border
                  size="small"
                  class="group-route-table"
                  empty-text="当前分组暂无路由"
                >
                  <el-table-column label="顺序" width="54" align="center">
                    <template #default="{ $index }">
                      <span class="route-order-badge route-order-badge--small">{{
                        formatOrder($index)
                      }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="菜单名称">
                    <template #default="{ row }">
                      <div class="route-table-title">
                        <strong>{{ row.title }}</strong>
                        <el-tag
                          size="small"
                          :type="
                            row.source === 'html-direct' || row.source === 'html-template'
                              ? 'success'
                              : 'info'
                          "
                        >
                          {{
                            row.source === 'html-direct'
                              ? 'HTML 直读'
                              : row.source === 'html-template'
                                ? 'HTML 导入'
                                : '工程页面'
                          }}
                        </el-tag>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="路由">
                    <template #default="{ row }">
                      <code class="route-table-path">{{ client.basePath }}/{{ row.path }}</code>
                    </template>
                  </el-table-column>
                  <el-table-column label="页面信息">
                    <template #default="{ row }">
                      <div class="route-table-info">
                        <span class="route-table-source" :title="row.view || row.source">
                          {{ row.view || row.source || '未记录页面来源' }}
                        </span>
                        <div v-if="pagePrdLinkFor(client.id, row.name)" class="route-table-prd">
                          <el-tag size="small" type="success">PRD 已关联</el-tag>
                          <span :title="pagePrdLinkFor(client.id, row.name)">
                            {{ pagePrdLinkTitle(pagePrdLinkFor(client.id, row.name)) }}
                          </span>
                        </div>
                        <el-tag v-else size="small" type="info">PRD 未关联</el-tag>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" align="right">
                    <template #default="{ row, $index }">
                      <div class="route-table-actions">
                        <div class="order-button-group" aria-label="调整路由顺序">
                          <el-button
                            circle
                            text
                            size="small"
                            :disabled="group.isUngrouped || $index === 0"
                            title="上移路由"
                            @click="movePage(client, group.id, $index, -1)"
                          >
                            <el-icon><ArrowUp /></el-icon>
                          </el-button>
                          <el-button
                            circle
                            text
                            size="small"
                            :disabled="group.isUngrouped || $index === group.pages.length - 1"
                            title="下移路由"
                            @click="movePage(client, group.id, $index, 1)"
                          >
                            <el-icon><ArrowDown /></el-icon>
                          </el-button>
                        </div>
                        <el-button
                          v-if="row.source !== 'html-direct'"
                          link
                          size="small"
                          type="primary"
                          @click="openEditRoute(client, row)"
                        >
                          编辑
                        </el-button>
                        <el-button
                          link
                          size="small"
                          type="primary"
                          :disabled="!canEditPagePrd"
                          :title="canEditPagePrd ? '配置整页 PRD 文件' : '生产构建只能查看页面关联'"
                          @click="openPagePrdLink(client, row)"
                        >
                          {{ pagePrdLinkFor(client.id, row.name) ? '编辑 PRD' : '关联 PRD' }}
                        </el-button>
                        <el-button
                          v-if="row.source !== 'html-direct'"
                          link
                          size="small"
                          type="danger"
                          @click="deleteRoute(client, row)"
                        >
                          删除
                        </el-button>
                        <span v-if="row.source === 'html-direct'" class="route-source-note"
                          >HTML 目录管理</span
                        >
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </article>
          </div>
          <el-empty v-else description="当前客户端暂无页面路由" :image-size="88" />
        </el-tab-pane>
      </el-tabs>
    </section>

    <section class="routes-panel backup-panel platform-surface">
      <div class="panel-heading">
        <div>
          <h2>页面备份</h2>
          <p>删除路由和替换导入都会产生备份；还原后备份仍会保留记录。</p>
        </div>
        <el-tag type="warning">{{ routeData?.backups?.length || 0 }} 条</el-tag>
      </div>
      <el-table :data="routeData?.backups || []" border empty-text="暂无页面备份">
        <el-table-column label="处理类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.type === 'deleted' ? 'danger' : 'warning'">
              {{ row.type === 'deleted' ? '删除备份' : row.type === 'edited' ? '编辑备份' : '替换备份' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="原页面" min-width="240">
          <template #default="{ row }">
            <strong>{{ row.original?.title || '-' }}</strong>
            <small>{{ row.client }}/{{ row.original?.path }}</small>
          </template>
        </el-table-column>
        <el-table-column label="备份时间" width="190">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.restoredAt" type="success">已还原</el-tag>
            <el-tag v-else type="info">待还原</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :disabled="Boolean(row.restoredAt)" @click="restoreBackup(row)">
              还原
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="routes-panel backup-panel platform-surface">
      <div class="panel-heading">
        <div>
          <h2>分组备份</h2>
          <p>修改菜单分组名称前会保留备份；还原后备份仍会保留记录。</p>
        </div>
        <el-tag type="warning">{{ routeData?.sectionBackups?.length || 0 }} 条</el-tag>
      </div>
      <el-table :data="routeData?.sectionBackups || []" border empty-text="暂无菜单分组备份">
        <el-table-column label="客户端" width="130">
          <template #default="{ row }">{{ row.client }}</template>
        </el-table-column>
        <el-table-column label="分组变更" min-width="300">
          <template #default="{ row }">
            <div v-for="section in row.replacement || []" :key="section.id" class="backup-section-row">
              <span>{{ row.original?.find((item) => item.id === section.id)?.title || '-' }}</span>
              <el-icon><ArrowRight /></el-icon>
              <strong>{{ section.title }}</strong>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="修改时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.restoredAt" type="success">已还原</el-tag>
            <el-tag v-else type="info">待还原</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :disabled="Boolean(row.restoredAt)"
              @click="restoreSectionBackup(row)"
            >
              还原
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog
      v-model="prdLinkDialogVisible"
      title="关联页面 PRD"
      width="620px"
      destroy-on-close
      :close-on-click-modal="false"
      class="route-editor-dialog apple-tool-dialog"
      modal-class="apple-tool-overlay"
    >
      <div class="dialog-intro">
        <span class="dialog-intro__icon"
          ><el-icon><Document /></el-icon
        ></span>
        <div>
          <strong>为整个页面指定 PRD 文件</strong>
          <p>页面进入开发模式后，顶部“查看 PRD”会打开这份文档。</p>
        </div>
      </div>
      <div class="prd-link-target">
        <span>{{ prdLinkContext.clientName }} · {{ prdLinkContext.pageTitle }}</span>
        <code>{{ prdLinkContext.fullPath }}</code>
      </div>
      <el-form label-position="top" class="route-dialog-form">
        <el-form-item label="PRD 文件">
          <el-select
            v-model="prdLinkDraft"
            class="prd-link-select"
            filterable
            clearable
            :loading="prdDocumentsLoading"
            placeholder="选择项目 docs 中的 Markdown 文件"
          >
            <el-option
              v-for="document in prdDocuments"
              :key="document.path"
              :label="`${document.title} · ${document.path}`"
              :value="document.path"
            />
          </el-select>
          <div class="form-help">清空后保存即可取消整页 PRD 关联，不会删除文档。</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="apple-dialog-footer">
          <span>只写入项目包 .platform 配置，不修改页面源码和 PRD 内容。</span>
          <div>
            <el-button @click="prdLinkDialogVisible = false">取消</el-button>
            <el-button
              type="primary"
              :loading="prdLinkSaving"
              :disabled="!canEditPagePrd"
              @click="savePagePrdLink"
            >
              保存关联
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'edit' ? '编辑路由' : '新增路由'"
      width="640px"
      destroy-on-close
      :close-on-click-modal="false"
      class="route-editor-dialog apple-tool-dialog"
      modal-class="apple-tool-overlay"
    >
      <div class="dialog-intro">
        <span class="dialog-intro__icon"
          ><el-icon><Menu /></el-icon
        ></span>
        <div>
          <strong>{{ dialogMode === 'edit' ? '调整现有页面登记' : '建立新的页面入口' }}</strong>
          <p>路由信息会同步到页面注册表和客户端菜单。</p>
        </div>
      </div>
      <el-form label-position="top" class="route-dialog-form">
        <el-form-item label="客户端">
          <el-select v-model="routeForm.client" style="width: 100%" @change="syncRouteSections">
            <el-option
              v-for="client in routeData?.clients || []"
              :key="client.id"
              :label="client.name"
              :value="client.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="路由片段">
          <el-input v-model="routeForm.routePath" placeholder="例如 vehicle-inspection" />
          <div class="form-help">仅使用小写英文字母、数字和连字符。</div>
        </el-form-item>
        <el-form-item label="路由名称">
          <el-input v-model="routeForm.pageTitle" placeholder="同时作为菜单显示名称" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="菜单分组">
            <el-select v-model="routeForm.menuSection" style="width: 100%">
              <el-option
                v-for="section in selectedRouteClient?.sections || []"
                :key="section.id"
                :label="section.title"
                :value="section.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="菜单图标">
            <el-select v-model="routeForm.menuIcon" style="width: 100%">
              <el-option v-for="icon in iconOptions" :key="icon" :label="icon" :value="icon" />
            </el-select>
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <div class="apple-dialog-footer">
          <span>{{
            dialogMode === 'edit' ? '保存后会更新菜单登记。' : '生成后可继续导入正式页面内容。'
          }}</span>
          <div>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="submitRoute">
              {{ dialogMode === 'edit' ? '保存修改' : '生成路由' }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="sectionDialogVisible"
      title="编辑菜单分组"
      width="680px"
      destroy-on-close
      :close-on-click-modal="false"
      class="route-section-dialog apple-tool-dialog"
      modal-class="apple-tool-overlay"
    >
      <div class="section-editor-heading">
        <p class="dialog-help">
          可新增、修改或删除菜单分组；已有分组 ID 保持不变，删除仍被页面使用的分组时系统会阻止保存。
        </p>
        <el-button size="small" @click="addSection">
          <el-icon><Plus /></el-icon>
          新增分组
        </el-button>
      </div>
      <div class="section-editor-list">
        <div v-for="(section, index) in sectionDraft" :key="section.id" class="section-editor-row">
          <div class="section-editor-order">
            <span class="route-order-badge route-order-badge--small">{{ formatOrder(index) }}</span>
            <div class="order-button-group" aria-label="调整分组顺序">
              <el-button
                circle
                text
                size="small"
                :disabled="index === 0"
                title="上移分组"
                @click="moveSectionDraft(index, -1)"
              >
                <el-icon><ArrowUp /></el-icon>
              </el-button>
              <el-button
                circle
                text
                size="small"
                :disabled="index === sectionDraft.length - 1"
                title="下移分组"
                @click="moveSectionDraft(index, 1)"
              >
                <el-icon><ArrowDown /></el-icon>
              </el-button>
            </div>
          </div>
          <el-input v-model="section.id" :disabled="!section.isNew" placeholder="分组 ID" />
          <el-input v-model="section.title" placeholder="请输入分组名称" />
          <el-button link type="danger" @click="removeSection(index)">删除</el-button>
        </div>
        <el-empty v-if="!sectionDraft.length" description="当前客户端暂无菜单分组" :image-size="70" />
      </div>
      <template #footer>
        <div class="apple-dialog-footer">
          <span>保存前会自动保留本次菜单分组配置。</span>
          <div>
            <el-button @click="sectionDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="sectionSaving" @click="saveSections">保存分组</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </main>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Document,
  Edit,
  Menu,
  Plus,
  Refresh,
} from '@element-plus/icons-vue';

import { getProject, installedProjects } from '../../config/project-packages';
import { loadDocumentManifest } from '../../services/prd-documents';
import { loadPagePrdLinks, savePagePrdLinks } from '../../services/page-prd-links';

const selectedProjectId = ref(installedProjects[0]?.id || '');
const activeClientId = ref('');
const routeData = ref(null);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const dialogVisible = ref(false);
const dialogMode = ref('create');
const sectionDialogVisible = ref(false);
const sectionSaving = ref(false);
const sectionClientId = ref('');
const sectionDraft = ref([]);
const routeOrderSnapshots = ref({});
const orderSavingClientId = ref('');
const collapsedGroupKeys = ref({});
const pagePrdLinks = ref({});
const pagePrdLinkOverrides = ref({});
const prdLinkDialogVisible = ref(false);
const prdLinkSaving = ref(false);
const prdDocumentsLoading = ref(false);
const prdDocuments = ref([]);
const prdLinkDraft = ref('');
const prdLinkContext = reactive({
  clientId: '',
  clientName: '',
  pageName: '',
  pageTitle: '',
  fullPath: '',
});
const routeForm = reactive({
  client: '',
  originalPath: '',
  routePath: '',
  pageTitle: '',
  menuSection: '',
  menuIcon: 'Document',
});
const iconOptions = [
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

const selectedRouteClient = computed(
  () => routeData.value?.clients.find((client) => client.id === routeForm.client) || null,
);
const selectedProject = computed(() => getProject(selectedProjectId.value));
const canEditPagePrd = import.meta.env.DEV;

watch(
  selectedProjectId,
  () => {
    prdDocuments.value = [];
    pagePrdLinks.value = {};
    pagePrdLinkOverrides.value = {};
    void loadRoutes();
  },
  { immediate: true },
);

function clonePagePrdLinks(source) {
  return Object.fromEntries(
    Object.entries(source || {}).map(([clientId, pages]) => [clientId, { ...(pages || {}) }]),
  );
}

function mergePagePrdLinks(baseLinks, overrideLinks) {
  const merged = clonePagePrdLinks(baseLinks);
  for (const [clientId, pages] of Object.entries(overrideLinks || {})) {
    if (!pages || typeof pages !== 'object') continue;
    merged[clientId] ||= {};
    for (const [pageName, documentPath] of Object.entries(pages)) {
      if (documentPath === null || documentPath === '') delete merged[clientId][pageName];
      else merged[clientId][pageName] = documentPath;
    }
  }
  return merged;
}

function pagePrdLinkFor(clientId, pageName) {
  const value = pagePrdLinks.value?.[clientId]?.[pageName];
  if (typeof value === 'string') return value;
  return value?.path || value?.file || '';
}

function pagePrdLinkTitle(documentPath) {
  return (
    String(documentPath || '')
      .split('/')
      .at(-1)
      ?.replace(/\.md$/i, '') || '已关联 PRD'
  );
}

async function loadRoutes() {
  if (!selectedProjectId.value) {
    routeData.value = null;
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const [response, externalLinks] = await Promise.all([
      fetch(`/__page-transfer/routes?projectId=${encodeURIComponent(selectedProjectId.value)}`, {
        cache: 'no-store',
      }),
      loadPagePrdLinks(selectedProjectId.value),
    ]);
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || '路由读取失败。');
    routeData.value = payload;
    collapsedGroupKeys.value = {};
    routeOrderSnapshots.value = Object.fromEntries(
      payload.clients.map((client) => [client.id, routeOrderSignature(client)]),
    );
    pagePrdLinkOverrides.value = externalLinks;
    pagePrdLinks.value = mergePagePrdLinks(selectedProject.value?.pagePrdLinks, externalLinks);
    if (!routeData.value.clients.some((client) => client.id === activeClientId.value)) {
      activeClientId.value = routeData.value.clients[0]?.id || '';
    }
  } catch (loadError) {
    routeData.value = null;
    error.value = loadError.message;
  } finally {
    loading.value = false;
  }
}

async function loadPrdDocuments() {
  if (prdDocuments.value.length || !selectedProjectId.value) return;
  prdDocumentsLoading.value = true;
  try {
    const manifest = await loadDocumentManifest(selectedProjectId.value);
    prdDocuments.value = manifest.documents || [];
  } catch (loadError) {
    ElMessage.error(loadError.message || 'PRD 文档读取失败。');
  } finally {
    prdDocumentsLoading.value = false;
  }
}

function openPagePrdLink(client, page) {
  Object.assign(prdLinkContext, {
    clientId: client.id,
    clientName: client.name,
    pageName: page.name,
    pageTitle: page.title,
    fullPath: `${client.basePath}/${page.path}`,
  });
  prdLinkDraft.value = pagePrdLinkFor(client.id, page.name);
  prdLinkDialogVisible.value = true;
  void loadPrdDocuments();
}

function updateNestedPagePrdLink(source, clientId, pageName, value) {
  const next = clonePagePrdLinks(source);
  next[clientId] ||= {};
  next[clientId][pageName] = value;
  return next;
}

async function savePagePrdLink() {
  if (!prdLinkContext.clientId || !prdLinkContext.pageName) return;
  prdLinkSaving.value = true;
  try {
    const nextOverrides = updateNestedPagePrdLink(
      pagePrdLinkOverrides.value,
      prdLinkContext.clientId,
      prdLinkContext.pageName,
      prdLinkDraft.value || null,
    );
    const saved = await savePagePrdLinks(selectedProjectId.value, nextOverrides);
    pagePrdLinkOverrides.value = saved;
    pagePrdLinks.value = mergePagePrdLinks(selectedProject.value?.pagePrdLinks, saved);
    prdLinkDialogVisible.value = false;
    ElMessage.success('页面 PRD 关联已保存，页面将自动重新载入。');
  } catch (saveError) {
    ElMessage.error(saveError.message || '页面 PRD 关联保存失败。');
  } finally {
    prdLinkSaving.value = false;
  }
}

function formatOrder(index) {
  return String(index + 1).padStart(2, '0');
}

function routeGroups(client) {
  const sectionIds = new Set((client.sections || []).map((section) => section.id));
  const groups = (client.sections || []).map((section, sectionIndex) => ({
    id: section.id,
    title: section.title,
    sectionIndex,
    isUngrouped: false,
    pages: (client.pages || []).filter((page) => page.section === section.id),
  }));
  const ungroupedPages = (client.pages || []).filter((page) => !sectionIds.has(page.section));
  if (ungroupedPages.length) {
    groups.push({
      id: '__ungrouped__',
      title: '未分组',
      sectionIndex: -1,
      isUngrouped: true,
      pages: ungroupedPages,
    });
  }
  return groups;
}

function groupKey(client, group) {
  return `${client.id}:${group.id}`;
}

function isGroupCollapsed(client, group) {
  return collapsedGroupKeys.value[groupKey(client, group)] !== false;
}

function toggleGroup(client, group) {
  const key = groupKey(client, group);
  collapsedGroupKeys.value = {
    ...collapsedGroupKeys.value,
    [key]: !isGroupCollapsed(client, group),
  };
}

function routeOrderSignature(client) {
  return JSON.stringify({
    sections: (client.sections || []).map((section) => section.id),
    pages: Object.fromEntries(
      routeGroups(client)
        .filter((group) => !group.isUngrouped)
        .map((group) => [group.id, group.pages.map((page) => page.name)]),
    ),
  });
}

function isRouteOrderDirty(client) {
  return routeOrderSignature(client) !== routeOrderSnapshots.value[client.id];
}

function moveSection(client, index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= client.sections.length) return;
  const [section] = client.sections.splice(index, 1);
  client.sections.splice(targetIndex, 0, section);
}

function movePage(client, sectionId, index, direction) {
  if (sectionId === '__ungrouped__') return;
  const groupPages = client.pages.filter((page) => page.section === sectionId);
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= groupPages.length) return;
  const currentPageIndex = client.pages.indexOf(groupPages[index]);
  const targetPageIndex = client.pages.indexOf(groupPages[targetIndex]);
  [client.pages[currentPageIndex], client.pages[targetPageIndex]] = [
    client.pages[targetPageIndex],
    client.pages[currentPageIndex],
  ];
}

async function saveRouteOrder(client) {
  if (!isRouteOrderDirty(client)) return;
  orderSavingClientId.value = client.id;
  try {
    const pageOrder = Object.fromEntries(
      routeGroups(client)
        .filter((group) => !group.isUngrouped)
        .map((group) => [group.id, group.pages.map((page) => page.name)]),
    );
    const response = await fetch('/__page-transfer/route/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: selectedProjectId.value,
        client: client.id,
        sectionOrder: client.sections.map((section) => section.id),
        pageOrder,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || '菜单顺序保存失败。');
    routeOrderSnapshots.value = {
      ...routeOrderSnapshots.value,
      [client.id]: routeOrderSignature(client),
    };
    ElMessage.success('菜单顺序已保存，重新载入页面后仍会保持当前顺序。');
  } catch (orderError) {
    ElMessage.error(orderError.message || '菜单顺序保存失败。');
  } finally {
    orderSavingClientId.value = '';
  }
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function syncRouteSections() {
  const firstSection = selectedRouteClient.value?.sections[0];
  if (!selectedRouteClient.value?.sections.some((section) => section.id === routeForm.menuSection)) {
    routeForm.menuSection = firstSection?.id || '';
  }
}

function openCreateRoute(client) {
  Object.assign(routeForm, {
    client: client.id,
    originalPath: '',
    routePath: '',
    pageTitle: '',
    menuSection: client.sections[0]?.id || '',
    menuIcon: 'Document',
  });
  dialogMode.value = 'create';
  dialogVisible.value = true;
}

function openEditRoute(client, page) {
  Object.assign(routeForm, {
    client: client.id,
    originalPath: page.path,
    routePath: page.path,
    pageTitle: page.title,
    menuSection: page.section || client.sections[0]?.id || '',
    menuIcon: page.icon || 'Document',
  });
  dialogMode.value = 'edit';
  dialogVisible.value = true;
}

function openSectionManager(client) {
  sectionClientId.value = client.id;
  sectionDraft.value = client.sections.map((section) => ({
    id: section.id,
    title: section.title,
    isNew: false,
  }));
  sectionDialogVisible.value = true;
}

function moveSectionDraft(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= sectionDraft.value.length) return;
  const [section] = sectionDraft.value.splice(index, 1);
  sectionDraft.value.splice(targetIndex, 0, section);
}

function addSection() {
  const existingIds = new Set(sectionDraft.value.map((section) => section.id));
  let index = sectionDraft.value.length + 1;
  let id = `group-${index}`;
  while (existingIds.has(id)) {
    index += 1;
    id = `group-${index}`;
  }
  sectionDraft.value.push({ id, title: '新分组', isNew: true });
}

async function removeSection(index) {
  const section = sectionDraft.value[index];
  if (!section) return;
  if (!section.isNew) {
    try {
      await ElMessageBox.confirm(
        `确认删除菜单分组“${section.title}”？如果仍有页面使用该分组，保存时会被阻止。`,
        '确认删除分组',
        {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning',
          customClass: 'apple-confirm-dialog',
          modalClass: 'apple-tool-overlay',
        },
      );
    } catch {
      return;
    }
  }
  sectionDraft.value.splice(index, 1);
}

async function submitRoute() {
  if (!routeForm.routePath.trim() || !routeForm.pageTitle.trim() || !routeForm.menuSection) {
    ElMessage.error('请补充路由片段、页面名称和菜单分组。');
    return;
  }
  saving.value = true;
  try {
    const isEdit = dialogMode.value === 'edit';
    const response = await fetch(`/__page-transfer/route/${isEdit ? 'update' : 'create'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: selectedProjectId.value, ...routeForm }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok)
      throw new Error(payload.error || (isEdit ? '路由编辑失败。' : '路由新增失败。'));
    ElMessage.success(
      isEdit ? '路由信息已保存，请重新载入开发服务。' : '路由和占位页面已生成，请重新载入开发服务。',
    );
    dialogVisible.value = false;
    await loadRoutes();
  } catch (createError) {
    ElMessage.error(createError.message);
  } finally {
    saving.value = false;
  }
}

async function saveSections() {
  if (sectionDraft.value.some((section) => !section.title.trim())) {
    ElMessage.error('菜单分组名称不能为空。');
    return;
  }
  sectionSaving.value = true;
  try {
    const response = await fetch('/__page-transfer/section/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: selectedProjectId.value,
        client: sectionClientId.value,
        sections: sectionDraft.value,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || '菜单分组保存失败。');
    ElMessage.success(`菜单分组已保存，备份编号：${payload.result.backupId}`);
    sectionDialogVisible.value = false;
    await loadRoutes();
  } catch (sectionError) {
    ElMessage.error(sectionError.message);
  } finally {
    sectionSaving.value = false;
  }
}

async function deleteRoute(client, page) {
  try {
    await ElMessageBox.confirm(
      `删除“${page.title}”后，路由会从菜单和页面注册表移除，但 Vue 文件和原定义会备份到项目包内。`,
      '确认删除路由',
      {
        confirmButtonText: '删除并备份',
        cancelButtonText: '取消',
        type: 'warning',
        customClass: 'apple-confirm-dialog',
        modalClass: 'apple-tool-overlay',
      },
    );
  } catch {
    return;
  }
  saving.value = true;
  try {
    const response = await fetch('/__page-transfer/route/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: selectedProjectId.value, client: client.id, pagePath: page.path }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || '路由删除失败。');
    ElMessage.success(`路由已删除，备份编号：${payload.result.backupId}`);
    await loadRoutes();
  } catch (deleteError) {
    ElMessage.error(deleteError.message);
  } finally {
    saving.value = false;
  }
}

async function restoreBackup(backup) {
  try {
    await ElMessageBox.confirm(
      `确认还原“${backup.original?.title || backup.original?.path}”？当前修改后的页面会被移除，原页面会重新登记。`,
      '确认还原页面',
      {
        confirmButtonText: '确认还原',
        cancelButtonText: '取消',
        type: 'warning',
        customClass: 'apple-confirm-dialog',
        modalClass: 'apple-tool-overlay',
      },
    );
  } catch {
    return;
  }
  saving.value = true;
  try {
    const response = await fetch('/__page-transfer/route/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: selectedProjectId.value, backupId: backup.id }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || '页面还原失败。');
    ElMessage.success('页面已还原，请重新载入开发服务。');
    await loadRoutes();
  } catch (restoreError) {
    ElMessage.error(restoreError.message);
  } finally {
    saving.value = false;
  }
}

async function restoreSectionBackup(backup) {
  try {
    await ElMessageBox.confirm(
      '确认还原这次菜单分组修改？当前分组名称会恢复为修改前的版本。',
      '确认还原菜单分组',
      {
        confirmButtonText: '确认还原',
        cancelButtonText: '取消',
        type: 'warning',
        customClass: 'apple-confirm-dialog',
        modalClass: 'apple-tool-overlay',
      },
    );
  } catch {
    return;
  }
  sectionSaving.value = true;
  try {
    const response = await fetch('/__page-transfer/section/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: selectedProjectId.value, backupId: backup.id }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || '菜单分组还原失败。');
    ElMessage.success('菜单分组已还原，请重新载入开发服务。');
    await loadRoutes();
  } catch (sectionError) {
    ElMessage.error(sectionError.message);
  } finally {
    sectionSaving.value = false;
  }
}
</script>

<style scoped>
.routes-page {
  --app-color-primary: var(--platform-color-accent);
  --app-color-primary-rgb: var(--platform-color-accent-rgb);
  width: min(var(--platform-content-max), calc(100% - 64px));
  min-height: 100svh;
  margin: 0 auto;
  padding: 24px 0 56px;
  color: var(--app-color-text-primary);
}
.routes-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 20px;
  padding: 18px 22px;
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
  background: linear-gradient(145deg, #3b82f6, #4f46e5);
  color: #fff;
  box-shadow: 0 8px 20px rgb(37 99 235 / 20%);
  font-size: 22px;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 0;
  color: var(--app-color-text-secondary);
  font-size: 13px;
  transition: color 160ms ease;
}
.routes-header .back-link {
  margin-bottom: 14px;
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
.routes-header h1,
.routes-header p,
.panel-heading h2,
.panel-heading p {
  margin: 0;
}
.routes-header h1 {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.2;
}
.subtitle,
.panel-heading p,
.client-summary span {
  margin-top: 5px !important;
  color: var(--app-color-text-muted);
  font-size: 13px;
  line-height: 1.55;
}
.header-actions,
.client-toolbar,
.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.header-actions {
  justify-content: flex-end;
}
.project-select {
  width: 220px;
}
.routes-alert {
  margin-bottom: 16px;
  border-radius: 12px;
}
.routes-overview {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
  padding: 20px 24px;
  border-color: var(--platform-color-border);
  background: rgb(255 255 255 / 82%);
}
.routes-overview__lead {
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
.routes-overview h2 {
  margin: 8px 0 0;
  font-size: 22px;
  letter-spacing: -0.025em;
}
.routes-overview p {
  margin: 8px 0 0;
  color: var(--app-color-text-muted);
  font-size: 13px;
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
.routes-panel {
  margin-bottom: 24px;
  padding: 24px;
  border-color: var(--platform-color-border);
  background: rgb(255 255 255 / 84%);
}
.panel-heading {
  margin-bottom: 22px;
}
.panel-heading h2 {
  font-size: 20px;
  letter-spacing: -0.02em;
}
.panel-heading .section-kicker {
  display: block;
  margin-bottom: 6px;
}
.client-tabs :deep(.el-tabs__header) {
  width: fit-content;
  max-width: 100%;
  margin-bottom: 20px;
  padding: 4px;
  border-radius: 12px;
  background: #f2f2f7;
}
.client-tabs :deep(.el-tabs__nav-wrap::after),
.client-tabs :deep(.el-tabs__active-bar) {
  display: none;
}
.client-tabs :deep(.el-tabs__item) {
  height: 36px;
  padding: 0 16px;
  border-radius: 9px;
  color: #6e6e73;
  font-size: 13px;
  transition:
    color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}
.client-tabs :deep(.el-tabs__item.is-active) {
  color: #1d1d1f;
  background: #fff;
  box-shadow: 0 1px 4px rgb(0 0 0 / 9%);
}
.client-toolbar {
  margin-bottom: 10px;
}
.client-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.client-summary {
  display: grid;
  gap: 2px;
}
.route-order-hint {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  margin: 0 0 10px;
  padding: 7px 10px;
  border: 0.5px solid rgb(var(--app-color-primary-rgb) / 16%);
  border-radius: 9px;
  background: rgb(var(--app-color-primary-rgb) / 5%);
  color: var(--app-color-text-muted);
  font-size: 11px;
}
.route-order-hint b {
  display: inline-grid;
  width: 20px;
  height: 20px;
  place-items: center;
  margin-right: 4px;
  border-radius: 6px;
  background: rgb(var(--app-color-primary-rgb) / 12%);
  color: var(--app-color-primary);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
.route-groups {
  display: grid;
  gap: 6px;
}
.route-group-card {
  overflow: hidden;
  border: 0.5px solid rgb(0 0 0 / 9%);
  border-radius: 10px;
  background: var(--platform-color-surface);
  box-shadow: 0 5px 16px rgb(0 0 0 / 3%);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}
.route-group-card:focus-within,
.route-group-card:hover {
  border-color: rgb(var(--app-color-primary-rgb) / 24%);
  box-shadow: 0 8px 20px rgb(0 0 0 / 5%);
}
.route-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 0.5px solid rgb(0 0 0 / 7%);
  background: linear-gradient(90deg, rgb(var(--app-color-primary-rgb) / 5%), transparent 62%);
}
.route-group-toggle {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.route-group-toggle:focus-visible {
  outline: 2px solid var(--app-color-primary);
  outline-offset: 3px;
  border-radius: 8px;
}
.route-group-toggle__icon {
  flex: 0 0 auto;
  color: var(--app-color-text-muted);
  transition:
    color 160ms ease,
    transform 160ms ease;
}
.route-group-toggle:hover .route-group-toggle__icon,
.route-group-toggle__icon.is-expanded {
  color: var(--app-color-primary);
}
.route-group-toggle__icon.is-expanded {
  transform: rotate(90deg);
}
.route-group-heading,
.route-group-title-line,
.section-editor-order,
.order-button-group {
  display: flex;
  align-items: center;
}
.route-group-heading {
  min-width: 0;
  gap: 8px;
}
.route-group-heading__copy {
  display: grid;
  min-width: 0;
  gap: 1px;
}
.route-group-title-line,
.route-name-line {
  flex-wrap: wrap;
  gap: 5px;
}
.route-group-title-line strong {
  font-size: 14px;
  letter-spacing: -0.015em;
}
.route-group-note {
  display: block;
  margin-top: 2px;
  color: var(--app-color-text-muted);
  font-family: var(--app-font-family-mono);
  font-size: 10px;
}
.route-order-badge {
  display: inline-grid;
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 9px;
  background: rgb(var(--app-color-primary-rgb) / 12%);
  color: var(--app-color-primary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}
.route-order-badge--small {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  font-size: 10px;
}
.order-button-group {
  flex: 0 0 auto;
  gap: 2px;
}
.order-button-group :deep(.el-button) {
  width: 26px;
  height: 26px;
  margin: 0;
  border-radius: 8px;
  color: var(--app-color-text-muted);
}
.order-button-group :deep(.el-button:not(.is-disabled):hover) {
  color: var(--app-color-primary);
  background: rgb(var(--app-color-primary-rgb) / 9%);
}
.route-table-title,
.route-table-info,
.route-table-prd,
.route-table-actions {
  display: flex;
  align-items: center;
}
.route-table-title {
  flex-wrap: wrap;
  gap: 4px;
}
.route-table-title strong {
  color: var(--app-color-text-primary);
  font-size: 12px;
}
.route-table-info {
  min-width: 0;
  align-items: flex-start;
  flex-direction: column;
  gap: 3px;
}
.route-table-path,
.route-table-source,
.route-table-prd > span {
  display: block;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: normal;
}
.route-table-path {
  color: var(--app-color-text-secondary);
  font-family: var(--app-font-family-mono);
  font-size: 11px;
  line-height: 1.35;
}
.route-table-source {
  color: var(--app-color-text-muted);
  font-size: 11px;
  line-height: 1.35;
}
.route-table-prd {
  min-width: 0;
  flex-wrap: wrap;
  gap: 4px;
}
.route-table-prd > span {
  min-width: 0;
  color: var(--app-color-text-muted);
  font-size: 11px;
  line-height: 1.35;
}
.route-table-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 2px;
  row-gap: 0;
}
.route-source-note {
  color: var(--app-color-text-muted);
  font-size: 11px;
  line-height: 1.35;
}
.route-group-content {
  width: 100%;
}
.route-group-card.is-collapsed .route-group-header {
  border-bottom-color: transparent;
}
.routes-panel :deep(.el-table) {
  overflow: hidden;
  border-radius: 12px;
  --el-table-border-color: rgb(0 0 0 / 7%);
}
.routes-panel :deep(.el-table .el-table__cell) {
  padding-top: 13px;
  padding-bottom: 13px;
}
.routes-panel :deep(.el-table th.el-table__cell) {
  background: #f7f7fa;
  color: var(--app-color-text-secondary);
  font-weight: 600;
}
.routes-panel :deep(.el-table tr:hover > td.el-table__cell) {
  background: #f2f2f7;
}
.group-route-table {
  width: 100%;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
.group-route-table :deep(.el-table__header),
.group-route-table :deep(.el-table__body) {
  width: 100% !important;
  table-layout: fixed;
}
.group-route-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}
.group-route-table :deep(.el-table__header-wrapper th.el-table__cell) {
  background: #fafafd;
  color: var(--app-color-text-muted);
  font-size: 12px;
}
.group-route-table :deep(.el-table__body-wrapper td.el-table__cell),
.group-route-table :deep(.el-table__header-wrapper th.el-table__cell) {
  padding-top: 5px;
  padding-bottom: 5px;
}
.group-route-table :deep(.cell) {
  padding-right: 6px;
  padding-left: 6px;
}
.group-route-table :deep(.el-table__body tr:hover > td.el-table__cell) {
  background: rgb(var(--app-color-primary-rgb) / 3%);
}
.dialog-help {
  margin: 0 0 16px;
  color: var(--app-color-text-muted);
  font-size: 13px;
  line-height: 1.6;
}
.dialog-intro {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #f5f5f7;
}
.dialog-intro__icon {
  display: inline-flex;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: color-mix(in srgb, var(--app-color-primary) 11%, white);
  color: var(--app-color-primary);
  font-size: 18px;
}
.dialog-intro > div {
  display: grid;
  gap: 3px;
}
.dialog-intro strong {
  color: #1d1d1f;
  font-size: 14px;
}
.dialog-intro p {
  margin: 0;
  color: #6e6e73;
  font-size: 12px;
}
.route-dialog-form {
  padding-top: 2px;
}
.prd-link-target {
  display: grid;
  gap: 5px;
  margin: -4px 0 20px;
  padding: 12px 14px;
  border: 0.5px solid rgb(0 0 0 / 8%);
  border-radius: 12px;
  background: #f5f5f7;
}
.prd-link-target span {
  color: var(--app-color-text-primary);
  font-size: 14px;
  font-weight: 650;
}
.prd-link-target code {
  overflow: hidden;
  color: var(--app-color-text-muted);
  font-family: var(--app-font-family-mono);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prd-link-select {
  width: 100%;
}
.section-editor-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 14px;
  background: #f5f5f7;
}
.section-editor-heading .dialog-help {
  flex: 1;
  margin: 0;
}
.section-editor-list {
  display: grid;
  gap: 12px;
  max-height: 46vh;
  overflow-y: auto;
  padding-right: 2px;
}
.section-editor-row {
  display: grid;
  grid-template-columns: auto 160px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 0.5px solid rgb(0 0 0 / 8%);
  border-radius: 12px;
  background: #fff;
  transition:
    border-color 160ms ease,
    background-color 160ms ease;
}
.section-editor-row:focus-within {
  border-color: rgb(var(--app-color-primary-rgb) / 28%);
  background: #fbfdff;
}
.section-editor-order {
  gap: 8px;
}
.apple-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.apple-dialog-footer > span {
  color: #6e6e73;
  font-size: 12px;
}
.apple-dialog-footer > div {
  display: flex;
  align-items: center;
  gap: 10px;
}
.backup-section-row {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 24px;
}
.backup-section-row .el-icon {
  color: var(--app-color-text-muted);
}
.backup-panel :deep(.el-table__body) small,
.backup-panel :deep(.el-table__body) strong {
  display: block;
}
.backup-panel :deep(.el-table__body) small {
  margin-top: 4px;
  color: var(--app-color-text-muted);
  font-size: 12px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 18px;
}
.form-help {
  margin-top: 5px;
  color: var(--app-color-text-muted);
  font-size: 12px;
  line-height: 1.5;
}
.routes-page :deep(.header-actions .el-button),
.routes-page :deep(.client-actions .el-button) {
  min-height: 38px;
  border-radius: 10px;
  font-weight: 550;
}
.routes-page :deep(.header-actions .el-select__wrapper) {
  min-height: 40px;
  border-radius: 10px;
}
@media (max-width: 1080px) {
  .routes-header {
    align-items: start;
    flex-wrap: wrap;
  }
  .header-actions {
    width: 100%;
    justify-content: flex-start;
    padding-left: 60px;
  }
}
@media (max-width: 920px) {
  .routes-overview {
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
@media (max-width: 840px) {
  .routes-page {
    width: calc(100% - 32px);
  }
  .routes-header {
    align-items: start;
    flex-direction: column;
    gap: 14px;
  }
  .routes-overview {
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
  .header-actions {
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
    padding-left: 0;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .section-editor-row {
    grid-template-columns: 1fr;
  }
  .section-editor-order {
    justify-content: space-between;
  }
  .route-group-header {
    align-items: flex-start;
  }
  .section-editor-heading {
    flex-direction: column;
  }
  .apple-dialog-footer {
    align-items: stretch;
    flex-direction: column;
  }
  .apple-dialog-footer > span {
    display: none;
  }
  .apple-dialog-footer > div {
    justify-content: flex-end;
  }
}
</style>
