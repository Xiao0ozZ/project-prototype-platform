<script setup>
import { computed, onMounted } from 'vue';
import { ArrowLeft, ArrowRight, FolderOpened, Menu, SetUp, Upload } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

import {
  canPersistPlatformSettings,
  loadPlatformSettings,
  platformSettings,
  setPlatformDeveloperMode,
} from '../../services/platform-settings';

const developerMode = computed(() => platformSettings.developerMode);

async function toggleDeveloperMode() {
  if (!canPersistPlatformSettings) return;

  try {
    await setPlatformDeveloperMode(!developerMode.value);
  } catch (error) {
    ElMessage.error(error.message || '共享开发模式保存失败。');
  }
}

onMounted(() => void loadPlatformSettings());

const tools = [
  {
    title: '组件规范',
    description: '查看和验证项目统一使用的界面组件。',
    to: '/components',
    icon: SetUp,
  },
  {
    title: '页面导入导出',
    description: '导入 HTML 原型，或导出独立页面用于评审。',
    to: '/tools/page-transfer',
    icon: Upload,
  },
  {
    title: '项目包状态',
    description: '管理项目名称、Logo、主题和客户端入口。',
    to: '/tools/projects',
    icon: FolderOpened,
  },
  {
    title: '路由菜单管理',
    description: '维护项目页面、菜单分组和页面备份。',
    to: '/tools/project-routes',
    icon: Menu,
  },
];
</script>

