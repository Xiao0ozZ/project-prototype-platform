<template>
  <main class="login-page">
    <section class="login-shell">
      <div class="login-brand" :style="brandStyle">
        <div class="space-y-4">
          <h2 class="text-3xl font-semibold leading-tight">{{ text('brandTitle') }}</h2>
          <p class="text-sm leading-relaxed text-white/80">{{ text('brandSubtitle') }}</p>
          <ul class="mt-4 space-y-2 text-sm text-white/85">
            <li v-for="(bullet, index) in brandBullets" :key="bullet" class="flex items-center">
              <span class="brand-bullet" :class="`brand-bullet-${index + 1}`"></span>
              {{ bullet }}
            </li>
          </ul>
        </div>
        <div class="mt-8 text-xs text-white/60">
          © {{ currentYear }} {{ project?.name }}. All rights reserved.
        </div>
      </div>

      <div class="login-form-panel">
        <div class="mb-8 flex items-center justify-between gap-4">
          <img v-if="logoUrl" :src="logoUrl" :alt="project?.name" class="h-8 w-auto" />
          <strong v-else class="text-lg text-gray-800">{{ project?.shortName || project?.name }}</strong>
          <div class="flex items-center gap-2">
            <el-select
              v-model="selectedClient"
              class="login-client-select"
              size="small"
              @change="switchClient"
            >
              <el-option
                v-for="item in project?.clients || []"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
            <el-select v-model="currentLocale" class="login-locale-select" size="small">
              <el-option
                v-for="option in localeOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </div>
        </div>

        <div class="mb-8 min-h-[92px]">
          <h1 class="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{{ text('title') }}</h1>
          <p class="mt-2 text-sm leading-relaxed text-gray-500">{{ text('subtitle') }}</p>
        </div>

        <el-form ref="formRef" :model="form" size="large" label-position="top" class="space-y-4">
          <el-form-item
            :label="text('tenantLabel')"
            prop="tenantCode"
            :rules="[{ required: true, message: text('tenantRequired'), trigger: 'blur' }]"
          >
            <el-input
              v-model="form.tenantCode"
              :placeholder="text('tenantPlaceholder')"
              autocomplete="organization"
            >
              <template #prefix
                ><el-icon><Tickets /></el-icon
              ></template>
            </el-input>
          </el-form-item>

          <el-form-item
            :label="text('accountLabel')"
            prop="account"
            :rules="[{ required: true, message: sharedText('accountRequired'), trigger: 'blur' }]"
          >
            <el-input
              v-model="form.account"
              :placeholder="text('accountPlaceholder')"
              autocomplete="username"
            >
              <template #prefix
                ><el-icon><User /></el-icon
              ></template>
            </el-input>
          </el-form-item>

          <el-form-item
            :label="sharedText('passwordLabel')"
            prop="password"
            :rules="[
              { required: true, message: sharedText('passwordRequired'), trigger: 'blur' },
              { min: 6, message: sharedText('passwordMin'), trigger: 'blur' },
            ]"
          >
            <el-input
              v-model="form.password"
              :placeholder="sharedText('passwordPlaceholder')"
              show-password
              type="password"
              autocomplete="current-password"
            >
              <template #prefix
                ><el-icon><Lock /></el-icon
              ></template>
            </el-input>
          </el-form-item>

          <div class="grid grid-cols-3 gap-3">
            <el-form-item
              class="col-span-2"
              :label="sharedText('captchaLabel')"
              prop="captcha"
              :rules="[{ required: true, message: sharedText('captchaRequired'), trigger: 'blur' }]"
            >
              <el-input
                v-model="form.captcha"
                :placeholder="sharedText('captchaPlaceholder')"
                autocomplete="off"
              >
                <template #prefix
                  ><el-icon><Key /></el-icon
                ></template>
              </el-input>
            </el-form-item>
            <div class="flex flex-col justify-end">
              <button type="button" class="captcha-box" @click="refreshCaptcha">
                {{ captchaToken ? sharedText('captchaImageText') : sharedText('captchaPlaceholderImage') }}
              </button>
              <button
                type="button"
                class="mt-1 text-right text-xs text-gray-400 hover:text-gray-500"
                @click="refreshCaptcha"
              >
                {{ sharedText('captchaRefresh') }}
              </button>
            </div>
          </div>

          <div class="mb-2 mt-1 flex items-center justify-between gap-4">
            <el-checkbox v-model="form.rememberMe">{{ sharedText('rememberMe') }}</el-checkbox>
            <el-button link type="primary" size="small" @click="showForgotPasswordTip">
              {{ sharedText('forgotPassword') }}
            </el-button>
          </div>

          <el-button
            type="primary"
            :loading="loading"
            :disabled="loading"
            class="mt-3 h-11 w-full text-base font-semibold"
            @click="handleLogin"
          >
            {{ sharedText('loginButton') }}
          </el-button>
        </el-form>

        <div class="mt-8 text-center text-xs text-gray-400">{{ text('footerNote') }}</div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Key, Lock, Tickets, User } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { localeOptions, setLocale } from '../../i18n';
import { getProject, getProjectClient } from '../../config/project-packages';
import { getThemeColorRgb } from '../../config/theme';
import { getProjectAssetUrl } from '../../services/project-assets';
import {
  getClientDefaultPagePath,
  getProjectClientEntryPath,
} from '../../services/project-navigation';

const props = defineProps({
  projectId: {
    type: String,
    required: true,
  },
  clientId: {
    type: String,
    required: true,
  },
});

