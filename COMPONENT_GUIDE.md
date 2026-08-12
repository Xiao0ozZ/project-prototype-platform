# 公共组件与 Composables 使用规范

> 当前正式平台已切换为 `apps/platform-react`，公共页面统一使用 Ant Design。本文件中的 Vue、Element Plus 和 `src/components/ui` 规则仅用于观察期回退代码，不再作为 React 新页面的实现规范。项目业务内容优先使用规范 HTML 模板与托管 HTML 运行方式。

## 1. 目的

本规范用于统一后续新增 Vue 原型页面的结构、视觉和常见交互。公共组件只抽象稳定、重复且不包含业务判断的部分；业务字段、状态流、按钮权限、接口调用和页面模拟数据仍由页面负责。

历史页面保持当前稳定结构，不因组件库扩充而批量改写。只有产品负责人明确指定历史页面改造时，才进行定点接入。

## 2. 设计变量

设计变量位于 `src/styles/tokens.css`，包括颜色、字体链、字号、间距、圆角、阴影、控件高度、表格行高和面板标题高度。

新增公共组件必须使用语义变量，不得在组件内重新定义一套主色、字号和间距体系。

主色只允许在 `tokens.css` 中定义。Vue/CSS 使用 `var(--app-color-primary)`，Tailwind 使用 `theme-primary`，ECharts/Canvas 使用 `src/config/theme.js`；Element Plus 已全局映射，不再填写局部 `color` 属性。

正文和控件统一继承 `var(--app-font-family-sans)`，代码、文件路径和技术标识使用 `var(--app-font-family-mono)`。页面和公共组件不得自行指定 Inter、Noto Sans SC、微软雅黑等单一字体；系统字体链会按 Windows、macOS、Android 和 Linux 的可用字体自动回退。图标字体不属于正文字体链，应限制在对应图标类内使用。

## 3. 公共组件

统一从 `src/components/ui` 引入。

### 页面与布局

| 组件                 | 用途                                             |
| -------------------- | ------------------------------------------------ |
| `PageLayout`         | 新页面内容的纵向间距、宽度和紧凑模式             |
| `PageHeader`         | 页面标题、说明和右侧主要操作                     |
| `ContentPanel`       | 通用内容区块、说明、状态和右侧操作               |
| `SummaryGrid`        | 统计卡片的响应式网格                             |
| `StatCard`           | 可选中、可取消或只读的基础统计指标               |
| `EntityDetailHeader` | 详情页返回、主体识别、状态、摘要资料和页面级操作 |

### 查询与数据

| 组件               | 用途                                                           |
| ------------------ | -------------------------------------------------------------- |
| `FilterBar`        | 基础筛选、操作、结果摘要和高级筛选                             |
| `FilterIconButton` | 查询、重置、刷新等紧凑工具图标按钮                             |
| `ListActionGroup`  | 列表导入、导出、批量操作和已选数量                             |
| `DataTablePanel`   | 组合筛选、表格和分页的完整数据区；一级列表默认不显示二级标题栏 |
| `TablePagination`  | 每页数量和翻页                                                 |
| `StatusTag`        | 统一业务状态颜色                                               |
| `DetailList`       | 详情页和弹窗中的标签、字段值网格                               |

筛选栏的“查询”“重置”“刷新”等紧凑工具操作统一使用 `FilterIconButton`，并提供 Tooltip 和 `aria-label`。`编辑`、`删除`、`查看`、`审核`、`停用`等行内或页面级业务命令继续使用文字按钮，禁止套用 `FilterIconButton`。

`DetailList` 的字段标签和值统一使用 `14px` 正文字号；标签使用中等字重区分，不得放大到与区块标题相同的层级。

标准一级列表页以“个人会员管理”为视觉基线：新增、建立类主操作放在 `PageHeader` 右侧并使用 `size="large"`；列表卡片直接从 `FilterBar` 开始，导出等列表操作与筛选条件放在左侧，结果总数放在右侧。`DataTablePanel` 的 `title`、`totalText` 和 `actions` 仅用于详情页中的子列表或确实需要独立区块标题的场景，不得在一级列表中重复显示“资料列表”“订单列表”等标题栏。

### 表单与反馈

| 组件                  | 用途                                     |
| --------------------- | ---------------------------------------- |
| `FormSection`         | 长表单中的资料分区和响应式字段网格       |
| `FormDialog`          | 标准标题、内容间距和底部操作的表单弹窗   |
| `DialogFooter`        | 弹窗取消、确认、禁用和加载状态           |
| `InfoBanner`          | 业务说明、风险、成功和异常提示           |
| `EmptyState`          | 无数据、未配置和待建立状态               |
| `FileImportDialog`    | 模板下载、文件选择、导入结果和异常明细   |
| `ReasonConfirmDialog` | 删除、停用、驳回等必须填写原因的确认操作 |

`FileImportDialog` 由页面控制 `idle`、`ready`、`loading`、`success`、`error` 五种状态；组件只负责文件选择、状态反馈、结果摘要和异常明细，实际上传、模板下载及业务校验由页面或接口层处理。

