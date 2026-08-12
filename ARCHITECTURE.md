# 工程架构

## 1. 分层原则

工程按“领域核心、运行时适配、界面应用、独立轻量外壳”分层：

```text
packages/project-core     项目包领域规则与纯 Node 文件能力
          ↑
plugins/                  Vite 开发接口、热更新与生产构建适配
scripts/project-cli.mjs   命令行入口
          ↑
packages/platform-client  框架无关的浏览器请求与响应归一化
          ↑
apps/platform-react/      React 正式平台、Ant Design、路由和浏览器状态

src/                      观察期保留的 Vue 回退平台

html-prototype-shell/     可整目录单独复制运行的独立 Node + HTML 工具
```

`packages/project-core` 不依赖 Vue、Vite、HTTP 或浏览器 API。插件只负责运行时协议，不重复实现项目包校验、文档扫描或关联配置规范化。

## 2. 轻量外壳边界

`html-prototype-shell` 必须保持完全自包含：复制该文件夹后，不需要主工程、Vue、Vite 或 npm 安装即可运行。因此它不导入 `packages/project-core` 的运行时代码。

主工程和轻量外壳通过以下方式保持一致：

- 使用相同的项目、文档和关联概念；
- 通过各自测试验证路径安全、扫描结果和 PRD 关联行为；
- 配置协议发生变化时，同时补充兼容测试；
- 不通过跨目录 import 破坏轻量外壳的可携带性。

## 3. 项目核心职责

`packages/project-core` 当前包含：

- 项目 Manifest、客户端、入口、主题和资源规则；
- `page-definitions.js` 的菜单、路由和页面文件校验；
- HTML 原型来源规范化；
- Markdown 文档清单生成；
- 页面级和功能级 PRD 关联配置规范化；
- JSON 原子写入、目录遍历和路径边界工具；
- 配置 Schema 版本及迁移注册入口。

机器可读契约位于 `packages/project-core/schemas`。JSON Schema 用于编辑器、外部工具和后续 MCP/CLI；运行时校验还会检查跨字段关系和本地文件是否存在。

## 4. Vite 插件职责

- `project-packages-plugin`：项目管理 HTTP 接口、资源读取、热更新和构建资产输出。
- `html-prototype-plugin`：HTML 原型扫描结果转换、内容区注入、开发读取和构建复制。
- `prd-content-plugin`：PRD HTTP 读取、变更通知和构建快照。
- `page-transfer-plugin`：HTML/Vue 页面导入、路由编辑、备份和导出。
- `platform-settings-plugin`：当前服务实例的开发模式配置。

插件不得包含 Vue 界面状态，也不应再次定义项目包基础 Schema。

## 5. CLI

统一入口：

```powershell
npm run project -- help
npm run project -- validate
npm run project -- init --id sample --name "示例项目"
npm run project -- migrate --project sample
npm run project -- serve --host 127.0.0.1 --port 5188
npm run project -- build-review --base /prototype/
```

`migrate` 默认只预览；添加 `--write` 才写回。`init` 遇到已有目录时拒绝覆盖。

## 6. 后续拆分顺序

1. 将 `page-transfer-plugin` 中的页面定义读写、备份和导出编排拆成领域服务。
2. 将 `ProjectRoutesView.vue` 的数据请求、分组排序和弹窗状态拆成 Composables。
3. 将 `ProjectPortal.vue` 的项目选择、入口构建和首页动作拆成统一状态模块。
4. 为 Schema v2 需求先增加迁移器和兼容测试，再修改项目包格式。
5. MCP 或其他自动化入口只能调用核心服务，不直接解析和改写项目文件。
