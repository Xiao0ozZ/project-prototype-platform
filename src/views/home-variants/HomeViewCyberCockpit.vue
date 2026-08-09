<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Aim,
  ArrowDown,
  Check,
  Iphone,
  Lightning,
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
// Web Audio API 原生赛博音效合成器 (0 外部依赖，点击交互即时触发)
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

function playSciFiAudio(type) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (type === 'select') {
      // 项目选择：量子矩阵共振音效 (双音高阶频跃升)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.16);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(660, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.16);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.18);
      osc2.stop(ctx.currentTime + 0.18);
    } else if (type === 'warp') {
      // 客户端点击：超光速穿梭跃迁引擎充能与爆裂冲量
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.55);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    }
  } catch {
    // 允许音效静音降级
  }
}

// 3D 驾驶舱视角陀螺仪与鼠标粒子 Physics
const pitch = ref(0);
const roll = ref(0);
const mouseX = ref(0);
const mouseY = ref(0);

// 点击冲击波与震动镜头
const shakeX = ref(0);
const shakeY = ref(0);
const showShockwave = ref(false);
const shockwaveX = ref(0);
const shockwaveY = ref(0);
const hudBanner = ref(null);
let hudBannerTimer = null;

// 超光速跃迁状态
const isWarping = ref(false);
const warpingTarget = ref(null);

