<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowDown,
  Check,
  FolderOpened,
  Iphone,
  Lightning,
  MagicStick,
  Monitor,
  OfficeBuilding,
  Position,
  Right,
} from '@element-plus/icons-vue';

import { getProject, getProjectEntryPath, installedProjects } from '../../config/project-packages';
import { projectConfig } from '../../config/project.config';
import { applyProjectTheme } from '../../config/theme';
import HomeProjectActions from '../../components/HomeProjectActions.vue';

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
// Web Audio API Apple VisionOS 空间音效 (极简、通透、高保真)
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

function playSpaceshipAudio(type) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (type === 'projectWarp') {
      const sub = ctx.createOscillator();
      const sweep = ctx.createOscillator();
      const gain = ctx.createGain();

      sub.type = 'sawtooth';
      sub.frequency.setValueAtTime(60, ctx.currentTime);
      sub.frequency.exponentialRampToValueAtTime(380, ctx.currentTime + 0.35);
      sub.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.85);

      sweep.type = 'sine';
      sweep.frequency.setValueAtTime(240, ctx.currentTime);
      sweep.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.25);
      sweep.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.85);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.38, ctx.currentTime + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);

      sub.connect(gain);
      sweep.connect(gain);
      gain.connect(ctx.destination);

      sub.start();
      sweep.start();
      sub.stop(ctx.currentTime + 0.85);
      sweep.stop(ctx.currentTime + 0.85);
    } else if (type === 'clientFlythrough') {
      const engine1 = ctx.createOscillator();
      const engine2 = ctx.createOscillator();
      const gain = ctx.createGain();

      engine1.type = 'sawtooth';
      engine1.frequency.setValueAtTime(95, ctx.currentTime);
      engine1.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.45);

      engine2.type = 'triangle';
      engine2.frequency.setValueAtTime(190, ctx.currentTime);
      engine2.frequency.exponentialRampToValueAtTime(2600, ctx.currentTime + 0.45);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.42, ctx.currentTime + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      engine1.connect(gain);
      engine2.connect(gain);
      gain.connect(ctx.destination);

      engine1.start();
      engine2.start();
      engine1.stop(ctx.currentTime + 0.8);
      engine2.stop(ctx.currentTime + 0.8);
    }
  } catch {
    // Audio fail-safe
  }
}

// 3D 鼠标倾斜与星尘粒子逻辑 (Mouse 3D Tilt & Stardust Particle Physics)
const mouseX = ref(0);
const mouseY = ref(0);

// ==========================================================================
// Apple VisionOS 空间全息 3D 自定义鼠标指针 (Apple Vision Spatial Cursor)
// ==========================================================================
const cursorRawX = ref(-100);
const cursorRawY = ref(-100);
const cursorSmoothedX = ref(-100);
const cursorSmoothedY = ref(-100);
const isCursorHovering = ref(false);
const isCursorVisible = ref(false);

// 脑洞大招 1: 选择项目 -> 跨星系穿越至新项目领域
const isProjectWarping = ref(false);
const projectWarpName = ref('');

// 脑洞大招 2: 点击客户端 -> 宇宙飞船全速冲入客户端虫洞
const isClientFlythrough = ref(false);
const flythroughTarget = ref(null);

function handleMouseMove(e) {
  if (isClientFlythrough.value) return;
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

  // 释放 Apple 极简晶蓝星尘微粒
  if (ctx && Math.random() < 0.6) {
    particles.push({
      x: clientX,
      y: clientY,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2 - 1,
      size: Math.random() * 2.5 + 1,
      alpha: 0.95,
      color: ['#007AFF', '#38bdf8', '#ffffff', '#e2e8f0'][Math.floor(Math.random() * 4)],
    });
  }
}

function handleMouseLeave() {
  isCursorVisible.value = false;
}

