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

const activeIndex = ref(0);
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
    router.replace({ path: '/variant-h', query: normalizedProjectId ? { project: normalizedProjectId } : {} });
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
      tagColor: [
        'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        'bg-purple-500/10 text-purple-300 border-purple-500/30',
        'bg-pink-500/10 text-pink-300 border-pink-500/30',
      ][index % 3],
      activeGlow: [
        'border-cyan-400 shadow-[0_0_50px_rgba(34,211,238,0.35)]',
        'border-purple-400 shadow-[0_0_50px_rgba(192,132,252,0.35)]',
        'border-pink-400 shadow-[0_0_50px_rgba(244,114,182,0.35)]',
      ][index % 3],
      btnGradient: [
        'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 shadow-cyan-500/30 hover:from-cyan-400 hover:to-indigo-500',
        'bg-gradient-to-r from-purple-500 via-pink-600 to-indigo-600 shadow-purple-500/30 hover:from-purple-400 hover:to-indigo-500',
        'bg-gradient-to-r from-pink-500 via-rose-600 to-purple-600 shadow-pink-500/30 hover:from-pink-400 hover:to-purple-500',
      ][index % 3],
      displayDescription:
        entry.kind === 'mobile'
          ? '全响应式 3D 触屏交互，手机壳全组件覆盖与移动端高保真视图流转'
          : entry.clientId === 'enterprise'
            ? '企业级综合管控看板、用车流程审批、车辆实时动态与多租户权限中心'
            : entry.clientId === 'operation'
              ? '运营调度大盘、运力算法分配、工单异常流转与高并发协同工作台'
              : entry.description || '业务原型系统',
    })),
);

const activeEntry = computed(() => {
  if (!clientEntries.value.length) return null;
  return clientEntries.value[activeIndex.value % clientEntries.value.length];
});

function nextEntry() {
  if (clientEntries.value.length) {
    activeIndex.value = (activeIndex.value + 1) % clientEntries.value.length;
  }
}

