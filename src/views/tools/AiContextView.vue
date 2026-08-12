<script setup>
import { computed, onMounted, reactive, ref, shallowRef, watch } from 'vue';
import {
  ArrowLeft,
  CircleCheck,
  Connection,
  CopyDocument,
  Document,
  Download,
  Link,
  Refresh,
  Warning,
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRoute, useRouter } from 'vue-router';

import {
  createContextExport,
  createPageContextPackage,
  createTraceabilityReport,
} from '../../../packages/project-core/src/ai-context.js';
import { installedProjects } from '../../config/project-packages';
import { loadPagePrdLinks, savePagePrdLinks } from '../../services/page-prd-links';
import {
  analyzeProjectContextImpact,
  clearProjectAiContextCache,
  loadProjectAiContext,
  saveProjectContextBaseline,
} from '../../services/project-ai-context';

const route = useRoute();
const router = useRouter();
const requestedProjectId = typeof route.query.project === 'string' ? route.query.project : '';
const selectedProjectId = ref(
  installedProjects.some((project) => project.id === requestedProjectId)
    ? requestedProjectId
    : installedProjects[0]?.id || '',
);
const context = shallowRef(null);
const loading = ref(false);
const error = ref('');
const activeTab = ref('overview');
const selectedPageKey = ref('');
const impact = ref(null);
const suggestionSelections = reactive({});
const savingPageKey = ref('');
const canEditAssociations = import.meta.env.DEV;

const selectedPage = computed(
  () => context.value?.pages.find((page) => page.key === selectedPageKey.value) || null,
);
const selectedRequirement = computed(() => {
  if (!selectedPage.value?.documentPath) return null;
  return (
    context.value?.documents.find((document) => document.path === selectedPage.value.documentPath) || null
  );
});
const selectedPageBindings = computed(() => {
  if (!selectedPage.value) return [];
  return context.value?.bindings.filter((binding) => binding.pagePath === selectedPage.value.fullPath) || [];
});
const selectedPageIssues = computed(() => {
  if (!selectedPage.value) return [];
  return context.value?.issues.filter((issue) => issue.pageKey === selectedPage.value.key) || [];
});
const pageGroups = computed(() => {
  if (!context.value) return [];
  return context.value.clients.map((client) => ({
    ...client,
    pages: context.value.pages.filter((page) => page.clientId === client.id),
  }));
});
const issueRows = computed(() => context.value?.issues || []);
const traceability = computed(() => (context.value ? createTraceabilityReport(context.value).rows : []));
const unlinkedDocumentCount = computed(
  () =>
    context.value?.documents.filter((document) => !document.linkedPageKeys.length && !document.archived)
      .length || 0,
);

watch(selectedProjectId, () => void refreshContext());

onMounted(() => {
  if (selectedProjectId.value) void refreshContext();
});

function resetSuggestionSelections() {
  for (const key of Object.keys(suggestionSelections)) delete suggestionSelections[key];
  for (const suggestion of context.value?.suggestions || []) {
    suggestionSelections[suggestion.pageKey] = suggestion.candidates[0]?.path || '';
  }
}

function selectInitialPage() {
  const requestedPage = typeof route.query.page === 'string' ? route.query.page : '';
  const matched = context.value?.pages.find(
    (page) => page.fullPath === requestedPage || page.key === requestedPage || page.name === requestedPage,
  );
  if (matched) {
    selectedPageKey.value = matched.key;
    activeTab.value = 'page';
    return;
  }
  if (!context.value?.pages.some((page) => page.key === selectedPageKey.value)) {
    selectedPageKey.value = context.value?.pages[0]?.key || '';
  }
}

async function refreshContext(force = false) {
  if (!selectedProjectId.value) {
    context.value = null;
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    if (force) clearProjectAiContextCache(selectedProjectId.value);
    context.value = await loadProjectAiContext(selectedProjectId.value, { force });
    impact.value = analyzeProjectContextImpact(context.value);
    resetSuggestionSelections();
    selectInitialPage();
  } catch (loadError) {
    context.value = null;
    impact.value = null;
    error.value = loadError.message || '项目上下文读取失败。';
  } finally {
    loading.value = false;
  }
}

