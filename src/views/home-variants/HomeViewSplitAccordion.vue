<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { getProject, getProjectEntryPath, installedProjects } from '../../config/project-packages';
import { projectConfig } from '../../config/project.config';
import { applyProjectTheme } from '../../config/theme';

const route = useRoute();
const router = useRouter();
const showProjectMenu = ref(false);
const projectMenuRef = ref(null);
const activeAccordionId = ref('');
const consoleVisibilityKey = 'project-platform:home-engineering-tools';
const selectedProjectStorageKey = 'project-platform:home-selected-project';

function readConsoleVisibility() {
  try {
    return window.sessionStorage.getItem(consoleVisibilityKey) === 'true';
  } catch {
    return false;
  }
}

const showConsole = ref(readConsoleVisibility());

const selectableProjects = computed(() =>
  installedProjects.filter((project) => project.homepage?.visible !== false),
);

const selectedProjectId = computed({
  get() {
    const queryProject = typeof route.query.project === 'string' ? route.query.project : '';
    if (selectableProjects.value.some((project) => project.id === queryProject)) return queryProject;

    try {
      const rememberedProject = window.localStorage.getItem(selectedProjectStorageKey) || '';
      return selectableProjects.value.some((project) => project.id === rememberedProject) ? rememberedProject : '';
    } catch {
      return '';
    }
  },
  set(projectId) {
    const normalizedProjectId = selectableProjects.value.some((project) => project.id === projectId) ? projectId : '';
    try {
      if (normalizedProjectId) {
        window.localStorage.setItem(selectedProjectStorageKey, normalizedProjectId);
      } else {
        window.localStorage.removeItem(selectedProjectStorageKey);
      }
    } catch {
      // Local storage is optional
    }
    router.replace({ path: '/variant-e', query: normalizedProjectId ? { project: normalizedProjectId } : {} });
  },
});

const selectedProject = computed(() => getProject(selectedProjectId.value));

watch(
  selectedProject,
  (project) => {
    applyProjectTheme(project || null);
  },
  { immediate: true },
);

const clientEntries = computed(() =>
  [...(selectedProject.value?.entries || [])]
    .filter((entry) => entry.kind !== 'docs')
    .sort((left, right) => (left.order || 0) - (right.order || 0))
    .map((entry, index) => ({
      ...entry,
      to: getProjectEntryPath(selectedProject.value, entry),
      numStr: `0${index + 1}`,
      bgColor: [
        'bg-slate-900 border-indigo-500/30 text-indigo-400',
        'bg-slate-950 border-cyan-500/30 text-cyan-400',
        'bg-slate-900 border-emerald-500/30 text-emerald-400',
      ][index % 3],
      accentGlow: [
        'from-indigo-600 to-blue-600 shadow-indigo-500/30',
        'from-cyan-500 to-teal-600 shadow-cyan-500/30',
        'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
      ][index % 3],
      displayDescription:
        entry.kind === 'mobile'
          ? '全响应式触屏交互，提供高保真手机壳实时体验模式与完整移动端视图链'
          : entry.clientId === 'enterprise'
            ? '企业级综合业务看板、用车流程审批、车辆实时监控与租户权限中心'
            : entry.clientId === 'operation'
              ? '运营调度大盘、运力算法分配、异常工单流转与高并发协同工作台'
              : entry.description || '业务原型入口系统',
    })),
);

// 默认激活手风琴的第一项
watch(
  clientEntries,
  (entries) => {
    if (entries.length && (!activeAccordionId.value || !entries.some((e) => e.id === activeAccordionId.value))) {
      activeAccordionId.value = entries[0].id;
    }
  },
  { immediate: true },
);

const documentEntries = computed(() =>
  [...(selectedProject.value?.entries || [])]
    .filter((entry) => entry.kind === 'docs')
    .sort((left, right) => (left.order || 0) - (right.order || 0))
    .map((entry) => ({
      ...entry,
      to: getProjectEntryPath(selectedProject.value, entry),
    })),
);

