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
    router.replace({ path: '/variant-o', query: normalizedProjectId ? { project: normalizedProjectId } : {} });
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

// 3D 驾驶舱视角陀螺仪与鼠标粒子 Physics
const pitch = ref(0);
const roll = ref(0);
const mouseX = ref(0);
const mouseY = ref(0);

function handleMouseMove(e) {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  mouseX.value = e.clientX;
  mouseY.value = e.clientY;

  // 驾驶舱 3D 陀螺仪旋转 Pitch & Roll (-8 到 +8 度)
  roll.value = ((e.clientX - cx) / cx) * 8;
  pitch.value = -((e.clientY - cy) / cy) * 8;

  // 释放量子质子弧 Sparks
  if (ctx && Math.random() < 0.7) {
    plasmaSparks.push({
      x: e.clientX,
      y: e.clientY,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3 - 1,
      size: Math.random() * 3 + 1,
      life: 1,
      color: ['#ec4899', '#38bdf8', '#a855f7', '#34d399'][Math.floor(Math.random() * 4)],
    });
  }
}

// Canvas 驾驶舱飞行能量场与量子质子引擎
let animationId = null;
let ctx = null;
let plasmaSparks = [];
let gridLines = [];

function initCockpitCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  gridLines = Array.from({ length: 30 }, () => ({
    y: Math.random() * canvas.height,
    speed: Math.random() * 2 + 1,
    opacity: Math.random() * 0.4 + 0.1,
  }));

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 渲染驾驶舱网格能量流
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < gridLines.length; i++) {
      const line = gridLines[i];
      line.y += line.speed;
      if (line.y > canvas.height) line.y = 0;

      ctx.beginPath();
      ctx.moveTo(0, line.y);
      ctx.lineTo(canvas.width, line.y);
      ctx.stroke();
    }

    // 2. 渲染动态量子质子火花 (Plasma Sparks)
    for (let i = plasmaSparks.length - 1; i >= 0; i--) {
      const p = plasmaSparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.025;

      if (p.life <= 0) {
        plasmaSparks.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
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
    .map((entry, index) => ({
      ...entry,
      to: getProjectEntryPath(selectedProject.value, entry),
      badgeColor: [
        'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-sm shadow-pink-500/50',
        'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/50',
        'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/50',
      ][index % 3],
      btnGlow: [
        'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 shadow-pink-500/30 hover:from-pink-600 hover:to-indigo-700',
        'bg-gradient-to-r from-cyan-400 via-blue-600 to-indigo-600 shadow-cyan-500/30 hover:from-cyan-500 hover:to-blue-700',
        'bg-gradient-to-r from-emerald-400 via-teal-600 to-indigo-600 shadow-emerald-500/30 hover:from-emerald-500 hover:to-indigo-700',
      ][index % 3],
      glowBorder: [
        'border-pink-500/50 shadow-[0_0_50px_rgba(236,72,153,0.4)] hover:border-pink-400',
        'border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.4)] hover:border-cyan-400',
        'border-emerald-500/50 shadow-[0_0_50px_rgba(52,211,153,0.4)] hover:border-emerald-400',
      ][index % 3],
      displayDescription:
        entry.kind === 'mobile'
          ? '全景 3D 触控驾驶舱，极速手机壳预览、全组件响应与流程演示'
          : entry.clientId === 'enterprise'
            ? '元宇宙控制大盘、车辆全轨迹决策监控与企业极速管控中枢'
            : entry.clientId === 'operation'
              ? '运力调度分配引擎、算法工单流转与高并发协同工作台'
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
  initCockpitCanvas();
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
  <div class="cyber-cockpit-page min-h-screen bg-[#010208] text-slate-100 font-sans selection:bg-pink-500 selection:text-white relative overflow-hidden flex flex-col justify-between select-none">
    <!-- 1. 飞行驾驶舱量子 Canvas -->
    <canvas ref="canvasRef" class="fixed inset-0 pointer-events-none z-0"></canvas>

    <!-- 2. 全屏 3D 飞行驾驶舱外框 (Cockpit HUD Frame Overlay) -->
    <div class="fixed inset-0 pointer-events-none z-20 border-[16px] border-slate-950/60 rounded-[48px] shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]">
      <!-- Cockpit HUD Target Reticle Grid Crosshair -->
      <div class="absolute top-6 left-6 text-[10px] font-mono text-pink-400/70 tracking-widest uppercase">
        SYS.MODE: WARP COCKPIT // PITCH: {{ pitch.toFixed(1) }}° ROLL: {{ roll.toFixed(1) }}°
      </div>
      <div class="absolute top-6 right-6 text-[10px] font-mono text-cyan-400/70 tracking-widest uppercase">
        FPS: 60 // QUANTUM LINK: ACTIVE
      </div>
    </div>

    <!-- 3. 极速悬浮 Header -->
    <header class="relative z-40 pt-8 px-10">
      <div class="mx-auto max-w-7xl h-16 rounded-full bg-slate-950/80 backdrop-blur-2xl border border-pink-500/40 px-6 flex items-center justify-between shadow-[0_0_50px_rgba(236,72,153,0.2)]">
        <!-- Logo -->
        <div class="flex items-center gap-6">
          <RouterLink to="/variant-o" class="flex items-center gap-3 group">
            <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400 p-[1px] shadow-[0_0_30px_rgba(236,72,153,0.6)] group-hover:rotate-180 transition-transform duration-700">
              <div class="w-full h-full rounded-full bg-[#010208] flex items-center justify-center text-pink-400 font-black">
                <el-icon><Aim /></el-icon>
              </div>
            </div>
            <div>
              <div class="text-[9px] font-mono text-pink-400 tracking-widest uppercase">3D CYBER MECH-COCKPIT</div>
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
              <span>{{ hasSelectedProject ? selectedProject?.name : '激活驾驶舱项目包...' }}</span>
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
                class="absolute left-0 mt-3 w-72 rounded-3xl bg-[#080D20]/95 backdrop-blur-2xl p-2.5 shadow-2xl border border-pink-500/40 z-50 text-xs"
              >
                <div class="px-3 py-1.5 text-[10px] font-mono text-pink-400 uppercase tracking-widest">COCKPIT MATRIX SELECTOR</div>
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

    <!-- 4. 终极压轴脑洞：全景 3D 飞行驾驶舱舞台 (3D Mech-Cockpit Stage) -->
    <main
      class="relative z-10 mx-auto max-w-7xl w-full flex-1 flex flex-col items-center justify-center px-10 py-6 space-y-12 transition-transform duration-300 ease-out"
      :style="{ transform: `perspective(1200px) rotateX(${pitch}deg) rotateY(${roll}deg)` }"
    >
      <!-- 迎宾标题 -->
      <div class="text-center space-y-4 max-w-3xl mx-auto">
        <div class="inline-flex items-center gap-2.5 px-4 py-1 rounded-full bg-pink-500/10 text-pink-300 text-xs font-mono font-bold border border-pink-500/30 backdrop-blur-md shadow-[0_0_30px_rgba(236,72,153,0.4)] animate-pulse">
          <span class="w-2.5 h-2.5 rounded-full bg-pink-400 shadow-[0_0_10px_#ec4899]"></span>
          <span>GRAND FINALE: 3D CYBER MECH-COCKPIT · OPTION O [终极压轴 🛸]</span>
        </div>

        <h1 class="text-5xl sm:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-200 to-cyan-300 leading-tight drop-shadow-[0_0_40px_rgba(236,72,153,0.5)]">
          {{ projectTitle }}
        </h1>

        <p class="text-slate-300 text-xs sm:text-sm leading-relaxed">
          移动鼠标掌控全向 3D 飞行驾驶舱视角，全息投射各端业务系统与需求规格书：
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

      <!-- 驾驶舱全息终端大卡片 (Cockpit Terminal Cards) -->
      <div v-if="clientEntries.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
        <div
          v-for="(entry, idx) in clientEntries"
          :key="entry.id"
          class="group relative rounded-[36px] bg-[#070C1F]/90 backdrop-blur-2xl p-8 border transition-all duration-500 hover:-translate-y-4 flex flex-col justify-between overflow-hidden shadow-2xl"
          :class="[
            entry.glowBorder,
            activeNodeIndex === idx ? 'ring-2 ring-pink-400 scale-105 z-20' : 'opacity-90 hover:opacity-100'
          ]"
          @pointerdown="activeNodeIndex = idx"
        >
          <!-- Terminal Hologram Bar Accent -->
          <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-pink-400 to-transparent shadow-[0_0_15px_#ec4899]"></div>

          <div>
            <div class="flex items-center justify-between mb-6">
              <div class="w-14 h-14 rounded-2xl bg-slate-950 flex items-center justify-center text-2xl text-pink-300 border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-300">
                <el-icon v-if="entry.kind === 'mobile'"><Iphone /></el-icon>
                <el-icon v-else-if="entry.clientId === 'enterprise'"><OfficeBuilding /></el-icon>
                <el-icon v-else><Monitor /></el-icon>
              </div>

              <span class="px-3 py-1 rounded-full text-[10px] font-mono font-black border uppercase" :class="entry.badgeColor">
                SYSTEM TERMINAL 0{{ idx + 1 }}
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
            <span>开火！跃迁至该系统原型</span>
            <el-icon class="text-sm group-hover:translate-x-2 transition-transform"><Right /></el-icon>
          </RouterLink>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="rounded-3xl border border-pink-500/30 bg-[#070C1F]/80 backdrop-blur-2xl p-12 text-center max-w-lg mx-auto shadow-[0_0_30px_rgba(236,72,153,0.2)]">
        <el-icon class="text-4xl text-pink-400 mb-3 animate-pulse"><Aim /></el-icon>
        <div class="text-sm font-black text-white">未找到可用驾驶舱终端</div>
        <div class="text-xs text-pink-300/80 mt-1">请在顶部下拉选择目标项目包。</div>
      </div>
    </main>

    <!-- 5. Footer -->
    <footer class="relative z-30 py-5 border-t border-pink-500/20 bg-[#010208]/95 text-xs font-mono text-pink-400/80 text-center tracking-widest">
      3D CYBER MECH-COCKPIT ENGINE · {{ projectConfig.name }}
    </footer>
  </div>
</template>

<style scoped>
.cyber-cockpit-page {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
</style>
