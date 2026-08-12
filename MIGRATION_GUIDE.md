# HTML 原型迁移到 Vue 3 工程规范

> 本文件保留为 Vue 回退链路的历史规范。React 正式平台导入规范 HTML 时会保存为 `html-pages/{client-id}` 托管页面，不再生成 Vue SFC；新工作应以 `templates/html-prototype-page.html` 和 `PAGE_TRANSFER_GUIDE.md` 为准。

## 1. 适用范围

本规范适用于将 `02_原型和PRD/原型/营运端`、`企业端`中的 HTML 原型接入当前 Vue 3 工程。旧 `02_原型和PRD/Vue3/CONVERSION_GUIDE.md` 面向单文件预览，不能直接作为本工程的接入方式。

迁移目标是保留原型内容区的视觉、字段、模拟数据和交互，同时复用工程统一侧栏、顶栏、路由和客户端切换，并保留已有多语言框架。

未来新增 HTML 原型必须先复制 [templates/html-prototype-page.html](./templates/html-prototype-page.html) 创建。模板代码已经标记可编辑区、锁定区、内容区、覆盖层、页面逻辑和页面样式；旧 HTML 页面仅作为视觉与交互参照，不能作为代码模板直接复制。

模板中的 `data-business-content` 是页面标题和子标题下方的自由业务区。默认统计卡、筛选和表格只是一种示例，可按需求整体替换为表单、详情、看板、控制台、地图、甘特图或其他业务布局；导入时保留该节点内部的实际内容，不按列表结构强制转换。

页面标题区按 `pageHeaderMode` 区分：一级列表、配置和看板通常使用 `standard`；二级详情页可使用 `back-only` 或 `none`。使用 `none` 时源 HTML 可以没有标题和子标题，导入器不得补造标题区。列表模板默认不增加“资料列表 + 总数”这类二级标题栏，筛选栏直接作为列表卡片顶部。

导入 Vue 时，`data-page-header="standard"` 必须转换为公共 `PageHeader` 组件及其 `actions` 插槽，不得继续生成页面自有的标题布局；标题区的主要新增、建立类按钮统一使用 `size="large"`，次要动作可使用默认尺寸。`back-only` 和 `none` 按源页面实际结构保留。历史 `legacy: true` 页面可能仍有自有标题代码，不代表新页面可以绕过公共组件。

## 2. 迁移前检查

1. 确认源 HTML、目标客户端、菜单名称和目标路由。
2. 检查源页面 `#app` 内的 `aside`、`header`、`main` 和 `main` 后方同级节点。
3. 统计源页面的 `el-dialog`、`el-drawer`、`el-table`、`el-tabs`、`el-form` 数量。
4. 检查页面脚本中的 `data`、`computed`、`methods`、`setup` 返回值及模拟数据。
5. 检查页面专属 CSS、外部 CDN、图片和旧 `.html` 跳转。

不能只复制 `<main>`：许多原型把弹窗和抽屉放在 `</main>` 后方。正确内容范围是 `#app` 移除 `aside` 和 `header` 后的全部业务节点。

## 3. 目标文件

```text
projects/{project-id}/views/{client-id}/<PascalCase>View.vue
```

- 一个 HTML 对应一个业务页面组件。
- 页面不得包含全局 `RouterView`、侧栏、顶栏、客户端选择、用户菜单或退出登录。
- 不建立空路由、占位页面或仅跳回旧 HTML 的中转组件。

## 4. 模板迁移

目标组件只保留业务内容：

```vue
<template>
  <main class="源页面 main 的 class">
    <!-- 原内容区 -->
  </main>

  <!-- 原 #app 内、main 后方的 el-dialog / el-drawer 等同级节点 -->
</template>
```

禁止带入：

- `<aside>` 和原型侧栏。
- 原型全局 `<header>`。
- `flex h-screen` 等旧页面外壳。
- Tailwind、Vue、Element Plus、图标库的 CDN 标签。
- 客户端门户脚本、旧端切换脚本和 `app.mount('#app')`。