const projectTitle = computed(() => selectedProject.value?.name || projectConfig.name);
const projectVersion = computed(() => selectedProject.value?.version || '1.0.0');
const hasSelectedProject = computed(() => Boolean(selectedProject.value));

function chooseProject(projectId) {
  selectedProjectId.value = projectId;
  showProjectMenu.value = false;
}

function toggleConsole() {
  showConsole.value = !showConsole.value;
  try {
    window.sessionStorage.setItem(consoleVisibilityKey, String(showConsole.value));
  } catch {
    // Session storage is optional
  }
}

function handleConsoleShortcut(event) {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'm') {
    event.preventDefault();
    toggleConsole();
  }
  if (event.key === 'Escape') {
    showProjectMenu.value = false;
  }
}

function handleOutsideProjectMenu(event) {
  if (showProjectMenu.value && !projectMenuRef.value?.contains(event.target)) {
    showProjectMenu.value = false;
  }
}

function openProjectSettings() {
  router.push({
    path: '/tools/projects',
    query: { project: selectedProjectId.value, edit: '1' },
  });
}

function openPageTransfer() {
  router.push({ path: '/tools/page-transfer', query: { project: selectedProjectId.value } });
}

onMounted(() => {
  window.addEventListener('keydown', handleConsoleShortcut);
  document.addEventListener('pointerdown', handleOutsideProjectMenu);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleConsoleShortcut);
  document.removeEventListener('pointerdown', handleOutsideProjectMenu);
});
</script>

