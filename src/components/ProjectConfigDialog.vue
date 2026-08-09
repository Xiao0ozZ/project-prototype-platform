<template>
  <el-dialog
    v-model="dialogVisible"
    width="980px"
    :close-on-click-modal="false"
    :show-close="false"
    class="project-dialog-apple-glass project-dialog-compact"
    modal-class="apple-tool-overlay"
  >
    <template #header>
      <span class="sr-only">{{ dialogTitle }}</span>
    </template>

    <div class="project-config-shell flex w-full flex-col overflow-hidden rounded-3xl bg-white">
      <header class="flex shrink-0 items-center justify-between border-b border-slate-200/80 px-6 py-4">
        <div class="flex min-w-0 items-center gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <el-icon><Setting /></el-icon>
          </span>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h2 class="truncate text-lg font-bold tracking-tight text-slate-950">{{ dialogTitle }}</h2>
              <span
                v-if="dialogMode === 'edit'"
                class="hidden truncate font-mono text-[11px] text-slate-400 sm:inline"
              >
                {{ form.id }} · {{ form.version }}
              </span>
            </div>
            <p class="mt-0.5 text-xs text-slate-500">只设置项目内容入口，其他工程参数会自动处理。</p>
          </div>
        </div>

        <button
          type="button"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="关闭"
          @click="dialogVisible = false"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </header>

      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-position="top"
        class="flex min-h-0 w-full flex-1 overflow-hidden max-md:flex-col"
      >
        <aside
          class="w-[176px] shrink-0 border-r border-slate-200/80 bg-slate-50/80 p-3 max-md:w-full max-md:border-b max-md:border-r-0"
        >
          <nav class="space-y-1 max-md:flex max-md:space-x-2 max-md:space-y-0" aria-label="项目配置分类">
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors max-md:w-auto max-md:flex-1"
              :class="
                activeSection === 'project'
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/80'
                  : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
              "
              @click="activeSection = 'project'"
            >
              <span
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
                :class="
                  activeSection === 'project' ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/70 text-slate-500'
                "
              >
                01
              </span>
              <span class="min-w-0">
                <strong class="block truncate text-xs">项目资料</strong>
                <small class="mt-0.5 block truncate text-[10px] font-normal text-slate-400 max-md:hidden">
                  名称、PRD、主题与显示
                </small>
              </span>
            </button>

            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors max-md:w-auto max-md:flex-1"
              :class="
                activeSection === 'clients'
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/80'
                  : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
              "
              @click="activeSection = 'clients'"
            >
              <span
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
                :class="
                  activeSection === 'clients' ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/70 text-slate-500'
                "
              >
                02
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex items-center justify-between gap-2">
                  <strong class="truncate text-xs">客户端</strong>
                  <small class="text-[10px] font-bold text-slate-400">{{ form.clients.length }}</small>
                </span>
                <small class="mt-0.5 block truncate text-[10px] font-normal text-slate-400 max-md:hidden">
                  结构与内容来源
                </small>
              </span>
            </button>
          </nav>
        </aside>

        <main class="project-config-content min-h-0 min-w-0 flex-1 overflow-y-auto px-6 py-5">
          <section v-show="activeSection === 'project'">
            <div class="mb-5 border-b border-slate-200/80 pb-4">
              <h3 class="text-base font-bold text-slate-900">项目资料</h3>
              <p class="mt-1 text-xs text-slate-500">设置项目名称、文档来源和统一主题色。</p>
            </div>

            <div class="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
              <div>
                <el-form-item label="项目名称" prop="name">
                  <el-input
                    v-model="form.name"
                    size="large"
                    maxlength="60"
                    placeholder="例如：客户服务平台"
                    show-word-limit
                  />
                </el-form-item>
                <p v-if="dialogMode === 'create'" class="mt-1.5 text-[11px] leading-5 text-slate-400">
                  项目 ID、简称和版本由平台自动生成。
                </p>
              </div>

              <div>
                <el-form-item label="PRD 文件夹">
                  <el-input
                    v-model="form.docsRoot"
                    size="large"
                    clearable
                    placeholder="填写项目内目录或本机绝对路径；没有可留空"
                  />
                </el-form-item>
                <p class="mt-1.5 text-[11px] leading-5 text-slate-400">
                  填写后启用文档中心；清空则不显示文档入口。
                </p>
              </div>
            </div>

            <div class="mt-6 grid grid-cols-1 gap-5 border-t border-slate-200/80 pt-4 md:grid-cols-2">
              <div>
                <el-form-item label="项目主题色" prop="primary">
                  <div class="flex w-full items-center gap-2.5">
                    <el-color-picker v-model="form.primary" color-format="hex" size="large" />
                    <el-input
                      v-model="form.primary"
                      class="min-w-0 flex-1"
                      size="large"
                      maxlength="7"
                      placeholder="#2563eb"
                    />
                  </div>
                </el-form-item>
                <p class="mt-1.5 text-[11px] leading-5 text-slate-400">
                  用于客户端外壳、主要按钮、链接和选中状态。
                </p>
              </div>

              <div
                class="flex min-h-[70px] items-center justify-between gap-5 md:border-l md:border-slate-200/80 md:pl-5"
              >
                <div>
                  <h4 class="text-sm font-bold text-slate-800">在首页显示项目</h4>
                  <p class="mt-1 text-[11px] leading-5 text-slate-400">
                    关闭后，项目不会出现在首页的项目选择列表中。
                  </p>
                </div>
                <el-switch v-model="form.homepageVisible" />
              </div>
            </div>
          </section>

          <section v-show="activeSection === 'clients'">
            <div class="flex items-start justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div>
                <h3 class="text-base font-bold text-slate-900">客户端</h3>
                <p class="mt-1 text-xs text-slate-500">每个客户端只需确定名称、页面结构和内容来源。</p>
              </div>
              <button
                type="button"
                class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100"
                @click="addClient"
              >
                <el-icon><Plus /></el-icon>
                <span>添加客户端</span>
              </button>
            </div>

            <div class="divide-y divide-slate-200/80">
              <article
                v-for="(client, index) in form.clients"
                :key="client.id"
                class="py-4 first:pt-4 last:pb-1"
              >
                <div class="flex items-center justify-between gap-4">
                  <div class="flex min-w-0 items-center gap-2">
                    <span
                      class="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 px-1.5 font-mono text-[10px] font-bold text-slate-500"
                    >
                      {{ String(index + 1).padStart(2, '0') }}
                    </span>
                    <strong class="truncate text-sm text-slate-800">
                      {{ client.name.trim() || `客户端 ${index + 1}` }}
                    </strong>
                  </div>
                  <div class="flex shrink-0 items-center gap-3">
                    <label
                      class="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-slate-500"
                    >
                      <span>首页显示</span>
                      <el-switch v-model="client.entryEnabled" size="small" />
                    </label>
                    <button
                      v-if="form.clients.length > 1"
                      type="button"
                      class="text-xs font-medium text-slate-400 transition-colors hover:text-rose-600"
                      @click="removeClient(client)"
                    >
                      移除
                    </button>
                  </div>
                </div>

                <div
                  class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[minmax(140px,0.8fr)_minmax(180px,1fr)_minmax(230px,1.4fr)]"
                >
                  <el-form-item label="客户端名称">
                    <el-input v-model="client.name" placeholder="例如：营运端" />
                  </el-form-item>

                  <el-form-item label="页面结构">
                    <el-select
                      :model-value="getClientPreset(client)"
                      class="w-full"
                      @change="applyClientPreset(client, $event)"
                    >
                      <el-option
                        v-for="option in getClientPresetOptions(client)"
                        :key="option.value"
                        :label="option.label"
                        :value="option.value"
                      />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="HTML 页面文件夹">
                    <el-input
                      v-model="form.prototype.clients[client.id].root"
                      clearable
                      placeholder="使用工程页面时留空"
                    />
                  </el-form-item>
                </div>

                <p class="mt-2 text-[11px] leading-5 text-slate-400">
                  {{ getClientPresetDescription(client) }}
                </p>
              </article>
            </div>
          </section>
        </main>
      </el-form>

      <footer
        class="flex w-full shrink-0 items-center justify-between gap-4 border-t border-slate-200/80 bg-slate-50/80 px-6 py-3.5"
      >
        <p class="hidden text-[11px] text-slate-400 sm:block">保存后会重新扫描项目内容并刷新入口。</p>
        <div class="ml-auto flex items-center gap-2.5">
          <button
            type="button"
            class="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100"
            @click="dialogVisible = false"
          >
            取消
          </button>
          <button
            type="button"
            class="inline-flex h-9 min-w-24 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="saving"
            @click="submitForm"
          >
            <el-icon v-if="saving" class="is-loading"><Loading /></el-icon>
            <span>{{ saving ? '保存中' : '保存' }}</span>
          </button>
        </div>
      </footer>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Loading, Plus, Setting } from '@element-plus/icons-vue';

