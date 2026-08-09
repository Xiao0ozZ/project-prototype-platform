<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { getProject, getProjectEntryPath, installedProjects } from '../../config/project-packages';
import { projectConfig } from '../../config/project.config';
import { applyProjectTheme } from '../../config/theme';
import HomeProjectActions from '../../components/HomeProjectActions.vue';

const route = useRoute();
const router = useRouter();
const showProjectMenu = ref(false);
const projectMenuRef = ref(null);
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
    router.replace({ path: '/variant-a', query: normalizedProjectId ? { project: normalizedProjectId } : {} });
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
      glassGradient: [
        'from-sky-400/20 via-blue-500/10 to-indigo-500/20 text-blue-600',
        'from-emerald-400/20 via-teal-500/10 to-cyan-500/20 text-emerald-600',
        'from-purple-400/20 via-pink-500/10 to-rose-500/20 text-purple-600',
      ][index % 3],
      displayDescription:
        entry.kind === 'mobile'
          ? '苹果液体玻璃触控界面，包含高保真手机壳与全视图流转'
          : entry.clientId === 'enterprise'
            ? '企业级综合管控看板、用车审批流与全量数据决策中心'
            : entry.clientId === 'operation'
              ? '实时运力调度大盘、算法分配与高并发协同工作台'
              : entry.description || '业务原型系统',
    })),
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