// 3D 星际穿越流光 Canvas 引擎 (Apple VisionOS 空间钛空银与深蓝光束)
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

  stars = Array.from({ length: 180 }, () => ({
    x: Math.random() * canvas.width - canvas.width / 2,
    y: Math.random() * canvas.height - canvas.height / 2,
    z: Math.random() * canvas.width,
    color: ['#ffffff', '#007AFF', '#38bdf8', '#e2e8f0', '#94a3b8'][Math.floor(Math.random() * 5)],
  }));

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    cursorSmoothedX.value += (cursorRawX.value - cursorSmoothedX.value) * 0.24;
    cursorSmoothedY.value += (cursorRawY.value - cursorSmoothedY.value) * 0.24;

    const isWarp = isClientFlythrough.value;
    const isProjWarp = isProjectWarping.value;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const starSpeed = isWarp ? 65 : isProjWarp ? 45 : 4.5;

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
        const size = (1 - star.z / canvas.width) * (isWarp ? 8.5 : isProjWarp ? 6.5 : 3.2) + 0.5;
        const alpha = (1 - star.z / canvas.width) * 0.88;

        const prevK = 250 / (star.z + (isWarp ? 60 : isProjWarp ? 35 : 10));
        const ppx = star.x * prevK + cx;
        const ppy = star.y * prevK + cy;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = star.color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.shadowBlur = isWarp ? 18 : isProjWarp ? 12 : 5;
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
      p.x += isWarp ? p.vx * 6 : p.vx;
      p.y += isWarp ? p.vy * 6 : p.vy;
      p.alpha -= isWarp ? 0.05 : 0.025;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color || '#007AFF';
      ctx.shadowBlur = isWarp ? 18 : 8;
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

function chooseProject(projectId, event) {
  selectedProjectId.value = projectId;
  showProjectMenu.value = false;

  playSpaceshipAudio('projectWarp');

  const pName = selectedProject.value?.name || '新星系项目包';
  projectWarpName.value = pName;
  isProjectWarping.value = true;

  const clickX = event?.clientX || window.innerWidth / 2;
  const clickY = event?.clientY || window.innerHeight / 3;

  for (let i = 0; i < 150; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 12 + 3;
    particles.push({
      x: clickX,
      y: clickY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 4 + 1.5,
      alpha: 1.4,
      color: ['#ffffff', '#007AFF', '#38bdf8', '#e2e8f0'][Math.floor(Math.random() * 4)],
    });
  }

  setTimeout(() => {
    isProjectWarping.value = false;
  }, 900);
}

function launchWarpJump(entry, event) {
  if (isClientFlythrough.value) return;

  playSpaceshipAudio('clientFlythrough');

  isClientFlythrough.value = true;
  flythroughTarget.value = entry;

  const clickX = event?.clientX || window.innerWidth / 2;
  const clickY = event?.clientY || window.innerHeight / 2;
  for (let i = 0; i < 120; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 15 + 4;
    particles.push({
      x: clickX,
      y: clickY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 4 + 2,
      alpha: 1.5,
      color: ['#007AFF', '#ffffff', '#38bdf8'][Math.floor(Math.random() * 3)],
    });
  }

  setTimeout(() => {
    router.push(entry.to);
  }, 800);
}

