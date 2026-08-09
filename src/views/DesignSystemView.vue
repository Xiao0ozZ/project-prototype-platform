<script setup>
import { computed, reactive, ref } from 'vue';
import { ArrowLeft, Check, Close, Edit, Grid, Plus, RefreshRight, Search } from '@element-plus/icons-vue';
import {
  ContentPanel,
  DataTablePanel,
  DetailList,
  EmptyState,
  EntityDetailHeader,
  FileImportDialog,
  FilterBar,
  FilterIconButton,
  FormDialog,
  FormSection,
  InfoBanner,
  ListActionGroup,
  PageHeader,
  PageLayout,
  ReasonConfirmDialog,
  StatCard,
  StatusTag,
  SummaryGrid,
  TablePagination,
} from '../components/ui';
import { useDialogState } from '../composables/useDialogState';
import { usePagination } from '../composables/usePagination';
import { useResettableFilters } from '../composables/useResettableFilters';
import { useSelectableStats } from '../composables/useSelectableStats';

const { selectedStat, selectStat } = useSelectableStats('all');
const { visible: dialogVisible, open: openDialog, close: closeDialog } = useDialogState();
const { currentPage, pageSize, pageSizes } = usePagination({ pageSize: 10 });
const { filters, resetFilters } = useResettableFilters(() => ({ keyword: '', status: '' }));
const advancedOpen = ref(false);
const selectedCount = ref(2);
const importDialogVisible = ref(false);
const importStatus = ref('ready');
const importFileName = ref('平台账户导入模板.xlsx');
const reasonDialogVisible = ref(false);
const operationReason = ref('');

const form = reactive({ name: '', type: '', remark: '' });
const stats = [
  { key: 'all', label: '全部订单', value: 128 },
  { key: 'pending', label: '待处理', value: 18 },
  { key: 'active', label: '履约中', value: 42 },
  { key: 'risk', label: '异常风险', value: 3 },
];
const batchActions = [
  { command: 'enable', label: '批量启用', icon: Check },
  { command: 'disable', label: '批量停用', icon: Close },
];
const importSummary = [
  { label: '资料总数', value: 12 },
  { label: '导入成功', value: 10, type: 'success' },
  { label: '导入异常', value: 2, type: 'danger' },
];
const importErrors = [
  { row: 3, name: '王小明', reason: '手机号重复' },
  { row: 8, name: '陈怡君', reason: '缺少手机号' },
];
const importErrorColumns = [
  { prop: 'row', label: '行号' },
  { prop: 'name', label: '姓名' },
  { prop: 'reason', label: '异常原因' },
];
const rows = [
  { id: 'DEMO-001', customer: '王小明', service: '门市租车', status: '履约中', type: 'success' },
  { id: 'DEMO-002', customer: '陈怡君', service: '分时租赁', status: '待处理', type: 'warning' },
  { id: 'DEMO-003', customer: '林冠宇', service: '公务车', status: '异常', type: 'danger' },
];
const detailItems = [
  { label: '订单编号', value: 'DEMO-001' },
  { label: '业务类型', value: '门市租车' },
  { label: '客户姓名', value: '王小明' },
  { label: '订单状态', value: '履约中', key: 'status' },
  { label: '取还据点', value: '台北总部地下停车场', span: 2 },
];

const activeFilterText = computed(() =>
  selectedStat.value ? '当前筛选：' + selectedStat.value : '未选择统计卡片',
);

function clearSelection() {
  selectedCount.value = 0;
}

function openImportDialog() {
  importFileName.value = '平台账户导入模板.xlsx';
  importStatus.value = 'ready';
  importDialogVisible.value = true;
}

function removeImportFile() {
  importFileName.value = '';
  importStatus.value = 'idle';
}

function confirmImport() {
  importStatus.value = 'success';
}

function confirmReason() {
  reasonDialogVisible.value = false;
  operationReason.value = '';
}
</script>