迁移后逐项核对按钮、字段、表格列、标签页、弹窗、抽屉、分页、筛选和空状态。不能为了让模板编译通过而删除不完整区块，应回到源 HTML 定点修复标签结构。

## 5. 脚本迁移

### Options API

将 HTML 中的组件选项保留为 SFC：

```vue
<script>
export default {
  data() {},
  computed: {},
  methods: {},
};
</script>
```

### Composition API

使用 `<script setup>` 时，模板引用的变量、方法和组件必须在当前作用域声明或导入。

统一删除：

- `createApp()`、`app.use(ElementPlus)`、`app.mount('#app')`。
- 全局图标注册循环。
- `ElementPlus.ElMessage`、`ElementPlus.ElMessageBox` 全局命名空间调用。
- `window.location`、`.html` 链接等旧页面导航。

消息组件按需导入：

```js
import { ElMessage, ElMessageBox } from 'element-plus';
```

页面导航使用 `useRouter()`、`<RouterLink>` 或路由对象。

## 6. 模拟数据

- 确需跨页面复用的企业、会员、车辆、据点、订单等静态数据放入所属项目包的 `projects/{project-id}/data`。
- 页面专属筛选、表单、选中项、弹窗状态和演示结果保留在页面组件内。
- 需要编辑共享数据时，复制为页面本地响应式状态，不能直接修改导入常量。
- 不因迁移重新设计业务字段或删除演示数据。

## 7. 样式迁移

1. Tailwind 工具类直接保留，工程已统一引入 Tailwind。
2. 页面专属 CSS 放入当前 SFC 的 `<style scoped>`；确需覆盖 Element Plus Teleport 节点时使用非 scoped 样式并限制页面类前缀。
3. 不重复定义全局字体、主色、侧栏、顶栏和 body 布局。
4. Tailwind Preflight 已关闭，`src/styles/base.css` 提供统一盒模型、边框、标题和段落重置。
5. 原型中的 `border`、`rounded-*`、图标对齐必须与 HTML 保持一致。
6. 页面容器不使用 `100vh` 抢占外壳高度；滚动由 `AppShell` 的侧栏和内容区分别管理。
7. 新增页面必须使用 <style scoped> 或 CSS Modules；历史非 scoped 页面由 scripts/style-isolation-legacy.json 基线管控，不得新增例外。
8. 字体、演示图片和图标必须使用本地依赖或 src/assets，不得新增 Google Fonts、Unsplash、Placeholder 等运行时外链。

## 8. 路由与菜单

每个项目的页面统一登记在 `projects/{project-id}/page-definitions.js`，共用外壳根据项目包同时生成 Vue Router 子路由、AppShell 侧栏菜单和页面标题。

新增页面优先运行生成器：

```powershell
npm run generate:page -- --list-sections enterprise
npm run generate:page -- --client enterprise --path expense-review --title "费用审核" --section billing --dry-run
npm run generate:page -- --client enterprise --path expense-review --title "费用审核" --section billing --icon Document
```

生成器会创建 `projects/{project-id}/views/{client-id}/<PascalCase>View.vue`，并自动写入该项目页面注册表。`--hidden` 表示只注册路由、不显示菜单。禁止再直接向 `src/router/index.js` 追加业务页面。

`legacy: true` 仅用于已经迁移的历史页面。生成器创建的新页面不允许增加该标记，必须使用统一内容区、公共组件和 scoped 样式。

客户端切换和退出登录统一回到：

- 客户端登录：`/p/{project-id}/{client-id}/login`
- 客户端页面：`/p/{project-id}/{client-id}/{page-path}`

## 9. 多语言