function prevEntry() {
  if (clientEntries.value.length) {
    activeIndex.value = (activeIndex.value - 1 + clientEntries.value.length) % clientEntries.value.length;
  }
}

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
  <div class="orbital-compass-page h-screen w-screen bg-[#050711] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black relative overflow-hidden flex flex-col justify-between">
    <!-- 背景 3D 星轨与粒子光场 Cosmic Aura -->
    <div class="fixed inset-0 pointer-events-none z-0">
      <div class="absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full bg-cyan-600/10 blur-[160px] animate-orbit-glow"></div>
      <div class="absolute -bottom-40 -right-40 w-[800px] h-[800px] rounded-full bg-purple-600/10 blur-[160px]"></div>

      <!-- 3D 同心环星轨 Orbital Rings -->
      <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-cyan-500/10 animate-spin-slow pointer-events-none"></div>
      <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full border border-purple-500/10 animate-spin-reverse pointer-events-none"></div>
      
      <!-- 极简矩阵点阵 Dot Canvas -->
      <div class="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:28px_28px]"></div>
    </div>

    <!-- 顶部 HUD Navigation Bar -->
    <header class="relative z-40 pt-6 px-8">
      <div class="mx-auto max-w-7xl h-16 rounded-full bg-[#090D1C]/80 backdrop-blur-2xl border border-white/10 px-6 flex items-center justify-between shadow-2xl">
        <div class="flex items-center gap-6">
          <RouterLink to="/variant-h" class="flex items-center gap-3 group">
            <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 p-[1px] shadow-lg shadow-cyan-500/30 group-hover:rotate-90 transition-transform duration-500">
              <div class="w-full h-full rounded-[15px] bg-[#050711] flex items-center justify-center text-cyan-400 font-black">
                <el-icon><Compass /></el-icon>
              </div>
            </div>
            <div>
              <div class="text-[9px] font-mono text-cyan-400 tracking-widest uppercase">SPATIAL ORBITAL COMPASS</div>
              <div class="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                {{ projectConfig.name }}
              </div>
            </div>
          </RouterLink>

          <span class="text-white/15 text-xs font-light">|</span>

          <!-- Dropdown -->
          <div ref="projectMenuRef" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition-all hover:border-cyan-500/40"
              @click="showProjectMenu = !showProjectMenu"
            >
              <span class="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse"></span>
              <span>{{ hasSelectedProject ? selectedProject?.name : '选择项目包' }}</span>
              <el-icon class="text-slate-400 text-xs transition-transform" :class="{ 'rotate-180': showProjectMenu }"><ArrowDown /></el-icon>
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
                class="absolute left-0 mt-3 w-72 rounded-3xl bg-[#090D1C]/95 backdrop-blur-2xl p-2.5 shadow-2xl border border-cyan-500/30 z-50 text-xs"
              >
                <div class="px-3 py-1.5 text-[10px] font-mono text-cyan-400 uppercase tracking-widest">ORBITAL PROJECTS</div>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-colors hover:bg-white/10"
                  :class="!hasSelectedProject ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-300'"
                  @click="chooseProject('')"
                >
                  <span>未选择项目</span>
                  <el-icon v-if="!hasSelectedProject" class="text-cyan-400"><Check /></el-icon>
                </button>
                <div class="my-1.5 border-t border-white/10"></div>
                <div class="max-h-60 overflow-y-auto space-y-1">
                  <button
                    v-for="project in selectableProjects"
                    :key="project.id"
                    type="button"
                    class="flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-colors hover:bg-white/10"
                    :class="project.id === selectedProjectId ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-200'"
                    @click="chooseProject(project.id)"
                  >
                    <div>
                      <div class="font-bold text-white">{{ project.name }}</div>
                      <div class="text-[10px] text-slate-400 font-mono">{{ project.id }} · v{{ project.version || '1.0' }}</div>
                    </div>
                    <el-icon v-if="project.id === selectedProjectId" class="text-cyan-400 text-sm"><Check /></el-icon>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="flex items-center gap-4 text-xs font-semibold text-slate-400">
          <RouterLink to="/components" class="hover:text-cyan-300 transition-colors">组件规范</RouterLink>
          <RouterLink to="/tools/project-routes" class="hover:text-cyan-300 transition-colors">路由管理</RouterLink>
          <RouterLink to="/tools/projects" class="hover:text-cyan-300 transition-colors">项目包</RouterLink>
          <button
            type="button"
            class="text-slate-400 hover:text-white transition-colors"
            title="快捷键 Ctrl+Shift+M"
            @click="toggleConsole"
          >
            {{ showConsole ? '开发者模式: 开' : '开发者模式' }}
          </button>
        </div>
      </div>
    </header>

    <!-- 颠覆创新核心：3D 环形罗盘焦点视窗 (Orbital Compass Stage Focus) -->
    <main class="relative z-10 mx-auto max-w-7xl w-full px-6 flex-1 flex flex-col justify-center my-auto">
      <div v-if="clientEntries.length" class="flex flex-col lg:flex-row items-center justify-between gap-12">
        <!-- 3D 罗盘环形控制选择器 (Left Orbital Dial Selector) -->
        <div class="w-full lg:w-1/2 flex flex-col items-center lg:items-start space-y-6">
          <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-mono border border-cyan-500/20 backdrop-blur-md">
            <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>INNOVATIVE ORBITAL COMPASS ARCHITECTURE</span>
          </div>

          <h1 class="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-400 tracking-tight leading-tight text-center lg:text-left">
            {{ projectTitle }}
          </h1>

          <!-- 3D 环形拨轮 (Orbital Segment Selector) -->
          <div class="w-full max-w-md bg-[#090D1C]/90 backdrop-blur-2xl border border-white/15 p-2 rounded-3xl shadow-2xl flex items-center justify-between gap-2">
            <button
              type="button"
              class="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all shrink-0 active:scale-95"
              @click="prevEntry"
            >
              <el-icon><ArrowLeft /></el-icon>
            </button>

            <!-- Segments list -->
            <div class="flex-1 flex items-center justify-center gap-2 overflow-hidden">
              <button
                v-for="(entry, idx) in clientEntries"
                :key="entry.id"
                type="button"
                class="px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-300 truncate"
                :class="activeIndex === idx ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/40 scale-105' : 'bg-white/5 text-slate-400 hover:text-white'"
                @click="activeIndex = idx"
              >
                {{ entry.name }}
              </button>
            </div>

            <button
              type="button"
              class="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all shrink-0 active:scale-95"
              @click="nextEntry"
            >
              <el-icon><ArrowRight /></el-icon>
            </button>
          </div>

          <!-- 文档与工具快速链接条 -->
          <div class="flex flex-wrap items-center gap-3 pt-2">
            <RouterLink
              v-for="doc in documentEntries.slice(0, 2)"
              :key="doc.id"
              :to="doc.to"
              class="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/10 text-xs font-semibold text-slate-300 transition-all flex items-center gap-2"
            >
              <el-icon class="text-cyan-400"><Document /></el-icon>
              <span>{{ doc.name }}</span>
            </RouterLink>
          </div>
        </div>

        <!-- 罗盘核心焦点展示 Card (Right Orbital Spotlight Card) -->
        <div v-if="activeEntry" class="w-full lg:w-1/2 relative">
          <!-- Ambient Glow for active card -->
          <div class="group relative rounded-[36px] bg-slate-950/90 backdrop-blur-2xl p-10 border transition-all duration-500 flex flex-col justify-between min-h-[420px] shadow-2xl" :class="activeEntry.activeGlow">
            <div>
              <div class="flex items-center justify-between mb-8">
                <div class="w-16 h-16 rounded-3xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center text-3xl text-cyan-300 shadow-inner">
                  <el-icon v-if="activeEntry.kind === 'mobile'"><Iphone /></el-icon>
                  <el-icon v-else-if="activeEntry.clientId === 'enterprise'"><OfficeBuilding /></el-icon>
                  <el-icon v-else><Monitor /></el-icon>
                </div>

                <span class="px-3.5 py-1 rounded-full text-xs font-mono font-bold tracking-wider border uppercase" :class="activeEntry.tagColor">
                  COMPASS NODE FOCUS
                </span>
              </div>

              <h2 class="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">
                {{ activeEntry.name }}
              </h2>

              <p class="text-slate-300 text-sm leading-relaxed mb-8">
                {{ activeEntry.displayDescription }}
              </p>
            </div>

            <!-- Launch Primary Button -->
            <RouterLink
              :to="activeEntry.to"
              class="w-full py-4 px-8 rounded-2xl text-sm font-black text-black flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95"
              :class="activeEntry.btnGradient"
            >
              <span>启动罗盘原型系统</span>
              <el-icon class="text-base transition-transform group-hover:translate-x-2"><Right /></el-icon>
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="rounded-3xl border border-white/10 bg-[#090D1C]/80 backdrop-blur-2xl p-16 text-center max-w-lg mx-auto shadow-2xl">
        <el-icon class="text-4xl text-cyan-400 mb-3 animate-bounce"><Compass /></el-icon>
        <div class="text-base font-black text-white">未激活目标罗盘节点</div>
        <div class="text-xs text-slate-400 mt-1">请在顶部下拉选择包含客户端的原型包。</div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="relative z-20 py-4 border-t border-white/10 bg-[#050711]/90 text-xs font-mono text-slate-400 text-center tracking-widest">
      SPATIAL ORBITAL COMPASS ENGINE · {{ projectConfig.name }}
    </footer>
  </div>
</template>

<style scoped>
@keyframes spinReverse {
  from { transform: translate(-50%, -50%) rotate(360deg); }
  to { transform: translate(-50%, -50%) rotate(0deg); }
}

.animate-spin-reverse {
  animation: spinReverse 35s linear infinite;
}

.animate-spin-slow {
  animation: spinSlow 45s linear infinite;
}

@keyframes spinSlow {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}
</style>
