<script setup>
const metrics = [
  { label: '活跃项目', value: 3 },
  { label: '待确认需求', value: 7 },
  { label: '原型页面', value: 12 },
];
</script>

<template>
  <main class="sample-overview">
    <header>
      <div>
        <h1>项目概览</h1>
        <p>这是脱敏示例页面，用于确认项目包、主题和 PRD 关联正常工作。</p>
      </div>
    </header>
    <section class="sample-overview__metrics" aria-label="示例统计">
      <article v-for="metric in metrics" :key="metric.label">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
      </article>
    </section>
  </main>
</template>

<style scoped>
.sample-overview {
  display: grid;
  gap: 20px;
}

.sample-overview header h1 {
  margin: 0;
  color: var(--app-color-text-primary);
  font-size: 28px;
}

.sample-overview header p,
.sample-overview__metrics span {
  color: var(--app-color-text-secondary);
}

.sample-overview__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--app-color-border);
  border-radius: 16px;
  background: var(--app-color-surface);
}

.sample-overview__metrics article {
  display: grid;
  gap: 10px;
  padding: 24px;
}

.sample-overview__metrics article + article {
  border-left: 1px solid var(--app-color-border);
}

.sample-overview__metrics strong {
  color: var(--app-color-primary);
  font-size: 30px;
}

@media (max-width: 720px) {
  .sample-overview__metrics {
    grid-template-columns: 1fr;
  }

  .sample-overview__metrics article + article {
    border-top: 1px solid var(--app-color-border);
    border-left: 0;
  }
}
</style>
