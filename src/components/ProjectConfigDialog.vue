<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="1180px"
    destroy-on-close
    :close-on-click-modal="false"
    class="project-dialog apple-tool-dialog"
    modal-class="apple-tool-overlay"
  >
    <template #header>
      <div class="project-dialog-heading">
        <div class="project-dialog-heading__icon">
          <span class="material-symbols-outlined" aria-hidden="true">tune</span>
        </div>
        <div class="project-dialog-heading__copy">
          <span class="project-dialog-heading__eyebrow">PROJECT CONFIGURATION</span>
          <strong>{{ dialogTitle }}</strong>
          <span>{{
            dialogMode === 'create'
              ? '从基础资料开始建立一个新的项目包。'
              : '调整当前项目的入口、品牌和工程能力。'
          }}</span>
        </div>
      </div>
    </template>
    <el-form
      ref="formRef"
      :model="form"
      :rules="formRules"
      label-position="top"
      label-width="auto"
      class="project-form"
    >
      <el-tabs v-model="activeConfigTab" class="project-config-tabs" tab-position="left">
        <el-tab-pane label="基础资料" name="basic" class="config-tab-pane config-tab-pane--basic">
          <template #label>
            <span class="config-tab-label">
              <span class="config-tab-label__index">01</span>
              <span><strong>基础资料</strong><small>名称、主题与品牌</small></span>
            </span>
          </template>
          <div class="config-tab-intro">
            <span class="config-tab-intro__eyebrow">IDENTITY & BRAND</span>
            <h2>项目身份与品牌</h2>
            <p>这些信息会出现在首页、客户端顶栏和项目入口中。</p>
          </div>
          <el-form-item label="项目 ID" prop="id" class="config-form-item config-form-item--wide">
            <el-input v-model="form.id" :disabled="dialogMode === 'edit'" placeholder="例如：demo-project" />
            <div class="form-help">仅使用小写英文字母、数字和连字符，创建后不能修改。</div>
          </el-form-item>
          <el-form-item label="项目名称" prop="name" class="config-form-item">
            <el-input v-model="form.name" placeholder="用于首页和页面顶栏显示" />
          </el-form-item>
          <el-form-item label="项目简称" prop="shortName" class="config-form-item">
            <el-input v-model="form.shortName" placeholder="用于空间较小的入口位置" />
          </el-form-item>
          <el-form-item label="项目版本" class="config-form-item">
            <el-input v-model="form.version" placeholder="例如：0.1.0" />
          </el-form-item>
          <el-form-item label="默认语言" class="config-form-item">
            <el-select v-model="form.defaultLocale" style="width: 220px">
              <el-option label="简体中文" value="zh-CN" />
              <el-option label="繁體中文" value="zh-TW" />
              <el-option label="English" value="en-US" />
            </el-select>
          </el-form-item>
          <el-form-item label="项目说明" class="config-form-item config-form-item--wide">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="2"
              placeholder="可选，用于项目首页说明"
            />
          </el-form-item>
          <el-form-item label="主题色" prop="primary" class="config-form-item">
            <div class="color-field">
              <el-color-picker v-model="form.primary" color-format="hex" />
              <el-input v-model="form.primary" maxlength="7" />
            </div>
          </el-form-item>
          <el-form-item label="内容区背景" prop="pageBackground" class="config-form-item">
            <div class="color-field">
              <el-color-picker v-model="form.pageBackground" color-format="hex" />
              <el-input v-model="form.pageBackground" maxlength="7" />
            </div>
          </el-form-item>
          <el-form-item label="项目 Logo" class="config-form-item config-form-item--wide">
            <div class="logo-field">
              <div class="logo-preview">
                <img v-if="logoPreview" :src="logoPreview" alt="项目 Logo 预览" />
                <span v-else>Logo</span>
              </div>
              <div class="logo-actions">
                <input
                  ref="logoInput"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  hidden
                  @change="handleLogoChange"
                />
                <el-button @click="chooseLogo">
                  <el-icon><Upload /></el-icon>
                  选择图片
                </el-button>
                <el-button v-if="logoPreview" link type="danger" @click="clearLogo">移除 Logo</el-button>
                <div class="form-help">支持 PNG、JPG、WebP、SVG，大小不超过 2 MB。</div>
              </div>
            </div>
          </el-form-item>
        </el-tab-pane>

        <el-tab-pane label="客户端入口" name="clients" class="config-tab-pane config-tab-pane--clients">
          <template #label>
            <span class="config-tab-label">
              <span class="config-tab-label__index">02</span>
              <span><strong>客户端入口</strong><small>入口名称与默认页</small></span>
            </span>
          </template>
          <div class="tab-intro-row">
            <div class="config-tab-intro">
              <span class="config-tab-intro__eyebrow">CLIENT ENTRY POINTS</span>
              <h2>客户端入口</h2>
              <p>控制首页展示哪些客户端，以及每个客户端进入后的默认行为。</p>
            </div>
            <el-button type="primary" plain size="small" @click="addClient">新增客户端入口</el-button>
          </div>
          <div class="client-config-list">
            <article v-for="client in form.clients" :key="client.id" class="client-config-card">
              <div class="client-config-card__header">
                <div>
                  <strong>{{ client.name || '未命名客户端' }}</strong>
                  <el-tag size="small" :type="client.isNew ? 'warning' : 'info'">
                    {{ client.id || '待填写 ID' }}
                  </el-tag>
                </div>
                <div class="client-config-card__actions">
                  <el-checkbox v-model="client.entryEnabled">在项目首页展示</el-checkbox>
                  <el-button
                    link
                    type="danger"
                    :disabled="form.clients.length <= 1"
                    :title="form.clients.length <= 1 ? '项目至少需要保留一个客户端' : '移除客户端配置'"
                    @click="removeClient(client)"
                  >
                    移除
                  </el-button>
                </div>
              </div>
              <div class="client-config-grid">
                <el-form-item v-if="client.isNew" label="客户端 ID" class="client-config-grid__wide">
                  <el-input v-model="client.id" placeholder="例如：admin、operation、enterprise" />
                  <div class="form-help">使用小写英文字母、数字和连字符；保存后作为客户端路由标识。</div>
                </el-form-item>
                <el-form-item label="入口名称">
                  <el-input v-model="client.name" placeholder="例如：营运端" />
                </el-form-item>
                <el-form-item label="入口图标">
                  <el-input v-model="client.entryIcon" placeholder="例如：Van、OfficeBuilding" />
                </el-form-item>
                <el-form-item label="入口顺序">
                  <el-input-number
                    v-model="client.entryOrder"
                    :min="1"
                    :max="999"
                    controls-position="right"
                  />
                </el-form-item>
                <el-form-item label="默认页面">
                  <el-input v-model="client.defaultPage" placeholder="例如：dashboard" />
                </el-form-item>
                <el-form-item label="登录账号">
                  <el-input v-model="client.loginAccount" placeholder="登录演示默认账号" />
                </el-form-item>
                <el-form-item label="租户代码">
                  <el-input v-model="client.tenantCode" placeholder="登录演示租户代码" />
                </el-form-item>
                <el-form-item label="客户端说明" class="client-config-grid__wide">
                  <el-input v-model="client.description" placeholder="用于首页入口卡片和客户端切换说明" />
                </el-form-item>
                <el-form-item label="登录背景路径" class="client-config-grid__wide">
                  <el-input
                    v-model="client.loginBackground"
                    placeholder="可选，例如：assets/auth/operation-login-bg.jpg"
                  />
                </el-form-item>
              </div>
            </article>
            <el-empty v-if="!form.clients.length" description="当前项目尚未登记客户端" />
          </div>
        </el-tab-pane>

        <el-tab-pane label="其他入口与能力" name="features" class="config-tab-pane config-tab-pane--features">
          <template #label>
            <span class="config-tab-label">
              <span class="config-tab-label__index">03</span>
              <span><strong>其他入口与能力</strong><small>文档、移动端与工具</small></span>
            </span>
          </template>
          <div class="config-tab-intro">
            <span class="config-tab-intro__eyebrow">PRODUCT CAPABILITIES</span>
            <h2>入口与工程能力</h2>
            <p>把项目资料和工程工具配置成适合当前项目的工作空间。</p>
          </div>
          <div class="resource-entry-list">
            <article v-for="entry in form.resourceEntries" :key="entry.kind" class="resource-entry-card">
              <div class="resource-entry-card__header">
                <div>
                  <strong>{{ entry.kind === 'docs' ? '文档中心' : '移动端' }}</strong>
                  <el-tag size="small" type="info">{{ entry.kind }}</el-tag>
                </div>
                <el-checkbox v-model="entry.enabled">在项目首页展示</el-checkbox>
              </div>
              <div class="client-config-grid">
                <el-form-item label="入口名称">
                  <el-input v-model="entry.name" />
                </el-form-item>
                <el-form-item label="入口图标">
                  <el-input v-model="entry.icon" placeholder="例如：Document、Iphone" />
                </el-form-item>
                <el-form-item label="入口顺序">
                  <el-input-number v-model="entry.order" :min="1" :max="999" controls-position="right" />
                </el-form-item>
                <el-form-item label="入口说明" class="client-config-grid__wide">
                  <el-input v-model="entry.description" />
                </el-form-item>
                <el-form-item v-if="entry.kind === 'docs'" label="PRD目录" class="client-config-grid__wide">
                  <el-input
                    v-model="form.docsRoot"
                    placeholder="支持项目内相对路径或本机绝对路径，例如：D:\\项目资料\\PRD"
                  />
                  <div class="form-help">
                    可直接指向工程外部的 PRD 文件夹；开发环境会实时读取，生产构建时会生成对应的文档快照。
                  </div>
                </el-form-item>
                <el-form-item v-else label="移动端文件" class="client-config-grid__wide">
                  <el-input v-model="form.mobileEntry" placeholder="项目内文件，例如：mobile/app.html" />
                </el-form-item>
              </div>
            </article>
          </div>

          <el-divider content-position="left">HTML 原型直读</el-divider>
          <section class="prototype-source-card">
            <div class="prototype-source-card__heading">
              <div>
                <strong>直接读取 HTML 原型</strong>
                <p>保留原 HTML 文件作为唯一页面源，不生成 Vue 副本；现有导入导出功能不受影响。</p>
              </div>
              <el-checkbox v-model="form.prototype.enabled">启用</el-checkbox>
            </div>
            <div v-if="form.clients.length" class="prototype-client-list">
              <article v-for="client in form.clients" :key="client.id" class="prototype-client-card">
                <div class="prototype-client-card__header">
                  <div>
                    <strong>{{ client.name }}</strong>
                    <el-tag size="small" type="info">{{ client.id }}</el-tag>
                    <p>为该客户端指定独立的 HTML 原型目录，目录内的页面会自动挂载到此客户端菜单。</p>
                  </div>
                  <el-checkbox
                    v-model="form.prototype.clients[client.id].enabled"
                    :disabled="!form.prototype.enabled"
                  >
                    读取此客户端
                  </el-checkbox>
                </div>
                <div class="client-config-grid">
                  <el-form-item label="HTML 原型目录" class="client-config-grid__wide">
                    <el-input
                      v-model="form.prototype.clients[client.id].root"
                      placeholder="支持项目内相对路径或本机绝对路径，例如：D:\\项目原型\\admin"
                      :disabled="!form.prototype.enabled || !form.prototype.clients[client.id].enabled"
                    />
                    <div class="form-help">
                      系统会递归扫描 HTML 文件，标题用于页面名称，文件相对路径用于生成稳定路由。
                    </div>
                  </el-form-item>
                  <el-form-item label="菜单分组">
                    <el-input
                      v-model="form.prototype.clients[client.id].section"
                      placeholder="可选，例如：workspace"
                      :disabled="!form.prototype.enabled || !form.prototype.clients[client.id].enabled"
                    />
                  </el-form-item>
                </div>
              </article>
            </div>
            <el-empty v-else description="请先登记至少一个客户端" />
            <div class="form-help prototype-source-card__help">
              每个客户端可以指向不同的 HTML
              文件夹；保存后开发环境会重新扫描，生产环境构建时会复制这些文件及其相对资源。
            </div>
          </section>

          <el-divider content-position="left">首页显示</el-divider>
          <div class="feature-switches">
            <el-checkbox v-model="form.homepageVisible">在首页项目选择中显示</el-checkbox>
          </div>

          <el-divider content-position="left">工程能力</el-divider>
          <div class="feature-switches">
            <el-checkbox v-model="form.features.pageTransfer">允许页面导入导出</el-checkbox>
            <el-checkbox v-model="form.features.designSystem">显示组件规范</el-checkbox>
            <el-checkbox v-model="form.features.legacyI18n">启用历史页面多语言映射</el-checkbox>
            <el-checkbox v-model="form.compatibility.legacyRoutes">保留历史路由兼容</el-checkbox>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-form>
    <template #footer>
      <div class="apple-dialog-footer">
        <span>保存后会重新扫描项目包并更新首页入口。</span>
        <div>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Upload } from '@element-plus/icons-vue';