<template>
  <div class="console-page platform-page">
    <main class="console-shell platform-page-shell">
      <header class="console-hero platform-hero">
        <div class="console-hero__topline">
          <RouterLink to="/" class="console-back-link">
            <el-icon><ArrowLeft /></el-icon>
            返回首页
          </RouterLink>
          <span class="console-status"><i></i>本机工程工具</span>
        </div>
        <div class="console-title-row">
          <span class="console-title-icon"
            ><el-icon><SetUp /></el-icon
          ></span>
          <div>
            <p class="console-eyebrow">ENGINEERING CONSOLE</p>
            <h1>控制台</h1>
            <p>集中管理项目包、页面、菜单和公共组件规范。</p>
          </div>
        </div>
      </header>

      <section class="developer-panel platform-surface">
        <div class="developer-panel__copy">
          <span class="developer-panel__label">开发体验</span>
          <h2>PRD 对照开发模式</h2>
          <p>开启后，在查看原型页面的同时显示对应的 PRD。默认使用固定分屏。</p>
          <small v-if="!canPersistPlatformSettings"> 当前为静态部署，修改开发模式后需要重新打包发布。 </small>
        </div>
        <button
          type="button"
          class="developer-toggle"
          :class="{ 'is-active': developerMode, 'is-disabled': !canPersistPlatformSettings }"
          :disabled="!canPersistPlatformSettings"
          @click="toggleDeveloperMode"
        >
          <span class="developer-toggle__indicator"></span>
          {{ developerMode ? '已开启' : canPersistPlatformSettings ? '开启开发模式' : '需重新打包' }}
        </button>
      </section>

      <section class="tools-panel platform-surface">
        <div class="tools-panel__heading">
          <div>
            <span>PLATFORM WORKSPACES</span>
            <h2>平台工作区</h2>
          </div>
          <small>{{ tools.length }} 个管理入口</small>
        </div>
        <div class="tools-grid">
          <RouterLink v-for="tool in tools" :key="tool.to" :to="tool.to" class="tool-link">
            <div class="tool-link__icon">
              <component :is="tool.icon" />
            </div>
            <div class="tool-link__copy">
              <h3>{{ tool.title }}</h3>
              <p>{{ tool.description }}</p>
            </div>
            <ArrowRight class="tool-link__arrow" />
          </RouterLink>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.console-page {
  color: var(--platform-color-text);
}
.console-shell {
  display: grid;
  gap: 20px;
}
.console-hero {
  display: grid;
  gap: 14px;
  padding: 18px 22px 22px;
}
.console-hero__topline,
.console-title-row,
.developer-panel,
.tools-panel__heading,
.tool-link {
  display: flex;
  align-items: center;
}
.console-hero__topline,
.developer-panel,
.tools-panel__heading {
  justify-content: space-between;
  gap: 20px;
}
.console-back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--platform-color-text-secondary);
  font-size: 12px;
  font-weight: 650;
  transition: color var(--platform-motion-base) ease;
}
.console-back-link:hover {
  color: var(--platform-color-accent);
}
.console-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--platform-color-text-secondary);
  font-size: 11px;
  font-weight: 650;
}
.console-status i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 4px rgb(34 197 94 / 10%);
}
.console-title-row {
  align-items: flex-start;
  gap: 13px;
}
.console-title-icon {
  display: inline-grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 13px;
  background: linear-gradient(145deg, #3b82f6, #4f46e5);
  color: #fff;
  box-shadow: 0 8px 20px rgb(37 99 235 / 22%);
  font-size: 19px;
}
.console-eyebrow,
.developer-panel__label,
.tools-panel__heading span {
  color: var(--platform-color-accent);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.15em;
}
.console-title-row h1 {
  margin-top: 3px;
  font-size: 26px;
  font-weight: 780;
  letter-spacing: -0.035em;
}
.console-title-row p:last-child,
.developer-panel__copy p,
.developer-panel__copy small,
.tool-link__copy p,
.tools-panel__heading small {
  color: var(--platform-color-text-secondary);
}
.console-title-row p:last-child {
  margin-top: 3px;
  font-size: 13px;
}
.developer-panel,
.tools-panel {
  padding: 22px;
}
.developer-panel__copy {
  min-width: 0;
}
.developer-panel__copy h2,
.tools-panel__heading h2 {
  margin-top: 4px;
  font-size: 18px;
  letter-spacing: -0.02em;
}
.developer-panel__copy p {
  margin-top: 7px;
  font-size: 13px;
  line-height: 1.55;
}
.developer-panel__copy small {
  display: block;
  margin-top: 4px;
  font-size: 11px;
}
.developer-toggle {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 14px;
  border: 0.5px solid rgb(15 23 42 / 10%);
  border-radius: 999px;
  background: rgb(248 250 252 / 88%);
  color: var(--platform-color-text-secondary);
  font-size: 12px;
  font-weight: 700;
}
.developer-toggle.is-active {
  border-color: transparent;
  background: var(--platform-color-accent);
  color: #fff;
  box-shadow: 0 8px 18px rgb(37 99 235 / 20%);
}
.developer-toggle.is-disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
.developer-toggle__indicator {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.72;
}
.tools-panel {
  display: grid;
  gap: 16px;
}
.tools-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.tool-link {
  min-width: 0;
  gap: 12px;
  min-height: 92px;
  padding: 15px;
  border: 0.5px solid rgb(15 23 42 / 8%);
  border-radius: 15px;
  background: rgb(255 255 255 / 68%);
  transition:
    border-color var(--platform-motion-base) ease,
    background-color var(--platform-motion-base) ease,
    box-shadow var(--platform-motion-base) ease,
    transform var(--platform-motion-base) var(--platform-ease-fluid);
}
.tool-link:hover {
  border-color: rgb(37 99 235 / 24%);
  background: #fff;
  box-shadow: 0 10px 22px rgb(51 65 85 / 8%);
  transform: translateY(-1px);
}
.tool-link__icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 12px;
  background: var(--platform-color-accent-soft);
  color: var(--platform-color-accent);
}
.tool-link__icon :deep(svg) {
  width: 19px;
  height: 19px;
}
.tool-link__copy {
  min-width: 0;
  flex: 1;
}
.tool-link__copy h3 {
  font-size: 14px;
  font-weight: 720;
}
.tool-link__copy p {
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.5;
}
.tool-link__arrow {
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
  color: #94a3b8;
  transition:
    color var(--platform-motion-base) ease,
    transform var(--platform-motion-base) var(--platform-ease-fluid);
}
.tool-link:hover .tool-link__arrow {
  color: var(--platform-color-accent);
  transform: translateX(3px);
}
@media (max-width: 720px) {
  .developer-panel {
    align-items: flex-start;
    flex-direction: column;
  }
  .tools-grid {
    grid-template-columns: 1fr;
  }
}
</style>
