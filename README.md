# 产品功能体验中心

> 产品功能体验中心

## 项目说明

本工程是一套 Vue 3 项目资料与原型共用外壳。不同实际项目以 `projects/{project-id}` 可插拔项目包接入，每个项目独立保存自己的配置、客户端入口、页面、模拟数据、资源、文档和移动端内容，共用首页、路由外壳、公共组件、主题引擎和工程工具。

工程定位为可运行的前端原型，不连接真实后端。页面使用模拟数据呈现业务字段、页面布局、弹窗和主要交互，供产品评审、业务确认、客户演示和前端开发参考。

## 当前范围

- 本仓库只维护共用平台壳子、公共组件、路由、工具、模板和自动化验收能力。
- 实际项目包、业务页面、模拟数据、项目资源和项目文档不随本仓库提交，由各项目单独保存后放入本地 `projects/{project-id}` 使用。
- 本地没有项目包时，首页不显示业务项目入口；加入项目包并重新扫描后，才会出现对应项目和客户端入口。
- 文档中心只读取各项目包 `projects/{project-id}/docs` 下的 Markdown，支持文件夹目录、搜索、Mermaid、相对图片和文档链接。
- 客户端入口：每个客户端可直接进入默认页、先显示平台演示登录页或进入指定页面，并可选择左侧菜单或无侧栏外壳。
- 多语言：保留现有简中、繁中和 English 切换框架；后续新页面默认只开发简体中文，仅在产品负责人明确指定页面后补充对应语言。

## 技术栈

- Vue 3 + Vite 6
- Vue Router 4
- Element Plus
- Tailwind CSS（关闭 Preflight，由工程基础样式统一兜底）
- Vue I18n
- ECharts
- Markdown It + Mermaid + DOMPurify
- Lucide（移动端静态资源已本地化）
- Playwright（路由、交互和视觉回归测试）
- Vitest + Vue Test Utils（公共组件单元测试）

## 目录结构

```text
项目资料原型工程/
├─ plugins/                    项目发现、PRD、导入导出及构建插件
├─ packages/project-core/      项目包 Schema、扫描、校验、文档和关联领域核心
├─ projects/                   本地可插拔项目包目录（已加入 Git 忽略，不提交到本仓库）
├─ examples/                   可提交、脱敏、可运行的项目包样例
├─ scripts/                    页面迁移和多语言审计脚本
├─ templates/                  新页面及可迁移 HTML 原型模板
├─ tests/                      路由冒烟、关键交互及视觉截图基线
├─ src/
│  ├─ components/             统一外壳及 ui 公共组件
│  ├─ config/                 平台配置、项目包注册和主题配置
│  ├─ i18n/                   多语言配置、词库及旧原型文案桥接
│  ├─ composables/            分页、筛选、弹窗、统计选择和图表通用逻辑
│  ├─ layouts/                客户端布局
│  ├─ router/                 全局路由
│  ├─ services/               文档读取等前端数据服务
│  ├─ styles/                 设计变量、全局样式与 Tailwind 入口
│  └─ views/                  首页、登录、文档、工具和错误页等平台页面
├─ COMPONENT_GUIDE.md          公共组件、Composables 和新增页面使用规范
├─ ARCHITECTURE.md             工程分层、轻量外壳边界和后续拆分顺序
├─ HTML_PROTOTYPE_CREATION_PROMPT.md 需求阶段可迁移 HTML 原型创建提示词
├─ MIGRATION_GUIDE.md          HTML 原型迁移到本工程的执行规范
├─ PAGE_TRANSFER_GUIDE.md      HTML 原型导入与 Vue 页面演示包导出说明
├─ PROJECT_PACKAGE_GUIDE.md    项目包结构、配置、插拔和发布规范
├─ TESTING_GUIDE.md            自动化验收范围、命令和基线更新规则
├─ start-preview-8080.cmd      Windows 双击启动脚本
└─ package.json
```

## 项目包配置