const clientEntries = computed(() =>
  [...(selectedProject.value?.entries || [])]
    .filter((entry) => entry.kind !== 'docs')
    .sort((left, right) => (left.order || 0) - (right.order || 0))
    .map((entry) => ({
      ...entry,
      to: getProjectEntryPath(selectedProject.value, entry),
      glowBorder: 'border-white/10 hover:border-white/30 hover:shadow-[0_0_40px_rgba(0,122,255,0.2)]',
      btnGlow: 'bg-[#007AFF] hover:bg-[#0062cc] text-white font-extrabold shadow-lg shadow-[#007AFF]/25',
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

const projectTitle = computed(() => selectedProject.value?.name || projectConfig.name);
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

function openProjectManagement() {
  router.push('/tools/projects');
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
  <div class="interstellar-warp-page min-h-screen bg-[#05070D] text-slate-100 font-sans selection:bg-[#007AFF] selection:text-white relative overflow-hidden flex flex-col justify-between select-none">
    <!-- 0. Apple Vision Spatial 3D 自定义鼠标指针 -->
    <div
      v-if="isCursorVisible"
      class="fixed pointer-events-none z-[100] w-2.5 h-2.5 rounded-full bg-[#007AFF] shadow-[0_0_12px_#007AFF] -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
      :style="{ left: `${cursorRawX}px`, top: `${cursorRawY}px` }"
    ></div>

    <div
      v-if="isCursorVisible"
      class="fixed pointer-events-none z-[99] rounded-full border border-white/50 bg-white/5 backdrop-blur-xs transition-all duration-200 ease-out -translate-x-1/2 -translate-y-1/2 flex items-center justify-center shadow-lg"
      :class="[
        isCursorHovering
          ? 'w-14 h-14 border-white bg-white/15 shadow-[0_0_30px_rgba(0,122,255,0.6)] scale-110'
          : 'w-9 h-9 border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.2)]',
      ]"
      :style="{ left: `${cursorSmoothedX}px`, top: `${cursorSmoothedY}px` }"
    >
      <div class="w-1.5 h-1.5 rounded-full bg-white/80"></div>
    </div>

    <!-- 1. 实时星际跃迁光束与 Apple 极简晶蓝星尘 Canvas 视景 -->
    <canvas ref="canvasRef" class="fixed inset-0 pointer-events-none z-0"></canvas>

    <!-- 背景 Apple VisionOS 极致氛围光晕 Backdrop Glows -->
    <div class="fixed inset-0 pointer-events-none z-0">
      <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[1250px] h-[540px] bg-gradient-to-b from-[#007AFF]/12 via-[#5856D6]/08 to-transparent blur-[160px] rounded-full"></div>
    </div>

    <!-- 脑洞大招 1: 选择项目 -> 跨星系穿越至新项目领域 HUD 遮罩 -->
    <Transition name="sector-warp">
      <div
        v-if="isProjectWarping"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[#020308]/96 backdrop-blur-2xl pointer-events-none"
      >
        <div class="relative flex flex-col items-center">
          <div class="w-80 h-80 rounded-full border-4 border-[#007AFF] animate-ping flex items-center justify-center shadow-[0_0_100px_rgba(0,122,255,0.9)]">
            <div class="w-56 h-56 rounded-full border-2 border-dashed border-white/80 animate-spin flex items-center justify-center">
              <el-icon class="text-6xl text-white animate-pulse"><MagicStick /></el-icon>
            </div>
          </div>
          
          <div class="mt-8 text-center space-y-2">
            <div class="text-xs font-mono text-[#38bdf8] tracking-widest uppercase animate-pulse">
              SYSTEM / SWITCHING PROJECT
            </div>
            <div class="text-5xl font-black text-white tracking-tight drop-shadow-[0_0_40px_rgba(255,255,255,0.9)]">
              【 {{ projectWarpName }} 】
            </div>
            <div class="text-xs font-mono text-slate-400 tracking-wider">
              LOADING PROJECT WORKSPACE...
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 脑洞大招 2: 点击客户端 -> 宇宙飞船全速冲入客户端虫洞 飞船驾驶舱 HUD 视区 -->
    <Transition name="flythrough-overlay">
      <div
        v-if="isClientFlythrough"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[#020308]/96 backdrop-blur-xl pointer-events-none"
      >
        <div class="absolute inset-0 border-[24px] border-[#020308]/90 rounded-[60px] pointer-events-none flex flex-col justify-between p-8 shadow-[inset_0_0_140px_rgba(0,0,0,0.95)]">
          <div class="flex justify-between text-xs font-mono text-white tracking-widest">
            <span class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-[#007AFF] animate-ping"></span>
              PRODUCT EXPERIENCE ENGINE: CLIENT TRANSITION // READY
            </span>
            <span class="text-[#38bdf8]">CLIENT ACCESS: ACTIVE</span>
          </div>
          
          <div class="flex justify-between items-end px-12 pb-4">
            <div class="w-20 h-48 bg-gradient-to-t from-[#007AFF] via-[#38bdf8] to-transparent blur-md rounded-full animate-pulse"></div>
            <div class="w-20 h-48 bg-gradient-to-t from-[#007AFF] via-[#38bdf8] to-transparent blur-md rounded-full animate-pulse"></div>
          </div>
        </div>

        <div class="relative flex flex-col items-center text-center">
          <div class="w-72 h-72 rounded-full border-2 border-dashed border-white animate-spin flex items-center justify-center shadow-[0_0_120px_rgba(255,255,255,0.8)]">
            <div class="w-52 h-52 rounded-full border-2 border-[#007AFF]/90 animate-ping flex items-center justify-center">
              <el-icon class="text-6xl text-[#007AFF] animate-bounce"><Position /></el-icon>
            </div>
          </div>

          <div class="mt-8 space-y-2">
            <div class="text-xs font-mono text-[#38bdf8] tracking-widest uppercase animate-pulse">
              SYSTEM / OPENING CLIENT
            </div>
            <div class="text-4xl font-black text-white tracking-tight drop-shadow-[0_0_35px_rgba(255,255,255,1)]">
              {{ flythroughTarget?.name }}
            </div>
            <div class="text-xs font-mono text-slate-400 tracking-wider">
              LOADING PROTOTYPE · 3... 2... 1...
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 2. Apple VisionOS 胶囊 Header (Apple Vision Glass Pill Bar) -->
    <header class="relative z-40 pt-6 px-8">
      <div class="mx-auto max-w-7xl h-16 rounded-full bg-[#0d111d]/75 backdrop-blur-3xl border border-white/10 px-6 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <!-- Logo -->
        <div class="flex items-center gap-6">
          <RouterLink to="/" class="flex items-center gap-3 group">
            <div class="w-9 h-9 rounded-full bg-white/10 p-[1px] border border-white/20 shadow-lg group-hover:rotate-180 transition-transform duration-700">
              <div class="w-full h-full rounded-full bg-[#05070D] flex items-center justify-center text-[#007AFF] font-black">
                <el-icon><MagicStick /></el-icon>
              </div>
            </div>
            <div>
              <div class="text-[9px] font-mono text-[#38bdf8] tracking-widest uppercase">PRODUCT EXPERIENCE HUB</div>
              <div class="text-sm font-black text-white group-hover:text-[#38bdf8] transition-colors">
                {{ projectConfig.name }}
              </div>
            </div>
          </RouterLink>

          <span class="text-white/20 text-xs">//</span>

          <!-- Dropdown 项目选择 -->
          <div ref="projectMenuRef" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 border border-white/10 transition-all hover:border-white/25 active:scale-95 shadow-sm"
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
                  <span>PROJECT PACKAGES</span>
                  <el-icon><Lightning /></el-icon>
                </div>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-colors hover:bg-white/10 active:scale-95"
                  :class="!hasSelectedProject ? 'bg-white/15 text-white font-bold border border-white/20' : 'text-slate-300'"
                  @click="chooseProject('', $event)"
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
                    @click="chooseProject(project.id, $event)"
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
          <HomeProjectActions
            v-if="showConsole"
            :can-transfer="hasSelectedProject"
            tone="dark"
            @manage="openProjectManagement"
            @transfer="openPageTransfer"
          />
          <RouterLink v-if="showConsole" to="/tools/console" class="text-slate-300 hover:text-white transition-colors">控制台</RouterLink>
        </div>
      </div>
    </header>

    <!-- 3. Apple Vision 3D 悬浮舞台 (Apple Vision Spatial Stage) -->
    <main
      class="relative z-10 mx-auto max-w-7xl w-full px-8 py-12 flex-1 flex flex-col justify-center space-y-12 transition-all duration-500 ease-out"
      :style="{
        transform: isClientFlythrough
          ? 'perspective(120px) translateZ(1600px) scale(4) rotateX(15deg)'
          : isProjectWarping
            ? 'scale(0.85) filter(blur(6px))'
            : `perspective(1000px) rotateY(${mouseX * 0.3}deg) rotateX(${-mouseY * 0.3}deg)`,
        opacity: isClientFlythrough || isProjectWarping ? '0.1' : '1',
      }"
    >
      <!-- 迎宾标题 -->
      <div class="text-center space-y-4 max-w-3xl mx-auto">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 text-[#38bdf8] text-xs font-mono font-bold border border-white/10 backdrop-blur-xl shadow-lg animate-pulse">
          <span class="w-2 h-2 rounded-full bg-[#007AFF] animate-ping"></span>
          <span>PRODUCT EXPERIENCE CENTER · 方案 G [星际穿越 🚀]</span>
        </div>

        <h1 class="text-5xl sm:text-7xl font-extrabold tracking-tight text-white leading-tight drop-shadow-[0_0_35px_rgba(255,255,255,0.4)]">
          {{ projectTitle }}
        </h1>

        <p class="text-slate-400 text-sm sm:text-base leading-relaxed">
          {{ hasSelectedProject ? (selectedProject?.description || '进入项目包，查看对应的业务原型、产品文档与功能入口。') : '请先选择一个项目包，再进入对应的业务客户端。' }}
        </p>

      </div>

      <!-- 客户端 3D 浮空倾斜大卡片 -->
      <div v-if="clientEntries.length" class="flex flex-wrap justify-center gap-8 w-full max-w-7xl mx-auto">
        <div
          v-for="entry in clientEntries"
          :key="entry.id"
          class="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] max-w-[380px] group relative rounded-[32px] bg-[#0e1322]/70 backdrop-blur-3xl p-8 border border-white/10 hover:border-white/25 hover:bg-[#12182a]/80 hover:shadow-[0_0_40px_rgba(56,189,248,0.15)] transition-all duration-500 hover:-translate-y-3 flex flex-col justify-between overflow-hidden shadow-2xl cursor-pointer"
          @click="launchWarpJump(entry, $event)"
        >
          <!-- Specular Light Sweep -->
          <div class="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none"></div>

          <div>
            <div class="flex items-center justify-between mb-6">
              <div class="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-2xl text-white shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <el-icon v-if="entry.kind === 'mobile'"><Iphone /></el-icon>
                <el-icon v-else-if="entry.clientId === 'enterprise'"><OfficeBuilding /></el-icon>
                <el-icon v-else><Monitor /></el-icon>
              </div>

              <span class="px-3 py-1 rounded-full text-[10px] font-mono font-bold border border-white/15 bg-white/5 text-slate-300 tracking-widest uppercase">
                CLIENT EXPERIENCE
              </span>
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
            @click.stop="launchWarpJump(entry, $event)"
          >
            <el-icon class="text-base animate-pulse"><Position /></el-icon>
            <span>进入客户端</span>
            <el-icon class="text-sm group-hover:translate-x-1.5 transition-transform"><Right /></el-icon>
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="rounded-3xl border border-white/10 bg-[#0d1222]/80 backdrop-blur-3xl p-12 text-center max-w-lg mx-auto shadow-2xl">
        <el-icon class="text-4xl text-[#007AFF] mb-3 animate-pulse"><FolderOpened /></el-icon>
        <div class="text-sm font-bold text-white">未找到可用客户端</div>
        <div class="text-xs text-slate-400 mt-1">请先选择一个包含客户端入口的项目包。</div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="relative z-20 py-5 border-t border-white/10 bg-[#05070D]/90 text-xs font-mono text-slate-500 text-center tracking-widest">
      PRODUCT EXPERIENCE CENTER · {{ projectConfig.name }}
    </footer>
  </div>
</template>

<style scoped>
.interstellar-warp-page,
.interstellar-warp-page * {
  cursor: none !important;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif;
}

.sector-warp-enter-active,
.sector-warp-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.sector-warp-enter-from,
.sector-warp-leave-to {
  opacity: 0;
  transform: scale(1.15);
}

.flythrough-overlay-enter-active,
.flythrough-overlay-leave-active {
  transition: all 0.35s ease;
}

.flythrough-overlay-enter-from,
.flythrough-overlay-leave-to {
  opacity: 0;
}
</style>