import { installedProjects } from '../config/project-packages';

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
const formRef = ref();
const activeSection = ref('project');
const generatedProjectId = ref('');
const reservedClientIds = new Set();

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
  docsRoot: '',
  storedDocsRoot: 'docs',
  originalDocsEnabled: false,
  prototype: { enabled: false, root: 'prototype', client: '', section: '', clients: {} },
  mobileEntry: 'mobile/app.html',
  features: { pageTransfer: true, designSystem: true, legacyI18n: false },
  compatibility: { legacyRoutes: false },
  logoDataUrl: '',
  removeLogo: false,
});

const formRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  primary: [
    { required: true, message: '请选择或输入项目主题色', trigger: ['blur', 'change'] },
    {
      pattern: /^#[0-9a-f]{6}$/i,
      message: '主题色必须使用六位十六进制色值，例如 #2563eb',
      trigger: ['blur', 'change'],
    },
  ],
};

const clientPresetOptions = [
  { value: 'standard', label: '左侧菜单' },
  { value: 'topnav', label: '顶部导航' },
  { value: 'simple', label: '无页面菜单' },
  { value: 'immersive', label: '沉浸式页面' },
  { value: 'html-full', label: '使用 HTML 自带外壳' },
  { value: 'login', label: '先登录再进入' },
];