<template>
  <div class="split-accordion-page h-screen w-screen bg-[#090D16] text-slate-100 font-sans antialiased overflow-hidden flex flex-col md:flex-row">
    <!-- 颠覆排版 左半屏：40% 宽度全景控制视窗 (Left Fixed Portal Hub) -->
    <aside class="w-full md:w-[42%] h-full bg-[#0D1322] border-r border-slate-800/80 p-8 sm:p-12 flex flex-col justify-between z-20 shrink-0 relative overflow-y-auto">
      <!-- Ambient Backglow -->
      <div class="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"></div>

      <!-- Top Header & Selector -->
      <div class="space-y-8 relative z-10">
        <!-- Logo -->
        <div class="flex items-center justify-between">
          <RouterLink to="/variant-e" class="flex items-center gap-3 group">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <div class="w-full h-full rounded-[15px] bg-[#090D16] flex items-center justify-center text-indigo-400 font-black">
                <el-icon><Platform /></el-icon>
              </div>
            </div>
            <div>
              <div class="text-xs font-mono text-indigo-400 tracking-wider">SPLIT ACCORDION ENGINE</div>
              <div class="text-sm font-black text-white group-hover:text-indigo-300 transition-colors">
                {{ projectConfig.name }}
              </div>
            </div>
          </RouterLink>

        <div class="flex items-center gap-4 text-xs font-semibold">
          <RouterLink to="/components" class="text-slate-400 hover:text-white transition-colors">组件规范</RouterLink>
          <RouterLink v-if="showConsole" to="/tools/projects" class="text-slate-400 hover:text-white transition-colors">项目管理</RouterLink>
          <RouterLink v-if="showConsole" to="/tools/console" class="text-slate-400 hover:text-white transition-colors">控制台</RouterLink>
        </div>
        </div>

        <!-- 全屏巨大项目选择按钮 (Hero Project Dropdown) -->
        <div ref="projectMenuRef" class="relative">
          <label class="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">TARGET PROJECT PACKAGE</label>
          <button
            type="button"
            class="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 hover:border-indigo-500/60 shadow-lg text-left group transition-all"
            @click="showProjectMenu = !showProjectMenu"
          >
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full" :class="hasSelectedProject ? 'bg-emerald-400 shadow-md shadow-emerald-400/80 animate-ping' : 'bg-slate-600'"></div>
              <div>
                <div class="text-base font-black text-white group-hover:text-indigo-300 transition-colors">
                  {{ hasSelectedProject ? selectedProject?.name : '选取目标项目包...' }}
                </div>
                <div class="text-xs text-slate-400 font-mono">
                  {{ hasSelectedProject ? `${selectedProject?.id} · v${projectVersion}` : '点击下拉列表中选定项目包' }}
                </div>
              </div>
            </div>
            <el-icon class="text-slate-400 text-base transition-transform duration-200" :class="{ 'rotate-180': showProjectMenu }"><ArrowDown /></el-icon>
          </button>

          <!-- Dropdown -->
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="transform scale-95 opacity-0 -translate-y-2"
            enter-to-class="transform scale-100 opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="transform scale-100 opacity-100 translate-y-0"
            leave-to-class="transform scale-95 opacity-0 -translate-y-2"
          >
            <div
              v-if="showProjectMenu"
              class="absolute left-0 right-0 mt-3 rounded-3xl bg-[#0D1322] p-2 shadow-2xl shadow-black border border-slate-700 z-50"
            >
              <div class="px-3 py-1.5 text-[10px] font-mono text-indigo-400 uppercase tracking-wider">PROJECT PACKAGES</div>
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-xs transition-colors hover:bg-slate-800"
                :class="!hasSelectedProject ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-300'"
                @click="chooseProject('')"
              >
                <span>未选择项目 (全局看板)</span>
                <el-icon v-if="!hasSelectedProject" class="text-indigo-400 text-base"><Check /></el-icon>
              </button>
              <div class="my-2 border-t border-slate-800"></div>
              <div class="max-h-60 overflow-y-auto space-y-1">
                <button
                  v-for="project in selectableProjects"
                  :key="project.id"
                  type="button"
                  class="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-xs transition-colors hover:bg-slate-800"
                  :class="project.id === selectedProjectId ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-200'"
                  @click="chooseProject(project.id)"
                >
                  <div>
                    <div class="font-bold text-white text-sm">{{ project.name }}</div>
                    <div class="text-[11px] text-slate-400 font-mono mt-0.5">{{ project.id }} · v{{ project.version || '1.0' }}</div>
                  </div>
                  <el-icon v-if="project.id === selectedProjectId" class="text-indigo-400 text-base"><Check /></el-icon>
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 需求文档快捷卡片 -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-mono text-slate-500 uppercase tracking-widest">REQUIREMENT DOCS</span>
            <span class="text-xs text-indigo-400 font-mono font-bold">{{ documentEntries.length }} DOCS</span>
          </div>

          <div v-if="documentEntries.length" class="space-y-2 max-h-48 overflow-y-auto pr-1">
            <RouterLink
              v-for="doc in documentEntries"
              :key="doc.id"
              :to="doc.to"
              class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all text-xs font-semibold text-slate-200 group"
            >
              <div class="flex items-center gap-2.5 truncate">
                <el-icon class="text-slate-400 group-hover:text-indigo-400"><Document /></el-icon>
                <span class="truncate">{{ doc.name }}</span>
              </div>
              <el-icon class="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all"><Right /></el-icon>
            </RouterLink>
          </div>
          <div v-else class="text-xs text-slate-500 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            {{ hasSelectedProject ? '该项目包暂未编写 Markdown 文档' : '选择项目包以查看相关文档' }}
          </div>
        </div>
      </div>

      <!-- 底部平台工具链 -->
      <div v-if="showConsole" class="pt-6 border-t border-slate-800/80 space-y-4 relative z-10">
        <span class="text-[10px] font-mono text-slate-500 uppercase tracking-widest">PLATFORM ARSENAL</span>
        <div class="grid grid-cols-2 gap-3">
          <RouterLink
            to="/tools/projects"
            class="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800 transition-all group"
          >
            <el-icon class="text-lg text-indigo-400 group-hover:scale-110 transition-transform"><Menu /></el-icon>
            <div>
              <div class="text-xs font-bold text-white">项目管理</div>
              <div class="text-[10px] text-slate-500">页面结构配置</div>
            </div>
          </RouterLink>

          <RouterLink
            to="/tools/page-transfer"
            class="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800 transition-all group"
          >
            <el-icon class="text-lg text-cyan-400 group-hover:scale-110 transition-transform"><Switch /></el-icon>
            <div>
              <div class="text-xs font-bold text-white">页面导入导出</div>
              <div class="text-[10px] text-slate-500">HTML包转换</div>
            </div>
          </RouterLink>
        </div>

        <div v-if="showConsole" class="pt-2 flex gap-2">
          <button
            type="button"
            class="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors border border-slate-700"
            @click="openProjectSettings"
          >
            编辑项目包配置
          </button>
        </div>
      </div>
    </aside>

    <!-- 颠覆排版 右半屏：58% 宽度手风琴客户端视界 (Right Interactive Accordion Showcase) -->
    <main class="w-full md:w-[58%] h-full p-6 sm:p-10 flex flex-col justify-center relative overflow-hidden bg-[#090D16]">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <span class="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">INTERACTIVE CLIENT SLATS</span>
          <h2 class="text-xl font-black text-white">客户端手风琴视景</h2>
        </div>
        <span class="text-xs text-slate-500 font-mono">{{ clientEntries.length }} 个端入口</span>
      </div>

      <!-- 手风琴展架 Accordion Container -->
      <div v-if="clientEntries.length" class="flex-1 max-h-[600px] flex flex-col md:flex-row gap-4">
        <div
          v-for="entry in clientEntries"
          :key="entry.id"
          class="group relative rounded-3xl border transition-all duration-500 ease-out cursor-pointer flex flex-col justify-between p-7 overflow-hidden"
          :class="[
            entry.bgColor,
            activeAccordionId === entry.id
              ? 'flex-[3] shadow-2xl shadow-indigo-500/20 scale-[1.01]'
              : 'flex-1 opacity-70 hover:opacity-100 hover:flex-[1.5]'
          ]"
          @click="activeAccordionId = entry.id"
        >
          <!-- Num Watermark Background -->
          <div class="absolute right-4 bottom-2 text-7xl font-black font-mono text-white/5 pointer-events-none select-none">
            {{ entry.numStr }}
          </div>

          <!-- Header -->
          <div class="relative z-10 flex items-center justify-between">
            <div class="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-xl text-white font-bold border border-white/10">
              <el-icon v-if="entry.kind === 'mobile'"><Iphone /></el-icon>
              <el-icon v-else-if="entry.clientId === 'enterprise'"><OfficeBuilding /></el-icon>
              <el-icon v-else><Monitor /></el-icon>
            </div>

            <span class="px-2.5 py-1 rounded-full bg-white/10 text-[10px] font-mono font-bold tracking-wider text-slate-300">
              {{ entry.numStr }}
            </span>
          </div>

          <!-- Active Expanded Content -->
          <div class="relative z-10 space-y-4 my-auto">
            <h3 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {{ entry.name }}
            </h3>

            <!-- 仅在展开态显示的详细说明 -->
            <p
              class="text-xs sm:text-sm text-slate-300 leading-relaxed transition-all duration-300"
              :class="activeAccordionId === entry.id ? 'opacity-100 max-h-32' : 'opacity-40 max-h-12 line-clamp-1'"
            >
              {{ entry.displayDescription }}
            </p>
          </div>

          <!-- Launch Action -->
          <div class="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between">
            <span class="text-xs font-bold text-white">
              {{ activeAccordionId === entry.id ? '启动该端系统原型' : '点击展开系统' }}
            </span>
            <RouterLink
              :to="entry.to"
              class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
              :class="entry.accentGlow"
              @click.stop
            >
              <span>立即体验</span>
              <el-icon><Right /></el-icon>
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="rounded-3xl border border-slate-800 bg-slate-900/50 p-12 text-center">
        <el-icon class="text-4xl text-slate-600 mb-2"><FolderOpened /></el-icon>
        <div class="text-sm font-bold text-white">未找到客户端</div>
        <div class="text-xs text-slate-500 mt-1">请在左侧选择包含客户端的原型包。</div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.split-accordion-page {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
</style>