- 新增或迁移页面默认只开发简体中文，不要求同步繁中、英文，也不要求为了未来翻译预先改写全部模板。
- 只有产品负责人明确指定页面和目标语言后，才执行该页面的翻译任务。
- 新编写的全局公共组件如需多语言，使用 Vue I18n 结构化 key。
- 历史迁移页面优先由 `src/i18n/catalog` 和 `legacy-localizer.js` 做精确文案映射。
- 动态插值、同词不同语境、图表文字或特殊组件无法使用精确映射时，再定点改为结构化 key。
- 模拟数据、姓名、手机号、车牌、订单号和业务记录默认不翻译。

仅在当前任务包含页面翻译时执行：

```powershell
npm run i18n:sync
npm run i18n:traditional
npm run audit:i18n
```

## 10. 强制验收

每次迁移或批量修复后必须执行：

```powershell
npm run audit:views
npm run audit:styles
npm run audit:components
npm run test:smoke
npm run test:visual
npm run build
```

当前任务包含多语言调整时，额外执行 `npm run audit:i18n`。

高频演示页面、公共页面或高风险页面还必须加入视觉基线；存在关键弹窗、抽屉或业务操作时必须增加交互测试。视觉基线更新规则见 [TESTING_GUIDE.md](./TESTING_GUIDE.md)。

`audit:views` 会检查：

- Vue SFC 严格解析和模板编译。
- 旧侧栏、旧顶栏、`h-screen` 外壳和旧 HTML 链接。
- 未声明模板变量和旧 Element Plus 全局调用。
- 菜单、路由、重复路径和未注册页面。
- 与源 HTML 的弹窗、抽屉、表格、标签页及表单数量差异。

构建通过后再由产品负责人进行浏览器视觉验收。自动审计不能替代逐页确认间距、边框、圆角、颜色、图标位置和弹窗内容。

## 11. 常见错误

| 问题                   | 原因                                    | 处理                                        |
| ---------------------- | --------------------------------------- | ------------------------------------------- |
| 双侧栏或双顶栏         | 旧 `aside/header` 被带入                | 删除旧外壳，仅保留业务节点                  |
| 菜单点击空白或刷新白屏 | 路由组件缺失、脚本异常或模板变量未返回  | 运行 `audit:views` 和 `build`，修正真实错误 |
| 按钮点击无弹窗         | 只复制 `<main>`，遗漏同级弹窗/抽屉      | 回到 `#app` 范围补回所有业务同级节点        |
| 卡片边框和圆角丢失     | Preflight 关闭后缺少统一 border-style   | 使用当前 `base.css`，不在单页重复兜底       |
| 页面内容整体下移       | 页面重复实现顶栏或使用旧壳层高度        | 删除旧 header 和 `h-screen`                 |
| 弹窗样式不生效         | Teleport 到 body，scoped 选择器无法命中 | 使用带页面前缀的非 scoped 样式              |
| 页面跳回 `.html`       | 未转换旧链接                            | 改为 Vue Router 路由                        |
| 所有页面一次性加载     | 路由使用静态 import                     | 改为动态 import                             |

## 版本记录

| 版本 | 日期       | 内容                                                                                       |
| ---- | ---------- | ------------------------------------------------------------------------------------------ |
| v1.0 | 2026-07-11 | 以统一 AppShell、动态路由、完整弹窗保留和自动迁移审计为准，替代旧单文件转换口径。          |
| v1.1 | 2026-07-12 | 增加样式隔离基线、本地资源约束、图表实例清理及异常兜底验收规则。                           |
| v1.2 | 2026-07-12 | 增加公共组件、Composables、无样式试点模式和组件治理审计规则。                              |
| v1.3 | 2026-07-12 | 增加页面生成器、统一页面注册表、ESLint、Prettier 和 CI 交付规则。                          |
| v1.4 | 2026-07-13 | 增加需求阶段可迁移 HTML 创建提示词、视觉参考边界、结构标记、导入清单和定案后单向迁移规则。 |
| v1.5 | 2026-07-13 | 建立可独立预览的 HTML 专用模板，固定机器可读的页面元数据、内容区、覆盖层、逻辑和样式边界。 |