function openProjectManagement() {
  router.push('/tools/projects');
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
  <div class="apple-glass-page min-h-screen bg-[#f0f4f8] text-slate-900 font-sans antialiased selection:bg-blue-500 selection:text-white relative overflow-hidden">
    <!-- 苹果光流背景 Gradient Orbs -->
    <div class="fixed inset-0 pointer-events-none z-0">
      <div class="absolute -top-40 right-0 w-[600px] h-[600px] rounded-full bg-blue-300/30 blur-[120px]"></div>
      <div class="absolute bottom-0 -left-20 w-[600px] h-[600px] rounded-full bg-purple-300/30 blur-[120px]"></div>
    </div>

    <!-- 苹果流线 Header (Apple Fluid Glass Header) -->
    <header class="sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b border-white/60 shadow-sm">
      <div class="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <!-- Logo & Dropdown -->
        <div class="flex items-center gap-4">
          <RouterLink to="/variant-a" class="flex items-center gap-2.5 group">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <el-icon><Platform /></el-icon>
            </div>
            <span class="font-bold text-slate-900 tracking-tight text-sm group-hover:text-blue-600 transition-colors">
              {{ projectConfig.name }}
            </span>
          </RouterLink>

          <!-- 选包 Dropdown -->
          <div ref="projectMenuRef" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 hover:bg-slate-200/80 text-xs font-semibold text-slate-700 border border-slate-200/60 backdrop-blur-md transition-all"
              @click="showProjectMenu = !showProjectMenu"
            >
              <span class="w-2 h-2 rounded-full" :class="hasSelectedProject ? 'bg-blue-500 shadow-sm shadow-blue-500/50' : 'bg-slate-400'"></span>
              <span>{{ hasSelectedProject ? selectedProject?.name : '选取目标项目包' }}</span>
              <el-icon class="text-slate-400 text-xs transition-transform" :class="{ 'rotate-180': showProjectMenu }"><ArrowDown /></el-icon>
            </button>

            <!-- Dropdown Popover -->
            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="transform scale-95 opacity-0 -translate-y-1"
              enter-to-class="transform scale-100 opacity-100 translate-y-0"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="transform scale-100 opacity-100 translate-y-0"
              leave-to-class="transform scale-95 opacity-0 -translate-y-1"
            >
              <div
                v-if="showProjectMenu"
                class="absolute left-0 mt-2 w-72 rounded-2xl bg-white/90 backdrop-blur-2xl p-2 shadow-2xl shadow-blue-900/10 border border-white/80 z-50 text-xs"
              >
                <div class="px-3 py-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase">可用项目列表</div>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-slate-100/80"
                  :class="!hasSelectedProject ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-600'"
                  @click="chooseProject('')"
                >
                  <span>未选择项目</span>
                  <el-icon v-if="!hasSelectedProject" class="text-blue-600"><Check /></el-icon>
                </button>
                <div class="my-1 border-t border-slate-100"></div>
                <div class="max-h-60 overflow-y-auto space-y-1">
                  <button
                    v-for="project in selectableProjects"
                    :key="project.id"
                    type="button"
                    class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-slate-100/80"
                    :class="project.id === selectedProjectId ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-700'"
                    @click="chooseProject(project.id)"
                  >
                    <div>
                      <div class="font-bold text-slate-900">{{ project.name }}</div>
                      <div class="text-[10px] text-slate-400 font-mono mt-0.5">{{ project.id }} · v{{ project.version || '1.0' }}</div>
                    </div>
                    <el-icon v-if="project.id === selectedProjectId" class="text-blue-600 text-sm"><Check /></el-icon>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="flex items-center gap-4 text-xs font-semibold text-slate-600">
          <RouterLink to="/components" class="hover:text-blue-600 transition-colors">组件规范</RouterLink>
          <HomeProjectActions
            v-if="showConsole"
            :can-transfer="hasSelectedProject"
            @manage="openProjectManagement"
            @transfer="openPageTransfer"
          />
          <RouterLink v-if="showConsole" to="/tools/console" class="hover:text-blue-600 transition-colors">控制台</RouterLink>
        </div>
      </div>
    </header>

    <!-- 主 Stage -->
    <main class="mx-auto max-w-6xl px-6 py-12 space-y-10 relative z-10">
      <section class="rounded-3xl bg-white/60 backdrop-blur-2xl border border-white/80 p-8 sm:p-10 shadow-xl shadow-slate-200/50 space-y-4">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold border border-blue-100">
          <span class="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
          <span>{{ hasSelectedProject ? `已接入：${selectedProject?.name} (v${projectVersion})` : '请选择目标项目包' }}</span>
        </div>

        <h1 class="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          {{ projectTitle }}
        </h1>

        <p class="text-slate-600 text-sm sm:text-base max-w-2xl leading-relaxed">
          {{ hasSelectedProject ? (selectedProject?.description || '苹果液体玻璃感高保真原型系统，体验流畅的触控交互与全量业务描述。') : '请在上方下拉选择项目包，体验苹果流体玻璃视效。' }}
        </p>

      </section>

      <!-- 卡片 Grid -->
      <section class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-extrabold text-slate-400 tracking-wider uppercase">客户端原型</h2>
          <span class="text-xs font-semibold text-slate-400">{{ clientEntries.length }} 个应用入口</span>
        </div>

        <div v-if="clientEntries.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <RouterLink
            v-for="entry in clientEntries"
            :key="entry.id"
            :to="entry.to"
            class="group rounded-3xl bg-white/80 backdrop-blur-xl p-7 shadow-lg shadow-slate-200/60 border border-white/90 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div class="flex items-center justify-between mb-5">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform" :class="entry.glassGradient">
                  <el-icon v-if="entry.kind === 'mobile'"><Iphone /></el-icon>
                  <el-icon v-else-if="entry.clientId === 'enterprise'"><OfficeBuilding /></el-icon>
                  <el-icon v-else><Monitor /></el-icon>
                </div>

                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  FLUID GLASS
                </span>
              </div>

              <h3 class="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                {{ entry.name }}
              </h3>
              <p class="text-xs text-slate-500 leading-relaxed">
                {{ entry.displayDescription }}
              </p>
            </div>

            <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-blue-600">
              <span>进入体验</span>
              <el-icon class="group-hover:translate-x-1 transition-transform"><Right /></el-icon>
            </div>
          </RouterLink>
        </div>

        <div v-else class="rounded-3xl bg-white/60 p-10 text-center border border-white/80 text-xs text-slate-500">
          请在上方选择有效的项目包。
        </div>
      </section>

      <!-- 底部 MD 文档与工具 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200/60">
        <section class="md:col-span-2 space-y-3">
          <h2 class="text-xs font-extrabold text-slate-400 uppercase tracking-wider">需求规格文档</h2>
          <div v-if="documentEntries.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RouterLink
              v-for="doc in documentEntries"
              :key="doc.id"
              :to="doc.to"
              class="flex items-center justify-between p-4 rounded-2xl bg-white/80 border border-white/90 hover:bg-white hover:shadow-md transition-all text-xs font-bold text-slate-800 group"
            >
              <div class="flex items-center gap-2.5 truncate">
                <el-icon class="text-blue-500"><Document /></el-icon>
                <span class="truncate">{{ doc.name }}</span>
              </div>
              <el-icon class="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-transform"><Right /></el-icon>
            </RouterLink>
          </div>
          <div v-else class="text-xs text-slate-400 bg-white/60 p-4 rounded-2xl border border-white/80">
            暂无文档。
          </div>
        </section>

      </div>
    </main>
  </div>
</template>

<style scoped>
.apple-glass-page {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
}
</style>