function issueLabel(severity) {
  return severity === 'error' ? '错误' : severity === 'warning' ? '待检查' : '提示';
}

function issueTagType(severity) {
  return severity === 'error' ? 'danger' : severity === 'warning' ? 'warning' : 'info';
}

function confidenceLabel(confidence) {
  return confidence === 'high' ? '高' : confidence === 'medium' ? '中' : '低';
}

function confidenceTagType(confidence) {
  return confidence === 'high' ? 'success' : confidence === 'medium' ? 'warning' : 'info';
}

function impactTypeLabel(type) {
  return type === 'added' ? '新增' : type === 'removed' ? '删除' : '修改';
}

function impactTagType(type) {
  return type === 'added' ? 'success' : type === 'removed' ? 'danger' : 'warning';
}

function pageTitle(pageKey) {
  const page = context.value?.pages.find((item) => item.key === pageKey);
  return page ? `${page.clientName} · ${page.title}` : pageKey;
}

function openPage(page = selectedPage.value) {
  if (!page) return;
  window.open(router.resolve(page.fullPath).href, '_blank', 'noopener');
}

async function copySelectedPageContext() {
  const payload = createPageContextPackage(context.value, selectedPageKey.value);
  if (!payload) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    ElMessage.success('当前页面与关联需求上下文已复制。');
  } catch {
    ElMessage.error('复制失败，请确认浏览器已允许剪贴板访问。');
  }
}

