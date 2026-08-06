<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowDown,
  Box,
  Check,
  Compass,
  Document,
  FolderOpened,
  Iphone,
  Lightning,
  MagicStick,
  Monitor,
  OfficeBuilding,
  Pointer,
  Position,
  Right,
  Setting,
  Switch,
  VideoPlay,
  View,
} from '@element-plus/icons-vue';

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
    router.replace({ path: route.path, query: normalizedProjectId ? { project: normalizedProjectId } : {} });
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

// ==========================================================================
// Web Audio API Apple VisionOS 空间计算保真音效 Engine
// ==========================================================================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSpatialSound(type) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (type === 'pinchSelect') {
      // VisionOS 捏合手势点击音效：清脆轻快音管响声
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'spatialWarp') {
      // VisionOS 空间应用加载音效：高保真升频共鸣
      const sub = ctx.createOscillator();
      const sweep = ctx.createOscillator();
      const gain = ctx.createGain();

      sub.type = 'sawtooth';
      sub.frequency.setValueAtTime(80, ctx.currentTime);
      sub.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.4);
      sub.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.9);

      sweep.type = 'sine';
      sweep.frequency.setValueAtTime(300, ctx.currentTime);
      sweep.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);

      sub.connect(gain);
      sweep.connect(gain);
      gain.connect(ctx.destination);

      sub.start();
      sweep.start();
      sub.stop(ctx.currentTime + 0.9);
      sweep.stop(ctx.currentTime + 0.9);
    }
  } catch {
    // Audio fail-safe
  }
}

// 3D 鼠标倾斜与空间眼动追焦 Cursor Physics
const mouseX = ref(0);
const mouseY = ref(0);
const cursorRawX = ref(-100);
const cursorRawY = ref(-100);
const cursorSmoothedX = ref(-100);
const cursorSmoothedY = ref(-100);
const isCursorHovering = ref(false);
const isCursorVisible = ref(false);

const isSpatialLaunching = ref(false);
const spatialLaunchTarget = ref(null);

function handleMouseMove(e) {
  if (isSpatialLaunching.value) return;
  const { clientX, clientY } = e;
  cursorRawX.value = clientX;
  cursorRawY.value = clientY;
  isCursorVisible.value = true;

  const target = e.target;
  if (target) {
    const isInteractive = Boolean(
      target.closest('button, a, input, select, [role="button"], .cursor-pointer, .group'),
    );
    isCursorHovering.value = isInteractive;
  }

  mouseX.value = (clientX / window.innerWidth - 0.5) * 16;
  mouseY.value = (clientY / window.innerHeight - 0.5) * 16;

  // 释放 Apple VisionOS 空间微粒
  if (ctx && Math.random() < 0.5) {
    particles.push({
      x: clientX,
      y: clientY,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2 - 1,
      size: Math.random() * 2.5 + 1,
      alpha: 0.95,
      color: ['#007AFF', '#38bdf8', '#ffffff', '#e2e8f0', '#a855f7'][Math.floor(Math.random() * 5)],
    });
  }
}

function handleMouseLeave() {
  isCursorVisible.value = false;
}

