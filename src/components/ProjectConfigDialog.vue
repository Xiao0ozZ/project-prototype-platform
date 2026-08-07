<template>
  <el-dialog
    v-model="dialogVisible"
    width="1180px"
    :close-on-click-modal="false"
    :show-close="false"
    class="project-dialog-apple-glass"
    modal-class="apple-tool-overlay"
  >
    <!-- 空 #header 插槽，配合 CSS display: none 彻底销毁 Element Plus 默认标题区域 -->
    <template #header>
      <span class="sr-only">{{ dialogTitle }}</span>
    </template>

    <div class="flex flex-col w-full overflow-hidden rounded-3xl bg-white border border-slate-200/90 shadow-2xl shadow-slate-900/15">
      <!-- 1. 方案 A 超紧凑单行 Header 顶栏 (高度 44px，100% 贴顶零边框空白) -->
      <div class="px-6 py-3 border-b border-slate-200/70 bg-white flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-xs flex items-center justify-center font-bold text-xs">
            <el-icon><Setting /></el-icon>
          </div>
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-extrabold text-slate-900 tracking-tight">{{ dialogTitle }}</h3>
            <span class="px-2 py-0.2 rounded-full bg-blue-50 text-blue-600 font-mono text-[10px] font-bold border border-blue-100">
              PROJECT CONFIG
            </span>
          </div>
          <span class="text-xs text-slate-400 font-medium hidden sm:inline">| {{ dialogMode === 'create' ? '从基础资料建立新项目包' : '调整入口、品牌与工程能力' }}</span>
        </div>

        <button
          type="button"
          class="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors text-xs font-bold"
          @click="dialogVisible = false"
        >
          ✕
        </button>
      </div>

      <!-- 2. 主体 Workspace 容器 (极速渲染：剔除内部多层重复 backdrop-blur 降低 GPU 开销，实现 0ms 秒开) -->
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-position="top"
        class="flex w-full h-[620px] overflow-hidden"
      >
        <!-- 左侧方案 A 冰霜高透侧边栏 (采用纯正浅灰底色，性能极佳) -->
        <aside class="w-[230px] bg-slate-50/90 border-r border-slate-200/70 p-4 flex flex-col justify-between shrink-0 select-none">
          <div class="space-y-1.5">
            <div class="px-3 py-1 text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest">
              CONFIG SECTIONS
            </div>

            <button
              type="button"
              class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-bold transition-all"
              :class="activeConfigTab === 'basic' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/90' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'"
              @click="activeConfigTab = 'basic'"
            >
              <span class="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold" :class="activeConfigTab === 'basic' ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/70 text-slate-500'">01</span>
              <span>基础资料</span>
            </button>

            <button
              type="button"
              class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs font-bold transition-all"
              :class="activeConfigTab === 'clients' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/90' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'"
              @click="activeConfigTab = 'clients'"
            >
              <div class="flex items-center gap-3">
                <span class="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold" :class="activeConfigTab === 'clients' ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/70 text-slate-500'">02</span>
                <span>客户端入口</span>
              </div>
              <span class="px-2 py-0.5 text-[10px] rounded-full" :class="activeConfigTab === 'clients' ? 'bg-blue-50 text-blue-600 font-bold' : 'bg-slate-200/70 text-slate-500'">
                {{ form.clients.length }}
              </span>
            </button>

            <button
              type="button"
              class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-bold transition-all"
              :class="activeConfigTab === 'features' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/90' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'"
              @click="activeConfigTab = 'features'"
            >
              <span class="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold" :class="activeConfigTab === 'features' ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/70 text-slate-500'">03</span>
              <span>能力与特性</span>
            </button>
          </div>

          <div class="p-3 rounded-xl bg-white border border-slate-200/80 text-[11px] text-slate-500 space-y-1 shadow-2xs">
            <div class="font-bold text-slate-700 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>方案 A 提示</span>
            </div>
            <p class="leading-relaxed">修改保存后，平台自动刷新并同步配置入口。</p>
          </div>
        </aside>

        <!-- 右侧方案 A 珍珠霜白流体底色 + 纯净高性能白卡片 -->
        <main class="flex-1 bg-[#f0f4f8] p-6 overflow-y-auto space-y-5">
          <!-- ==================== TAB 1: 基础资料 ==================== -->
          <div v-show="activeConfigTab === 'basic'" class="space-y-5">
            <!-- Card 1: 📌 项目身份与基础定义 -->
            <section class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
              <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span class="w-2 h-4 rounded-full bg-blue-600"></span>
                <h4 class="text-sm font-extrabold text-slate-900">项目身份与基础定义</h4>
              </div>

              <div class="space-y-4">
                <el-form-item label="项目 ID" prop="id">
                  <el-input v-model="form.id" :disabled="dialogMode === 'edit'" placeholder="例如：demo-project" />
                  <div class="text-[11px] text-slate-400 mt-1">仅使用小写英文字母、数字和连字符，创建后不可更改。</div>
                </el-form-item>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <el-form-item label="项目名称" prop="name">
                    <el-input v-model="form.name" placeholder="用于首页和顶栏大标题显示" />
                  </el-form-item>

                  <el-form-item label="项目简称" prop="shortName">
                    <el-input v-model="form.shortName" placeholder="用于紧凑空间或卡片标语" />
                  </el-form-item>

                  <el-form-item label="项目版本">
                    <el-input v-model="form.version" placeholder="例如：0.1.0" />
                  </el-form-item>

                  <el-form-item label="默认语言">
                    <el-select v-model="form.defaultLocale" class="w-full">
                      <el-option label="简体中文" value="zh-CN" />
                      <el-option label="繁體中文" value="zh-TW" />
                      <el-option label="English" value="en-US" />
                    </el-select>
                  </el-form-item>
                </div>

                <el-form-item label="项目说明">
                  <el-input
                    v-model="form.description"
                    type="textarea"
                    :rows="2"
                    placeholder="可选，用于项目卡片下方简介说明"
                  />
                </el-form-item>
              </div>
            </section>

            <!-- Card 2: 🎨 品牌色彩与主题风格 -->
            <section class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
              <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-4 rounded-full bg-indigo-600"></span>
                  <h4 class="text-sm font-extrabold text-slate-900">品牌色彩与主题风格</h4>
                </div>
                <div class="flex items-center gap-3">
                  <div class="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <span>主色 Preview:</span>
                    <span class="w-4 h-4 rounded-full border border-slate-300 shadow-2xs inline-block" :style="{ backgroundColor: form.primary }"></span>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <el-form-item label="主题主色" prop="primary">
                  <div class="flex items-center gap-2">
                    <el-color-picker v-model="form.primary" color-format="hex" />
                    <el-input v-model="form.primary" maxlength="7" class="font-mono" />
                  </div>
                </el-form-item>

                <el-form-item label="内容区背景色" prop="pageBackground">
                  <div class="flex items-center gap-2">
                    <el-color-picker v-model="form.pageBackground" color-format="hex" />
                    <el-input v-model="form.pageBackground" maxlength="7" class="font-mono" />
                  </div>
                </el-form-item>
              </div>
            </section>

            <!-- Card 3: 🖼️ 项目 Logo 资产 -->
            <section class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span class="w-2 h-4 rounded-full bg-purple-600"></span>
                <h4 class="text-sm font-extrabold text-slate-900">项目 Logo 品牌资产</h4>
              </div>

              <div class="flex items-center gap-5">
                <div class="w-20 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400 overflow-hidden shrink-0 shadow-2xs">
                  <img v-if="logoPreview" :src="logoPreview" alt="Logo 预览" class="w-full h-full object-contain" />
                  <span v-else>无 Logo</span>
                </div>

                <div class="space-y-2">
                  <input ref="logoInput" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden @change="handleLogoChange" />
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1"
                      @click="chooseLogo"
                    >
                      <el-icon><Upload /></el-icon>
                      <span>上传 Logo</span>
                    </button>
                    <button v-if="logoPreview" type="button" class="text-xs font-bold text-rose-600 hover:underline px-2" @click="clearLogo">
                      移除 Logo
                    </button>
                  </div>
                  <div class="text-[11px] text-slate-400">支持 PNG、JPG、WebP、SVG 格式，图片文件需小于 2MB。</div>
                </div>
              </div>
            </section>
          </div>

          <!-- ==================== TAB 2: 客户端入口 ==================== -->
          <div v-show="activeConfigTab === 'clients'" class="space-y-4">
            <div class="flex items-center justify-between bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <div>
                <h4 class="text-sm font-extrabold text-blue-900">客户端入口配置</h4>
                <p class="text-xs text-blue-600 mt-0.5">配置项目下的端侧入口（例如管理端、营运端、企业端等）。</p>
              </div>
              <button
                type="button"
                class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-1 active:scale-95"
                @click="addClient"
              >
                <el-icon><Plus /></el-icon>
                <span>新增客户端</span>
              </button>
            </div>

            <div class="space-y-4">
              <article v-for="client in form.clients" :key="client.id" class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4 hover:border-blue-300 transition-all">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div class="flex items-center gap-2">
                    <span class="font-extrabold text-slate-900 text-sm">{{ client.name || '未命名客户端' }}</span>
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold" :class="client.isNew ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-100 text-slate-500'">
                      ID: {{ client.id || '待填写' }}
                    </span>
                  </div>

                  <div class="flex items-center gap-4 text-xs">
                    <el-checkbox v-model="client.entryEnabled">在首页卡片展示</el-checkbox>
                    <button
                      type="button"
                      class="font-bold text-rose-500 hover:text-rose-700 disabled:opacity-30 disabled:pointer-events-none"
                      :disabled="form.clients.length <= 1"
                      @click="removeClient(client)"
                    >
                      移除
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <el-form-item v-if="client.isNew" label="客户端 ID" class="sm:col-span-3">
                    <el-input v-model="client.id" placeholder="例如：admin、operation、enterprise" />
                  </el-form-item>
                  <el-form-item label="入口名称">
                    <el-input v-model="client.name" placeholder="例如：营运端" />
                  </el-form-item>
                  <el-form-item label="入口图标">
                    <el-input v-model="client.entryIcon" placeholder="例如：Van、OfficeBuilding" />
                  </el-form-item>
                  <el-form-item label="入口排序">
                    <el-input-number v-model="client.entryOrder" :min="1" :max="999" controls-position="right" class="w-full" />
                  </el-form-item>
                  <el-form-item label="默认页面">
                    <el-input v-model="client.defaultPage" placeholder="例如：dashboard" />
                  </el-form-item>
                  <el-form-item label="演示账号">
                    <el-input v-model="client.loginAccount" placeholder="默认账号" />
                  </el-form-item>
                  <el-form-item label="租户代码">
                    <el-input v-model="client.tenantCode" placeholder="默认租户代码" />
                  </el-form-item>
                  <el-form-item label="客户端说明" class="sm:col-span-3">
                    <el-input v-model="client.description" placeholder="用于首页客户端卡片说明" />
                  </el-form-item>
                </div>
              </article>
            </div>
          </div>

          <!-- ==================== TAB 3: 能力与特性 ==================== -->
          <div v-show="activeConfigTab === 'features'" class="space-y-4">
            <!-- 资源入口配置 -->
            <section class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
              <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span class="w-2 h-4 rounded-full bg-emerald-600"></span>
                <h4 class="text-sm font-extrabold text-slate-900">产品资源与工具能力</h4>
              </div>

              <div class="space-y-4">
                <article v-for="entry in form.resourceEntries" :key="entry.kind" class="bg-slate-50 rounded-xl p-4 border border-slate-200/70 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-slate-900 text-xs">{{ entry.kind === 'docs' ? '📄 文档中心' : '📱 移动端' }}</span>
                    <el-checkbox v-model="entry.enabled">在首页展示</el-checkbox>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <el-form-item label="入口名称">
                      <el-input v-model="entry.name" />
                    </el-form-item>
                    <el-form-item label="图标">
                      <el-input v-model="entry.icon" />
                    </el-form-item>
                    <el-form-item label="排序">
                      <el-input-number v-model="entry.order" :min="1" :max="999" controls-position="right" class="w-full" />
                    </el-form-item>
                    <el-form-item v-if="entry.kind === 'docs'" label="PRD 目录路径" class="sm:col-span-3">
                      <el-input v-model="form.docsRoot" placeholder="例如：docs 或 D:\\项目资料\\PRD" />
                    </el-form-item>
                  </div>
                </article>
              </div>
            </section>

            <!-- 勾选特性开关 -->
            <section class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span class="w-2 h-4 rounded-full bg-amber-600"></span>
                <h4 class="text-sm font-extrabold text-slate-900">工程特性与显隐开关</h4>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <el-checkbox v-model="form.homepageVisible" class="!mr-0">在首页项目列表中展示</el-checkbox>
                <el-checkbox v-model="form.features.pageTransfer" class="!mr-0">允许页面导入导出</el-checkbox>
                <el-checkbox v-model="form.features.designSystem" class="!mr-0">显示组件规范入口</el-checkbox>
                <el-checkbox v-model="form.compatibility.legacyRoutes" class="!mr-0">保留历史路由兼容</el-checkbox>
              </div>
            </section>
          </div>
        </main>
      </el-form>

      <!-- 3. 方案 A 超紧凑单行 Footer 底栏 (高度 48px，与底框齐平) -->
      <div class="px-6 py-3 border-t border-slate-200/70 bg-white flex items-center justify-between shrink-0">
        <span class="text-xs text-slate-400 font-medium">
          💡 保存修改后，开发服务将重新扫描并渲染本地项目配置。
        </span>
        <div class="flex items-center gap-2.5">
          <button
            type="button"
            class="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition-colors"
            @click="dialogVisible = false"
          >
            取消
          </button>
          <button
            type="button"
            class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-1.5"
            :disabled="saving"
            @click="submitForm"
          >
            <el-icon v-if="saving" class="animate-spin"><Loading /></el-icon>
            <span>{{ saving ? '保存中...' : '保存配置' }}</span>
          </button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Loading, Plus, Setting, Upload } from '@element-plus/icons-vue';

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
/* 强力消灭 Element Plus 默认标题区域 .el-dialog__header（顶部空白横条根源） */
:global(.project-dialog-apple-glass .el-dialog__header),
:global(.el-overlay-dialog .project-dialog-apple-glass .el-dialog__header),
:global(header.el-dialog__header) {
  display: none !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
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
  font-size: 11px !important;
  font-weight: 700 !important;
  color: #475569 !important;
  margin-bottom: 3px !important;
}
:global(.project-dialog-apple-glass .el-input__wrapper),
:global(.project-dialog-apple-glass .el-select__wrapper) {
  border-radius: 10px !important;
  background: #ffffff !important;
  box-shadow: 0 0 0 1px #e2e8f0 inset !important;
}
:global(.project-dialog-apple-glass .el-input__wrapper.is-focus),
:global(.project-dialog-apple-glass .el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 2px #2563eb inset !important;
}
</style>