function downloadJson(payload, fileName) {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportContext(command) {
  if (!context.value) return;
  const includeDocumentContent = command === 'full';
  const payload = createContextExport(context.value, { includeDocumentContent });
  downloadJson(
    payload,
    `${context.value.project.id}-context-${includeDocumentContent ? 'full' : 'index'}.json`,
  );
  ElMessage.success(includeDocumentContent ? '完整上下文包已导出。' : '上下文索引已导出。');
}

function exportTraceability() {
  if (!context.value) return;
  const payload = createTraceabilityReport(context.value);
  payload.impact = impact.value;
  downloadJson(payload, `${context.value.project.id}-traceability.json`);
  ElMessage.success('需求追溯矩阵已导出。');
}

function updateBaseline() {
  if (!context.value) return;
  saveProjectContextBaseline(context.value);
  impact.value = analyzeProjectContextImpact(context.value);
  ElMessage.success('已在当前浏览器建立 PRD 影响分析基线。');
}

function cloneLinks(source) {
  return Object.fromEntries(
    Object.entries(source || {}).map(([clientId, pages]) => [clientId, { ...(pages || {}) }]),
  );
}

async function confirmSuggestion(suggestion) {
  const documentPath = suggestionSelections[suggestion.pageKey];
  const candidate = suggestion.candidates.find((item) => item.path === documentPath);
  if (!documentPath || !candidate) return;
  try {
    await ElMessageBox.confirm(
      `确认将“${suggestion.page.title}”关联到“${candidate.title}”吗？系统只会更新页面关联配置。`,
      '确认页面 PRD 关联',
      { confirmButtonText: '确认关联', cancelButtonText: '取消', type: 'info' },
    );
    savingPageKey.value = suggestion.pageKey;
    const overrides = cloneLinks(await loadPagePrdLinks(selectedProjectId.value));
    overrides[suggestion.page.clientId] ||= {};
    overrides[suggestion.page.clientId][suggestion.page.name] = documentPath;
    await savePagePrdLinks(selectedProjectId.value, overrides);
    await refreshContext(true);
    ElMessage.success('页面 PRD 关联已保存。');
  } catch (saveError) {
    if (saveError !== 'cancel' && saveError !== 'close') {
      ElMessage.error(saveError.message || '页面 PRD 关联保存失败。');
    }
  } finally {
    savingPageKey.value = '';
  }
}
</script>

<template>
  <div class="ai-context-page platform-page">
    <main class="ai-context-shell platform-page-shell">
      <header class="ai-context-hero platform-hero">
        <div class="ai-context-hero__copy">
          <RouterLink to="/tools/console" class="ai-context-back">
            <el-icon><ArrowLeft /></el-icon>
            返回控制台
          </RouterLink>
          <div class="ai-context-title">
            <span class="ai-context-title__icon"
              ><el-icon><Connection /></el-icon
            ></span>
            <div>
              <span>PROJECT DELIVERY CONTEXT</span>
              <h1>AI 上下文中心</h1>
              <p>把项目、页面、PRD 和关联关系整理为可检查、可确认、可交给 AI 使用的上下文。</p>
            </div>
          </div>
        </div>
        <div class="ai-context-actions">
          <span class="local-badge"><i></i>本地分析，不上传资料</span>
          <el-select v-model="selectedProjectId" class="project-select" placeholder="选择项目">
            <el-option
              v-for="project in installedProjects"
              :key="project.id"
              :label="project.name"
              :value="project.id"
            />
          </el-select>
          <el-button :icon="Refresh" :loading="loading" @click="refreshContext(true)">重新分析</el-button>
          <el-dropdown :disabled="!context" @command="exportContext">
            <el-button type="primary">
              <el-icon><Download /></el-icon>
              导出上下文包
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="index">导出索引 JSON</el-dropdown-item>
                <el-dropdown-item command="full">导出完整 JSON（含 PRD 正文）</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <section v-if="loading && !context" class="context-state platform-surface">
        <el-skeleton :rows="6" animated />
      </section>
      <section v-else-if="error" class="context-state platform-surface">
        <el-result icon="error" title="上下文读取失败" :sub-title="error">
          <template #extra
            ><el-button type="primary" @click="refreshContext(true)">重新读取</el-button></template
          >
        </el-result>
      </section>
      <template v-else-if="context">
        <section class="context-summary platform-surface" aria-label="项目上下文摘要">
          <div class="coverage-summary">
            <span>页面与 PRD 覆盖率</span>
            <strong>{{ context.summary.pageCoverage }}%</strong>
            <el-progress :percentage="context.summary.pageCoverage" :show-text="false" :stroke-width="7" />
          </div>
          <dl>
            <div>
              <dt>客户端</dt>
              <dd>{{ context.summary.clients }}</dd>
            </div>
            <div>
              <dt>页面</dt>
              <dd>{{ context.summary.pages }}</dd>
            </div>
            <div>
              <dt>PRD</dt>
              <dd>{{ context.summary.documents }}</dd>
            </div>
            <div>
              <dt>组件关联</dt>
              <dd>{{ context.summary.componentBindings }}</dd>
            </div>
            <div class="is-warning">
              <dt>待处理</dt>
              <dd>{{ context.summary.errors + context.summary.warnings }}</dd>
            </div>
          </dl>
        </section>

        <section class="context-workspace platform-surface">
          <el-tabs v-model="activeTab" class="context-tabs">
            <el-tab-pane label="项目概览" name="overview">
              <div class="tab-heading">
                <div>
                  <h2>交付完整性</h2>
                  <p>检查页面、PRD 文件和组件级关联是否仍然有效。</p>
                </div>
                <span>{{ context.generatedAt.replace('T', ' ').slice(0, 19) }} 更新</span>
              </div>

              <div class="overview-callouts">
                <div>
                  <el-icon><CircleCheck /></el-icon>
                  <span
                    ><strong>{{ context.summary.linkedPages }}</strong> 个页面已关联 PRD</span
                  >
                </div>
                <div>
                  <el-icon><Warning /></el-icon>
                  <span
                    ><strong>{{ context.summary.unlinkedPages }}</strong> 个页面尚未关联</span
                  >
                </div>
                <div>
                  <el-icon><Document /></el-icon>
                  <span
                    ><strong>{{ unlinkedDocumentCount }}</strong> 份非归档文档暂无页面使用</span
                  >
                </div>
              </div>

              <el-table v-if="issueRows.length" :data="issueRows" class="context-table" table-layout="fixed">
                <el-table-column label="级别" width="92">
                  <template #default="{ row }">
                    <el-tag :type="issueTagType(row.severity)" effect="light">{{
                      issueLabel(row.severity)
                    }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="subject" label="对象" min-width="220" show-overflow-tooltip />
                <el-table-column prop="message" label="检查结果" min-width="420" show-overflow-tooltip />
              </el-table>
              <el-empty v-else description="当前没有发现关联完整性问题" />
            </el-tab-pane>

            <el-tab-pane label="页面上下文" name="page">
              <div class="page-context-toolbar">
                <div>
                  <label for="page-context-select">当前页面</label>
                  <el-select
                    id="page-context-select"
                    v-model="selectedPageKey"
                    class="page-context-select"
                    filterable
                    placeholder="选择页面"
                  >
                    <el-option-group v-for="group in pageGroups" :key="group.id" :label="group.name">
                      <el-option
                        v-for="page in group.pages"
                        :key="page.key"
                        :label="page.title"
                        :value="page.key"
                      />
                    </el-option-group>
                  </el-select>
                </div>
                <div>
                  <el-button :disabled="!selectedPage" @click="openPage()">打开页面</el-button>
                  <el-button
                    type="primary"
                    :icon="CopyDocument"
                    :disabled="!selectedPage"
                    @click="copySelectedPageContext"
                  >
                    复制页面上下文
                  </el-button>
                </div>
              </div>

              <div v-if="selectedPage" class="page-context-body">
                <section class="page-identity">
                  <span>{{ selectedPage.clientName }} · {{ selectedPage.sectionTitle || '未分组' }}</span>
                  <h2>{{ selectedPage.title }}</h2>
                  <code>{{ selectedPage.fullPath }}</code>
                  <dl>
                    <div>
                      <dt>页面来源</dt>
                      <dd>{{ selectedPage.sourceType }}</dd>
                    </div>
                    <div>
                      <dt>源文件</dt>
                      <dd>{{ selectedPage.source || '未登记' }}</dd>
                    </div>
                    <div>
                      <dt>组件关联</dt>
                      <dd>{{ selectedPageBindings.length }}</dd>
                    </div>
                    <div>
                      <dt>检查问题</dt>
                      <dd>{{ selectedPageIssues.length }}</dd>
                    </div>
                  </dl>
                </section>

                <section class="requirement-context">
                  <div class="requirement-context__heading">
                    <div>
                      <span>关联需求</span>
                      <h3>{{ selectedRequirement?.title || '尚未关联 PRD' }}</h3>
                    </div>
                    <el-tag :type="selectedRequirement ? 'success' : 'warning'" effect="light">
                      {{ selectedRequirement ? '关联有效' : '待关联' }}
                    </el-tag>
                  </div>
                  <template v-if="selectedRequirement">
                    <code>{{ selectedRequirement.path }}</code>
                    <ol v-if="selectedRequirement.headings.length" class="heading-list">
                      <li
                        v-for="heading in selectedRequirement.headings"
                        :key="heading.id"
                        :class="`level-${heading.level}`"
                      >
                        {{ heading.text }}
                      </li>
                    </ol>
                    <p v-else class="context-muted">文档没有可提取的一级至三级标题。</p>
                  </template>
                  <p v-else class="context-muted">
                    可到“关联建议”查看规则匹配结果，或在路由菜单管理中手动指定 PRD。
                  </p>
                </section>
              </div>
            </el-tab-pane>

            <el-tab-pane :label="`追溯矩阵 ${context.summary.pages}`" name="traceability">
              <div class="tab-heading">
                <div>
                  <h2>页面、PRD 与组件追溯矩阵</h2>
                  <p>按客户端列出每个页面的来源、页面级 PRD、组件级关联和待处理问题。</p>
                </div>
                <el-button :icon="Download" @click="exportTraceability">导出矩阵</el-button>
              </div>
              <el-table :data="traceability" class="context-table" table-layout="fixed" max-height="560">
                <el-table-column label="页面" min-width="230">
                  <template #default="{ row }">
                    <strong>{{ row.page.title }}</strong>
                    <small>{{ row.client.name }} · {{ row.page.path }}</small>
                  </template>
                </el-table-column>
                <el-table-column label="来源" min-width="190">
                  <template #default="{ row }">
                    <strong>{{ row.page.sourceType }}</strong>
                    <small>{{ row.page.source || '未登记源文件' }}</small>
                  </template>
                </el-table-column>
                <el-table-column label="页面 PRD" min-width="260">
                  <template #default="{ row }">
                    <template v-if="row.requirement">
                      <strong>{{ row.requirement.title }}</strong>
                      <small>{{ row.requirement.path }}</small>
                    </template>
                    <span v-else class="context-muted">未关联</span>
                  </template>
                </el-table-column>
                <el-table-column label="组件关联" width="110" align="center">
                  <template #default="{ row }">{{ row.componentBindings.length }}</template>
                </el-table-column>
                <el-table-column label="状态" width="110" align="center">
                  <template #default="{ row }">
                    <el-tag :type="row.status === 'covered' ? 'success' : 'warning'" effect="light">
                      {{ row.status === 'covered' ? '已覆盖' : '待关联' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="问题" width="90" align="center">
                  <template #default="{ row }">{{ row.issues.length }}</template>
                </el-table-column>
              </el-table>
            </el-tab-pane>

            <el-tab-pane :label="`PRD 索引 ${context.summary.documents}`" name="documents">
              <div class="tab-heading">
                <div>
                  <h2>项目 PRD 清单</h2>
                  <p>来自当前项目文档目录的 Markdown 文件；归档文档保留显示，但不参与自动关联建议。</p>
                </div>
                <span>{{ context.summary.linkedDocuments }} 份已被页面使用</span>
              </div>
              <el-table
                v-if="context.documents.length"
                :data="context.documents"
                class="context-table"
                table-layout="fixed"
                max-height="520"
              >
                <el-table-column label="PRD" min-width="320">
                  <template #default="{ row }">
                    <strong>{{ row.title }}</strong>
                    <small>{{ row.path }}</small>
                  </template>
                </el-table-column>
                <el-table-column label="文档结构" width="110" align="center">
                  <template #default="{ row }">{{ row.headings.length }} 个标题</template>
                </el-table-column>
                <el-table-column label="关联页面" min-width="320">
                  <template #default="{ row }">
                    <span v-if="row.linkedPageKeys.length" class="impact-pages">
                      <button
                        v-for="pageKey in row.linkedPageKeys"
                        :key="pageKey"
                        type="button"
                        @click="
                          selectedPageKey = pageKey;
                          activeTab = 'page';
                        "
                      >
                        {{ pageTitle(pageKey) }}
                      </button>
                    </span>
                    <span v-else class="context-muted">暂无页面级关联</span>
                  </template>
                </el-table-column>
                <el-table-column label="组件关联" width="110" align="center">
                  <template #default="{ row }">{{ row.componentBindingIds.length }}</template>
                </el-table-column>
                <el-table-column label="状态" width="100" align="center">
                  <template #default="{ row }">
                    <el-tag
                      :type="row.archived ? 'info' : row.contentAvailable ? 'success' : 'warning'"
                      effect="light"
                    >
                      {{ row.archived ? '归档' : row.contentAvailable ? '可读取' : '正文失败' }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-else description="当前项目没有可读取的 Markdown 文档" />
            </el-tab-pane>

            <el-tab-pane :label="`关联建议 ${context.summary.suggestions || ''}`" name="suggestions">
              <div class="tab-heading">
                <div>
                  <h2>页面与 PRD 关联建议</h2>
                  <p>根据标题、路由、源文件名和目录生成候选；系统不会自动写入，必须由你确认。</p>
                </div>
                <el-tag effect="plain">规则匹配，不是模型结论</el-tag>
              </div>
              <el-table
                v-if="context.suggestions.length"
                :data="context.suggestions"
                class="context-table"
                table-layout="fixed"
              >
                <el-table-column label="页面" min-width="230">
                  <template #default="{ row }">
                    <strong>{{ row.page.title }}</strong>
                    <small>{{ row.page.clientName }} · {{ row.page.fullPath }}</small>
                  </template>
                </el-table-column>
                <el-table-column label="建议 PRD" min-width="360">
                  <template #default="{ row }">
                    <el-select v-model="suggestionSelections[row.pageKey]" class="suggestion-select">
                      <el-option
                        v-for="candidate in row.candidates"
                        :key="candidate.path"
                        :label="`${candidate.title} · ${candidate.path}`"
                        :value="candidate.path"
                      />
                    </el-select>
                    <small>{{
                      row.candidates
                        .find((item) => item.path === suggestionSelections[row.pageKey])
                        ?.reasons.join('；')
                    }}</small>
                  </template>
                </el-table-column>
                <el-table-column label="可信度" width="120" align="center">
                  <template #default="{ row }">
                    <el-tag
                      :type="
                        confidenceTagType(
                          row.candidates.find((item) => item.path === suggestionSelections[row.pageKey])
                            ?.confidence,
                        )
                      "
                      effect="light"
                    >
                      {{
                        confidenceLabel(
                          row.candidates.find((item) => item.path === suggestionSelections[row.pageKey])
                            ?.confidence,
                        )
                      }}
                      {{
                        Math.round(
                          (row.candidates.find((item) => item.path === suggestionSelections[row.pageKey])
                            ?.score || 0) * 100,
                        )
                      }}%
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="140" align="right">
                  <template #default="{ row }">
                    <el-button
                      type="primary"
                      link
                      :icon="Link"
                      :disabled="!canEditAssociations"
                      :loading="savingPageKey === row.pageKey"
                      @click="confirmSuggestion(row)"
                      >确认关联</el-button
                    >
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-else description="当前没有达到建议阈值的未关联页面" />
              <p v-if="!canEditAssociations" class="static-note">
                静态部署只提供查看和导出；关联确认请在本机开发环境操作。
              </p>
            </el-tab-pane>

            <el-tab-pane label="PRD 影响分析" name="impact">
              <div class="tab-heading">
                <div>
                  <h2>PRD 变更影响</h2>
                  <p>比较当前文档与浏览器本地基线，并列出通过页面或组件关联可能受影响的范围。</p>
                </div>
                <el-button type="primary" plain @click="updateBaseline">
                  {{ impact?.status === 'uninitialized' ? '建立分析基线' : '更新分析基线' }}
                </el-button>
              </div>

              <el-alert
                v-if="impact?.status === 'uninitialized'"
                title="尚未建立 PRD 变更基线"
                description="第一次建立基线只会写入当前浏览器的 localStorage，不会修改 PRD 或项目包。后续文档变化会在这里显示影响页面。"
                type="info"
                :closable="false"
                show-icon
              />
              <template v-else>
                <div class="impact-summary">
                  <span>基线：{{ impact.baselineCapturedAt?.replace('T', ' ').slice(0, 19) }}</span>
                  <strong>{{
                    impact.changes.length ? `${impact.changes.length} 份文档有变化` : '当前文档与基线一致'
                  }}</strong>
                  <span>影响 {{ impact.summary.impactedPages }} 个已关联页面</span>
                </div>
                <el-table
                  v-if="impact.changes.length"
                  :data="impact.changes"
                  class="context-table"
                  table-layout="fixed"
                >
                  <el-table-column label="变化" width="90">
                    <template #default="{ row }">
                      <el-tag :type="impactTagType(row.type)" effect="light">{{
                        impactTypeLabel(row.type)
                      }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="path" label="PRD 文件" min-width="360" show-overflow-tooltip />
                  <el-table-column label="影响页面" min-width="360">
                    <template #default="{ row }">
                      <span v-if="row.linkedPageKeys.length" class="impact-pages">
                        <button
                          v-for="pageKey in row.linkedPageKeys"
                          :key="pageKey"
                          type="button"
                          @click="
                            selectedPageKey = pageKey;
                            activeTab = 'page';
                          "
                        >
                          {{ pageTitle(pageKey) }}
                        </button>
                      </span>
                      <span v-else class="context-muted">没有页面级关联</span>
                    </template>
                  </el-table-column>
                </el-table>
                <el-empty v-else description="当前没有检测到 PRD 变化" />
              </template>
            </el-tab-pane>
          </el-tabs>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.ai-context-shell {
  display: grid;
  gap: 18px;
}

.ai-context-hero,
.ai-context-actions,
.ai-context-title,
.ai-context-back,
.local-badge,
.context-summary,
.page-context-toolbar,
.requirement-context__heading,
.impact-summary {
  display: flex;
  align-items: center;
}

.ai-context-hero {
  justify-content: space-between;
  gap: 28px;
  padding: 18px 22px;
}

.ai-context-hero__copy {
  display: grid;
  gap: 13px;
  min-width: 0;
}

.ai-context-back {
  width: fit-content;
  gap: 5px;
  color: var(--platform-color-text-secondary);
  font-size: 12px;
  font-weight: 650;
}

.ai-context-back:hover {
  color: var(--platform-color-accent);
}

.ai-context-title {
  align-items: flex-start;
  gap: 13px;
}

.ai-context-title__icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 13px;
  background: var(--platform-color-accent-soft);
  color: var(--platform-color-accent);
  font-size: 20px;
}

.ai-context-title span,
.tab-heading > span {
  color: var(--platform-color-accent);
  font-size: 10px;
  font-weight: 760;
  letter-spacing: 0.14em;
}

.ai-context-title h1 {
  margin-top: 2px;
  font-size: 25px;
  font-weight: 780;
  letter-spacing: -0.035em;
}

.ai-context-title p,
.tab-heading p,
.context-muted,
.static-note {
  color: var(--platform-color-text-secondary);
}

.ai-context-title p {
  margin-top: 3px;
  font-size: 13px;
}

.ai-context-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 9px;
}

.local-badge {
  gap: 7px;
  width: 100%;
  justify-content: flex-end;
  color: var(--platform-color-text-secondary);
  font-size: 11px;
  font-weight: 650;
}

.local-badge i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #16a34a;
  box-shadow: 0 0 0 4px rgb(22 163 74 / 10%);
}

.project-select {
  width: 190px;
}

.context-state {
  min-height: 420px;
  padding: 28px;
}

.context-summary {
  gap: 28px;
  padding: 17px 22px;
}

.coverage-summary {
  width: 250px;
  flex: 0 0 auto;
}

.coverage-summary span,
.context-summary dt {
  color: var(--platform-color-text-secondary);
  font-size: 11px;
  font-weight: 650;
}

.coverage-summary strong {
  float: right;
  font-size: 18px;
  line-height: 1;
}

.coverage-summary :deep(.el-progress) {
  clear: both;
  padding-top: 8px;
}

.context-summary dl {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(5, minmax(80px, 1fr));
  margin: 0;
}

.context-summary dl > div {
  padding: 0 20px;
  border-left: 0.5px solid var(--platform-color-border);
}

.context-summary dd {
  margin: 5px 0 0;
  font-size: 20px;
  font-weight: 760;
}

.context-summary .is-warning dd {
  color: #d97706;
}

.context-workspace {
  min-height: 570px;
  padding: 0 22px 24px;
  overflow: hidden;
}

.context-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.context-tabs :deep(.el-tabs__item) {
  height: 54px;
  font-weight: 680;
}

.context-tabs :deep(.el-tabs__content) {
  padding-top: 22px;
}

.tab-heading,
.page-context-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 22px;
  margin-bottom: 18px;
}

.tab-heading {
  align-items: flex-start;
}

.tab-heading h2 {
  font-size: 18px;
  letter-spacing: -0.02em;
}

.tab-heading p {
  margin-top: 5px;
  font-size: 12px;
}

.overview-callouts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 18px;
  border: 0.5px solid var(--platform-color-border);
  border-radius: 13px;
  background: var(--platform-color-surface-soft);
}

.overview-callouts > div {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 54px;
  padding: 0 16px;
  color: var(--platform-color-text-secondary);
  font-size: 12px;
}

.overview-callouts > div + div {
  border-left: 0.5px solid var(--platform-color-border);
}

.overview-callouts .el-icon {
  color: var(--platform-color-accent);
  font-size: 17px;
}

.overview-callouts strong {
  color: var(--platform-color-text);
  font-size: 15px;
}

.context-table {
  width: 100%;
  border: 0.5px solid var(--platform-color-border);
  border-radius: 13px;
  overflow: hidden;
}

.context-table strong,
.context-table small {
  display: block;
}

.context-table small {
  margin-top: 4px;
  overflow: hidden;
  color: var(--platform-color-text-secondary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-context-toolbar {
  align-items: flex-end;
}

.page-context-toolbar > div {
  display: flex;
  align-items: center;
  gap: 9px;
}

.page-context-toolbar label {
  color: var(--platform-color-text-secondary);
  font-size: 12px;
  font-weight: 680;
}

.page-context-select {
  width: min(420px, 44vw);
}

.page-context-body {
  display: grid;
  grid-template-columns: minmax(280px, 0.7fr) minmax(420px, 1.3fr);
  border: 0.5px solid var(--platform-color-border);
  border-radius: 15px;
  overflow: hidden;
}

.page-identity,
.requirement-context {
  min-width: 0;
  padding: 24px;
}

.page-identity {
  background: var(--platform-color-surface-soft);
}

.page-identity > span,
.requirement-context__heading span {
  color: var(--platform-color-text-secondary);
  font-size: 11px;
  font-weight: 670;
}

.page-identity h2 {
  margin-top: 7px;
  font-size: 22px;
  letter-spacing: -0.03em;
}

.page-identity > code,
.requirement-context > code {
  display: block;
  margin-top: 9px;
  overflow: hidden;
  color: var(--platform-color-text-secondary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-identity dl {
  display: grid;
  gap: 0;
  margin: 24px 0 0;
}

.page-identity dl > div {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 14px;
  padding: 9px 0;
  border-top: 0.5px solid var(--platform-color-border);
  font-size: 12px;
}

.page-identity dt {
  color: var(--platform-color-text-secondary);
}

.page-identity dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.requirement-context {
  border-left: 0.5px solid var(--platform-color-border);
}

.requirement-context__heading {
  justify-content: space-between;
  gap: 18px;
}

.requirement-context__heading h3 {
  margin-top: 5px;
  font-size: 17px;
}

.heading-list {
  max-height: 285px;
  margin: 20px 0 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.heading-list li {
  padding: 7px 10px;
  border-left: 2px solid transparent;
  color: var(--platform-color-text-secondary);
  font-size: 12px;
}

.heading-list li:hover {
  border-left-color: var(--platform-color-accent);
  background: var(--platform-color-accent-soft);
  color: var(--platform-color-text);
}

.heading-list .level-2 {
  padding-left: 24px;
}

.heading-list .level-3 {
  padding-left: 38px;
}

.context-muted {
  font-size: 12px;
}

.requirement-context > .context-muted {
  margin-top: 22px;
}

.suggestion-select {
  width: 100%;
}

.static-note {
  margin-top: 13px;
  font-size: 11px;
}

.impact-summary {
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--platform-color-surface-soft);
  color: var(--platform-color-text-secondary);
  font-size: 12px;
}

.impact-summary strong {
  color: var(--platform-color-text);
  font-size: 14px;
}

.impact-pages {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.impact-pages button {
  padding: 3px 7px;
  border: 0;
  border-radius: 6px;
  background: var(--platform-color-accent-soft);
  color: var(--platform-color-accent);
  font-size: 11px;
}

@media (max-width: 960px) {
  .ai-context-hero,
  .context-summary,
  .page-context-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .ai-context-actions,
  .local-badge {
    width: 100%;
    justify-content: flex-start;
  }

  .coverage-summary,
  .page-context-select {
    width: 100%;
  }

  .context-summary dl {
    width: 100%;
  }

  .context-summary dl > div:first-child {
    border-left: 0;
  }

  .page-context-body {
    grid-template-columns: 1fr;
  }

  .requirement-context {
    border-top: 0.5px solid var(--platform-color-border);
    border-left: 0;
  }
}

@media (max-width: 640px) {
  .context-summary dl,
  .overview-callouts {
    grid-template-columns: 1fr;
  }

  .context-summary dl > div,
  .overview-callouts > div + div {
    border-top: 0.5px solid var(--platform-color-border);
    border-left: 0;
  }

  .context-summary dl > div {
    padding: 10px 0;
  }
}
</style>