import { getProjectAssetUrl } from '../services/project-assets';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'edit' },
  project: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'saved']);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});
const dialogMode = computed(() => props.mode);
const dialogTitle = computed(() => (dialogMode.value === 'create' ? '新建项目' : '编辑项目'));
const saving = ref(false);
const activeConfigTab = ref('basic');
const formRef = ref();
const logoInput = ref();
const logoPreview = ref('');
const form = reactive({
  id: '',
  name: '',
  shortName: '',
  version: '0.1.0',
  defaultLocale: 'zh-CN',
  description: '',
  primary: '#2563eb',
  pageBackground: '#f5f7fb',
  homepageVisible: true,
  clients: [],
  resourceEntries: [],
  docsRoot: 'docs',
  prototype: { enabled: false, root: 'prototype', client: '', section: '', clients: {} },
  mobileEntry: 'mobile/app.html',
  features: { pageTransfer: true, designSystem: true, legacyI18n: false },
  compatibility: { legacyRoutes: false },
  logoDataUrl: '',
  removeLogo: false,
});
const formRules = {
  id: [
    { required: true, message: '请输入项目 ID', trigger: 'blur' },
    { pattern: /^[a-z][a-z0-9-]*$/, message: '请输入小写 kebab-case，例如 demo-project', trigger: 'blur' },
  ],
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  shortName: [{ required: true, message: '请输入项目简称', trigger: 'blur' }],
  primary: [{ pattern: /^#[a-f\d]{6}$/i, message: '请输入六位十六进制色值', trigger: 'blur' }],
  pageBackground: [{ pattern: /^#[a-f\d]{6}$/i, message: '请输入六位十六进制色值', trigger: 'blur' }],
};

function createClientDraft(client = {}, entry = null) {
  return {
    id: client.id || '',
    isNew: Boolean(client.isNew),
    name: client.name || '',
    description: client.description || '',
    icon: client.icon || 'Document',
    defaultPage: client.defaultPage || '',
    loginAccount: client.login?.account || '',
    tenantCode: client.login?.tenantCode || '',
    loginBackground: client.login?.background || '',
    entryEnabled: Boolean(entry),
    entryIcon: entry?.icon || client.icon || 'Document',
    entryOrder: Number(entry?.order) || 10,
  };
}

function createResourceEntryDraft(kind, entry = null) {
  const defaults = {
    docs: { name: '产品文档', description: '阅读项目 PRD 与产品说明。', icon: 'Document', order: 40 },
    mobile: { name: '移动端', description: '查看移动端业务流程和页面交互。', icon: 'Iphone', order: 30 },
  };
  return {
    kind,
    enabled: Boolean(entry),
    name: entry?.name || defaults[kind].name,
    description: entry?.description || defaults[kind].description,
    icon: entry?.icon || defaults[kind].icon,
    order: Number(entry?.order) || defaults[kind].order,
  };
}

function createPrototypeClientDraft(config = {}) {
  return {
    enabled: Boolean(config.enabled),
    root: config.root || '',
    section: config.section || '',
  };
}

function createPrototypeClientMap(clients, prototype = {}) {
  const configuredClients = prototype.clients || {};
  const legacyClient = prototype.client || (clients.length === 1 ? clients[0]?.id : '');
  return Object.fromEntries(
    clients.map((client) => {
      const configured = Array.isArray(configuredClients)
        ? configuredClients.find((item) => (item?.clientId || item?.id) === client.id)
        : configuredClients[client.id];
      const legacyConfig =
        client.id === legacyClient
          ? {
              enabled: Boolean(prototype.enabled),
              root: prototype.root || 'prototype',
              section: prototype.section || '',
            }
          : {};
      return [client.id, createPrototypeClientDraft(configured || legacyConfig)];
    }),
  );
}

function syncPrototypeClientMap() {
  const validIds = new Set(form.clients.map((client) => client.id));
  form.clients.forEach((client) => {
    if (!client.id) return;
    form.prototype.clients[client.id] ||= createPrototypeClientDraft();
  });
  Object.keys(form.prototype.clients).forEach((clientId) => {
    if (!validIds.has(clientId)) delete form.prototype.clients[clientId];
  });
}

function resetForm() {
  Object.assign(form, {
    id: '',
    name: '',
    shortName: '',
    version: '0.1.0',
    defaultLocale: 'zh-CN',
    description: '',
    primary: '#2563eb',
    pageBackground: '#f5f7fb',
    homepageVisible: true,
    clients: [
      createClientDraft(
        {
          id: 'admin',
          name: '管理端',
          description: '项目管理后台。',
          icon: 'Management',
          defaultPage: 'home',
        },
        { name: '管理端', description: '进入项目管理后台。', icon: 'Management', order: 10 },
      ),
    ],
    resourceEntries: [
      createResourceEntryDraft('docs', {
        name: '产品文档',
        description: '阅读项目 PRD 与产品说明。',
        icon: 'Document',
        order: 20,
      }),
      createResourceEntryDraft('mobile'),
    ],
    docsRoot: 'docs',
    prototype: { enabled: false, root: 'prototype', client: '', section: '', clients: {} },
    mobileEntry: 'mobile/app.html',
    features: { pageTransfer: true, designSystem: true, legacyI18n: false },
    compatibility: { legacyRoutes: false },
    logoDataUrl: '',
    removeLogo: false,
  });
  form.prototype.clients = createPrototypeClientMap(form.clients);
  logoPreview.value = '';
  activeConfigTab.value = 'basic';
  if (logoInput.value) logoInput.value.value = '';
}

function hydrateProject(project) {
  resetForm();
  if (!project) return;
  const entries = project.entries || [];
  const projectClients = (project.clients || []).map((client) =>
    createClientDraft(
      client,
      entries.find((entry) => entry.kind === 'client' && entry.clientId === client.id),
    ),
  );
  Object.assign(form, {
    id: project.id,
    name: project.name,
    shortName: project.shortName || project.name,
    version: project.version || '0.1.0',
    defaultLocale: project.defaultLocale || 'zh-CN',
    description: project.description || '',
    primary: project.theme?.primary || '#2563eb',
    pageBackground: project.theme?.pageBackground || '#f5f7fb',
    homepageVisible: project.homepage?.visible !== false,
    clients: projectClients,
    resourceEntries: ['docs', 'mobile'].map((kind) =>
      createResourceEntryDraft(
        kind,
        entries.find((entry) => entry.kind === kind),
      ),
    ),
    docsRoot: project.docs?.root || 'docs',
    prototype: {
      enabled: Boolean(project.prototype?.enabled),
      root: project.prototype?.root || 'prototype',
      client: project.prototype?.client || '',
      section: project.prototype?.section || '',
      clients: createPrototypeClientMap(projectClients, project.prototype || {}),
    },
    mobileEntry: project.mobile?.entry || 'mobile/app.html',
    features: {
      pageTransfer: project.features?.pageTransfer !== false,
      designSystem: project.features?.designSystem !== false,
      legacyI18n: Boolean(project.features?.legacyI18n),
    },
    compatibility: { legacyRoutes: Boolean(project.compatibility?.legacyRoutes) },
  });
  logoPreview.value = project.branding?.logo ? getProjectAssetUrl(project.id, project.branding.logo) : '';
}

function prepareForm() {
  if (dialogMode.value === 'create') resetForm();
  else hydrateProject(props.project);
  nextTick(() => formRef.value?.clearValidate());
}

watch(
  () => [props.modelValue, props.mode, props.project?.id],
  ([visible]) => {
    if (visible) prepareForm();
  },
);

watch(
  () => form.clients.map((client) => client.id),
  () => syncPrototypeClientMap(),
  { immediate: true },
);

function chooseLogo() {
  logoInput.value?.click();
}

function clearLogo() {
  form.logoDataUrl = '';
  form.removeLogo = Boolean(dialogMode.value === 'edit' && logoPreview.value);
  logoPreview.value = '';
}

function handleLogoChange(event) {
  const [file] = event.target.files || [];
  event.target.value = '';
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('Logo 文件大小需控制在 2 MB 以内。');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    form.logoDataUrl = String(reader.result || '');
    form.removeLogo = false;
    logoPreview.value = form.logoDataUrl;
  };
  reader.onerror = () => ElMessage.error('Logo 读取失败，请重新选择。');
  reader.readAsDataURL(file);
}

function addClient() {
  let index = form.clients.length + 1;
  let id = `client-${index}`;
  while (form.clients.some((client) => client.id === id)) {
    index += 1;
    id = `client-${index}`;
  }
  form.clients.push(
    createClientDraft(
      { id, isNew: true, name: `客户端 ${index}`, description: '项目客户端入口。', icon: 'Management' },
      null,
    ),
  );
  syncPrototypeClientMap();
  activeConfigTab.value = 'clients';
}

async function removeClient(client) {
  if (form.clients.length <= 1) {
    ElMessage.warning('项目至少需要保留一个客户端。');
    return;
  }

  if (!client.isNew) {
    const confirmed = await ElMessageBox.confirm(
      `移除“${client.name || client.id}”后，它将不再作为项目客户端入口显示；对应页面文件和页面定义不会被删除。`,
      '确认移除客户端？',
      { confirmButtonText: '确认移除', cancelButtonText: '取消', type: 'warning' },
    ).catch(() => false);
    if (!confirmed) return;
  }

  const index = form.clients.indexOf(client);
  if (index >= 0) form.clients.splice(index, 1);
  syncPrototypeClientMap();
}

function buildProjectPayload() {
  const clients = form.clients.map((client) => ({
    id: client.id,
    name: client.name.trim(),
    description: client.description.trim(),
    icon: client.icon.trim() || 'Document',
    defaultPage: client.defaultPage.trim(),
    login: {
      account: client.loginAccount.trim(),
      tenantCode: client.tenantCode.trim(),
      ...(client.loginBackground.trim() ? { background: client.loginBackground.trim() } : {}),
    },
  }));
  const entries = [
    ...form.clients
      .filter((client) => client.entryEnabled)
      .map((client) => ({
        id: client.id,
        kind: 'client',
        clientId: client.id,
        name: client.name.trim(),
        description: client.description.trim(),
        icon: client.entryIcon.trim() || client.icon.trim() || 'Document',
        order: Number(client.entryOrder) || 10,
      })),
    ...form.resourceEntries
      .filter((entry) => entry.enabled)
      .map((entry) => ({
        id: entry.kind,
        kind: entry.kind,
        name: entry.name.trim(),
        description: entry.description.trim(),
        icon: entry.icon.trim() || (entry.kind === 'docs' ? 'Document' : 'Iphone'),
        order: Number(entry.order) || 30,
      })),
  ];
  const docsEntry = form.resourceEntries.find((entry) => entry.kind === 'docs');
  const mobileEntry = form.resourceEntries.find((entry) => entry.kind === 'mobile');
  const prototypeClients = Object.fromEntries(
    form.clients.map((client) => {
      const config = form.prototype.clients[client.id] || {};
      return [
        client.id,
        {
          enabled: Boolean(config.enabled),
          root: String(config.root || '').trim(),
          section: String(config.section || '').trim(),
        },
      ];
    }),
  );
  return {
    id: form.id,
    name: form.name,
    shortName: form.shortName,
    version: form.version,
    defaultLocale: form.defaultLocale,
    description: form.description,
    primary: form.primary,
    pageBackground: form.pageBackground,
    homepage: { visible: Boolean(form.homepageVisible) },
    clients,
    entries,
    docs: { enabled: Boolean(docsEntry?.enabled), root: form.docsRoot.trim() || 'docs' },
    prototype: {
      enabled: Boolean(form.prototype.enabled),
      root: form.prototype.root.trim() || 'prototype',
      client: form.prototype.client.trim(),
      section: form.prototype.section.trim(),
      clients: prototypeClients,
    },
    mobile: { enabled: Boolean(mobileEntry?.enabled), entry: form.mobileEntry.trim() || 'mobile/app.html' },
    features: { ...form.features },
    compatibility: { legacyRoutes: Boolean(form.compatibility.legacyRoutes) },
    logoDataUrl: form.logoDataUrl,
    removeLogo: form.removeLogo,
  };
}

async function submitForm() {
  if (saving.value) return;
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  if (form.clients.some((client) => !client.id.trim() || !/^[a-z][a-z0-9-]*$/.test(client.id.trim()))) {
    ElMessage.error('请补充正确的客户端 ID。');
    activeConfigTab.value = 'clients';
    return;
  }
  if (form.clients.some((client) => !client.name.trim())) {
    ElMessage.error('请补充所有客户端的入口名称。');
    activeConfigTab.value = 'clients';
    return;
  }
  saving.value = true;
  try {
    const endpoint = dialogMode.value === 'create' ? '/__projects/create' : '/__projects/update';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildProjectPayload()),
    });
    const payload = await response.json();
    if (!response.ok || payload.ok === false) throw new Error(payload.message || '项目保存失败');
    const message = payload.message || '项目配置已保存';
    ElMessage.success(message);
    emit('saved', { message, payload });
    dialogVisible.value = false;
  } catch (saveError) {
    ElMessage.error(saveError.message);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.project-form {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  padding: 0;
}
.project-config-tabs {
  width: 100%;
  min-width: 0;
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
}
:global(.project-dialog.el-dialog) {
  width: min(1180px, calc(100vw - 48px)) !important;
  height: min(820px, calc(100svh - 48px));
  max-width: none;
  max-height: calc(100svh - 48px);
  margin: 24px auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
:global(.project-dialog .el-dialog__body) {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  max-height: none;
  overflow: hidden;
  padding: 0;
}
:global(.project-dialog .project-config-tabs > .el-tabs__header.is-left) {
  width: 190px;
  margin: 0;
  padding: 18px 12px;
  border-right: 0.5px solid rgb(0 0 0 / 8%);
  background: #f5f5f7;
}
:global(.project-dialog .project-config-tabs .el-tabs__nav-wrap.is-left::after) {
  display: none;
}
:global(.project-dialog .project-config-tabs .el-tabs__active-bar.is-left) {
  display: none;
}
:global(.project-dialog .project-config-tabs .el-tabs__item.is-left) {
  height: 42px;
  justify-content: flex-start;
  margin-bottom: 4px;
  padding: 0 14px;
  border-radius: 10px;
  color: #515154;
  font-size: 13px;
  font-weight: 550;
  text-align: left;
  transition:
    color 160ms ease,
    background-color 160ms ease;
}
:global(.project-dialog .project-config-tabs .el-tabs__item.is-left:hover) {
  color: #1d1d1f;
  background: rgb(255 255 255 / 68%);
}
:global(.project-dialog .project-config-tabs .el-tabs__item.is-left.is-active) {
  color: var(--app-color-primary);
  background: #fff;
  box-shadow: 0 1px 4px rgb(0 0 0 / 6%);
}
:global(.project-dialog .project-config-tabs > .el-tabs__content) {
  height: 100%;
  overflow-y: auto;
  padding: 24px 28px 34px;
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
.tab-intro {
  margin: 0;
  color: var(--app-color-text-muted);
  font-size: 13px;
  line-height: 1.6;
}
.tab-intro-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.client-config-list,
.resource-entry-list {
  display: grid;
  gap: 14px;
}
.client-config-card,
.resource-entry-card {
  padding: 18px;
  border: 0.5px solid rgb(0 0 0 / 8%);
  border-radius: 14px;
  background: #f8f8fa;
}
.prototype-source-card {
  margin-bottom: 20px;
  padding: 18px;
  border: 0.5px solid rgb(0 0 0 / 8%);
  border-radius: 14px;
  background: #f8f8fa;
}
.prototype-source-card__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}
.prototype-source-card__heading strong,
.prototype-source-card__heading p {
  margin: 0;
}
.prototype-source-card__heading strong {
  color: var(--app-color-text-primary);
  font-size: 15px;
}
.prototype-source-card__heading p {
  margin-top: 5px;
  color: var(--app-color-text-muted);
  font-size: 12px;
  line-height: 1.5;
}
.prototype-client-list {
  display: grid;
  gap: 12px;
}
.prototype-client-card {
  padding: 16px;
  border: 1px solid rgb(37 99 235 / 14%);
  border-radius: 14px;
  background: rgb(37 99 235 / 3%);
}
.prototype-client-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}
.prototype-client-card__header strong {
  color: var(--app-color-text-primary);
  font-size: 14px;
}
.prototype-client-card__header .el-tag {
  margin-left: 8px;
}
.prototype-client-card__header p {
  margin: 5px 0 0;
  color: var(--app-color-text-muted);
  font-size: 12px;
  line-height: 1.5;
}
.prototype-source-card__help {
  margin-top: 12px;
}
.client-config-card__header,
.resource-entry-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}
.client-config-card__header > div,
.resource-entry-card__header > div {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.client-config-card__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.client-config-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0 18px;
}
.client-config-grid .el-form-item {
  margin-bottom: 14px;
}
.client-config-grid__wide {
  grid-column: 1 / -1;
}
.feature-switches {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, max-content));
  gap: 16px 28px;
  padding: 4px 0 12px 112px;
}
.form-help {
  margin-top: 5px;
  color: var(--app-color-text-muted);
  font-size: 12px;
  line-height: 1.5;
}
.color-field {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 220px;
}
.color-field .el-input {
  flex: 1;
}
.logo-field {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.logo-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 84px;
  height: 56px;
  overflow: hidden;
  border: 1px solid var(--app-color-border);
  border-radius: 12px;
  background: var(--app-color-page);
  color: var(--app-color-text-muted);
  font-size: 12px;
}
.logo-preview img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.logo-actions {
  min-width: 0;
}
@media (max-width: 760px) {
  .client-config-grid {
    grid-template-columns: 1fr;
  }
  .tab-intro-row {
    flex-direction: column;
  }
  .client-config-grid__wide {
    grid-column: auto;
  }
  .feature-switches {
    grid-template-columns: 1fr;
    padding-left: 0;
  }
  :global(.project-dialog .project-config-tabs) {
    display: flex;
    height: auto;
    min-height: 0;
    flex-direction: column;
  }
  :global(.project-dialog .project-config-tabs > .el-tabs__header.is-left) {
    width: 100%;
    height: auto;
    padding: 10px;
    border-right: 0;
    border-bottom: 0.5px solid rgb(0 0 0 / 8%);
  }
  :global(.project-dialog .project-config-tabs .el-tabs__nav-scroll) {
    overflow-x: auto;
  }
  :global(.project-dialog .project-config-tabs .el-tabs__nav.is-left) {
    display: flex;
    float: none;
    gap: 4px;
    transform: none !important;
  }
  :global(.project-dialog .project-config-tabs .el-tabs__item.is-left) {
    height: 38px;
    flex: 0 0 auto;
    margin: 0;
    white-space: nowrap;
  }
  :global(.project-dialog .project-config-tabs > .el-tabs__content) {
    height: auto;
    max-height: calc(100svh - 230px);
    padding: 18px;
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
/* The form is a focused configuration workspace, not a raw settings dump. */
.project-dialog-heading {
  display: flex;
  align-items: center;
  gap: 14px;
}

.project-dialog-heading__icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 14px;
  background: color-mix(in srgb, var(--app-color-primary) 12%, white);
  color: var(--app-color-primary);
}

.project-dialog-heading__icon .material-symbols-outlined {
  font-size: 22px;
  font-variation-settings:
    'FILL' 0,
    'wght' 500,
    'GRAD' 0,
    'opsz' 24;
}

.project-dialog-heading__copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.project-dialog-heading__eyebrow,
.config-tab-intro__eyebrow {
  color: var(--app-color-primary);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.16em;
  line-height: 1.4;
}

.project-dialog-heading__copy strong {
  color: #1d1d1f;
  font-size: 21px;
  font-weight: 680;
  letter-spacing: -0.025em;
  line-height: 1.25;
}

.project-dialog-heading__copy > span:last-child {
  overflow: hidden;
  color: #6e6e73;
  font-size: 12px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.project-dialog .el-dialog__header) {
  min-height: 76px;
  flex: 0 0 auto;
  padding: 15px 60px 14px 24px;
  background: linear-gradient(180deg, #fff 0%, #fbfbfd 100%);
}

:global(.project-dialog .el-dialog__footer) {
  flex: 0 0 auto;
  min-height: 60px;
  padding: 10px 18px;
}

:global(.project-dialog .el-dialog__body) {
  background: #fff;
}

:global(.project-dialog .project-config-tabs > .el-tabs__header.is-left) {
  width: 204px;
  flex: 0 0 204px;
  padding: 16px 12px;
  border-right: 1px solid rgb(0 0 0 / 7%);
  background: #f7f7f9;
}

:global(.project-dialog .project-config-tabs .el-tabs__item.is-left) {
  height: 58px;
  margin-bottom: 6px;
  padding: 0 12px;
  border-radius: 12px;
  color: #6e6e73;
  transition:
    color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

:global(.project-dialog .project-config-tabs .el-tabs__item.is-left:hover) {
  color: #1d1d1f;
  background: rgb(255 255 255 / 72%);
}

:global(.project-dialog .project-config-tabs .el-tabs__item.is-left.is-active) {
  color: var(--app-color-primary);
  background: #fff;
  box-shadow:
    0 5px 16px rgb(15 23 42 / 7%),
    0 0 0 1px rgb(0 0 0 / 4%);
  transform: translateX(2px);
}

.config-tab-label {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 11px;
  text-align: left;
}

.config-tab-label__index {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgb(0 0 0 / 9%);
  border-radius: 9px;
  background: #fff;
  color: #8e8e93;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

:global(.project-dialog .el-tabs__item.is-active) .config-tab-label__index {
  border-color: color-mix(in srgb, var(--app-color-primary) 22%, white);
  background: color-mix(in srgb, var(--app-color-primary) 11%, white);
  color: var(--app-color-primary);
}

.config-tab-label > span:last-child {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.config-tab-label strong {
  overflow: hidden;
  color: currentColor;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.config-tab-label small {
  overflow: hidden;
  color: #8e8e93;
  font-size: 11px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.project-dialog .project-config-tabs > .el-tabs__content) {
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 24px 26px 30px;
  background: #fff;
}

.config-tab-intro {
  display: grid;
  gap: 5px;
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgb(0 0 0 / 7%);
}

.config-tab-intro h2 {
  margin: 0;
  color: #1d1d1f;
  font-size: 20px;
  font-weight: 680;
  letter-spacing: -0.03em;
  line-height: 1.25;
}

.config-tab-intro p {
  margin: 0;
  color: #6e6e73;
  font-size: 13px;
  line-height: 1.6;
}

:global(.project-dialog .config-tab-pane--basic) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 20px;
  align-content: start;
}

:global(.project-dialog .config-tab-pane--basic > .config-tab-intro),
:global(.project-dialog .config-tab-pane--basic > .config-form-item--wide) {
  grid-column: 1 / -1;
}

:global(.project-dialog .config-tab-pane--basic > .config-form-item) {
  min-width: 0;
  margin-bottom: 18px;
}

:global(.project-dialog .config-tab-pane--basic .el-form-item__label) {
  height: auto;
  margin-bottom: 7px;
  line-height: 1.35;
}

:global(.project-dialog .config-tab-pane--basic .el-textarea__inner) {
  min-height: 76px !important;
}

.color-field {
  width: 100%;
}

.logo-field {
  align-items: center;
  padding: 16px;
  border: 1px solid rgb(0 0 0 / 7%);
  border-radius: 14px;
  background: #f8f8fa;
}

.logo-preview {
  width: 94px;
  height: 64px;
  border-color: rgb(0 0 0 / 9%);
  background: #fff;
}

.logo-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.logo-actions .form-help {
  width: 100%;
  margin-top: 0;
}

.tab-intro-row {
  align-items: flex-end;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgb(0 0 0 / 7%);
}

.tab-intro-row .config-tab-intro {
  flex: 1;
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: 0;
}

.tab-intro-row > .el-button {
  flex: 0 0 auto;
  margin-bottom: 4px;
}

.client-config-list,
.resource-entry-list {
  gap: 16px;
}

.client-config-card,
.resource-entry-card {
  padding: 16px 18px;
  border: 1px solid rgb(0 0 0 / 8%);
  border-radius: 16px;
  background: #fbfbfc;
  box-shadow: 0 2px 8px rgb(15 23 42 / 3%);
}
.prototype-source-card {
  padding: 16px 18px;
  border: 1px solid rgb(0 0 0 / 8%);
  border-radius: 16px;
  background: #fbfbfc;
  box-shadow: 0 2px 8px rgb(15 23 42 / 3%);
}

.client-config-card__header,
.resource-entry-card__header {
  align-items: flex-start;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgb(0 0 0 / 7%);
}

.client-config-card__header > div:first-child,
.resource-entry-card__header > div:first-child {
  display: grid;
  align-items: center;
  gap: 7px;
}

.client-config-card__header strong,
.resource-entry-card__header strong {
  color: #1d1d1f;
  font-size: 15px;
  font-weight: 650;
}

.client-config-card__actions {
  align-items: center;
  gap: 14px;
}

.client-config-grid {
  gap: 0 20px;
}

.client-config-grid .el-form-item {
  margin-bottom: 16px;
}

:global(.project-dialog .client-config-grid .el-form-item__label) {
  height: auto;
  margin-bottom: 7px;
  line-height: 1.35;
}

.feature-switches {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
  padding: 0;
}

.feature-switches .el-checkbox {
  min-height: 44px;
  margin: 0;
  padding: 0 14px;
  border: 1px solid rgb(0 0 0 / 7%);
  border-radius: 12px;
  background: #fbfbfc;
}

:global(.project-dialog .el-divider) {
  margin: 22px 0 14px;
  border-top-color: rgb(0 0 0 / 7%);
}

:global(.project-dialog .el-divider__text) {
  padding: 0 12px 0 0;
  background: #fff;
  color: #3a3a3c;
  font-size: 13px;
  font-weight: 650;
}

.apple-dialog-footer {
  min-height: 38px;
}

.apple-dialog-footer > span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.apple-dialog-footer > span::before {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--app-color-primary);
  content: '';
}

.apple-dialog-footer > div {
  gap: 10px;
}

:global(.project-dialog .apple-dialog-footer .el-button) {
  min-width: 88px;
}

:global(.project-dialog .apple-dialog-footer .el-button--primary) {
  min-width: 96px;
  box-shadow: 0 5px 14px rgb(var(--app-color-primary-rgb) / 20%);
}

@media (max-width: 760px) {
  :global(.project-dialog.el-dialog) {
    width: calc(100vw - 20px) !important;
    height: calc(100svh - 20px);
    max-height: none;
    margin: 10px auto;
  }

  :global(.project-dialog .el-dialog__header) {
    min-height: 72px;
    padding: 14px 52px 13px 18px;
  }

  .project-dialog-heading__icon {
    width: 38px;
    height: 38px;
    border-radius: 12px;
  }

  .project-dialog-heading__copy strong {
    font-size: 18px;
  }

  .project-dialog-heading__copy > span:last-child {
    font-size: 11px;
  }

  :global(.project-dialog .project-config-tabs > .el-tabs__content) {
    height: auto;
    max-height: none;
    min-height: 0;
    flex: 1 1 auto;
    padding: 18px 16px 24px;
  }

  :global(.project-dialog .config-tab-pane--basic) {
    display: block;
  }

  :global(.project-dialog .config-tab-pane--basic > .config-form-item) {
    margin-bottom: 16px;
  }

  .tab-intro-row {
    align-items: stretch;
    flex-direction: column;
  }

  .tab-intro-row > .el-button {
    align-self: flex-start;
    margin-bottom: 0;
  }

  .client-config-grid,
  .feature-switches {
    grid-template-columns: 1fr;
  }

  .client-config-card,
  .resource-entry-card {
    padding: 16px;
  }

  .client-config-card__header,
  .resource-entry-card__header {
    flex-direction: column;
  }

  .client-config-card__actions {
    width: 100%;
    justify-content: space-between;
  }

  .logo-field {
    align-items: flex-start;
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

@media (prefers-reduced-transparency: reduce) {
  :global(.project-dialog .el-dialog__header),
  :global(.project-dialog .el-dialog__footer) {
    background: #fff;
    backdrop-filter: none;
  }
}

@media (prefers-contrast: more) {
  :global(.project-dialog .project-config-tabs > .el-tabs__header.is-left),
  .client-config-card,
  .resource-entry-card,
  .feature-switches .el-checkbox,
  .logo-field {
    border-color: #6e6e73;
  }
}
</style>
