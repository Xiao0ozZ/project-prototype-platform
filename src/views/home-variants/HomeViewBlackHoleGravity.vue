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
    router.replace({ path: '/variant-k', query: normalizedProjectId ? { project: normalizedProjectId } : {} });
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

// 鼠标黑洞引力场与吸积盘粒子 physics
const mouseX = ref(0);
const mouseY = ref(0);
const blackHoleOffsetX = ref(0);
const blackHoleOffsetY = ref(0);

function handleMouseMove(e) {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  mouseX.value = e.clientX;
  mouseY.value = e.clientY;

  // 算中央黑洞引力位移 (Gravitational Pull)
  blackHoleOffsetX.value = (e.clientX - cx) * 0.08;
  blackHoleOffsetY.value = (e.clientY - cy) * 0.08;
}

// Canvas 星云粒子与黑洞引力光环 Engine
let animationId = null;
let ctx = null;
let accretionParticles = [];

function initBlackHoleCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particleCount = 180;
  accretionParticles = Array.from({ length: particleCount }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: Math.random() * 220 + 120,
    speed: (Math.random() * 0.008 + 0.003) * (Math.random() < 0.5 ? 1 : -1),
    size: Math.random() * 2 + 1,
    color: ['#ec4899', '#a855f7', '#3b82f6', '#06b6d4', '#f59e0b'][Math.floor(Math.random() * 5)],
    alpha: Math.random() * 0.7 + 0.3,
  }));

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2 + blackHoleOffsetX.value;
    const cy = canvas.height / 2 + blackHoleOffsetY.value;

    // 绘制中央黑洞视界引力强光圈 (Event Horizon Outer Glow)
    const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 320);
    grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    grad.addColorStop(0.2, 'rgba(168, 85, 247, 0.4)');
    grad.addColorStop(0.5, 'rgba(236, 72, 153, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 320, 0, Math.PI * 2);
    ctx.fill();

    // 绘制吸积盘公转粒子 (Accretion Disk Particles)
    for (let i = 0; i < accretionParticles.length; i++) {
      const p = accretionParticles[i];
      p.angle += p.speed;

      const px = cx + Math.cos(p.angle) * p.radius;
      const py = cy + Math.sin(p.angle) * (p.radius * 0.6); // 椭圆轨道视差

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 12;
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
      // 算全景环形辐射角度
      const total = arr.length || 1;
      const angleDeg = (index / total) * 360 - 90; // 顶端开始
      const rad = (angleDeg * Math.PI) / 180;
      const distance = 320; // 轨道半径

      return {
        ...entry,
        to: getProjectEntryPath(selectedProject.value, entry),
        orbitX: Math.cos(rad) * distance,
        orbitY: Math.sin(rad) * (distance * 0.65), // 椭圆视角
        badgeBg: [
          'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-sm shadow-pink-500/50',
          'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/50',
          'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/50',
        ][index % 3],
        glowStyle: [
          'border-pink-500/50 shadow-[0_0_40px_rgba(236,72,153,0.35)]',
          'border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.35)]',
          'border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.35)]',
        ][index % 3],
        btnStyle: [
          'bg-gradient-to-r from-pink-500 to-purple-600 shadow-pink-500/30 hover:from-pink-600 hover:to-purple-700',
          'bg-gradient-to-r from-purple-500 to-indigo-600 shadow-purple-500/30 hover:from-purple-600 hover:to-indigo-700',
          'bg-gradient-to-r from-cyan-400 to-blue-600 shadow-cyan-500/30 hover:from-cyan-500 hover:to-blue-700',
        ][index % 3],
        displayDescription:
          entry.kind === 'mobile'
            ? '引力场全触屏交互，手机壳真实比例流转与完整全组件演示'
            : entry.clientId === 'enterprise'
              ? '黑洞决策控制大盘、车辆全轨迹监控与企业极速管控中枢'
              : entry.clientId === 'operation'
                ? '运力调度分配引擎、算法工单流转与高并发协同工作台'
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

onMounted(() => {
  initBlackHoleCanvas();
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('resize', handleResize);
  document.addEventListener('pointerdown', handleOutsideProjectMenu);
});
onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId);
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('pointerdown', handleOutsideProjectMenu);
});
</script>