const clientPresetDescriptions = {
  standard: '使用平台顶栏和左侧菜单，适合常规后台与管理类原型。',
  topnav: '使用平台顶栏和顶部菜单，适合栏目较少的业务页面。',
  simple: '保留平台顶栏，不显示页面菜单，适合单页功能或阅读页面。',
  immersive: '不显示平台导航，页面以完整画布呈现；开发模式下仍保留必要工具。',
  'html-full': '保留 HTML 文件自己的顶栏和菜单，不再叠加平台外壳。',
  login: '先进入平台登录页，登录后使用左侧菜单进入内容。',
  custom: '当前项目使用已有的自定义入口页面，保存时会原样保留。',
};

function createClientDraft(client = {}, entry = null) {
  return {
    id: client.id || '',
    isNew: Boolean(client.isNew),
    name: client.name || '',
    description: client.description || '',
    icon: client.icon || 'Document',
    defaultPage: client.defaultPage || '',
    entryMode: client.entry?.mode || 'platform-login',
    customEntryPage: client.entry?.page || '',
    layoutType: client.layout?.type || 'sidebar',
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
  const root = String(config.root || '');
  const enabled = config.enabled !== false && Boolean(root.trim());
  return {
    enabled,
    root: enabled ? root : '',
    storedRoot: root,
    section: config.section || '',
    shellMode: config.shellMode === 'full' ? 'full' : 'auto',
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

function getPrototypeClient(client) {
  return form.prototype.clients[client.id] || createPrototypeClientDraft();
}

function getClientPreset(client) {
  if (client.entryMode === 'custom-page') return 'custom';
  if (client.entryMode === 'platform-login') return 'login';
  if (client.layoutType === 'topnav') return 'topnav';
  if (client.layoutType === 'none') return 'simple';
  if (client.layoutType === 'bare') {
    return getPrototypeClient(client).shellMode === 'full' ? 'html-full' : 'immersive';
  }
  return 'standard';
}

function getClientPresetOptions(client) {
  if (getClientPreset(client) !== 'custom') return clientPresetOptions;
  return [...clientPresetOptions, { value: 'custom', label: '保留现有自定义入口' }];
}

function getClientPresetDescription(client) {
  return clientPresetDescriptions[getClientPreset(client)] || clientPresetDescriptions.standard;
}

function applyClientPreset(client, preset) {
  if (preset === 'custom') return;
  const prototypeClient = getPrototypeClient(client);
  form.prototype.clients[client.id] = prototypeClient;
  client.entryMode = preset === 'login' ? 'platform-login' : 'direct';
  client.layoutType =
    {
      standard: 'sidebar',
      topnav: 'topnav',
      simple: 'none',
      immersive: 'bare',
      'html-full': 'bare',
      login: 'sidebar',
    }[preset] || 'sidebar';
  prototypeClient.shellMode = preset === 'html-full' ? 'full' : 'auto';
  if (preset === 'login') client.loginAccount ||= 'admin';
}

function createGeneratedProjectId() {
  return `project-${Date.now().toString(36)}`;
}

function projectSlug(name) {
  const slug = String(name || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^[^a-z]+/, '');
  return slug || generatedProjectId.value || createGeneratedProjectId();
}

function createUniqueProjectId(name) {
  const usedIds = new Set(installedProjects.map((project) => project.id));
  const base = projectSlug(name);
  let candidate = base;
  let suffix = 2;
  while (usedIds.has(candidate)) candidate = `${base}-${suffix++}`;
  return candidate;
}

function resetForm() {
  generatedProjectId.value = createGeneratedProjectId();
  activeSection.value = 'project';
  reservedClientIds.clear();
  reservedClientIds.add('client-1');
  Object.assign(form, {
    id: generatedProjectId.value,
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
          id: 'client-1',
          name: '管理端',
          description: '项目客户端入口。',
          icon: 'Management',
          defaultPage: '',
          entry: { mode: 'direct' },
          layout: { type: 'sidebar' },
        },
        { name: '管理端', description: '进入项目客户端。', icon: 'Management', order: 10 },
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
    docsRoot: '',
    storedDocsRoot: 'docs',
    originalDocsEnabled: false,
    prototype: { enabled: false, root: 'prototype', client: '', section: '', clients: {} },
    mobileEntry: 'mobile/app.html',
    features: { pageTransfer: true, designSystem: true, legacyI18n: false },
    compatibility: { legacyRoutes: false },
    logoDataUrl: '',
    removeLogo: false,
  });
  form.prototype.clients = createPrototypeClientMap(form.clients);
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
  reservedClientIds.clear();
  projectClients.forEach((client) => reservedClientIds.add(client.id));
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
    docsRoot: project.docs?.enabled ? project.docs?.root || 'docs' : '',
    storedDocsRoot: project.docs?.root || 'docs',
    originalDocsEnabled: Boolean(project.docs?.enabled),
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
    logoDataUrl: '',
    removeLogo: false,
  });
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

function addClient() {
  let index = form.clients.length + 1;
  let id = `client-${index}`;
  while (reservedClientIds.has(id)) {
    index += 1;
    id = `client-${index}`;
  }
  form.clients.push(
    createClientDraft(
      {
        id,
        isNew: true,
        name: `客户端 ${index}`,
        description: '项目客户端入口。',
        icon: 'Management',
        defaultPage: '',
        entry: { mode: 'direct' },
        layout: { type: 'sidebar' },
      },
      {
        name: `客户端 ${index}`,
        description: '进入项目客户端。',
        icon: 'Management',
        order: index * 10,
      },
    ),
  );
  reservedClientIds.add(id);
  syncPrototypeClientMap();
}

async function removeClient(client) {
  if (form.clients.length <= 1) {
    ElMessage.warning('项目至少需要保留一个客户端。');
    return;
  }
  if (!client.isNew) {
    const confirmed = await ElMessageBox.confirm(
      `移除“${client.name || client.id}”后，它将不再显示为项目客户端；页面文件不会被删除。`,
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
  const docsEnabled = Boolean(form.docsRoot.trim());
  const docsEntry = form.resourceEntries.find((entry) => entry.kind === 'docs');
  const docsEntryEnabled = docsEnabled && (Boolean(docsEntry?.enabled) || !form.originalDocsEnabled);
  const clients = form.clients.map((client) => ({
    id: client.id,
    name: client.name.trim(),
    description: client.description.trim(),
    icon: client.icon.trim() || 'Document',
    defaultPage: client.defaultPage.trim(),
    entry: {
      mode: client.entryMode,
      ...(client.entryMode === 'custom-page' ? { page: client.customEntryPage.trim() } : {}),
    },
    layout: { type: client.layoutType },
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
      .filter((entry) => (entry.kind === 'docs' ? docsEntryEnabled : entry.enabled))
      .map((entry) => ({
        id: entry.kind,
        kind: entry.kind,
        name: entry.name.trim(),
        description: entry.description.trim(),
        icon: entry.icon.trim() || (entry.kind === 'docs' ? 'Document' : 'Iphone'),
        order: Number(entry.order) || 30,
      })),
  ];
  const mobileEntry = form.resourceEntries.find((entry) => entry.kind === 'mobile');
  const prototypeClients = Object.fromEntries(
    form.clients.map((client) => {
      const config = form.prototype.clients[client.id] || {};
      const root = String(config.root || '').trim();
      const storedRoot = root || (!config.enabled ? String(config.storedRoot || '').trim() : '');
      return [
        client.id,
        {
          enabled: Boolean(root),
          root: storedRoot,
          section: String(config.section || '').trim(),
          shellMode: config.shellMode === 'full' ? 'full' : 'auto',
        },
      ];
    }),
  );
  return {
    id: form.id,
    name: form.name.trim(),
    shortName: form.shortName.trim() || form.name.trim(),
    version: form.version,
    defaultLocale: form.defaultLocale,
    description: form.description,
    primary: form.primary,
    pageBackground: form.pageBackground,
    homepage: { visible: Boolean(form.homepageVisible) },
    clients,
    entries,
    docs: {
      enabled: docsEnabled,
      root: form.docsRoot.trim() || form.storedDocsRoot.trim() || 'docs',
    },
    prototype: {
      enabled: Object.values(prototypeClients).some((config) => config.enabled),
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
  if (form.clients.some((client) => !client.name.trim())) {
    ElMessage.error('请填写所有客户端名称。');
    return;
  }
  if (dialogMode.value === 'create') {
    form.id = createUniqueProjectId(form.name);
    form.shortName = form.name.trim();
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
:global(.project-config-shell) {
  height: min(720px, calc(100dvh - 48px));
}

:global(.project-config-content) {
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
}

:global(.project-dialog-compact.el-dialog) {
  width: min(980px, calc(100vw - 32px)) !important;
}

:global(.project-dialog-apple-glass .el-dialog__header),
:global(.el-overlay-dialog .project-dialog-apple-glass .el-dialog__header),
:global(header.el-dialog__header) {
  display: none !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  overflow: hidden !important;
}

:global(.project-dialog-apple-glass .el-dialog__body) {
  padding: 0 !important;
  margin: 0 !important;
}

:global(.project-dialog-apple-glass .el-form-item) {
  margin-bottom: 0;
}

:global(.project-dialog-apple-glass .el-form-item__label) {
  height: auto !important;
  margin-bottom: 5px !important;
  padding: 0 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  line-height: 1.4 !important;
  color: #475569 !important;
}

:global(.project-dialog-apple-glass .el-input__wrapper),
:global(.project-dialog-apple-glass .el-select__wrapper) {
  border-radius: 10px !important;
  background: #fff !important;
  box-shadow: 0 0 0 1px #e2e8f0 inset !important;
}

:global(.project-dialog-apple-glass .el-input__wrapper.is-focus),
:global(.project-dialog-apple-glass .el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 2px #2563eb inset !important;
}

@media (max-width: 640px) {
  :global(.project-dialog-compact.el-dialog) {
    width: calc(100vw - 16px) !important;
  }
}
</style>