共用外壳不硬编码实际项目。每个项目放在 `projects/{project-id}`，至少包含 `project.json`、`page-definitions.js` 和业务页面。移出项目文件夹后，开发环境重新扫描时该项目入口会消失；移回后恢复。生产环境是构建快照，项目包变化后必须重新构建发布。

新项目从 `templates/project-package` 复制，完整字段和边界见 [PROJECT_PACKAGE_GUIDE.md](./PROJECT_PACKAGE_GUIDE.md)。

工程级命名统一使用 `app-*`、`ui-*`、`theme-*`，不得使用具体项目名称作为 CSS 变量、公共类名、插件名、事件名、包名或资源文件名。`npm run audit:naming` 会检查该规则。

## 本地运行

### Windows 双击启动

双击 `start-preview-8080.cmd`。脚本会：

1. 检查 Node.js。
2. 在缺少 `node_modules` 时自动安装依赖。
3. 使用 `0.0.0.0:8080` 启动 Vite。
4. 自动打开 `http://127.0.0.1:8080`。

同一局域网的其他人员可通过 `http://本机IP:8080` 访问。关闭脚本窗口或按 `Ctrl+C` 可停止服务。

### 命令行启动

```powershell
npm install
npm run dev -- --host 0.0.0.0 --port 8080 --strictPort
```

## 常用命令

```powershell
npm run dev                 # 本机开发预览，默认 127.0.0.1:5188
npm run dev:lan             # 局域网预览，默认 0.0.0.0:5188
npm run project -- help     # 查看项目包 CLI
npm run project:example     # 将脱敏样例安装到本地 projects/sample-project
npm run project:validate    # 使用共享核心校验项目包
npm run project:health      # 检查项目、HTML 和需求关联健康状态
npm run quality:core        # 只检查可提交的平台底座与样例，不读取 projects 业务源码
npm run build               # 生产构建
npm run audit:projects      # 项目包配置、页面、资源和文档完整性检查
npm run audit:views         # 全页面迁移、路由、外壳、弹窗及 SFC 审计
npm run audit:styles        # 样式隔离与外部样式资源审计
npm run audit:components    # 公共组件、Composables 和示例页审计
npm run i18n:sync           # 扫描静态界面文案并同步三份词库键
npm run i18n:traditional    # 使用 OpenCC 在本地生成繁体词库
npm run audit:i18n          # 检查三份词库结构和未转换数量
npm run test:smoke          # 全部路由和关键交互检查
npm run test:visual         # 关键页面视觉基线比较
npm run test:ui             # 执行全部 Playwright 测试
npm run test:unit           # 公共组件单元测试
```

项目包、HTML 和 PRD 的日常维护命令：

```powershell
npm run project -- preflight --file D:\prototypes\page.html
npm run project -- mount --project sample --docs D:\product\docs --prototype admin=D:\product\html
npm run project -- mounts
npm run project -- snapshot --project sample
npm run project -- trace --project sample
npm run project -- build-review --base /prototype/
```

`mount` 只写入被 Git 忽略的 `project-mounts.local.json`，不会改 `project.json`、PRD 或 HTML 原文件。生产构建会把挂载目录复制为本次发布的只读快照；服务器不能借此直接修改本机源资料。

## 新增页面

页面、路由和菜单统一维护在对应项目包的 `page-definitions.js`。禁止再分别修改 Router 和菜单数组。

```powershell
npm run generate:page -- --list-projects
npm run generate:page -- --project sample-project --list-sections admin
npm run generate:page -- --project sample-project --client admin --path vehicle-inspection --title "车辆验车" --section assets --dry-run
```

生成器会创建使用公共组件和 scoped 样式的 Vue 页面，并同时登记路由与菜单。使用 `--hidden` 时只登记路由，不显示在侧栏。详细规则见 [COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md) 和 [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)。

## 入口与路由

