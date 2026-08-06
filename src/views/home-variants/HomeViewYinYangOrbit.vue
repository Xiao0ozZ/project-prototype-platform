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
const canvasRef = ref(null);

const activeNodeIndex = ref(0);
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
    router.replace({ path: '/variant-m', query: normalizedProjectId ? { project: normalizedProjectId } : {} });
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

// 鼠标太极磁场偏转 (Magnetic Dipole Offset)
const mouseX = ref(0);
const mouseY = ref(0);
const magneticX = ref(0);
const magneticY = ref(0);

function handleMouseMove(e) {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  mouseX.value = e.clientX;
  mouseY.value = e.clientY;

  magneticX.value = (e.clientX - cx) * 0.06;
  magneticY.value = (e.clientY - cy) * 0.06;
}

// Canvas 太极双环 S 曲线粒子与流速 Canvas Engine
let animationId = null;
let ctx = null;
let flowParticles = [];

function initYinYangCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const count = 160;
  flowParticles = Array.from({ length: count }, () => ({
    t: Math.random(),
    speed: Math.random() * 0.003 + 0.001,
    size: Math.random() * 2 + 1,
    color: Math.random() < 0.5 ? '#ec4899' : '#06b6d4',
    alpha: Math.random() * 0.7 + 0.3,
  }));

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2 + magneticX.value;
    const cy = canvas.height / 2 + magneticY.value;

    // 绘制太极阴阳 S 曲线轨迹粒子 (Yin-Yang S-Curve Particle Flow)
    for (let i = 0; i < flowParticles.length; i++) {
      const p = flowParticles[i];
      p.t = (p.t + p.speed) % 1;

      // 双双同心八卦 S 轨迹参数化方程 (S-Curve Equation)
      const angle = p.t * Math.PI * 2;
      const r = 260 * Math.sin(angle * 0.5);
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * (r * 0.55);

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    animationId = requestAnimationFrame(render);
  }

  render();
}

function handleResize() {
  if (canvasRef.value) {
    canvasRef.value.width = window.innerWidth;
    canvasRef.value.height = window.innerHeight;
  }
}

const clientEntries = computed(() =>
  [...(selectedProject.value?.entries || [])]
    .filter((entry) => entry.kind !== 'docs')
    .sort((left, right) => (left.order || 0) - (right.order || 0))
    .map((entry, index, arr) => {
      const total = arr.length || 1;
      const side = index % 2 === 0 ? -1 : 1; // 阴阳左右分排
      const offsetX = side * 280;
      const offsetY = (index / total - 0.5) * 140;

      return {
        ...entry,
        to: getProjectEntryPath(selectedProject.value, entry),
        posX: offsetX,
        posY: offsetY,
        badgeStyle: side === -1
          ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
          : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        glowStyle: side === -1
          ? 'border-pink-500/50 shadow-[0_0_40px_rgba(236,72,153,0.3)]'
          : 'border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.3)]',
        btnStyle: side === -1
          ? 'bg-gradient-to-r from-pink-500 to-purple-600 shadow-pink-500/30 hover:from-pink-600 hover:to-purple-700'
          : 'bg-gradient-to-r from-cyan-400 to-blue-600 shadow-cyan-500/30 hover:from-cyan-500 hover:to-blue-700',
        displayDescription:
          entry.kind === 'mobile'
            ? '太极磁场全触屏交互，极速手机壳预览与完整全组件流转'
            : entry.clientId === 'enterprise'
              ? '双流综合管控大盘、车辆全轨迹决策监控与企业极速管控中枢'
              : entry.clientId === 'operation'
                ? '双轨道运力调度分配引擎、算法工单流转与高并发协同工作台'
                : entry.description || '业务原型系统',
      };
    }),
);

const activeEntry = computed(() => {
  if (!clientEntries.value.length) return null;
  return clientEntries.value[activeNodeIndex.value % clientEntries.value.length];
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
  initYinYangCanvas();
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('resize', handleResize);
  window.addEventListener('keydown', handleConsoleShortcut);
  document.addEventListener('pointerdown', handleOutsideProjectMenu);
});
onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId);
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('keydown', handleConsoleShortcut);
  document.removeEventListener('pointerdown', handleOutsideProjectMenu);
});
</script>