const router = useRouter();
const { locale, t } = useI18n({ useScope: 'global' });
const formRef = ref();
const loading = ref(false);
const captchaToken = ref(Date.now());
const selectedClient = ref(props.clientId);
let loginTimer;

const project = computed(() => getProject(props.projectId));
const client = computed(() => getProjectClient(props.projectId, props.clientId));
const defaultPagePath = computed(() => getClientDefaultPagePath(client.value));
const clientConfig = computed(() => ({
  account: client.value?.login?.account || 'admin',
  tenantCode: client.value?.login?.tenantCode || 'demo',
  destination: defaultPagePath.value
    ? `/p/${props.projectId}/${props.clientId}/${defaultPagePath.value}`
    : `/p/${props.projectId}/${props.clientId}/login`,
  background: client.value?.login?.background
    ? getProjectAssetUrl(props.projectId, client.value.login.background)
    : '',
}));
const logoUrl = computed(() =>
  project.value?.branding?.logo ? getProjectAssetUrl(props.projectId, project.value.branding.logo) : '',
);

const form = reactive({
  tenantCode: clientConfig.value.tenantCode,
  account: clientConfig.value.account,
  password: '123456',
  captcha: '8888',
  rememberMe: true,
});

const currentYear = new Date().getFullYear();
const currentLocale = computed({
  get: () => locale.value,
  set: (value) => setLocale(value),
});
const brandStyle = computed(() => ({
  backgroundImage: clientConfig.value.background
    ? `linear-gradient(135deg, ${getThemeColorRgb(0.92)} 0%, rgba(2, 132, 199, 0.75) 100%), url(${clientConfig.value.background})`
    : `linear-gradient(135deg, ${getThemeColorRgb(0.96)} 0%, rgba(2, 132, 199, 0.78) 100%)`,
}));
const genericCopy = computed(() => ({
  brandTitle: project.value?.name || '项目平台',
  brandSubtitle: client.value?.description || '进入项目管理后台。',
  brandBullet1: '统一页面与操作规范',
  brandBullet2: '项目数据独立管理',
  brandBullet3: '支持原型演示与评审',
  title: `${client.value?.name || '项目'}登录`,
  subtitle: `请输入账号信息进入${client.value?.name || '项目后台'}。`,
  tenantLabel: '项目代码',
  tenantRequired: '请输入项目代码',
  tenantPlaceholder: '请输入项目代码',
  accountLabel: '账号',
  accountPlaceholder: '请输入账号',
  footerNote: '当前为项目原型演示环境',
}));
const text = (key) => {
  const configured = client.value?.login?.copy?.[key];
  if (configured) return configured;
  if (['operation', 'enterprise'].includes(props.clientId)) return t(`login.${props.clientId}.${key}`);
  return genericCopy.value[key] || key;
};
const sharedText = (key) => t(`login.shared.${key}`);
const brandBullets = computed(() => [text('brandBullet1'), text('brandBullet2'), text('brandBullet3')]);

watch(
  () => props.clientId,
  (client) => {
    selectedClient.value = client;
    form.tenantCode = clientConfig.value.tenantCode;
    form.account = clientConfig.value.account;
    formRef.value?.clearValidate();
  },
);

function refreshCaptcha() {
  captchaToken.value = Date.now();
  form.captcha = '';
}

function switchClient(client) {
  const targetClient = project.value?.clients.find((item) => item.id === client);
  const destination = targetClient
    ? getProjectClientEntryPath(props.projectId, targetClient)
    : `/p/${props.projectId}/${client}`;
  router.push(destination);
}

function showForgotPasswordTip() {
  ElMessage.info(sharedText('forgotPasswordTip'));
}

async function handleLogin() {
  if (!formRef.value || loading.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  loading.value = true;
  window.clearTimeout(loginTimer);
  loginTimer = window.setTimeout(() => {
    loading.value = false;
    ElMessage.success(sharedText('loginSuccess'));
    router.push(clientConfig.value.destination);
  }, 800);
}

onBeforeUnmount(() => {
  window.clearTimeout(loginTimer);
});
</script>

<style scoped>
.login-page {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: #f3f4f6;
  position: relative;
  overflow: hidden;
}

.login-shell {
  display: flex;
  width: 100%;
  max-width: 1024px;
  min-height: 620px;
  overflow: hidden;
  border: 1px solid #f3f4f6;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 16px 40px rgb(15 23 42 / 10%);
}

.login-brand {
  display: flex;
  width: 50%;
  flex-direction: column;
  justify-content: space-between;
  padding: 32px;
  color: #fff;
  background-position: center;
  background-size: cover;
}

.login-form-panel {
  display: flex;
  width: 50%;
  flex-direction: column;
  padding: 40px;
  background: #fff;
}

.brand-bullet {
  width: 6px;
  height: 6px;
  margin-right: 8px;
  border-radius: 50%;
  background: #6ee7b7;
  box-shadow: 0 1px 2px rgb(6 78 59 / 40%);
}

.brand-bullet-2 {
  background: #fcd34d;
}

.brand-bullet-3 {
  background: #7dd3fc;
}

.login-client-select {
  width: 104px;
}

.login-locale-select {
  width: 92px;
}

.captcha-box {
  display: flex;
  width: 100%;
  height: 42px;
  cursor: pointer;
  user-select: none;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  color: #4b5563;
  font-size: 13px;
}

.captcha-box:hover {
  background: #f3f4f6;
}

@media (max-width: 1023px) {
  .login-shell {
    max-width: 540px;
    min-height: auto;
  }

  .login-brand {
    display: none;
  }

  .login-form-panel {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .login-form-panel {
    padding: 28px 22px;
  }
}
</style>
