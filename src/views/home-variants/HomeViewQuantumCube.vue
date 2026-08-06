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

const activeFace = ref(0); // 0..5 代表魔方的 6 个面
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
    router.replace({ path: '/variant-l', query: normalizedProjectId ? { project: normalizedProjectId } : {} });
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

// 3D 魔方旋转与鼠标跟随角度 (Cube Rotation Angles)
const rotateX = ref(-15);
const rotateY = ref(25);
const isDragging = ref(false);
let lastMouseX = 0;
let lastMouseY = 0;

function handlePointerDown(e) {
  isDragging.value = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
}

function handlePointerMove(e) {
  if (isDragging.value) {
    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;
    rotateY.value += deltaX * 0.5;
    rotateX.value -= deltaY * 0.5;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
}

function handlePointerUp() {
  isDragging.value = false;
}

// 快速 Snap 旋转到指定魔方面
const faceRotations = [
  { rx: 0, ry: 0 },       // Front
  { rx: 0, ry: -90 },     // Right
  { rx: 0, ry: -180 },    // Back
  { rx: 0, ry: 90 },      // Left
  { rx: -90, ry: 0 },     // Top
  { rx: 90, ry: 0 },      // Bottom
];

function snapToFace(index) {
  activeFace.value = index;
  const rot = faceRotations[index % faceRotations.length];
  rotateX.value = rot.rx;
  rotateY.value = rot.ry;
}

const clientEntries = computed(() =>
  [...(selectedProject.value?.entries || [])]
    .filter((entry) => entry.kind !== 'docs')
    .sort((left, right) => (left.order || 0) - (right.order || 0))
    .map((entry, index) => ({
      ...entry,
      to: getProjectEntryPath(selectedProject.value, entry),
      badgeColor: [
        'bg-pink-500/20 text-pink-300 border-pink-500/40',
        'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        'bg-amber-500/20 text-amber-300 border-amber-500/40',
      ][index % 3],
      btnGlow: [
        'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 shadow-pink-500/30 hover:from-pink-600 hover:to-indigo-700',
        'bg-gradient-to-r from-cyan-400 via-blue-600 to-indigo-600 shadow-cyan-500/30 hover:from-cyan-500 hover:to-indigo-700',
        'bg-gradient-to-r from-amber-400 via-orange-600 to-red-600 shadow-amber-500/30 hover:from-amber-500 hover:to-red-700',
      ][index % 3],
      displayDescription:
        entry.kind === 'mobile'
          ? '量子触屏全组件流转，手机壳真实响应式交互视图'
          : entry.clientId === 'enterprise'
            ? '量子决策大盘、全量车辆轨迹监控与企业极速管控中枢'
            : entry.clientId === 'operation'
              ? '运力调度分配引擎、算法工单流转与高并发协同工作台'
              : entry.description || '量子原型系统',
    })),
);

const currentActiveEntry = computed(() => {
  if (!clientEntries.value.length) return null;
  return clientEntries.value[activeFace.value % clientEntries.value.length];
});

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

function handleConsoleShortcut(event) {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'm') {
    event.preventDefault();
    toggleConsole();
  }

  if (event.key === 'Escape') {
    showProjectMenu.value = false;
  }
}

onMounted(() => {
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('keydown', handleConsoleShortcut);
  document.addEventListener('pointerdown', handleOutsideProjectMenu);
});
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerup', handlePointerUp);
  window.removeEventListener('keydown', handleConsoleShortcut);
  document.removeEventListener('pointerdown', handleOutsideProjectMenu);
});
</script>

