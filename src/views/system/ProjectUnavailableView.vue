<template>
  <main class="project-unavailable platform-page">
    <section class="unavailable-panel platform-hero">
      <span class="unavailable-icon">!</span>
      <span class="unavailable-eyebrow">PROJECT PACKAGE</span>
      <h1>项目不可用</h1>
      <p>
        没有发现或无法访问项目包 <code>{{ projectId }}</code
        >。
      </p>
      <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
    </section>
  </main>
</template>

<script setup>
defineProps({ projectId: { type: String, required: true } });
</script>

<style scoped>
.project-unavailable {
  min-height: 100svh;
  display: grid;
  place-items: center;
  padding: 32px;
}
.unavailable-panel {
  width: min(480px, 100%);
  padding: 38px;
  text-align: center;
}
.unavailable-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  margin: 0 auto 14px;
  border-radius: 14px;
  background: #fff7ed;
  color: #ea580c;
  font-size: 20px;
  font-weight: 800;
}
.unavailable-eyebrow {
  color: var(--platform-color-accent);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.16em;
}
h1 {
  margin-top: 8px;
  font-size: 25px;
  letter-spacing: -0.035em;
}
p {
  margin: 10px 0 24px;
  color: var(--platform-color-text-secondary);
  font-size: 13px;
  line-height: 1.65;
}
code {
  padding: 2px 6px;
  border-radius: 6px;
  background: rgb(15 23 42 / 5%);
  font-family: var(--app-font-family-mono);
}
.unavailable-panel :deep(.el-button) {
  min-height: 40px;
  padding: 0 20px;
  border-radius: 11px;
  font-weight: 700;
}
</style>