- `/`：项目资料与原型首页；默认不选择项目，选择后在当前首页展示该项目入口。
- `/p/{project-id}`：兼容旧链接，跳转回首页并自动选中指定项目。
- `/p/{project-id}/{client-id}`：按客户端配置进入默认页、平台演示登录页或指定入口页。
- `/p/{project-id}/{client-id}/login`：指定项目客户端的可选演示登录页。
- `/p/{project-id}/{client-id}/{page-path}`：指定项目业务页面。
- `/p/{project-id}/mobile`：指定项目移动端流程演示。
- `/p/{project-id}/docs`：指定项目文档中心，可使用 `?file=相对路径.md` 打开文档。
- `/components`：公共组件、设计变量与交互示例页。
- `/tools/page-transfer`：本机 HTML 原型导入与独立页面导出工具；单页直接下载 HTML，多页才生成 ZIP。
- `/tools/projects`：查看有效和无效项目包及校验结果，并管理项目资料与首页项目选择显示状态。
- `/tools/project-routes`：管理客户端菜单、页面顺序和页面级 PRD 关联。
- `/tools/ai-context`：检查项目交付上下文、确认关联建议、分析 PRD 变化并导出机器可读上下文包。
- `/tools/console`：内部开发控制台，集中管理工程工具并开启开发模式。

业务页面采用路由按需加载。切换客户端时按目标客户端的进入方式导航；每个客户端可使用左侧菜单、按路由分组的顶部导航、仅保留平台顶栏或沉浸式内容；仅使用平台演示登录页的客户端显示退出登录操作。

## 开发模式与 PRD 对照

开发模式用于 PM、开发人员和内部评审。开启后，已登记 PRD 关联的业务页面会在统一外壳顶栏显示“查看 PRD”，默认以固定分屏方式同时查看原型和 PRD；也可以切换为浮层或新窗口。PRD 面板还可以下载当前页面对应的 Vue 源文件，便于开发人员辅助定位；该下载接口仅在本机 Vite 开发服务中开放。客户演示时保持关闭，不显示开发信息。

页面与 PRD 文件的对应关系保存在项目包 `.platform/page-prd-links.json`，可在“路由菜单管理”的页面列表中直接选择、修改或清除；历史项目中的 `page-prd-links.js` 仍作为兼容读取来源。没有关联 PRD 的页面不会显示入口。开发模式可以在 `/tools/console` 开启，也可以通过业务页面 URL 的 `?__dev=1` 开启当前浏览器会话。

页面来源支持两种模式：现有 HTML 导入继续生成 Vue 页面；启用项目的 `prototype` 后，也可以按客户端分别扫描 HTML 文件夹并运行原 HTML，HTML 直读页面不生成 Vue 副本。外部 HTML 默认由平台外壳承载并只显示模板内容区，也可按客户端选择保留 HTML 自身的完整外壳。

业务页面开发模式状态保存在工程根目录的 `platform-settings.json`，该文件已加入 `.gitignore`，只作为当前服务实例的本地配置。本机通过 Vite 开发服务保存配置，局域网访问者读取同一份配置，刷新后即可看到 PRD 和源文件入口。静态生产包只能读取构建时写入的 `platform-settings.json` 快照，不能在线修改；需要修改时应更新配置后重新构建发布。首页控制台及首页管理工具仍只保存在当前浏览器的 `sessionStorage`，不写入配置文件；`?__dev=1` 仅作为当前浏览器的临时开发模式覆盖，不会修改共享配置。

## AI 上下文中心

`/tools/ai-context` 将现有项目配置、客户端页面、PRD 文档、页面级关联和组件级关联汇总为统一交付上下文。它是本地确定性分析能力，不调用外部大模型，也不会上传项目资料。

