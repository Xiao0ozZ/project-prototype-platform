<template>
  <main class="not-found-page platform-page">
    <section class="not-found-panel platform-hero">
      <span class="status-eyebrow">PLATFORM NAVIGATION</span>
      <span class="status-code">404</span>
      <h1>没有找到这个页面</h1>
      <p>当前地址没有对应的公共工具或原型页面，可以返回首页重新选择入口。</p>
      <router-link class="home-link" to="/">返回首页</router-link>
    </section>
  </main>
</template>

<style scoped>
.not-found-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  color: var(--platform-color-text);
}
.not-found-panel {
  width: min(480px, 100%);
  padding: 38px;
  text-align: center;
}
.status-eyebrow {
  display: block;
  color: var(--platform-color-accent);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.16em;
}
.status-code {
  display: block;
  margin: 12px 0 3px;
  color: var(--platform-color-accent);
  font-size: 56px;
  font-weight: 800;
  letter-spacing: -0.06em;
}
h1 {
  margin: 0 0 10px;
  font-size: 25px;
  letter-spacing: -0.035em;
}
p {
  max-width: 360px;
  margin: 0 auto 24px;
  color: var(--platform-color-text-secondary);
  font-size: 13px;
  line-height: 1.65;
}
.home-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 20px;
  color: #fff;
  border-radius: 11px;
  background: var(--platform-color-accent);
  box-shadow: 0 9px 20px rgb(37 99 235 / 20%);
  font-size: 13px;
  font-weight: 700;
  transition:
    background-color var(--platform-motion-base) ease,
    transform var(--platform-motion-fast) ease;
}
.home-link:hover {
  background: var(--platform-color-accent-hover);
}
.home-link:active {
  transform: scale(0.97);
}
</style>