// Canvas 3D 空间计算网格与晶蓝星流 Engine
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

  stars = Array.from({ length: 150 }, () => ({
    x: Math.random() * canvas.width - canvas.width / 2,
    y: Math.random() * canvas.height - canvas.height / 2,
    z: Math.random() * canvas.width,
    color: ['#ffffff', '#007AFF', '#38bdf8', '#e2e8f0', '#a855f7'][Math.floor(Math.random() * 5)],
  }));

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    cursorSmoothedX.value += (cursorRawX.value - cursorSmoothedX.value) * 0.25;
    cursorSmoothedY.value += (cursorRawY.value - cursorSmoothedY.value) * 0.25;

    const isWarp = isSpatialLaunching.value;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const starSpeed = isWarp ? 50 : 3.8;

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      star.z -= starSpeed;
      if (star.z <= 0) {
        star.z = canvas.width;
        star.x = Math.random() * canvas.width - cx;
        star.y = Math.random() * canvas.height - cy;
      }

      const k = 250 / star.z;
      const px = star.x * k + cx;
      const py = star.y * k + cy;

      if (px >= 0 && px <= canvas.width && py >= 0 && py <= canvas.height) {
        const size = (1 - star.z / canvas.width) * (isWarp ? 7.5 : 3.0) + 0.5;
        const alpha = (1 - star.z / canvas.width) * 0.85;

        const prevK = 250 / (star.z + (isWarp ? 45 : 8));
        const ppx = star.x * prevK + cx;
        const ppy = star.y * prevK + cy;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = star.color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.shadowBlur = isWarp ? 16 : 4;
        ctx.shadowColor = star.color;
        ctx.beginPath();
        ctx.moveTo(ppx, ppy);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.restore();
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += isWarp ? p.vx * 5 : p.vx;
      p.y += isWarp ? p.vy * 5 : p.vy;
      p.alpha -= isWarp ? 0.05 : 0.025;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color || '#007AFF';
      ctx.shadowBlur = isWarp ? 16 : 6;
      ctx.shadowColor = p.color || '#007AFF';
      ctx.beginPath();
      ctx.arc(p.x, p.y, isWarp ? p.size * 2 : p.size, 0, Math.PI * 2);
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

function chooseProject(projectId) {
  selectedProjectId.value = projectId;
  showProjectMenu.value = false;

  playSpatialSound('pinchSelect');
}

function launchSpatialApp(entry) {
  if (isSpatialLaunching.value) return;

  playSpatialSound('spatialWarp');

  isSpatialLaunching.value = true;
  spatialLaunchTarget.value = entry;

  setTimeout(() => {
    router.push(entry.to);
  }, 750);
}

const clientEntries = computed(() =>
  [...(selectedProject.value?.entries || [])]
    .filter((entry) => entry.kind !== 'docs')
    .sort((left, right) => (left.order || 0) - (right.order || 0))
    .map((entry) => ({
      ...entry,
      to: getProjectEntryPath(selectedProject.value, entry),
      displayDescription:
        entry.kind === 'mobile'
          ? 'VisionOS 空间触控视区，手机壳实时交互、高保真组件与全流程视图'
          : entry.clientId === 'enterprise'
            ? 'VisionOS 空间指挥控制大盘、车辆全轨迹决策监控与企业极速管控中枢'
            : entry.clientId === 'operation'
              ? '实时运力调度引擎、算法智能分配与高并发协同工作台'
              : entry.description || 'VisionOS 原型系统',
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
  initCanvas();
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseleave', handleMouseLeave);
  window.addEventListener('resize', handleResize);
  window.addEventListener('keydown', handleConsoleShortcut);
  document.addEventListener('pointerdown', handleOutsideProjectMenu);
});
onBeforeUnmount(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseleave', handleMouseLeave);
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('keydown', handleConsoleShortcut);
  document.removeEventListener('pointerdown', handleOutsideProjectMenu);
});
</script>

<template>
  <div class="apple-visionos-page min-h-screen bg-[#04060C] text-slate-100 font-sans selection:bg-[#007AFF] selection:text-white relative overflow-hidden flex flex-col justify-between select-none">
    <!-- 0. Apple VisionOS Eye-Tracking & Pinch Custom Cursor Pointer -->
    <div
      v-if="isCursorVisible"
      class="fixed pointer-events-none z-[100] w-2.5 h-2.5 rounded-full bg-[#007AFF] shadow-[0_0_12px_#007AFF] -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
      :style="{ left: `${cursorRawX}px`, top: `${cursorRawY}px` }"
    ></div>

    <div
      v-if="isCursorVisible"
      class="fixed pointer-events-none z-[99] rounded-full border border-white/50 bg-white/10 backdrop-blur-xs transition-all duration-200 ease-out -translate-x-1/2 -translate-y-1/2 flex items-center justify-center shadow-xl"
      :class="[
        isCursorHovering
          ? 'w-14 h-14 border-white bg-white/20 shadow-[0_0_35px_rgba(0,122,255,0.7)] scale-110'
          : 'w-10 h-10 border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.25)]',
      ]"
      :style="{ left: `${cursorSmoothedX}px`, top: `${cursorSmoothedY}px` }"
    >
      <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
    </div>

    <!-- 1. 实时 Canvas 空间计算粒粒子与极致氛围晕 -->
    <canvas ref="canvasRef" class="fixed inset-0 pointer-events-none z-0"></canvas>

    <!-- 背景 Apple VisionOS 空间感 Ambient Glows -->
    <div class="fixed inset-0 pointer-events-none z-0">
      <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[1300px] h-[550px] bg-gradient-to-b from-[#007AFF]/15 via-[#5856D6]/10 to-transparent blur-[160px] rounded-full"></div>
      <div class="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#a855f7]/08 blur-[180px] rounded-full"></div>
    </div>

    <!-- VisionOS 空间应用启动全息遮罩 Overlay -->
    <Transition name="spatial-launch">
      <div
        v-if="isSpatialLaunching"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[#020409]/96 backdrop-blur-3xl pointer-events-none"
      >
        <div class="relative flex flex-col items-center text-center">
          <div class="w-72 h-72 rounded-full border-2 border-white/80 animate-ping flex items-center justify-center shadow-[0_0_100px_rgba(0,122,255,0.8)]">
            <div class="w-52 h-52 rounded-full border-2 border-[#007AFF] animate-spin flex items-center justify-center">
              <el-icon class="text-6xl text-white animate-pulse"><View /></el-icon>
            </div>
          </div>

          <div class="mt-8 space-y-2">
            <div class="text-xs font-mono text-[#38bdf8] tracking-widest uppercase animate-pulse">
              >>> APPLE VISIONOS SPATIAL EXPERIENCE LAUNCHING <<<
            </div>
            <div class="text-5xl font-extrabold text-white tracking-tight drop-shadow-[0_0_40px_rgba(255,255,255,0.9)]">
              {{ spatialLaunchTarget?.name }}
            </div>
            <div class="text-xs font-mono text-slate-400 tracking-wider">
              MOUNTING SPATIAL WINDOW · INITIALIZING 3D ENVIRONMENT...
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 2. Apple VisionOS Capsule Floating Header Bar -->
    <header class="relative z-40 pt-6 px-8">
      <div class="mx-auto max-w-7xl h-16 rounded-full bg-[#0d111d]/75 backdrop-blur-3xl border border-white/10 px-6 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <!-- Logo -->
        <div class="flex items-center gap-6">
          <RouterLink to="/" class="flex items-center gap-3 group">
            <div class="w-9 h-9 rounded-full bg-white/10 p-[1px] border border-white/20 shadow-lg group-hover:rotate-180 transition-transform duration-700">
              <div class="w-full h-full rounded-full bg-[#04060C] flex items-center justify-center text-[#007AFF] font-black">
                <el-icon><View /></el-icon>
              </div>
            </div>
            <div>
              <div class="text-[9px] font-mono text-[#38bdf8] tracking-widest uppercase">VISIONOS SPATIAL COMPUTING</div>
              <div class="text-sm font-extrabold text-white group-hover:text-[#38bdf8] transition-colors">
                {{ projectConfig.name }}
              </div>
            </div>
          </RouterLink>

          <span class="text-white/20 text-xs">//</span>

          <!-- Dropdown 项目选择 -->
          <div ref="projectMenuRef" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition-all hover:border-white/25 active:scale-95 shadow-sm"
              @click="showProjectMenu = !showProjectMenu"
            >
              <span class="w-2 h-2 rounded-full bg-[#007AFF] shadow-[0_0_10px_#007AFF] animate-ping"></span>
              <span>{{ hasSelectedProject ? selectedProject?.name : '选取目标项目包' }}</span>
              <el-icon class="text-slate-400 text-xs transition-transform duration-200" :class="{ 'rotate-180': showProjectMenu }"><ArrowDown /></el-icon>
            </button>

            <!-- Dropdown List -->
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
                class="absolute left-0 mt-3 w-72 rounded-3xl bg-[#0d1222]/98 backdrop-blur-3xl p-2.5 shadow-2xl border border-white/15 z-50 text-xs"
              >
                <div class="px-3 py-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center justify-between">
                  <span>VISIONOS PACKAGES</span>
                  <el-icon><Lightning /></el-icon>
                </div>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-colors hover:bg-white/10 active:scale-95"
                  :class="!hasSelectedProject ? 'bg-white/15 text-white font-bold border border-white/20' : 'text-slate-300'"
                  @click="chooseProject('')"
                >
                  <span>未选择项目</span>
                  <el-icon v-if="!hasSelectedProject" class="text-[#007AFF]"><Check /></el-icon>
                </button>
                <div class="my-1.5 border-t border-white/10"></div>
                <div class="max-h-60 overflow-y-auto space-y-1">
                  <button
                    v-for="project in selectableProjects"
                    :key="project.id"
                    type="button"
                    class="group/item flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-all hover:bg-white/10 active:scale-95 relative overflow-hidden"
                    :class="project.id === selectedProjectId ? 'bg-white/15 text-white font-bold border border-white/20' : 'text-slate-200'"
                    @click="chooseProject(project.id)"
                  >
                    <div>
                      <div class="font-bold text-white tracking-wide group-hover/item:text-[#38bdf8] transition-colors">{{ project.name }}</div>
                      <div class="text-[10px] text-slate-400 font-mono mt-0.5">{{ project.id }} · v{{ project.version || '1.0' }}</div>
                    </div>
                    <el-icon v-if="project.id === selectedProjectId" class="text-[#007AFF] text-sm"><Check /></el-icon>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="flex items-center gap-4 text-xs font-semibold">
          <RouterLink to="/components" class="text-slate-300 hover:text-white transition-colors">组件规范</RouterLink>
          <RouterLink v-if="showConsole" to="/tools/projects" class="text-slate-300 hover:text-white transition-colors">项目管理</RouterLink>
          <RouterLink v-if="showConsole" to="/tools/console" class="text-slate-300 hover:text-white transition-colors">控制台</RouterLink>
        </div>
      </div>
    </header>

    <!-- 3. Apple VisionOS 3D 空间计算窗口舞台 (3D Spatial Computing Window Array) -->
    <main
      class="relative z-10 mx-auto max-w-7xl w-full px-8 py-12 flex-1 flex flex-col justify-center space-y-12 transition-all duration-500 ease-out"
      :style="{
        transform: isSpatialLaunching
          ? 'perspective(120px) translateZ(1600px) scale(4) rotateX(15deg)'
          : `perspective(1000px) rotateY(${mouseX * 0.35}deg) rotateX(${-mouseY * 0.35}deg)`,
        opacity: isSpatialLaunching ? '0.1' : '1',
      }"
    >
      <!-- Hero 迎宾区域 -->
      <div class="text-center space-y-4 max-w-3xl mx-auto">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 text-[#38bdf8] text-xs font-mono font-bold border border-white/10 backdrop-blur-xl shadow-lg animate-pulse">
          <span class="w-2 h-2 rounded-full bg-[#007AFF] animate-ping"></span>
          <span>APPLE VISIONOS SPATIAL COMPUTING EXPERIENCE [方案 V 👓]</span>
        </div>

        <h1 class="text-5xl sm:text-7xl font-extrabold tracking-tight text-white leading-tight drop-shadow-[0_0_35px_rgba(255,255,255,0.4)]">
          {{ projectTitle }}
        </h1>

        <p class="text-slate-400 text-sm sm:text-base leading-relaxed">
          {{ hasSelectedProject ? (selectedProject?.description || '体验 Apple VisionOS 空间计算黑玻璃高保真原型，支持眼动追焦与捏合手势流转。') : '请在上方选择目标项目包，开启 VisionOS 空间视效。' }}
        </p>

        <div v-if="showConsole" class="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            class="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/20 backdrop-blur-md transition-all shadow-md active:scale-95"
            @click="openProjectSettings"
          >
            <el-icon><Setting /></el-icon>
            修改包配置
          </button>
          <button
            type="button"
            class="px-6 py-2.5 rounded-2xl bg-[#007AFF] hover:bg-[#0062cc] text-white font-extrabold text-xs shadow-lg shadow-[#007AFF]/25 transition-all active:scale-95"
            @click="openPageTransfer"
          >
            <el-icon><Switch /></el-icon>
            页面导入导出
          </button>
        </div>
      </div>

      <!-- VisionOS 3D 空间黑玻璃窗口 Card Grid -->
      <div v-if="clientEntries.length" class="flex flex-wrap justify-center gap-8 w-full max-w-7xl mx-auto">
        <div
          v-for="entry in clientEntries"
          :key="entry.id"
          class="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] max-w-[380px] group relative rounded-[36px] bg-[#0c111e]/75 backdrop-blur-3xl p-8 border border-white/12 hover:border-white/30 hover:bg-[#111728]/85 hover:shadow-[0_20px_60px_rgba(0,122,255,0.2)] transition-all duration-500 hover:-translate-y-3 flex flex-col justify-between overflow-hidden shadow-2xl cursor-pointer"
          @click="launchSpatialApp(entry)"
        >
          <!-- Apple VisionOS 空间窗口控制条 (Spatial Window Titlebar Pill) -->
          <div class="flex items-center justify-between pb-6 mb-4 border-b border-white/10">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
              <span class="w-3 h-3 rounded-full bg-emerald-500/80"></span>
            </div>
            <span class="text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10">
              VISIONOS WINDOW
            </span>
          </div>

          <div>
            <div class="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-2xl text-white shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 mb-6">
              <el-icon v-if="entry.kind === 'mobile'"><Iphone /></el-icon>
              <el-icon v-else-if="entry.clientId === 'enterprise'"><OfficeBuilding /></el-icon>
              <el-icon v-else><Monitor /></el-icon>
            </div>

            <h2 class="text-2xl font-bold text-white group-hover:text-[#38bdf8] transition-colors mb-2">
              {{ entry.name }}
            </h2>
            <p class="text-xs text-slate-400 leading-relaxed">
              {{ entry.displayDescription }}
            </p>
          </div>

          <button
            type="button"
            class="mt-8 w-full py-4 px-6 rounded-2xl text-xs font-extrabold text-white bg-[#007AFF] hover:bg-[#0062cc] shadow-lg shadow-[#007AFF]/25 flex items-center justify-center gap-2 transition-all active:scale-95"
            @click.stop="launchSpatialApp(entry)"
          >
            <el-icon class="text-base animate-pulse"><Pointer /></el-icon>
            <span>捏合手势开启窗口</span>
            <el-icon class="text-sm group-hover:translate-x-1.5 transition-transform"><Right /></el-icon>
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="rounded-3xl border border-white/10 bg-[#0d1222]/80 backdrop-blur-3xl p-12 text-center max-w-lg mx-auto shadow-2xl">
        <el-icon class="text-4xl text-[#007AFF] mb-3 animate-pulse"><FolderOpened /></el-icon>
        <div class="text-sm font-bold text-white">未找到可用空间客户端</div>
        <div class="text-xs text-slate-400 mt-1">请在顶部下拉选择包含客户端的原型包。</div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="relative z-20 py-5 border-t border-white/10 bg-[#04060C]/90 text-xs font-mono text-slate-500 text-center tracking-widest">
      APPLE VISIONOS SPATIAL COMPUTING SYSTEM · {{ projectConfig.name }}
    </footer>
  </div>
</template>

<style scoped>
.apple-visionos-page,
.apple-visionos-page * {
  cursor: none !important;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif;
}

.spatial-launch-enter-active,
.spatial-launch-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.spatial-launch-enter-from,
.spatial-launch-leave-to {
  opacity: 0;
  transform: scale(1.15);
}
</style>
