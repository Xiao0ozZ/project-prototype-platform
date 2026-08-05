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
    router.replace({ path: '/variant-j', query: normalizedProjectId ? { project: normalizedProjectId } : {} });
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

// 3D 鼠标倾斜与星尘粒子逻辑 (Mouse 3D Tilt & Stardust Particle Physics)
const mouseX = ref(0);
const mouseY = ref(0);

function handleMouseMove(e) {
  const { clientX, clientY } = e;
  mouseX.value = (clientX / window.innerWidth - 0.5) * 20; // -10 to +10 deg
  mouseY.value = (clientY / window.innerHeight - 0.5) * 20;

  // 释放动态鼠标星尘
  if (ctx && Math.random() < 0.6) {
    particles.push({
      x: clientX,
      y: clientY,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2 - 1,
      size: Math.random() * 2.5 + 1,
      alpha: 1,
      color: ['#ec4899', '#38bdf8', '#c084fc', '#f59e0b'][Math.floor(Math.random() * 4)],
    });
  }
}

// 星际跃迁与星尘粒子 Canvas 引擎
let animationFrameId = null;
let ctx = null;
let stars = [];
let particles = [];

function initCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // 初始化星际跃迁光束 (Warp Speed Stars)
  stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width - canvas.width / 2,
    y: Math.random() * canvas.height - canvas.height / 2,
    z: Math.random() * canvas.width,
  }));

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 渲染星际跃迁光束
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      star.z -= 4; // 光速飞行速度
      if (star.z <= 0) {
        star.z = canvas.width;
        star.x = Math.random() * canvas.width - cx;
        star.y = Math.random() * canvas.height - cy;
      }

      const k = 250 / star.z;
      const px = star.x * k + cx;
      const py = star.y * k + cy;

      if (px >= 0 && px <= canvas.width && py >= 0 && py <= canvas.height) {
        const size = (1 - star.z / canvas.width) * 2.5;
        const alpha = (1 - star.z / canvas.width) * 0.8;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. 渲染动态鼠标跟随星尘粒子 (Stardust Particles)
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.02;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    animationFrameId = requestAnimationFrame(render);
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
    .map((entry, index) => ({
      ...entry,
      to: getProjectEntryPath(selectedProject.value, entry),
      glowBorder: [
        'border-pink-500/40 hover:border-pink-400 hover:shadow-[0_0_50px_rgba(236,72,153,0.4)]',
        'border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_50px_rgba(56,189,248,0.4)]',
        'border-amber-500/40 hover:border-amber-400 hover:shadow-[0_0_50px_rgba(245,158,11,0.4)]',
      ][index % 3],
      btnGlow: [
        'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 shadow-pink-500/30',
        'bg-gradient-to-r from-cyan-400 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-700 shadow-cyan-500/30',
        'bg-gradient-to-r from-amber-400 via-orange-600 to-red-600 hover:from-amber-500 hover:to-red-700 shadow-amber-500/30',
      ][index % 3],
      displayDescription:
        entry.kind === 'mobile'
          ? '星际跃迁触控视区，手机壳实时交互、高保真组件与全流程视图'
          : entry.clientId === 'enterprise'
            ? '星际指挥控制大盘、车辆全轨迹决策监控与企业极速管控中枢'
            : entry.clientId === 'operation'
              ? '实时运力调度引擎、算法智能分配与高并发协同工作台'
              : entry.description || '星际原型系统',
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
  initCanvas();
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('resize', handleResize);
  document.addEventListener('pointerdown', handleOutsideProjectMenu);
});
onBeforeUnmount(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('pointerdown', handleOutsideProjectMenu);
});
</script>

<template>
  <div class="interstellar-warp-page min-h-screen bg-[#02040A] text-slate-100 font-sans selection:bg-pink-500 selection:text-white relative overflow-hidden flex flex-col justify-between">
    <!-- 1. 实时星际跃迁光束与鼠标星尘 Canvas 视景 -->
    <canvas ref="canvasRef" class="fixed inset-0 pointer-events-none z-0"></canvas>

    <!-- 背景极光晕 Backdrop Glows -->
    <div class="fixed inset-0 pointer-events-none z-0">
      <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-gradient-to-b from-indigo-600/20 via-pink-600/15 to-transparent blur-[140px] rounded-full"></div>
    </div>

    <!-- 2. 全全息星际流线胶囊 Header (Holographic Interstellar Header) -->
    <header class="relative z-40 pt-6 px-8">
      <div class="mx-auto max-w-7xl h-16 rounded-full bg-slate-950/80 backdrop-blur-2xl border border-pink-500/30 px-6 flex items-center justify-between shadow-[0_0_40px_rgba(236,72,153,0.15)]">
        <!-- Logo -->
        <div class="flex items-center gap-6">
          <RouterLink to="/variant-j" class="flex items-center gap-3 group">
            <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400 p-[1px] shadow-[0_0_25px_rgba(236,72,153,0.5)] group-hover:rotate-180 transition-transform duration-700">
              <div class="w-full h-full rounded-full bg-[#02040A] flex items-center justify-center text-pink-400 font-black">
                <el-icon><MagicStick /></el-icon>
              </div>
            </div>
            <div>
              <div class="text-[9px] font-mono text-pink-400 tracking-widest uppercase">INTERSTELLAR WARP HUD</div>
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
              <span>{{ hasSelectedProject ? selectedProject?.name : '激活星际项目包' }}</span>
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
                class="absolute left-0 mt-3 w-72 rounded-3xl bg-[#090D1C]/95 backdrop-blur-2xl p-2.5 shadow-2xl border border-pink-500/40 z-50 text-xs"
              >
                <div class="px-3 py-1.5 text-[10px] font-mono text-pink-400 uppercase tracking-widest">WARP MATRIX SELECTOR</div>
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
          <RouterLink to="/tools/project-routes" class="text-slate-300 hover:text-pink-400 transition-colors">路由管理</RouterLink>
          <RouterLink to="/tools/projects" class="text-slate-300 hover:text-pink-400 transition-colors">项目包</RouterLink>
          <button
            type="button"
            class="text-pink-400/70 hover:text-pink-300 transition-colors"
            title="快捷键 Ctrl+Shift+M"
            @click="toggleConsole"
          >
            {{ showConsole ? '开发者模式: 开' : '开发者模式' }}
          </button>
        </div>
      </div>
    </header>

    <!-- 3. 3D 鼠标物理倾斜视差舞台 (3D Mouse Parallax Stage) -->
    <main
      class="relative z-10 mx-auto max-w-7xl w-full px-8 py-12 flex-1 flex flex-col justify-center space-y-12 transition-transform duration-200 ease-out"
      :style="{ transform: `perspective(1000px) rotateY(${mouseX * 0.3}deg) rotateX(${-mouseY * 0.3}deg)` }"
    >
      <!-- 迎宾标题 -->
      <div class="text-center space-y-4 max-w-3xl mx-auto">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 text-pink-300 text-xs font-mono font-bold border border-pink-500/30 backdrop-blur-md shadow-[0_0_25px_rgba(236,72,153,0.35)]">
          <span class="w-2 h-2 rounded-full bg-pink-400 animate-ping"></span>
          <span>INTERSTELLAR WARP & MOUSE STARDUST PHYSICS · OPTION J</span>
        </div>

        <h1 class="text-5xl sm:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-200 to-cyan-300 leading-tight drop-shadow-[0_0_35px_rgba(236,72,153,0.4)]">
          {{ projectTitle }}
        </h1>

        <p class="text-slate-300 text-sm sm:text-base leading-relaxed">
          {{ hasSelectedProject ? (selectedProject?.description || '移动鼠标体验实时璀璨星尘与 3D 陀螺仪视差，高保真原型极速响应。') : '请在上方激活目标星际项目包，移动鼠标开启跃迁星尘物理互动。' }}
        </p>

        <div v-if="showConsole" class="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            class="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/20 backdrop-blur-md transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            @click="openProjectSettings"
          >
            <el-icon><Setting /></el-icon>
            修改包配置
          </button>
          <button
            type="button"
            class="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 text-xs font-black text-white shadow-[0_0_30px_rgba(236,72,153,0.5)] transition-all active:scale-95 hover:scale-105"
            @click="openPageTransfer"
          >
            <el-icon><Switch /></el-icon>
            页面导入导出
          </button>
        </div>
      </div>

      <!-- 客户端 3D 浮空倾斜大卡片 -->
      <div v-if="clientEntries.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <div
          v-for="entry in clientEntries"
          :key="entry.id"
          class="group relative rounded-[32px] bg-[#080D20]/90 backdrop-blur-2xl p-8 border transition-all duration-500 hover:-translate-y-3 flex flex-col justify-between overflow-hidden shadow-2xl"
          :class="entry.glowBorder"
        >
          <!-- Specular Light Sweep -->
          <div class="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-pink-500/15 blur-2xl group-hover:bg-pink-500/30 transition-all pointer-events-none"></div>

          <div>
            <div class="flex items-center justify-between mb-6">
              <div class="w-14 h-14 rounded-2xl bg-slate-950 flex items-center justify-center text-2xl text-pink-300 border border-white/10 shadow-inner group-hover:scale-110 transition-transform">
                <el-icon v-if="entry.kind === 'mobile'"><Iphone /></el-icon>
                <el-icon v-else-if="entry.clientId === 'enterprise'"><OfficeBuilding /></el-icon>
                <el-icon v-else><Monitor /></el-icon>
              </div>

              <span class="px-3 py-1 rounded-full text-[10px] font-mono font-black border tracking-widest uppercase bg-pink-500/20 text-pink-300 border-pink-500/40">
                WARP NODE
              </span>
            </div>

            <h2 class="text-2xl font-black text-white group-hover:text-pink-300 transition-colors mb-2">
              {{ entry.name }}
            </h2>
            <p class="text-xs text-slate-300 leading-relaxed">
              {{ entry.displayDescription }}
            </p>
          </div>

          <RouterLink
            :to="entry.to"
            class="mt-8 w-full py-4 px-6 rounded-2xl text-xs font-black text-white flex items-center justify-center gap-2 transition-all active:scale-95"
            :class="entry.btnGlow"
          >
            <span>开启星际跃迁原型</span>
            <el-icon class="text-sm group-hover:translate-x-1.5 transition-transform"><Right /></el-icon>
          </RouterLink>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="rounded-3xl border border-pink-500/30 bg-[#080D20]/80 backdrop-blur-2xl p-12 text-center max-w-lg mx-auto shadow-[0_0_30px_rgba(236,72,153,0.2)]">
        <el-icon class="text-4xl text-pink-400 mb-3 animate-pulse"><FolderOpened /></el-icon>
        <div class="text-sm font-black text-white">未找到可用跃迁端</div>
        <div class="text-xs text-pink-300/80 mt-1">请在顶部下拉选择包含客户端的原型包。</div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="relative z-20 py-5 border-t border-pink-500/20 bg-[#02040A]/90 text-xs font-mono text-pink-400/80 text-center tracking-widest">
      INTERSTELLAR WARP & MOUSE STARDUST ENGINE · {{ projectConfig.name }}
    </footer>
  </div>
</template>

<style scoped>
.interstellar-warp-page {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
</style>