<template>
  <div class="quantum-cube-page h-screen w-screen bg-[#030510] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black relative overflow-hidden flex flex-col justify-between select-none">
    <!-- 动态量子网格与光脉冲 Quantum Aura -->
    <div class="fixed inset-0 pointer-events-none z-0">
      <div class="absolute -top-40 left-1/3 w-[900px] h-[550px] bg-gradient-to-b from-cyan-600/15 via-purple-600/15 to-transparent blur-[140px] rounded-full animate-pulse"></div>
      <div class="absolute bottom-0 -right-20 w-[700px] h-[700px] bg-pink-600/15 blur-[160px] rounded-full"></div>
      
      <!-- 极简矩阵网格 -->
      <div class="absolute inset-0 bg-[linear-gradient(to_right,#06b6d412_1px,transparent_1px),linear-gradient(to_bottom,#06b6d412_1px,transparent_1px)] bg-[size:3rem_3rem]"></div>
    </div>

    <!-- 1. 全全息 Streamline Navigation Header -->
    <header class="relative z-40 pt-6 px-8">
      <div class="mx-auto max-w-7xl h-16 rounded-full bg-slate-950/80 backdrop-blur-2xl border border-cyan-500/30 px-6 flex items-center justify-between shadow-[0_0_40px_rgba(6,182,212,0.15)]">
        <!-- Logo -->
        <div class="flex items-center gap-6">
          <RouterLink to="/variant-l" class="flex items-center gap-3 group">
            <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 p-[1px] shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform duration-500">
              <div class="w-full h-full rounded-[15px] bg-[#030510] flex items-center justify-center text-cyan-400 font-black">
                <el-icon><Box /></el-icon>
              </div>
            </div>
            <div>
              <div class="text-[9px] font-mono text-cyan-400 tracking-widest uppercase">QUANTUM HYPERCUBE 3D</div>
              <div class="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                {{ projectConfig.name }}
              </div>
            </div>
          </RouterLink>

          <span class="text-cyan-500/30 text-xs">//</span>

          <!-- Dropdown -->
          <div ref="projectMenuRef" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-bold text-cyan-300 border border-cyan-500/30 transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              @click="showProjectMenu = !showProjectMenu"
            >
              <span class="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#06b6d4] animate-ping"></span>
              <span>{{ hasSelectedProject ? selectedProject?.name : '选取量子魔方项目包' }}</span>
              <el-icon class="text-cyan-400 text-xs transition-transform duration-200" :class="{ 'rotate-180': showProjectMenu }"><ArrowDown /></el-icon>
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
                class="absolute left-0 mt-3 w-72 rounded-3xl bg-[#080E24]/95 backdrop-blur-2xl p-2.5 shadow-2xl border border-cyan-500/40 z-50 text-xs"
              >
                <div class="px-3 py-1.5 text-[10px] font-mono text-cyan-400 uppercase tracking-widest">QUANTUM MATRIX SELECTOR</div>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-colors hover:bg-cyan-500/20"
                  :class="!hasSelectedProject ? 'bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40' : 'text-slate-300'"
                  @click="chooseProject('')"
                >
                  <span>未选择项目</span>
                  <el-icon v-if="!hasSelectedProject" class="text-cyan-400"><Check /></el-icon>
                </button>
                <div class="my-1.5 border-t border-cyan-500/20"></div>
                <div class="max-h-60 overflow-y-auto space-y-1">
                  <button
                    v-for="project in selectableProjects"
                    :key="project.id"
                    type="button"
                    class="flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-colors hover:bg-cyan-500/20"
                    :class="project.id === selectedProjectId ? 'bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40' : 'text-slate-200'"
                    @click="chooseProject(project.id)"
                  >
                    <div>
                      <div class="font-bold text-white tracking-wide">{{ project.name }}</div>
                      <div class="text-[10px] text-cyan-400/80 font-mono mt-0.5">{{ project.id }} · v{{ project.version || '1.0' }}</div>
                    </div>
                    <el-icon v-if="project.id === selectedProjectId" class="text-cyan-400 text-sm"><Check /></el-icon>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="flex items-center gap-4 text-xs font-semibold">
          <RouterLink to="/components" class="text-slate-300 hover:text-cyan-400 transition-colors">组件规范</RouterLink>
          <RouterLink v-if="showConsole" to="/tools/projects" class="text-slate-300 hover:text-cyan-400 transition-colors">项目管理</RouterLink>
          <RouterLink v-if="showConsole" to="/tools/console" class="text-slate-300 hover:text-cyan-400 transition-colors">控制台</RouterLink>
        </div>
      </div>
    </header>

    <!-- 2. 突破性脑洞排版：3D 交互式量子魔方 (3D Interactive Hypercube Stage) -->
    <main class="relative z-10 mx-auto max-w-7xl w-full flex-1 flex flex-col md:flex-row items-center justify-between px-8 py-4 gap-12">
      <!-- 左侧：魔方控制面板 & 视角 Snap Controls -->
      <div class="w-full md:w-5/12 space-y-6">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/30 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.3)]">
          <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span>3D HYPERCUBE INTERACTIVE ENGINE · OPTION L</span>
        </div>

        <h1 class="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-purple-400 leading-tight">
          {{ projectTitle }}
        </h1>

        <p class="text-slate-300 text-xs sm:text-sm leading-relaxed">
          按住鼠标在右侧拖拽可全向旋转 3D 量子魔方，或直接点击下方按钮快速切面：
        </p>

        <!-- 魔方 6 面极速 Snap 控制盘 -->
        <div class="grid grid-cols-3 gap-2 pt-2">
          <button
            v-for="(entry, idx) in clientEntries"
            :key="entry.id"
            type="button"
            class="p-3 rounded-2xl border text-xs font-bold transition-all text-left truncate flex flex-col justify-between"
            :class="activeFace === idx ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-105' : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'"
            @click="snapToFace(idx)"
          >
            <div class="text-[9px] font-mono text-cyan-400/80 mb-1">FACE 0{{ idx + 1 }}</div>
            <div class="truncate">{{ entry.name }}</div>
          </button>
        </div>

        <!-- 当前对面节点的 Launch 按钮 -->
        <div v-if="currentActiveEntry" class="pt-4">
          <RouterLink
            :to="currentActiveEntry.to"
            class="w-full py-4 px-6 rounded-2xl text-xs font-black text-white flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl hover:scale-105"
            :class="currentActiveEntry.btnGlow"
          >
            <span>进入该魔方面原型</span>
            <el-icon class="text-sm"><Right /></el-icon>
          </RouterLink>
        </div>
      </div>

      <!-- 右侧：全屏 3D 自由旋转魔方舞台 (3D Interactive Orbit Cube Stage) -->
      <div
        class="w-full md:w-7/12 h-[460px] flex items-center justify-center cursor-grab active:cursor-grabbing relative"
        @pointerdown="handlePointerDown"
      >
        <!-- 提示贴纸 -->
        <div class="absolute top-2 right-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px] font-mono border border-cyan-500/30 backdrop-blur-md">
          🖱️ 拖拽按住可 360° 旋转魔方
        </div>

        <div class="cube-scene">
          <div
            class="cube"
            :style="{ transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)` }"
          >
            <!-- Face 1: Front -->
            <div class="cube-face cube-face-front">
              <div v-if="clientEntries[0]" class="h-full flex flex-col justify-between p-6">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <el-icon class="text-2xl text-pink-400"><Iphone /></el-icon>
                    <span class="text-[10px] font-mono text-pink-400 bg-pink-500/20 px-2 py-0.5 rounded border border-pink-500/30">FRONT FACE</span>
                  </div>
                  <h3 class="text-xl font-extrabold text-white mb-2">{{ clientEntries[0].name }}</h3>
                  <p class="text-xs text-slate-300 line-clamp-3">{{ clientEntries[0].displayDescription }}</p>
                </div>
                <div class="text-[10px] font-mono text-cyan-400 font-bold">CLICK SNAP TO LAUNCH →</div>
              </div>
            </div>

            <!-- Face 2: Right -->
            <div class="cube-face cube-face-right">
              <div v-if="clientEntries[1]" class="h-full flex flex-col justify-between p-6">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <el-icon class="text-2xl text-cyan-400"><OfficeBuilding /></el-icon>
                    <span class="text-[10px] font-mono text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30">RIGHT FACE</span>
                  </div>
                  <h3 class="text-xl font-extrabold text-white mb-2">{{ clientEntries[1].name }}</h3>
                  <p class="text-xs text-slate-300 line-clamp-3">{{ clientEntries[1].displayDescription }}</p>
                </div>
                <div class="text-[10px] font-mono text-cyan-400 font-bold">CLICK SNAP TO LAUNCH →</div>
              </div>
            </div>

            <!-- Face 3: Back -->
            <div class="cube-face cube-face-back">
              <div v-if="clientEntries[2]" class="h-full flex flex-col justify-between p-6">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <el-icon class="text-2xl text-amber-400"><Monitor /></el-icon>
                    <span class="text-[10px] font-mono text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">BACK FACE</span>
                  </div>
                  <h3 class="text-xl font-extrabold text-white mb-2">{{ clientEntries[2].name }}</h3>
                  <p class="text-xs text-slate-300 line-clamp-3">{{ clientEntries[2].displayDescription }}</p>
                </div>
                <div class="text-[10px] font-mono text-cyan-400 font-bold">CLICK SNAP TO LAUNCH →</div>
              </div>
            </div>

            <!-- Face 4: Left -->
            <div class="cube-face cube-face-left">
              <div class="h-full flex flex-col justify-between p-6">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <el-icon class="text-2xl text-purple-400"><Document /></el-icon>
                    <span class="text-[10px] font-mono text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">LEFT FACE</span>
                  </div>
                  <h3 class="text-xl font-extrabold text-white mb-2">PRD 需求规格书</h3>
                  <p class="text-xs text-slate-300">查看完整架构说明文档与交互原型规范。</p>
                </div>
              </div>
            </div>

            <!-- Face 5: Top -->
            <div class="cube-face cube-face-top">
              <div class="h-full flex flex-col justify-between p-6">
                <div>
                  <el-icon class="text-2xl text-cyan-400 mb-2"><Setting /></el-icon>
                  <h3 class="text-xl font-extrabold text-white">平台工程工具</h3>
                  <p class="text-xs text-slate-300">路由与项目包配置控制台。</p>
                </div>
              </div>
            </div>

            <!-- Face 6: Bottom -->
            <div class="cube-face cube-face-bottom">
              <div class="h-full flex flex-col justify-between p-6">
                <div>
                  <el-icon class="text-2xl text-pink-400 mb-2"><MagicStick /></el-icon>
                  <h3 class="text-xl font-extrabold text-white">QUANTUM CORE</h3>
                  <p class="text-xs text-slate-300">v{{ projectVersion }} 全息矩阵节点</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 3. Footer -->
    <footer class="relative z-20 py-5 border-t border-cyan-500/20 bg-[#030510]/90 text-xs font-mono text-cyan-400/80 text-center tracking-widest">
      QUANTUM 3D HYPERCUBE ENGINE · {{ projectConfig.name }}
    </footer>
  </div>
</template>

<style scoped>
.cube-scene {
  width: 260px;
  height: 260px;
  perspective: 1000px;
}

.cube {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.15s ease-out;
}

.cube-face {
  position: absolute;
  width: 260px;
  height: 260px;
  border: 1.5px solid rgba(6, 182, 212, 0.4);
  background: rgba(8, 14, 36, 0.92);
  backdrop-filter: blur(16px);
  border-radius: 28px;
  box-shadow: 0 0 40px rgba(6, 182, 212, 0.25);
}

.cube-face-front  { transform: rotateY(  0deg) translateZ(130px); }
.cube-face-right  { transform: rotateY( 90deg) translateZ(130px); }
.cube-face-back   { transform: rotateY(180deg) translateZ(130px); }
.cube-face-left   { transform: rotateY(-90deg) translateZ(130px); }
.cube-face-top    { transform: rotateX( 90deg) translateZ(130px); }
.cube-face-bottom { transform: rotateX(-90deg) translateZ(130px); }
</style>
