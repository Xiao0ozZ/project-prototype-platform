<template>
  <div class="packages-page min-h-screen bg-[#f0f4f8] text-slate-900 font-sans antialiased selection:bg-blue-500 selection:text-white relative overflow-hidden">
    <!-- 苹果光流背景 Gradient Orbs -->
    <div class="fixed inset-0 pointer-events-none z-0">
      <div class="absolute -top-40 right-0 w-[600px] h-[600px] rounded-full bg-blue-300/25 blur-[120px]"></div>
      <div class="absolute bottom-0 -left-20 w-[600px] h-[600px] rounded-full bg-purple-300/25 blur-[120px]"></div>
    </div>

    <!-- 主 Stage -->
    <main class="mx-auto max-w-6xl px-6 py-6 space-y-5 relative z-10">
      <!-- 1. 精简紧凑型 Header 顶栏 -->
      <header class="rounded-3xl bg-white/80 backdrop-blur-2xl border border-white/90 px-7 py-5 shadow-xl shadow-slate-200/50 space-y-3">
        <!-- 顶行：返回首页 + 操作按钮群 -->
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <RouterLink to="/" class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
            <el-icon><ArrowLeft /></el-icon>
            <span>返回首页</span>
          </RouterLink>

          <div class="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              v-if="canManageProjects"
              type="button"
              class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-1.5"
              @click="openCreateDialog"
            >
              <el-icon><Plus /></el-icon>
              <span>新建项目</span>
            </button>
            <button
              v-if="canManageProjects"
              type="button"
              class="px-3.5 py-2 rounded-xl bg-white/80 hover:bg-white text-slate-700 font-bold text-xs border border-slate-200/80 shadow-xs transition-all flex items-center gap-1.5"
              @click="$router.push('/tools/project-routes')"
            >
              <el-icon><Menu /></el-icon>
              <span>路由菜单管理</span>
            </button>
            <button
              type="button"
              class="px-3.5 py-2 rounded-xl bg-white/80 hover:bg-white text-slate-700 font-bold text-xs border border-slate-200/80 shadow-xs transition-all flex items-center gap-1.5"
              :disabled="loading"
              @click="loadPackages"
            >
              <el-icon :class="{ 'animate-spin': loading }"><Refresh /></el-icon>
              <span>重新扫描</span>
            </button>
          </div>
        </div>

        <!-- 标题行：图标 + 标题 + 简介 (高度极致紧凑) -->
        <div class="flex items-center gap-3 pt-1">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 flex items-center justify-center text-lg font-bold shrink-0">
            <el-icon><FolderOpened /></el-icon>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">项目包状态</h1>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wider">
                PROJECT LIBRARY
              </span>
            </div>
            <p class="text-xs text-slate-500 font-medium mt-0.5">
              管理本地项目资料、首页入口和项目能力；新增项目会从模板生成初始化包。
            </p>
          </div>
        </div>
      </header>

      <!-- 反馈 Notice -->
      <div v-if="error || notice" class="space-y-2">
        <el-alert v-if="error" :title="error" type="error" :closable="false" class="!rounded-2xl" />
        <el-alert v-if="notice" :title="notice" type="success" :closable="true" class="!rounded-2xl" @close="notice = ''" />
      </div>

      <!-- 2. 项目资料总览 (Overview Panel) -->
      <section class="rounded-3xl bg-white/80 backdrop-blur-2xl border border-white/90 px-7 py-5 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-stretch justify-between gap-6" aria-label="项目包概览">
        <div class="space-y-1 md:w-1/3 flex flex-col justify-center">
          <span class="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest">LOCAL PROJECT PACKAGES</span>
          <h2 class="text-lg font-extrabold text-slate-900">项目资料总览</h2>
          <p class="text-xs text-slate-500 leading-relaxed">
            首页、客户端入口、文档和移动端内容都来自本地项目包。
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5 md:border-l md:border-slate-200/80 md:pl-6 flex-1">
          <div class="bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-2xs flex flex-col justify-center space-y-0.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500">可用项目</span>
              <span class="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
            </div>
            <span class="text-2xl font-extrabold text-slate-900 tracking-tight">{{ projects.length }}</span>
            <span class="text-[10px] text-slate-400 font-medium">已通过完整性检查</span>
          </div>

          <div class="bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-2xs flex flex-col justify-center space-y-0.5" :class="{ 'bg-amber-50/70 border-amber-200/80': invalidProjects.length }">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500">异常项目</span>
              <span class="w-2 h-2 rounded-full" :class="invalidProjects.length ? 'bg-amber-500 shadow-sm shadow-amber-500/50' : 'bg-slate-300'"></span>
            </div>
            <span class="text-2xl font-extrabold tracking-tight" :class="invalidProjects.length ? 'text-amber-600' : 'text-slate-900'">{{ invalidProjects.length }}</span>
            <span class="text-[10px] text-slate-400 font-medium">{{ invalidProjects.length ? '需要处理后才能使用' : '当前没有异常' }}</span>
          </div>

          <div class="bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-2xs flex flex-col justify-center space-y-0.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500">当前权限</span>
              <span class="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
            </div>
            <span class="text-xl font-extrabold text-blue-600 tracking-tight">{{ canManageProjects ? '可管理' : '只读' }}</span>
            <span class="text-[10px] text-slate-400 font-medium">{{ canManageProjects ? '可编辑项目包配置' : '仅查看生产构建内容' }}</span>
          </div>
        </div>
      </section>

      <!-- 3. 项目清单 (Project Index Table) -->
      <section class="rounded-3xl bg-white/80 backdrop-blur-2xl border border-white/90 px-7 py-6 shadow-xl shadow-slate-200/50 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <h2 class="text-lg font-extrabold text-slate-900">项目清单</h2>
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">PROJECT INDEX</span>
          </div>
          <span class="px-3 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
            {{ projects.length }} 个项目
          </span>
        </div>

        <div class="rounded-2xl border border-slate-200/70 overflow-hidden shadow-2xs">
          <el-table :data="projects" border empty-text="尚未发现有效项目包" class="apple-glass-table">
            <el-table-column prop="name" label="项目名称" min-width="170">
              <template #default="{ row }">
                <span class="font-bold text-slate-900">{{ row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="id" label="项目 ID" min-width="140">
              <template #default="{ row }">
                <span class="font-mono text-xs text-slate-500">{{ row.id }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="version" label="版本" width="100">
              <template #default="{ row }">
                <span class="font-mono text-xs font-bold text-slate-600">v{{ row.version || '1.0' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="客户端" min-width="220">
              <template #default="{ row }">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span
                    v-for="client in row.clients"
                    :key="client.id"
                    class="px-2.5 py-0.5 rounded-xl text-xs font-semibold bg-slate-100/90 text-slate-700 border border-slate-200/70"
                  >
                    {{ client.name }}
                  </span>
                  <span v-if="!row.clients.length" class="text-xs text-slate-400">-</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 inline-flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-2xs"></span>
                  <span>可用</span>
                </span>
              </template>
            </el-table-column>
            <el-table-column label="首页显示" width="110">
              <template #default="{ row }">
                <span
                  class="px-2.5 py-0.5 rounded-full text-xs font-bold inline-block"
                  :class="row.homepage?.visible !== false ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-400 border border-slate-200'"
                >
                  {{ row.homepage?.visible !== false ? '显示' : '隐藏' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column v-if="canManageProjects" label="操作" width="90" fixed="right">
              <template #default="{ row }">
                <button
                  type="button"
                  class="px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs transition-colors border border-blue-100/80 inline-flex items-center gap-1"
                  @click="openEditDialog(row)"
                >
                  <el-icon><Edit /></el-icon>
                  <span>编辑</span>
                </button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </section>

      <!-- 4. 无效项目包 Warning (如果有) -->
      <section v-if="invalidProjects.length" class="rounded-3xl bg-amber-50/80 backdrop-blur-2xl border border-amber-200/80 px-7 py-5 shadow-xl shadow-amber-950/5 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-extrabold text-amber-900">无效项目包</h2>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            {{ invalidProjects.length }} 个需要处理
          </span>
        </div>
        <el-table :data="invalidProjects" border class="apple-glass-table">
          <el-table-column prop="folder" label="文件夹" width="220" />
          <el-table-column label="问题">
            <template #default="{ row }">{{ row.errors.join('；') }}</template>
          </el-table-column>
          <el-table-column v-if="canManageProjects" label="操作" width="120" align="center">
            <template #default="{ row }">
              <button
                v-if="row.project"
                type="button"
                class="px-3 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs transition-colors border border-amber-200 inline-flex items-center gap-1"
                @click="openInvalidProjectDialog(row)"
              >
                <el-icon><Edit /></el-icon>
                <span>配置</span>
              </button>
              <span v-else class="text-xs text-slate-400">无法读取配置</span>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <ProjectConfigDialog
        v-model="dialogVisible"
        :mode="dialogMode"
        :project="editingProject"
        @saved="handleDialogSaved"
      />
    </main>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { ArrowLeft, Edit, FolderOpened, Menu, Plus, Refresh } from '@element-plus/icons-vue';
import { useRoute } from 'vue-router';

import ProjectConfigDialog from '../../components/ProjectConfigDialog.vue';
import { onProjectPackagesChanged } from '../../services/project-assets';

const projects = ref([]);
const invalidProjects = ref([]);
const loading = ref(false);
const error = ref('');
const notice = ref('');
const dialogVisible = ref(false);
const dialogMode = ref('create');
const editingProject = ref(null);
const canManageProjects = import.meta.env.DEV;
const route = useRoute();
let stopWatching = () => {};

async function loadPackages() {
  loading.value = true;
  error.value = '';
  try {
    const response = await fetch('/__projects/manifest', { cache: 'no-store' });
    if (!response.ok) throw new Error(`项目包扫描失败（${response.status}）`);
    const payload = await response.json();
    projects.value = payload.projects || [];
    invalidProjects.value = payload.invalidProjects || [];
  } catch (loadError) {
    error.value = loadError.message;
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  dialogMode.value = 'create';
  editingProject.value = null;
  dialogVisible.value = true;
}

function openEditDialog(project) {
  dialogMode.value = 'edit';
  editingProject.value = project;
  dialogVisible.value = true;
}

function openInvalidProjectDialog(invalidProject) {
  if (!invalidProject.project) {
    notice.value = '该项目的 project.json 无法读取，需先修复配置文件格式后才能编辑。';
    return;
  }
  openEditDialog(invalidProject.project);
}

async function handleDialogSaved({ message }) {
  notice.value = `${message} 开发服务正在重新载入项目配置。`;
  await loadPackages();
}

onMounted(async () => {
  await loadPackages();
  const projectId = typeof route.query.project === 'string' ? route.query.project : '';
  if (canManageProjects && route.query.edit === '1' && projectId) {
    const project =
      projects.value.find((item) => item.id === projectId) ||
      invalidProjects.value.find((item) => item.folder === projectId)?.project;
    if (project) openEditDialog(project);
  }
  stopWatching = onProjectPackagesChanged(loadPackages);
});
onBeforeUnmount(() => stopWatching());
</script>

<style scoped>
.apple-glass-table {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: rgba(248, 250, 252, 0.85);
  --el-table-row-hover-bg-color: rgba(239, 246, 255, 0.7);
  --el-table-border-color: rgba(241, 245, 249, 0.9);
  font-size: 13px;
}
:deep(.el-table th.el-table__cell) {
  background-color: rgba(248, 250, 252, 0.85) !important;
  color: #64748b;
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-top: 12px;
  padding-bottom: 12px;
}
:deep(.el-table td.el-table__cell) {
  padding-top: 12px;
  padding-bottom: 12px;
}
</style>