<template>
  <main class="design-system-page platform-page">
    <PageLayout class="design-system-shell">
      <div class="catalog-nav platform-material">
        <RouterLink to="/" class="back-link">
          <el-icon><ArrowLeft /></el-icon>
          返回项目首页
        </RouterLink>
        <span>组件规范 v3.1 · 20 个公共组件</span>
      </div>

      <div class="design-hero platform-hero">
        <div class="design-hero__icon">
          <el-icon><Grid /></el-icon>
        </div>
        <div class="design-hero__body">
          <p class="eyebrow">DESIGN SYSTEM</p>
          <PageHeader
            class="design-page-header"
            title="平台通用组件规范"
            description="新页面直接复用完整页面结构；历史页面保持稳定，不做批量组件化改写。"
          >
            <template #actions>
              <el-button :icon="Plus" type="primary" size="large" @click="openDialog">新增示例</el-button>
            </template>
          </PageHeader>
        </div>
      </div>

      <section class="token-strip" aria-label="设计变量">
        <div>
          <span class="token-dot primary"></span><strong>主色</strong><small>--app-color-primary</small>
        </div>
        <div><span class="token-dot success"></span><strong>成功</strong><small>#16A34A</small></div>
        <div><span class="token-dot warning"></span><strong>提醒</strong><small>#F59E0B</small></div>
        <div><span class="token-dot danger"></span><strong>异常</strong><small>#DC2626</small></div>
        <div><strong>面板圆角</strong><small>8px</small></div>
        <div><strong>基础间距</strong><small>4 / 8 / 12 / 16 / 24</small></div>
      </section>

      <InfoBanner
        title="组件使用边界"
        description="PageLayout、SummaryGrid、DataTablePanel 等负责稳定结构；业务字段、权限、状态流和接口调用仍由页面实现。"
      >
        <template #actions><el-button type="primary" link>查看规范</el-button></template>
      </InfoBanner>

      <ContentPanel title="页面概览与统计卡片" class="section-panel">
        <template #actions
          ><span class="section-note">{{ activeFilterText }}</span></template
        >
        <SummaryGrid>
          <StatCard
            v-for="item in stats"
            :key="item.key"
            :label="item.label"
            :value="item.value"
            :active="selectedStat === item.key"
            @click="selectStat(item.key)"
          />
        </SummaryGrid>
      </ContentPanel>

      <DataTablePanel class="section-panel">
        <template #filters>
          <FilterBar v-model:advanced-open="advancedOpen" :advanced-count="2">
            <el-input
              v-model="filters.keyword"
              :prefix-icon="Search"
              clearable
              placeholder="订单号 / 客户名称"
              style="width: 240px"
            />
            <el-select v-model="filters.status" clearable placeholder="订单状态" style="width: 150px">
              <el-option label="待处理" value="pending" />
              <el-option label="履约中" value="active" />
              <el-option label="已完成" value="completed" />
            </el-select>
            <FilterIconButton label="查询" :icon="Search" type="primary" />
            <FilterIconButton label="重置筛选" :icon="RefreshRight" @click="resetFilters" />
            <template #actions>
              <ListActionGroup
                :selected-count="selectedCount"
                :batch-actions="batchActions"
                clearable
                @import="openImportDialog"
                @clear-selection="clearSelection"
              />
            </template>
            <template #summary><span>共 128 笔订单</span></template>
            <template #advanced>
              <div class="advanced-filter-grid">
                <el-select clearable placeholder="业务类型">
                  <el-option label="门市租车" value="store" />
                  <el-option label="分时租赁" value="time-share" />
                </el-select>
                <el-select clearable placeholder="费用状态">
                  <el-option label="已结清" value="paid" />
                  <el-option label="待处理" value="pending" />
                </el-select>
                <el-date-picker type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" />
              </div>
            </template>
          </FilterBar>
        </template>

        <el-table :data="rows" stripe style="width: 100%">
          <el-table-column prop="id" label="订单号" width="180" />
          <el-table-column prop="customer" label="客户" />
          <el-table-column prop="service" label="业务类型" />
          <el-table-column label="状态" width="120">
            <template #default="{ row }"
              ><StatusTag :type="row.type">{{ row.status }}</StatusTag></template
            >
          </el-table-column>
          <el-table-column label="操作" width="120" align="right">
            <template #default><el-button type="primary" link>查看</el-button></template>
          </el-table-column>
        </el-table>

        <template #pagination>
          <TablePagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="pageSizes"
            :total="128"
          />
        </template>
      </DataTablePanel>

      <ContentPanel title="详情页头部与业务分区" class="section-panel detail-page-demo">
        <div class="detail-page-demo__content">
          <EntityDetailHeader
            title="王小明"
            subtitle="个人会员 · MEMBER-20260714001"
            leading-text="王"
            :tags="[
              { label: '正常', type: 'success' },
              { label: '金牌会员', type: 'warning' },
            ]"
            :meta-items="[
              { label: '手机号：', value: '0912-345-678' },
              { label: '注册时间：', value: '2026-07-14 09:30' },
            ]"
          >
            <template #actions>
              <el-button :icon="Edit" type="primary">编辑资料</el-button>
              <el-button plain>冻结</el-button>
            </template>
          </EntityDetailHeader>
          <ContentPanel title="基础资料" class="section-panel">
            <DetailList
              :items="[
                { label: '姓名', value: '王小明' },
                { label: '手机号', value: '0912-345-678' },
                { label: '会员编号', value: 'MEMBER-20260714001' },
                { label: '注册时间', value: '2026-07-14 09:30' },
              ]"
            />
          </ContentPanel>
          <ContentPanel title="业务资格" class="section-panel">
            <template #meta><StatusTag type="success">资料有效</StatusTag></template>
            <DetailList
              :items="[
                { label: '会员方案', value: '金牌会员' },
                { label: '账号状态', value: '正常', key: 'status' },
                { label: '可用载具', value: '轿车、摩托车', span: 2 },
              ]"
            >
              <template #value="{ item }">
                <StatusTag v-if="item.key === 'status'" type="success">{{ item.value }}</StatusTag>
                <span v-else>{{ item.value }}</span>
              </template>
            </DetailList>
          </ContentPanel>
          <ContentPanel title="操作记录" class="section-panel" :padded="false">
            <el-table
              :data="[
                {
                  time: '2026-07-14 10:20',
                  type: '编辑资料',
                  operator: 'Admin',
                  content: '更新可用载具类型',
                },
                { time: '2026-07-12 15:40', type: '会员审核', operator: '陈怡君', content: '资料审核通过' },
              ]"
              stripe
            >
              <el-table-column prop="time" label="操作时间" width="180" />
              <el-table-column prop="type" label="操作类型" width="130" />
              <el-table-column prop="operator" label="操作人" width="120" />
              <el-table-column prop="content" label="操作内容" />
            </el-table>
          </ContentPanel>
        </div>
      </ContentPanel>

      <div class="two-column-grid">
        <ContentPanel title="详情字段" class="section-panel">
          <DetailList :items="detailItems">
            <template #value="{ item }">
              <StatusTag v-if="item.key === 'status'" type="success">{{ item.value }}</StatusTag>
              <span v-else>{{ item.value }}</span>
            </template>
          </DetailList>
        </ContentPanel>

        <ContentPanel title="反馈与空状态" class="section-panel feedback-panel">
          <InfoBanner type="warning" title="资料待补充" description="仍有 2 项必要资料尚未填写。" />
          <div class="feedback-panel__actions">
            <el-button type="danger" plain @click="reasonDialogVisible = true">停用账户</el-button>
            <span>编辑、删除、查看等业务操作使用文字按钮；需要原因时通过确认弹窗收口。</span>
          </div>
          <EmptyState title="暂无操作记录" description="完成第一笔操作后，记录会显示在这里。">
            <template #actions><el-button type="primary" plain>建立记录</el-button></template>
          </EmptyState>
        </ContentPanel>
      </div>

      <ContentPanel title="状态标签" class="section-panel">
        <div class="tag-row">
          <StatusTag type="primary">处理中</StatusTag>
          <StatusTag type="success">已完成</StatusTag>
          <StatusTag type="warning">待确认</StatusTag>
          <StatusTag type="danger">异常</StatusTag>
          <StatusTag type="info">已关闭</StatusTag>
        </div>
      </ContentPanel>
    </PageLayout>

    <FormDialog
      v-model="dialogVisible"
      title="新增示例"
      confirm-text="保存"
      @cancel="closeDialog"
      @confirm="closeDialog"
    >
      <el-form label-position="top" :model="form">
        <FormSection title="基础资料" description="填写这笔资料的识别信息和业务类型。">
          <el-form-item label="名称" required
            ><el-input v-model="form.name" placeholder="请输入名称"
          /></el-form-item>
          <el-form-item label="业务类型" required>
            <el-select v-model="form.type" placeholder="请选择业务类型" style="width: 100%">
              <el-option label="门市租车" value="store" />
              <el-option label="分时租赁" value="time-share" />
              <el-option label="公务车" value="official" />
            </el-select>
          </el-form-item>
        </FormSection>
        <FormSection title="补充说明" :columns="1">
          <el-form-item label="说明"
            ><el-input v-model="form.remark" type="textarea" :rows="3"
          /></el-form-item>
        </FormSection>
      </el-form>
    </FormDialog>
    <FileImportDialog
      v-model="importDialogVisible"
      title="导入账户资料"
      :file-name="importFileName"
      :status="importStatus"
      :summary-items="importSummary"
      :errors="importErrors"
      :error-columns="importErrorColumns"
      @select-file="
        importFileName = $event.name;
        importStatus = 'ready';
      "
      @remove-file="removeImportFile"
      @confirm="confirmImport"
    />
    <ReasonConfirmDialog
      v-model="reasonDialogVisible"
      v-model:reason="operationReason"
      title="确认停用账户"
      description="停用后，该账户将无法继续登录。请填写操作原因以便后续追溯。"
      confirm-text="确认停用"
      @confirm="confirmReason"
    />
  </main>