<template>
  <div class="black-hole-page h-screen w-screen bg-[#020308] text-slate-100 font-sans selection:bg-purple-500 selection:text-white relative overflow-hidden flex flex-col justify-between">
    <!-- 1. 黑洞吸积盘 & 鼠标引力透视 Canvas -->
    <canvas ref="canvasRef" class="fixed inset-0 pointer-events-none z-0"></canvas>

    <!-- 2. 全全息 HUD Navigation Bar -->
    <header class="relative z-40 pt-6 px-8">
      <div class="mx-auto max-w-7xl h-16 rounded-full bg-slate-950/80 backdrop-blur-2xl border border-purple-500/30 px-6 flex items-center justify-between shadow-[0_0_40px_rgba(168,85,247,0.15)]">
        <!-- Logo -->
        <div class="flex items-center gap-6">
          <RouterLink to="/variant-k" class="flex items-center gap-3 group">
            <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-cyan-400 p-[1px] shadow-[0_0_25px_rgba(168,85,247,0.5)] group-hover:rotate-180 transition-transform duration-700">
              <div class="w-full h-full rounded-full bg-[#020308] flex items-center justify-center text-purple-400 font-black">
                <el-icon><Sunrise /></el-icon>
              </div>
            </div>
            <div>
              <div class="text-[9px] font-mono text-purple-400 tracking-widest uppercase">BLACK HOLE GRAVITY MATRIX</div>
              <div class="text-sm font-black text-white group-hover:text-purple-300 transition-colors">
                {{ projectConfig.name }}
              </div>
            </div>
          </RouterLink>

          <span class="text-purple-500/30 text-xs">//</span>

          <!-- Dropdown -->
          <div ref="projectMenuRef" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-xs font-bold text-purple-300 border border-purple-500/30 transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              @click="showProjectMenu = !showProjectMenu"
            >
              <span class="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_10px_#a855f7] animate-ping"></span>
              <span>{{ hasSelectedProject ? selectedProject?.name : '激活黑洞项目包...' }}</span>
              <el-icon class="text-purple-400 text-xs transition-transform duration-200" :class="{ 'rotate-180': showProjectMenu }"><ArrowDown /></el-icon>
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
                class="absolute left-0 mt-3 w-72 rounded-3xl bg-[#090B18]/95 backdrop-blur-2xl p-2.5 shadow-2xl border border-purple-500/40 z-50 text-xs"
              >
                <div class="px-3 py-1.5 text-[10px] font-mono text-purple-400 uppercase tracking-widest">GRAVITY SINGULARITY MATRIX</div>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-colors hover:bg-purple-500/20"
                  :class="!hasSelectedProject ? 'bg-purple-500/30 text-purple-300 font-bold border border-purple-500/40' : 'text-slate-300'"
                  @click="chooseProject('')"
                >
                  <span>未选择项目</span>
                  <el-icon v-if="!hasSelectedProject" class="text-purple-400"><Check /></el-icon>
                </button>
                <div class="my-1.5 border-t border-purple-500/20"></div>
                <div class="max-h-60 overflow-y-auto space-y-1">
                  <button
                    v-for="project in selectableProjects"
                    :key="project.id"
                    type="button"
                    class="flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-colors hover:bg-purple-500/20"
                    :class="project.id === selectedProjectId ? 'bg-purple-500/30 text-purple-300 font-bold border border-purple-500/40' : 'text-slate-200'"
                    @click="chooseProject(project.id)"
                  >
                    <div>
                      <div class="font-bold text-white tracking-wide">{{ project.name }}</div>
                      <div class="text-[10px] text-purple-400/80 font-mono mt-0.5">{{ project.id }} · v{{ project.version || '1.0' }}</div>
                    </div>
                    <el-icon v-if="project.id === selectedProjectId" class="text-purple-400 text-sm"><Check /></el-icon>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="flex items-center gap-4 text-xs font-semibold">
          <RouterLink to="/components" class="text-slate-300 hover:text-purple-400 transition-colors">组件规范</RouterLink>
          <RouterLink to="/tools/project-routes" class="text-slate-300 hover:text-purple-400 transition-colors">路由管理</RouterLink>
          <RouterLink to="/tools/projects" class="text-slate-300 hover:text-purple-400 transition-colors">项目包</RouterLink>
          <button
            type="button"
            class="text-purple-400/70 hover:text-purple-300 transition-colors"
            title="快捷键 Ctrl+Shift+M"
            @click="toggleConsole"
          >
            {{ showConsole ? '开发者模式: 开' : '开发者模式' }}
          </button>
        </div>
      </div>
    </header>

    <!-- 3. 颠覆性排版：黑洞视界 & 环形行星轨道矩阵 (Black Hole Singularity Radial Orbit) -->
    <main class="relative z-10 mx-auto max-w-7xl w-full flex-1 flex items-center justify-center">
      <!-- 中央黑洞核心视界 Singularity Hub Center -->
      <div
        class="relative w-80 sm:w-96 rounded-full bg-slate-950/90 backdrop-blur-3xl border border-purple-500/50 p-8 shadow-[0_0_80px_rgba(168,85,247,0.35)] text-center transition-transform duration-300 ease-out z-20 flex flex-col justify-between min-h-[360px]"
        :style="{ transform: `translate(${blackHoleOffsetX}px, ${blackHoleOffsetY}px)` }"
      >
        <!-- 引力光束扫掠 -->
        <div class="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-500/20 via-pink-500/10 to-transparent blur-xl pointer-events-none"></div>

        <div class="relative z-10 space-y-3">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 text-[10px] font-mono font-bold border border-purple-500/30">
            <span class="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
            <span>BLACK HOLE GRAVITY RADIAL · OPTION K</span>
          </div>

          <h1 class="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-pink-300 tracking-tight">
            {{ projectTitle }}
          </h1>

          <p v-if="activeEntry" class="text-xs text-slate-300 leading-relaxed line-clamp-3">
            {{ activeEntry.displayDescription }}
          </p>
          <p v-else class="text-xs text-slate-400">
            请选择项目包以开启环形黑洞引力轨道。
          </p>
        </div>

        <!-- 激活节点的跃迁按钮 -->
        <div v-if="activeEntry" class="relative z-10 pt-4">
          <RouterLink
            :to="activeEntry.to"
            class="w-full py-3 px-5 rounded-2xl text-xs font-black text-white flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 hover:scale-105"
            :class="activeEntry.btnStyle"
          >
            <span>进入黑洞视界原型</span>
            <el-icon><Right /></el-icon>
          </RouterLink>
        </div>
      </div>

      <!-- 环绕黑洞的【行星轨道节点 Capsules】 (Radial Planetary Orbit Nodes) -->
      <div v-if="clientEntries.length" class="absolute inset-0 pointer-events-none flex items-center justify-center">
        <button
          v-for="(node, idx) in clientEntries"
          :key="node.id"
          type="button"
          class="pointer-events-auto absolute group rounded-3xl bg-[#090D22]/95 backdrop-blur-2xl p-5 border transition-all duration-500 hover:scale-110 flex items-center gap-4 shadow-2xl text-left"
          :class="[
            node.glowStyle,
            activeNodeIndex === idx ? 'ring-2 ring-purple-400 scale-110 z-30' : 'opacity-85 hover:opacity-100 z-10'
          ]"
          :style="{
            transform: `translate(${node.orbitX + blackHoleOffsetX * 0.4}px, ${node.orbitY + blackHoleOffsetY * 0.4}px)`
          }"
          @click="activeNodeIndex = idx"
        >
          <!-- 连线指回中央引力核心 -->
          <div class="w-10 h-10 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-center text-xl text-purple-300 shrink-0 group-hover:scale-110 transition-transform">
            <el-icon v-if="node.kind === 'mobile'"><Iphone /></el-icon>
            <el-icon v-else-if="node.clientId === 'enterprise'"><OfficeBuilding /></el-icon>
            <el-icon v-else><Monitor /></el-icon>
          </div>

          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">{{ node.name }}</span>
              <span class="px-2 py-0.5 rounded-full text-[9px] font-mono border" :class="node.badgeBg">
                NODE 0{{ idx + 1 }}
              </span>
            </div>
            <div class="text-[10px] text-slate-400 font-mono mt-0.5">点击对焦视界中枢</div>
          </div>
        </button>
      </div>
    </main>

    <!-- 4. 底部全全息需求文档与工具 Drawer Bar -->
    <footer class="relative z-20 py-5 border-t border-purple-500/20 bg-[#020308]/90 text-xs font-mono text-purple-300/80">
      <div class="mx-auto max-w-7xl px-8 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <span class="text-purple-400 font-bold uppercase">PRD SPECIFICATIONS:</span>
          <RouterLink
            v-for="doc in documentEntries"
            :key="doc.id"
            :to="doc.to"
            class="text-slate-300 hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            <el-icon><Document /></el-icon>
            <span>{{ doc.name }}</span>
          </RouterLink>
        </div>

        <div class="flex items-center gap-4">
          <RouterLink to="/tools/project-routes" class="hover:text-purple-300 transition-colors">路由中枢</RouterLink>
          <RouterLink to="/tools/page-transfer" class="hover:text-purple-300 transition-colors">导入导出</RouterLink>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.black-hole-page {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
</style>