- “项目概览”检查页面缺少 PRD、关联文件失效、组件关联目标失效和文档正文读取失败。
- “页面上下文”可选择任意 Vue 或 HTML 直读页面，复制该页面及其关联需求的 JSON 上下文；业务页面在开发模式下也可从账号菜单直接打开当前页面上下文。
- “关联建议”根据页面标题、路由、源文件名、菜单分组和 PRD 文件信息生成候选，只有本机开发环境中由用户确认后才写入 `.platform/page-prd-links.json`。
- “PRD 影响分析”把当前文档摘要与浏览器本地基线比较，并通过已有页面/组件关联列出潜在影响范围；基线只存入 `localStorage`，不写入 PRD 或项目包。
- “追溯矩阵”按页面汇总页面来源、页面级 PRD、组件级章节关联和待处理问题，并支持导出 JSON。
- “导出上下文包”提供索引 JSON 和包含 PRD 正文的完整 JSON，供 Codex、Claude 或其他工具读取。核心数据结构和分析函数位于 `packages/project-core/src/ai-context.js`，后续本地 MCP Server 可直接复用，不需要重新定义项目模型。

需要把影响分析留给其他电脑或 CI 时，先用 `snapshot` 保存基线，再用 `trace --baseline <文件>` 生成可共享的追溯报告。报告会标出未关联页面、孤立 PRD、失效章节锚点和本次 PRD 变化影响到的页面。

关联建议属于规则匹配结果，不等同于已理解业务语义的模型结论；低、中、高可信度都必须由项目负责人确认。静态生产包支持查看、分析和导出，但不允许修改页面关联。

## 文档中心机制

- 文档资料源由每个项目包的 `project.json.docs.root` 指定，支持项目包内相对路径，也支持本机可访问的绝对路径；新项目默认使用包内 `docs`。
- 开发环境由 Vite 插件按项目递归扫描；新增、删除或移动 Markdown 后会刷新对应项目目录。
- `npm run build` 会生成 `dist/projects/{project-id}/docs/manifest.json` 和文档内容。
- Markdown 内容经过 DOMPurify 过滤；Mermaid 仅在文档含流程图或时序图时按需加载。
- 生产环境展示的是最近一次构建时的文档快照，PRD 更新后需要重新构建并发布。

## 多语言机制

当前工程采用两套机制：

1. 统一外壳、首页、登录页和文档中心使用 Vue I18n 结构化 key。
2. 历史迁移业务页面保留简体中文原文，由 `legacy-localizer.js` 按精确文案从词库映射替换，并处理 Element Plus Teleport 弹窗。

- `src/i18n/catalog/zh-CN.json`：静态界面原文。
- `src/i18n/catalog/zh-TW.json`：离线 OpenCC 生成的繁体文案。
- `src/i18n/catalog/en-US.json`：英文静态文案。
- `src/i18n/legacy-localizer.js`：处理历史页面及 Element Plus Teleport 弹窗。

后续新页面只需完成简体中文页面，不要求同步繁中、英文词库，也不要求把全部页面文字改写为 `$t()`。只有明确提出某个页面需要翻译时，才执行 `npm run i18n:sync`、补充该页面目标语言并运行 `npm run audit:i18n`。

精确文案映射适合静态标题、按钮、表头、提示和常见属性，通常不需要改动原 Vue 页面。以下情况需要定点调整 Vue：包含变量的动态句子、同一中文文案在不同语境需要不同译法、ECharts/Canvas 内文字、由接口返回的业务内容，以及翻译后长度变化导致的布局问题。模拟数据、姓名、车牌、订单号和业务记录默认不翻译。

`npm run i18n:translate:english` 会调用公共翻译服务，因此脚本默认拒绝执行。仅在项目负责人明确允许发送静态界面文案后，设置 `ALLOW_PUBLIC_TRANSLATION=yes` 才可运行。

## 组件化底座