Element Plus 已提供的 `el-input`、`el-select`、`el-table-column`、`el-tabs`、`el-date-picker` 等基础控件直接使用，不再重复封装。

## 4. 页面类型组合

| 页面类型           | 默认组合                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------- |
| 列表管理页         | `PageLayout + PageHeader + SummaryGrid + DataTablePanel + ListActionGroup + TablePagination` |
| 详情页             | `PageLayout + EntityDetailHeader + SummaryGrid + ContentPanel + DetailList`                  |
| 新增/编辑页        | `PageLayout + PageHeader + ContentPanel + FormSection`                                       |
| 弹窗表单           | `FormDialog + FormSection + DialogFooter`                                                    |
| 文件导入           | `FileImportDialog`                                                                           |
| 原因确认           | `ReasonConfirmDialog`                                                                        |
| 空白或未配置页     | `ContentPanel + EmptyState`                                                                  |
| 规则说明或风险提示 | `InfoBanner`                                                                                 |

业务页面不需要把所有组件全部使用。按页面类型选择组合，避免为了组件化增加无意义层级。

## 5. PageHeader 历史兼容模式

现有四个试点历史页面使用 `unstyled` 并保留原 class，只复用结构，不改变视觉。后续不再主动扩大历史页面组件化范围。

```vue
<PageHeader
  unstyled
  class="flex justify-between items-end mb-6"
  title="页面标题"
  description="页面说明"
  title-class="text-2xl font-bold"
>
  <template #actions>
    <el-button type="primary" size="large">新增</el-button>
  </template>
</PageHeader>
```

新页面使用默认样式，不得增加 `unstyled` 或 `legacy: true`。

## 6. Composables

| Composable             | 用途                           |
| ---------------------- | ------------------------------ |
| `usePagination`        | 当前页、每页数量、偏移量和重置 |
| `useResettableFilters` | 建立并恢复筛选初始值           |
| `useSelectableStats`   | 统计卡片选中和再次点击取消     |
| `useDialogState`       | 弹窗打开、关闭和切换           |
| `useChartRegistry`     | ECharts resize、卸载和实例销毁 |

Composables 不包含具体业务枚举、权限和接口调用。

## 7. 新页面生成与开发顺序

1. 查询目标客户端可用菜单分组。
2. 使用生成器建立页面并自动登记路由、菜单。
3. 按页面类型从 `/components` 选择组件组合。
4. 页面专属样式使用 `<style scoped>`，颜色和间距优先使用设计变量。
5. 页面业务状态保留在页面；确需跨页面共享的模拟数据放入所属项目包的 `projects/{project-id}/data`。
6. 只有两个以上页面存在完全相同的结构与行为时才新增公共组件。

```powershell
npm run generate:page -- --list-sections operation
npm run generate:page -- --client operation --path vehicle-inspection --title "车辆验车" --section assets --dry-run
npm run generate:page -- --client operation --path vehicle-inspection --title "车辆验车" --section assets
```

## 8. 示例与验收

组件规范页：`/components`。

每次新增或修改公共组件必须执行：

```powershell
npm run format
npm run lint
npm run audit:components
npm run audit:styles
npm run test:unit
npm run test:smoke
npm run test:visual
npm run build
```

公共组件发生确认后的视觉调整时，才允许更新组件规范页及受影响业务页的视觉基线，不得用更新截图掩盖回归。

## 版本记录

| 版本 | 日期       | 内容                                                                                                                     |
| ---- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| v1.0 | 2026-07-12 | 建立设计变量、8 个基础公共组件、5 个 Composables 和组件规范页。                                                          |
| v2.0 | 2026-07-12 | 扩充为 16 个公共组件，覆盖页面布局、完整数据区、详情、提示、空状态和表单弹窗。                                           |
| v2.1 | 2026-07-13 | 为 16 个公共组件补充 Vitest 单元测试，并列入组件修改验收。                                                               |
| v2.2 | 2026-07-14 | 以个人会员管理页统一标准列表的标题操作、筛选栏、表头、列表面板和分页样式。                                               |
| v3.0 | 2026-07-14 | 扩充为 19 个公共组件，新增列表操作组、文件导入弹窗和详情主体头部；详情内容继续按业务拆分为独立区块。                     |
| v3.1 | 2026-07-14 | 调整为 20 个公开组件，新增筛选工具图标按钮和原因确认弹窗，补齐文件导入状态；编辑、删除、查看等业务操作继续使用文字按钮。 |
| v3.2 | 2026-07-14 | 统一详情字段为 14px 正文层级，并将字号层级、工具图标与业务文字按钮规则同步到 HTML 和 Vue 新页面模板。                    |
| v3.3 | 2026-07-24 | 统一系统网页字体链和等宽字体变量，移除正文字体网络与本地字体包依赖，并同步 Element Plus、文档中心和 HTML 模板。          |
