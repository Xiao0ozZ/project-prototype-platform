<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import HomeViewAppleGlass from './home-variants/HomeViewAppleGlass.vue';
import HomeViewStageHub from './home-variants/HomeViewStageHub.vue';
import HomeViewSplitAccordion from './home-variants/HomeViewSplitAccordion.vue';
import HomeViewAlabasterGallery from './home-variants/HomeViewAlabasterGallery.vue';
import HomeViewOrbitalCompass from './home-variants/HomeViewOrbitalCompass.vue';
import HomeViewParallaxTheater from './home-variants/HomeViewParallaxTheater.vue';
import HomeViewInterstellarWarp from './home-variants/HomeViewInterstellarWarp.vue';
import HomeViewBlackHoleGravity from './home-variants/HomeViewBlackHoleGravity.vue';
import HomeViewQuantumCube from './home-variants/HomeViewQuantumCube.vue';
import HomeViewYinYangOrbit from './home-variants/HomeViewYinYangOrbit.vue';
import HomeViewCyberCockpit from './home-variants/HomeViewCyberCockpit.vue';

const skinStorageKey = 'project-platform:home-skin-theme';
const skinMenuRef = ref(null);
const showSkinMenu = ref(false);

// 正确修正保留的 11 套连续编号皮肤（方案 A 确定为苹果液体玻璃）
const skins = [
  {
    id: 'apple-glass',
    name: '方案 A：苹果液体玻璃',
    tag: '方案 A 🍎',
    component: HomeViewAppleGlass,
  },
  {
    id: 'stage-hub',
    name: '方案 B：全屏展台舞台',
    tag: '方案 B',
    component: HomeViewStageHub,
  },
  {
    id: 'split-accordion',
    name: '方案 C：全屏双分屏手风琴',
    tag: '方案 C',
    component: HomeViewSplitAccordion,
  },
  {
    id: 'alabaster-gallery',
    name: '方案 D：羊脂白艺术画廊',
    tag: '方案 D',
    component: HomeViewAlabasterGallery,
  },
  {
    id: 'orbital-compass',
    name: '方案 E：3D 环形星轨罗盘',
    tag: '方案 E',
    component: HomeViewOrbitalCompass,
  },
  {
    id: 'parallax-theater',
    name: '方案 F：3D 视差胶囊巨幕',
    tag: '方案 F',
    component: HomeViewParallaxTheater,
  },
  {
    id: 'interstellar-warp',
    name: '方案 G：星际穿越',
    tag: '方案 G',
    component: HomeViewInterstellarWarp,
  },
  {
    id: 'black-hole-gravity',
    name: '方案 H：黑洞引力场',
    tag: '方案 H',
    component: HomeViewBlackHoleGravity,
  },
  {
    id: 'quantum-cube',
    name: '方案 I：3D 量子赛博魔方',
    tag: '方案 I',
    component: HomeViewQuantumCube,
  },
  {
    id: 'yin-yang-orbit',
    name: '方案 J：太极双轨矩阵',
    tag: '方案 J',
    component: HomeViewYinYangOrbit,
  },
  {
    id: 'cyber-cockpit',
    name: '方案 K：3D 赛博驾驶舱',
    tag: '方案 K 🛸',
    component: HomeViewCyberCockpit,
  },
];

function readSavedSkin() {
  try {
    const saved = localStorage.getItem(skinStorageKey);
    return skins.some((s) => s.id === saved) ? saved : 'cyber-cockpit';
  } catch {
    return 'cyber-cockpit';
  }
}

const activeSkinId = ref(readSavedSkin());

const currentSkinComponent = computed(() => {
  const found = skins.find((s) => s.id === activeSkinId.value);
  return found ? found.component : HomeViewCyberCockpit;
});

const activeSkinTag = computed(() => {
  const found = skins.find((s) => s.id === activeSkinId.value);
  return found ? found.tag : '方案 K 🛸';
});

function selectSkin(skinId) {
  activeSkinId.value = skinId;
  try {
    localStorage.setItem(skinStorageKey, skinId);
  } catch {
    // LocalStorage optional
  }
  showSkinMenu.value = false;
}

function handleOutsideClick(event) {
  if (showSkinMenu.value && !skinMenuRef.value?.contains(event.target)) {
    showSkinMenu.value = false;
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideClick);
});
</script>

<template>
  <div class="homepage-skin-container relative">
    <!-- 右下角极简常驻向上弹出下拉菜单 -->
    <div class="fixed bottom-6 right-6 z-50">
      <div ref="skinMenuRef" class="relative">
        <button
          type="button"
          class="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900/90 text-white hover:bg-slate-900 shadow-2xl border border-white/20 backdrop-blur-xl transition-all duration-200 active:scale-95 text-xs font-semibold"
          @click="showSkinMenu = !showSkinMenu"
        >
          <el-icon><Brush /></el-icon>
          <span>皮肤/架构</span>
          <span class="text-slate-400 font-normal">({{ activeSkinTag }})</span>
          <el-icon class="text-xs text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': showSkinMenu }"><ArrowUp /></el-icon>
        </button>

        <!-- 向上弹出精简选项菜单 -->
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="transform scale-95 opacity-0 translate-y-2"
          enter-to-class="transform scale-100 opacity-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="transform scale-100 opacity-100 translate-y-0"
          leave-to-class="transform scale-95 opacity-0 translate-y-2"
        >
          <div
            v-if="showSkinMenu"
            class="absolute bottom-full right-0 mb-3 w-64 rounded-2xl bg-slate-900/95 text-white p-1.5 shadow-2xl border border-white/15 backdrop-blur-2xl z-50 max-h-80 overflow-y-auto"
          >
            <div class="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">选择皮肤与排版架构</div>
            <button
              v-for="skin in skins"
              :key="skin.id"
              type="button"
              class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors hover:bg-white/10"
              :class="activeSkinId === skin.id ? 'bg-pink-600/30 text-pink-300 font-bold border border-pink-500/40' : 'text-slate-300'"
              @click="selectSkin(skin.id)"
            >
              <span>{{ skin.name }}</span>
              <el-icon v-if="activeSkinId === skin.id" class="text-pink-400"><Check /></el-icon>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- 动态渲染选中的皮肤组件 -->
    <Transition name="fade-skin" mode="out-in">
      <component :is="currentSkinComponent" />
    </Transition>
  </div>
</template>

<style scoped>
.fade-skin-enter-active,
.fade-skin-leave-active {
  transition: opacity 0.2s ease;
}

.fade-skin-enter-from,
.fade-skin-leave-to {
  opacity: 0;
}
</style>
