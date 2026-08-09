<template>
  <section class="client-empty-view" aria-labelledby="client-empty-title">
    <el-empty :image-size="96">
      <template #description>
        <div class="client-empty-copy">
          <h1 id="client-empty-title">客户端暂无页面</h1>
          <p>可以在路由菜单管理中新增页面，或在项目配置中指定 HTML 原型目录。</p>
        </div>
      </template>
      <RouterLink class="client-empty-action" :to="routeManagerTarget">前往路由菜单管理</RouterLink>
    </el-empty>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const routeManagerTarget = computed(() => ({
  name: 'project-routes',
  query: {
    project: String(route.meta.projectId || ''),
    client: String(route.meta.clientId || ''),
  },
}));
</script>

<style scoped>
.client-empty-view {
  display: grid;
  min-height: min(560px, calc(100vh - 140px));
  place-items: center;
  border: 1px solid var(--app-color-border-light);
  border-radius: 14px;
  background: var(--app-color-surface);
}

.client-empty-copy {
  max-width: 460px;
  text-align: center;
}

.client-empty-copy h1 {
  margin: 0;
  color: var(--app-color-text-primary);
  font-size: 20px;
}

.client-empty-copy p {
  margin: 8px 0 0;
  color: var(--app-color-text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.client-empty-action {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  padding: 0 16px;
  border-radius: 9px;
  background: var(--app-color-primary);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}
</style>