- `src/styles/tokens.css` 统一颜色、字号、间距、边框、圆角和控件尺寸。
- 工程主色只在 `src/styles/tokens.css` 定义，并统一驱动 Element Plus、Tailwind、CSS 和图表颜色；`npm run audit:theme` 用于阻止页面重新写死主色。
- `src/components/ui` 提供页面标题、内容面板、筛选栏、统计卡片、表格工具栏、分页、状态标签和弹窗底部。
- `src/composables` 提供分页、筛选重置、统计选择、弹窗状态和 ECharts 生命周期逻辑。
- `/components` 集中展示组件状态和交互，供新页面开发及评审使用。
- 历史迁移页面可使用 `PageHeader` 无样式模式接入公共页面结构，同时保持原页面视觉基线。

详细规则见 [COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md)。

## 页面迁移规则

需求阶段先复制 [templates/html-prototype-page.html](./templates/html-prototype-page.html) 创建可迁移 HTML。模板内已经写明可编辑范围和迁移标记；旧页面可以用于对齐既有视觉与交互，但不能直接复制其外壳、全局样式和启动代码。

页面定案后停止修改 HTML，再通过页面导入工具迁移到 Vue。HTML 原型仍是视觉和业务字段的核对来源。导出工具只生成客户演示运行包，不把运行包作为 Vue 源码再次导回。迁移页面必须：

- 只接入页面内容区及其同级弹窗、抽屉，不复制旧侧栏和旧顶栏。
- 保留源页面字段、模拟数据、按钮、表格、弹窗和交互。
- 使用统一 `AppShell`、路由和菜单。
- 页面专属状态留在页面组件；新项目确需跨页面共享的数据放在该项目包的 `data` 或项目级模块内。
- 页面写入前通过严格 SFC 编译，完成后运行 `npm run audit:views` 和 `npm run build`。

详细规则见 [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)。

导入导出工具的完整使用规则见 [PAGE_TRANSFER_GUIDE.md](./PAGE_TRANSFER_GUIDE.md)。

## 代码质量与 CI

```powershell
npm run lint          # ESLint：Vue 模板、脚本和工程底座
npm run format        # Prettier：仅格式化工程底座和公共组件
npm run format:check  # 检查格式，不写文件
npm run audit:all     # 页面、样式、组件、多语言和保真审计
npm run quality:check # Lint、格式、审计和生产构建
npm run ci:check      # 本地执行 CI 同级检查、组件单元测试和浏览器冒烟测试
```

历史迁移页面不执行 Prettier 批量格式化，ESLint 对其采用兼容规则；新页面和工程底座执行严格规则。仓库 CI 位于 `.github/workflows/prototype-quality.yml`，提交涉及本工程或 PRD 文档时会自动执行质量检查、构建、组件单元测试和浏览器冒烟测试。

## 自动化验收

- 路由冒烟测试自动扫描全部有效项目包及其 `page-definitions.js`，检查页面可见性、内容区和浏览器运行错误。
- 关键交互覆盖登录、客户端切换、退出、弹窗、抽屉、统计卡片、分页和文档搜索。
- 高频演示页面可建立固定视口的 Chromium 视觉基线。
- 已确认的视觉变更才允许执行 `npm run test:visual:update`，不得用更新基线掩盖页面回归。

完整规则见 [TESTING_GUIDE.md](./TESTING_GUIDE.md)。

## 验证状态

- 工程提供严格 SFC 编译、路由、菜单、外壳、弹窗和样式审计能力。
- 自动化测试覆盖公共组件、项目包扫描、路由冒烟、关键交互和视觉基线。
- 文档中心和移动端演示支持本地资源构建，不依赖外部 CDN。
- 生产构建和质量检查命令已纳入本地脚本及 GitHub Actions。

本工程不包含真实接口、身份认证、权限校验和数据持久化，不能作为生产系统直接部署。

## 版本记录