function handleMouseMove(e) {
  if (isWarping.value) return;
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

// Canvas 驾驶舱飞行能量场与 3D 星际穿越纯白颗粒引擎
let animationId = null;
let ctx = null;
let plasmaSparks = [];
let gridLines = [];
let warpStars = [];

function initCockpitCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // 1. 初始化 3D 星际穿越纯白颗粒 (纯净星际穿越光速微粒)
  warpStars = Array.from({ length: 160 }, () => ({
    x: Math.random() * canvas.width - canvas.width / 2,
    y: Math.random() * canvas.height - canvas.height / 2,
    z: Math.random() * canvas.width,
    color: '#ffffff',
  }));

  gridLines = Array.from({ length: 35 }, () => ({
    y: Math.random() * canvas.height,
    x: Math.random() * canvas.width,
    length: Math.random() * 80 + 20,
    speed: Math.random() * 2 + 1,
    opacity: Math.random() * 0.4 + 0.1,
  }));

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isWarp = isWarping.value;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // 1. 渲染 3D 星际穿越纯白颗粒 (经典星际穿越：纯白光芒颗粒从远方冲向屏幕)
    const starSpeed = isWarp ? 30 : 4.5;
    for (let i = 0; i < warpStars.length; i++) {
      const star = warpStars[i];
      star.z -= starSpeed;
      if (star.z <= 0) {
        star.z = canvas.width;
        star.x = Math.random() * canvas.width - cx;
        star.y = Math.random() * canvas.height - cy;
      }

      const k = 260 / star.z;
      const px = star.x * k + cx;
      const py = star.y * k + cy;

      if (px >= 0 && px <= canvas.width && py >= 0 && py <= canvas.height) {
        const size = (1 - star.z / canvas.width) * (isWarp ? 5.5 : 2.8) + 0.4;
        const alpha = (1 - star.z / canvas.width) * 0.85;

        const prevK = 260 / (star.z + (isWarp ? 40 : 10));
        const ppx = star.x * prevK + cx;
        const ppy = star.y * prevK + cy;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.shadowBlur = isWarp ? 12 : 5;
        ctx.shadowColor = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(ppx, ppy);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 2. 渲染驾驶舱网格与跃迁隧道 (Hyperdrive Tunnel Engine)
    if (isWarp) {
      // 跃迁超光速星线 (Hyperspace Speedlines Radiating from Center)
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 90; i++) {
        const angle = (i / 90) * Math.PI * 2;
        const distFar = 800 + Math.random() * 400;
        const distNear = 40 + Math.random() * 60;
        
        const x1 = cx + Math.cos(angle) * distNear;
        const y1 = cy + Math.sin(angle) * distNear;
        const x2 = cx + Math.cos(angle) * distFar;
        const y2 = cy + Math.sin(angle) * distFar;

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');

        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    } else {
      // 常规量子驾驶舱网格
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
    }

    // 2. 渲染动态纯白微粒 (White Plasma Sparks)
    for (let i = plasmaSparks.length - 1; i >= 0; i--) {
      const p = plasmaSparks[i];
      p.x += isWarp ? p.vx * 6 : p.vx;
      p.y += isWarp ? p.vy * 6 : p.vy;
      p.life -= isWarp ? 0.04 : 0.025;

      if (p.life <= 0) {
        plasmaSparks.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color || '#ffffff';
      ctx.shadowBlur = isWarp ? 20 : 10;
      ctx.shadowColor = p.color || '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, isWarp ? p.size * 2 : p.size, 0, Math.PI * 2);
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

// 激发点击选择项目大招特效：画面镜头震动 + 纯白质子满屏爆裂 + HUD 霓虹高亮通报
function chooseProject(projectId, event) {
  selectedProjectId.value = projectId;
  showProjectMenu.value = false;

  playSciFiAudio('select');

  // 1. 触发 3D 驾驶舱震动
  shakeX.value = (Math.random() - 0.5) * 16;
  shakeY.value = (Math.random() - 0.5) * 16;
  setTimeout(() => {
    shakeX.value = 0;
    shakeY.value = 0;
  }, 300);

  // 2. 在点击位置释放 120 颗爆裂纯白火花
  const clickX = event?.clientX || window.innerWidth / 2;
  const clickY = event?.clientY || window.innerHeight / 3;
  
  shockwaveX.value = clickX;
  shockwaveY.value = clickY;
  showShockwave.value = true;
  setTimeout(() => (showShockwave.value = false), 600);

  for (let i = 0; i < 120; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 2;
    plasmaSparks.push({
      x: clickX,
      y: clickY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 3 + 1.5,
      life: 1.2,
      color: '#ffffff',
    });
  }

  // 3. 弹出 HUD 驾驶舱系统通告
  const pName = selectedProject.value?.name || '平台全景系统';
  hudBanner.value = `>>> 驾驶舱核心重组完成：【${pName}】已就绪激活 <<<`;
  if (hudBannerTimer) clearTimeout(hudBannerTimer);
  hudBannerTimer = setTimeout(() => {
    hudBanner.value = null;
  }, 2600);
}

// 激发点击客户端入口大招特效：超光速星际跃迁引擎 (Hyperdrive Warp Jump)
function launchWarpJump(entry, event) {
  if (isWarping.value) return;

  playSciFiAudio('warp');

  isWarping.value = true;
  warpingTarget.value = entry;

  // 产生 100+ 跃迁纯白质子
  const clickX = event?.clientX || window.innerWidth / 2;
  const clickY = event?.clientY || window.innerHeight / 2;
  for (let i = 0; i < 100; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 12 + 4;
    plasmaSparks.push({
      x: clickX,
      y: clickY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 4 + 2,
      life: 1.5,
      color: '#ffffff',
    });
  }

  // 跃迁 750ms 后跳转页面
  setTimeout(() => {
    router.push(entry.to);
  }, 750);
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
        'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 shadow-pink-500/40 hover:from-pink-600 hover:to-indigo-700',
        'bg-gradient-to-r from-cyan-400 via-blue-600 to-indigo-600 shadow-cyan-500/40 hover:from-cyan-500 hover:to-blue-700',
        'bg-gradient-to-r from-emerald-400 via-teal-600 to-indigo-600 shadow-emerald-500/40 hover:from-emerald-500 hover:to-indigo-700',
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
  initCockpitCanvas();
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
  <div class="cyber-cockpit-page min-h-screen bg-[#010208] text-slate-100 font-sans selection:bg-pink-500 selection:text-white relative overflow-hidden flex flex-col justify-between select-none">
    <!-- 1. 飞行驾驶舱量子 Canvas (含超光速跃迁与粒子爆裂) -->
    <canvas ref="canvasRef" class="fixed inset-0 pointer-events-none z-0"></canvas>

    <!-- 点击选择项目时产生的扩散能量脉冲波 -->
    <div
      v-if="showShockwave"
      class="fixed z-40 rounded-full border-2 border-pink-400 pointer-events-none animate-shockwave"
      :style="{
        left: `${shockwaveX}px`,
        top: `${shockwaveY}px`,
        transform: 'translate(-50%, -50%)',
      }"
    ></div>

    <!-- 2. 全屏 3D 飞行驾驶舱外框 (Cockpit HUD Frame Overlay) -->
    <div class="fixed inset-0 pointer-events-none z-20 border-[16px] border-slate-950/60 rounded-[48px] shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]">
      <!-- Cockpit HUD Target Reticle Grid Crosshair -->
      <div class="absolute top-6 left-6 text-[10px] font-mono text-pink-400/80 tracking-widest uppercase flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-pink-400 animate-ping"></span>
        <span>SYS.MODE: WARP COCKPIT // PITCH: {{ pitch.toFixed(1) }}° ROLL: {{ roll.toFixed(1) }}°</span>
      </div>
      <div class="absolute top-6 right-6 text-[10px] font-mono text-cyan-400/80 tracking-widest uppercase">
        FPS: 60 // QUANTUM LINK: {{ isWarping ? 'WARPING...' : 'ACTIVE' }}
      </div>
    </div>

    <!-- HUD 驾驶舱系统通告 Banner (选择项目时弹出) -->
    <Transition name="hud-banner">
      <div
        v-if="hudBanner"
        class="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-8 py-3 rounded-full bg-pink-500/20 text-pink-300 text-xs font-mono font-black border border-pink-400/60 backdrop-blur-2xl shadow-[0_0_50px_rgba(236,72,153,0.8)] flex items-center gap-3"
      >
        <span class="w-2.5 h-2.5 rounded-full bg-pink-400 animate-ping"></span>
        <span>{{ hudBanner }}</span>
      </div>
    </Transition>

    <!-- 3D 超光速星际跃迁 HUD 全息遮罩 (点击客户端入口时爆发) -->
    <Transition name="warp-overlay">
      <div
        v-if="isWarping"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md pointer-events-none"
      >
        <div class="relative flex flex-col items-center">
          <!-- 旋转全息锁定视准圈 -->
          <div class="w-64 h-64 rounded-full border-2 border-dashed border-cyan-400 animate-spin flex items-center justify-center shadow-[0_0_80px_rgba(6,182,212,0.8)]">
            <div class="w-44 h-44 rounded-full border-2 border-pink-500/80 animate-ping flex items-center justify-center">
              <el-icon class="text-5xl text-pink-400 animate-bounce"><Position /></el-icon>
            </div>
          </div>
          
          <div class="mt-8 text-center space-y-2">
            <div class="text-xs font-mono text-pink-400 tracking-widest uppercase animate-pulse">
              &gt;&gt;&gt; HYPERDRIVE WARP LEAP INITIATED &lt;&lt;&lt;
            </div>
            <div class="text-4xl font-black text-white tracking-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.9)]">
              {{ warpingTarget?.name }}
            </div>
            <div class="text-xs font-mono text-cyan-300 tracking-wider">
              QUANTUM LINK: 100% | SPEED: MACH 99 | ACCESSING SYSTEM PROTOTYPE...
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 3. 极速悬浮 Header -->
    <header class="relative z-40 pt-8 px-10">
      <div class="mx-auto max-w-7xl h-16 rounded-full bg-slate-950/80 backdrop-blur-2xl border border-pink-500/40 px-6 flex items-center justify-between shadow-[0_0_50px_rgba(236,72,153,0.2)]">
        <!-- Logo -->
        <div class="flex items-center gap-6">
          <RouterLink to="/" class="flex items-center gap-3 group">
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

          <!-- Dropdown 项目选择 -->
          <div ref="projectMenuRef" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-pink-500/10 hover:bg-pink-500/20 text-xs font-bold text-pink-300 border border-pink-500/30 transition-all hover:shadow-[0_0_20px_rgba(236,72,153,0.4)] active:scale-95"
              @click="showProjectMenu = !showProjectMenu"
            >
              <span class="w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_10px_#ec4899] animate-ping"></span>
              <span>{{ hasSelectedProject ? selectedProject?.name : '激活驾驶舱项目包...' }}</span>
              <el-icon class="text-pink-400 text-xs transition-transform duration-200" :class="{ 'rotate-180': showProjectMenu }"><ArrowDown /></el-icon>
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
                class="absolute left-0 mt-3 w-72 rounded-3xl bg-[#080D20]/95 backdrop-blur-2xl p-2.5 shadow-2xl border border-pink-500/40 z-50 text-xs"
              >
                <div class="px-3 py-1.5 text-[10px] font-mono text-pink-400 uppercase tracking-widest flex items-center justify-between">
                  <span>COCKPIT MATRIX SELECTOR</span>
                  <el-icon><Lightning /></el-icon>
                </div>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-colors hover:bg-pink-500/20 active:scale-95"
                  :class="!hasSelectedProject ? 'bg-pink-500/30 text-pink-300 font-bold border border-pink-500/40' : 'text-slate-300'"
                  @click="chooseProject('', $event)"
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
                    class="group/item flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-all hover:bg-gradient-to-r hover:from-pink-500/30 hover:to-cyan-500/20 active:scale-95 relative overflow-hidden"
                    :class="project.id === selectedProjectId ? 'bg-pink-500/30 text-pink-300 font-bold border border-pink-500/40' : 'text-slate-200'"
                    @click="chooseProject(project.id, $event)"
                  >
                    <div>
                      <div class="font-bold text-white tracking-wide group-hover/item:text-pink-300 transition-colors">{{ project.name }}</div>
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
          <HomeProjectActions
            v-if="showConsole"
            :can-transfer="hasSelectedProject"
            tone="dark"
            @manage="openProjectManagement"
            @transfer="openPageTransfer"
          />
          <RouterLink v-if="showConsole" to="/tools/console" class="text-slate-300 hover:text-pink-400 transition-colors">控制台</RouterLink>
        </div>
      </div>
    </header>

    <!-- 4. 终极压轴脑洞：全景 3D 飞行驾驶舱舞台 (3D Mech-Cockpit Stage) -->
    <main
      class="relative z-10 mx-auto max-w-7xl w-full flex-1 flex flex-col items-center justify-center px-10 py-6 space-y-12 transition-all duration-500 ease-out"
      :style="{
        transform: isWarping
          ? 'perspective(200px) translateZ(1200px) scale(3.5) rotateZ(12deg)'
          : `perspective(1200px) rotateX(${pitch + shakeY}deg) rotateY(${roll + shakeX}deg)`,
        opacity: isWarping ? '0.1' : '1',
      }"
    >
      <!-- 迎宾标题 -->
      <div class="text-center space-y-4 max-w-3xl mx-auto">
        <div class="inline-flex items-center gap-2.5 px-4 py-1 rounded-full bg-pink-500/10 text-pink-300 text-xs font-mono font-bold border border-pink-500/30 backdrop-blur-md shadow-[0_0_30px_rgba(236,72,153,0.4)] animate-pulse">
          <span class="w-2.5 h-2.5 rounded-full bg-pink-400 shadow-[0_0_10px_#ec4899]"></span>
          <span>GRAND FINALE: 3D CYBER MECH-COCKPIT · OPTION K [终极压轴 🛸]</span>
        </div>

        <h1 class="text-5xl sm:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-200 to-cyan-300 leading-tight drop-shadow-[0_0_40px_rgba(236,72,153,0.5)]">
          {{ projectTitle }}
        </h1>

        <p class="text-slate-300 text-xs sm:text-sm leading-relaxed">
          移动鼠标掌控全向 3D 飞行驾驶舱视角，点击项目或客户端发起超光速跃迁：
        </p>

      </div>

      <!-- 驾驶舱全息终端大卡片 (Cockpit Terminal Cards) -->
      <div v-if="clientEntries.length" class="flex flex-wrap justify-center gap-8 w-full max-w-7xl mx-auto">
        <div
          v-for="(entry, idx) in clientEntries"
          :key="entry.id"
          class="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] max-w-[380px] group relative rounded-[36px] bg-[#070C1F]/90 backdrop-blur-2xl p-8 border transition-all duration-500 hover:-translate-y-4 flex flex-col justify-between overflow-hidden shadow-2xl cursor-pointer"
          :class="[
            entry.glowBorder,
            activeNodeIndex === idx ? 'ring-2 ring-pink-400 scale-105 z-20' : 'opacity-90 hover:opacity-100'
          ]"
          @pointerdown="activeNodeIndex = idx"
          @click="launchWarpJump(entry, $event)"
        >
          <!-- Terminal Hologram Bar Accent -->
          <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-pink-400 to-transparent shadow-[0_0_15px_#ec4899]"></div>

          <div>
            <div class="flex items-center justify-between mb-6">
              <div class="w-14 h-14 rounded-2xl bg-slate-950 flex items-center justify-center text-2xl text-pink-300 border border-white/10 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
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

          <button
            type="button"
            class="mt-8 w-full py-4 px-6 rounded-2xl text-xs font-black text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg group-hover:shadow-[0_0_30px_rgba(236,72,153,0.6)]"
            :class="entry.btnGlow"
            @click.stop="launchWarpJump(entry, $event)"
          >
            <el-icon class="text-base animate-pulse"><Position /></el-icon>
            <span>开火！跃迁至该系统原型</span>
            <el-icon class="text-sm group-hover:translate-x-2 transition-transform"><Right /></el-icon>
          </button>
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

@keyframes shockwave {
  0% {
    width: 0px;
    height: 0px;
    opacity: 1;
    border-width: 4px;
  }
  100% {
    width: 600px;
    height: 600px;
    opacity: 0;
    border-width: 1px;
  }
}

.animate-shockwave {
  animation: shockwave 0.6s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
}

.hud-banner-enter-active,
.hud-banner-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.hud-banner-enter-from,
.hud-banner-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px) scale(0.9);
}

.warp-overlay-enter-active,
.warp-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.warp-overlay-enter-from,
.warp-overlay-leave-to {
  opacity: 0;
}
</style>