<template>
  <div class="yin-yang-orbit-page h-screen w-screen bg-[#02040B] text-slate-100 font-sans selection:bg-pink-500 selection:text-white relative overflow-hidden flex flex-col justify-between">
    <!-- 1. 太极 S 轨迹粒子与磁场 Canvas -->
    <canvas ref="canvasRef" class="fixed inset-0 pointer-events-none z-0"></canvas>

    <!-- 2. 全全息 Streamline Navigation Header -->
    <header class="relative z-40 pt-6 px-8">
      <div class="mx-auto max-w-7xl h-16 rounded-full bg-slate-950/80 backdrop-blur-2xl border border-pink-500/30 px-6 flex items-center justify-between shadow-[0_0_40px_rgba(236,72,153,0.15)]">
        <!-- Logo -->
        <div class="flex items-center gap-6">
          <RouterLink to="/variant-m" class="flex items-center gap-3 group">
            <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400 p-[1px] shadow-[0_0_25px_rgba(236,72,153,0.5)] group-hover:rotate-180 transition-transform duration-700">
              <div class="w-full h-full rounded-full bg-[#02040B] flex items-center justify-center text-pink-400 font-black">
                <el-icon><RefreshRight /></el-icon>
              </div>
            </div>
            <div>
              <div class="text-[9px] font-mono text-pink-400 tracking-widest uppercase">YIN-YANG DUAL ORBIT MATRIX</div>
              <div class="text-sm font-black text-white group-hover:text-pink-300 transition-colors">
                {{ projectConfig.name }}
              </div>
            </div>
          </RouterLink>

          <span class="text-pink-500/30 text-xs">//</span>

          <!-- Dropdown -->
          <div ref="projectMenuRef" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-pink-500/10 hover:bg-pink-500/20 text-xs font-bold text-pink-300 border border-pink-500/30 transition-all hover:shadow-[0_0_20px_rgba(236,72,153,0.4)]"
              @click="showProjectMenu = !showProjectMenu"
            >
              <span class="w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_10px_#ec4899] animate-ping"></span>
              <span>{{ hasSelectedProject ? selectedProject?.name : '选择太极双轨包...' }}</span>
              <el-icon class="text-pink-400 text-xs transition-transform duration-200" :class="{ 'rotate-180': showProjectMenu }"><ArrowDown /></el-icon>
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
                class="absolute left-0 mt-3 w-72 rounded-3xl bg-[#090D1E]/95 backdrop-blur-2xl p-2.5 shadow-2xl border border-pink-500/40 z-50 text-xs"
              >
                <div class="px-3 py-1.5 text-[10px] font-mono text-pink-400 uppercase tracking-widest">DUAL ORBIT SELECTOR</div>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-colors hover:bg-pink-500/20"
                  :class="!hasSelectedProject ? 'bg-pink-500/30 text-pink-300 font-bold border border-pink-500/40' : 'text-slate-300'"
                  @click="chooseProject('')"
                >
                  <span>未选择项目</span>
                  <el-icon v-if="!hasSelectedProject" class="text-pink-400"><Check /></el-icon>
                </button>
                <div class="my-1.5 border-t border-pink-500/20"></div>
                <div class="max-h-60 overflow-y-auto space-y-1">
                  <button
                    v-for="project in selectableProjects"
                    :key="project.id"
                    type="button"
                    class="flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-colors hover:bg-pink-500/20"
                    :class="project.id === selectedProjectId ? 'bg-pink-500/30 text-pink-300 font-bold border border-pink-500/40' : 'text-slate-200'"
                    @click="chooseProject(project.id)"
                  >
                    <div>
                      <div class="font-bold text-white tracking-wide">{{ project.name }}</div>
                      <div class="text-[10px] text-pink-400/80 font-mono mt-0.5">{{ project.id }} · v{{ project.version || '1.0' }}</div>
                    </div>
                    <el-icon v-if="project.id === selectedProjectId" class="text-pink-400 text-sm"><Check /></el-icon>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="flex items-center gap-4 text-xs font-semibold">
          <RouterLink to="/components" class="text-slate-300 hover:text-pink-400 transition-colors">组件规范</RouterLink>
          <RouterLink v-if="showConsole" to="/tools/projects" class="text-slate-300 hover:text-pink-400 transition-colors">项目管理</RouterLink>
          <RouterLink v-if="showConsole" to="/tools/console" class="text-slate-300 hover:text-pink-400 transition-colors">控制台</RouterLink>
        </div>
      </div>
    </header>

    <!-- 3. 全新颠覆排版：全景双重太极咬合轨道阵列 (Yin-Yang Dual Orbit Stage) -->
    <main class="relative z-10 mx-auto max-w-7xl w-full flex-1 flex items-center justify-center">
      <!-- 中央太极焦点核心 Center Singularity Hub -->
      <div
        class="relative w-80 sm:w-96 rounded-full bg-slate-950/90 backdrop-blur-3xl border border-pink-500/40 p-8 text-center shadow-[0_0_80px_rgba(236,72,153,0.3)] transition-transform duration-300 ease-out z-20 flex flex-col justify-between min-h-[360px]"
        :style="{ transform: `translate(${magneticX}px, ${magneticY}px)` }"
      >
        <div class="relative z-10 space-y-3">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/15 text-pink-300 text-[10px] font-mono font-bold border border-pink-500/30">
            <span class="w-2 h-2 rounded-full bg-pink-400 animate-ping"></span>
            <span>YIN-YANG DUAL ORBIT MATRIX · OPTION M</span>
          </div>

          <h1 class="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-200 to-cyan-300 tracking-tight">
            {{ projectTitle }}
          </h1>

          <p v-if="activeEntry" class="text-xs text-slate-300 leading-relaxed line-clamp-3">
            {{ activeEntry.displayDescription }}
          </p>
          <p v-else class="text-xs text-slate-400">
            请选择项目包以开启太极双重轨道。
          </p>
        </div>

        <div v-if="activeEntry" class="relative z-10 pt-4">
          <RouterLink
            :to="activeEntry.to"
            class="w-full py-3.5 px-5 rounded-2xl text-xs font-black text-white flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 hover:scale-105"
            :class="activeEntry.btnStyle"
          >
            <span>进入太极轨线原型</span>
            <el-icon><Right /></el-icon>
          </RouterLink>
        </div>
      </div>

      <!-- 阴阳双重轨线交互 Capsule Cards (Yin-Yang Dual Orbit Capsules) -->
      <div v-if="clientEntries.length" class="absolute inset-0 pointer-events-none flex items-center justify-center">
        <button
          v-for="(node, idx) in clientEntries"
          :key="node.id"
          type="button"
          class="pointer-events-auto absolute group rounded-3xl bg-[#080D20]/95 backdrop-blur-2xl p-5 border transition-all duration-500 hover:scale-110 flex items-center gap-4 shadow-2xl text-left"
          :class="[
            node.glowStyle,
            activeNodeIndex === idx ? 'ring-2 ring-pink-400 scale-110 z-30' : 'opacity-85 hover:opacity-100 z-10'
          ]"
          :style="{
            transform: `translate(${node.posX + magneticX * 0.5}px, ${node.posY + magneticY * 0.5}px)`
          }"
          @click="activeNodeIndex = idx"
        >
          <div class="w-10 h-10 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-center text-xl text-pink-300 shrink-0 group-hover:scale-110 transition-transform">
            <el-icon v-if="node.kind === 'mobile'"><Iphone /></el-icon>
            <el-icon v-else-if="node.clientId === 'enterprise'"><OfficeBuilding /></el-icon>
            <el-icon v-else><Monitor /></el-icon>
          </div>

          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">{{ node.name }}</span>
              <span class="px-2 py-0.5 rounded-full text-[9px] font-mono border" :class="node.badgeStyle">
                {{ idx % 2 === 0 ? '阴轨 NODE' : '阳轨 NODE' }}
              </span>
            </div>
            <div class="text-[10px] text-slate-400 font-mono mt-0.5">点击对焦太极中枢</div>
          </div>
        </button>
      </div>
    </main>

    <!-- 4. Footer -->
    <footer class="relative z-20 py-5 border-t border-pink-500/20 bg-[#02040B]/90 text-xs font-mono text-pink-300/80">
      <div class="mx-auto max-w-7xl px-8 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <span class="text-pink-400 font-bold uppercase">PRD SPECIFICATIONS:</span>
          <RouterLink
            v-for="doc in documentEntries"
            :key="doc.id"
            :to="doc.to"
            class="text-slate-300 hover:text-pink-300 transition-colors flex items-center gap-1"
          >
            <el-icon><Document /></el-icon>
            <span>{{ doc.name }}</span>
          </RouterLink>
        </div>

        <div class="flex items-center gap-4">
          <RouterLink to="/tools/project-routes" class="hover:text-pink-300 transition-colors">路由架构</RouterLink>
          <RouterLink to="/tools/page-transfer" class="hover:text-pink-300 transition-colors">导入导出</RouterLink>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.yin-yang-orbit-page {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
</style>