| 版本    | 日期       | 内容                                                                                                                               |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| v0.1.0  | 2026-07-10 | 建立 Vue 3 原型工程，统一客户端外壳、路由及页面迁移规范。                                                                          |
| v0.2.0  | 2026-07-11 | 完成基础客户端入口、登录页、路由审计和页面迁移规范。                                                                               |
| v0.3.0  | 2026-07-11 | 增加移动端入口、多语言框架、自适应滚动、路由按需加载和工程审计脚本。                                                               |
| v0.4.0  | 2026-07-11 | 增加 Vue 文档中心、PRD 自动扫描、Markdown 与 Mermaid 渲染及构建时文档发布。                                                        |
| v0.4.1  | 2026-07-11 | 明确新页面默认只开发简体中文，多语言改为按指定页面补充。                                                                           |
| v0.5.0  | 2026-07-11 | 建立 Playwright 路由冒烟、关键交互和视觉截图基线，补充自动化验收规范。                                                             |
| v0.6.0  | 2026-07-12 | 增加样式隔离审计、本地字体与演示图片、ECharts 生命周期治理、404 与全局异常兜底，并扩充自动化基线。                                 |
| v0.7.0  | 2026-07-12 | 建立设计变量、公共组件、Composables、组件规范页及无损迁移试点。                                                                    |
| v0.8.0  | 2026-07-12 | 增加新页面生成器、页面注册单一配置源、ESLint、Prettier 和 GitHub Actions 持续集成。                                                |
| v0.9.0  | 2026-07-12 | 扩充公共组件，升级组件规范页和新页面模板，覆盖列表、详情、反馈与表单结构。                                                         |
| v0.9.1  | 2026-07-13 | 接入 Vitest 组件单元测试，并纳入本地 CI 与 GitHub Actions。                                                                        |
| v0.10.0 | 2026-07-13 | 增加需求阶段可迁移 HTML 创建提示词，明确旧原型仅作视觉参照及 HTML 定案后单向迁移 Vue 的流程。                                      |
| v0.10.1 | 2026-07-13 | 增加可独立预览且可机械提取的 HTML 专用模板，作为后续需求阶段新原型的统一起点。                                                     |
| v0.10.2 | 2026-07-15 | 增加页面导入导出工具：规范 HTML 可导入 Vue 工程，已接入页面可按选择生成独立演示包。                                                |
| v0.10.3 | 2026-07-15 | 修正页面导出口径：单页输出独立 HTML，多页才输出仅含所选 HTML 的 ZIP，并补齐文件菜单跳转。                                          |
| v0.10.4 | 2026-07-15 | 导出演示 HTML 改用 CDN 加载公共依赖，避免把字体、Vue 和组件库整套内嵌造成文件过大。                                                |
| v0.10.5 | 2026-07-15 | 完成首个规范 HTML 导入页面验收，补充来源文件登记并修正导入页面的静态审计兼容性。                                                   |
| v0.10.6 | 2026-07-15 | 精简独立 HTML 导出运行时，移除全量多语言词库；新建订单实测由约 587 KB 降至约 66 KB。                                               |
| v0.10.7 | 2026-07-15 | 明确导出构建使用生产压缩，并压缩最终 HTML 外壳空白，进一步避免单页演示文件被无效格式撑大。                                         |
| v0.11.0 | 2026-07-16 | 改造为共用外壳与可插拔项目包：增加项目发现、动态入口和路由、项目主题与资源、项目级文档、项目化导入导出、空白项目模板和完整性校验。 |
| v0.11.1 | 2026-07-16 | 增加项目包首页显示管理；隐藏项目入口不会删除项目包，重新启用后可恢复首页选择。                                                     |
| v0.12.0 | 2026-07-17 | 增加开发模式 PRD 对照：页面关联 PRD，支持默认固定分屏、浮层、新窗口阅读和下载当前页面 Vue 源文件。                                 |
| v0.12.1 | 2026-07-17 | 将共用平台壳子独立为单独仓库；实际项目包改为本地独立保存，不纳入壳子仓库。                                                         |
| v0.12.2 | 2026-07-17 | 将开发模式改为共享平台配置，局域网访问者可读取同一份开发模式状态。                                                                 |
| v0.12.3 | 2026-07-17 | 将首页管理入口恢复为浏览器本地开关，与共享开发模式完全分离。                                                                       |