</template>

<style scoped>
.design-system-page {
  min-height: 100vh;
  padding: 24px;
  --app-color-primary: var(--platform-color-accent);
  --app-color-primary-rgb: var(--platform-color-accent-rgb);
  color: var(--app-color-text-primary);
}
.design-system-shell {
  width: min(1180px, 100%);
}
.catalog-nav {
  position: sticky;
  top: 12px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 46px;
  padding: 0 14px;
  border-radius: 14px;
  color: var(--app-color-text-muted);
  font-size: var(--app-font-size-sm);
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--app-color-primary);
  font-weight: 600;
}
.design-hero {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px 22px;
}
.design-hero__icon {
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
.design-hero__body {
  min-width: 0;
  flex: 1;
}
.eyebrow {
  margin: 0 0 8px;
  color: var(--app-color-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
}
.design-page-header {
  margin-bottom: 0;
}
.design-page-header :deep(h1) {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.2;
}
.design-page-header :deep(p) {
  margin-top: 5px;
  color: var(--app-color-text-muted);
  font-size: 13px;
  line-height: 1.6;
}
.token-strip {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--app-color-border);
  border-radius: var(--app-radius-panel);
  background: var(--app-color-border);
}
.token-strip > div {
  display: grid;
  min-height: 82px;
  align-content: center;
  gap: 4px;
  padding: 14px;
  background: var(--app-color-surface);
}
.token-strip strong {
  font-size: var(--app-font-size-sm);
}
.token-strip small,
.section-note {
  color: var(--app-color-text-muted);
  font-size: var(--app-font-size-xs);
}
.token-dot {
  width: 22px;
  height: 6px;
  margin-bottom: 4px;
  border-radius: 2px;
}
.token-dot.primary {
  background: var(--app-color-primary);
}
.token-dot.success {
  background: var(--app-color-success);
}
.token-dot.warning {
  background: var(--app-color-warning);
}
.token-dot.danger {
  background: var(--app-color-danger);
}
.two-column-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--app-space-4);
}
.feedback-panel :deep(.ui-content-panel__body) {
  display: grid;
  gap: var(--app-space-4);
}
.feedback-panel__actions {
  display: flex;
  align-items: center;
  gap: var(--app-space-3);
  color: var(--app-color-text-muted);
  font-size: var(--app-font-size-sm);
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--app-space-3);
}
.advanced-filter-grid {
  display: grid;
  grid-template-columns: 180px 180px minmax(260px, 1fr);
  gap: var(--app-space-3);
}
.detail-page-demo {
  min-width: 0;
}
.detail-page-demo__content {
  display: grid;
  gap: var(--app-space-4);
}
@media (max-width: 900px) {
  .token-strip {
    grid-template-columns: repeat(3, 1fr);
  }
  .two-column-grid {
    grid-template-columns: 1fr;
  }
  .advanced-filter-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 760px) {
  .catalog-nav > span {
    display: none;
  }
  .design-hero {
    gap: 10px;
  }
  .design-hero__icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
  }
  .design-page-header {
    align-items: stretch;
    flex-direction: column;
  }
  .design-page-header :deep(h1) {
    font-size: 30px;
  }
  .design-page-header :deep(.ui-page-header__actions) {
    width: 100%;
  }
}
</style>
