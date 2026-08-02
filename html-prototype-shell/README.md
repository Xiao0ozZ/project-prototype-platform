# HTML 原型外壳

这是一个独立的 HTML 原型浏览器，不依赖 Vue、Vite 或 npm 安装。

它只读取外部文件，不修改历史 HTML 和 PRD：

- 自动扫描 `config.json` 中的 HTML 原型目录；
- 左侧生成业务菜单，整体外观与后台业务页面保持一致；
- 中间用无边框全画布 iframe 保留原 HTML 的弹窗、表单和脚本交互；
- 加载页面时注入隔离样式，隐藏原页面菜单栏和顶部栏；
- PRD 默认关闭，需要时通过顶栏按钮在右侧展开；
- PRD 侧窗支持固定分屏、浮层、目录、正文搜索、前后匹配和新窗口打开；
- `bindings.json` 维护页面与 PRD 文件的关联；
- `page-rules.json` 维护少数特殊页面的内容根节点和隐藏规则；
- `Ctrl + Alt + M` 打开仅供本地维护的管理检查器；
- 多页 HTML 的原有相对链接继续在 iframe 内运行。

## 使用

1. 修改 `config.json`：

   - `prototypeRoot`：历史 HTML 原型根目录，必须填写相对于 `html-prototype-shell` 的路径；
   - `docsRoot`：PRD Markdown 根目录，必须填写相对于 `html-prototype-shell` 的路径；
   - `hideSelectors`：历史页面菜单栏和顶栏的 CSS 选择器；
   - `branding`：轻量外壳自己的项目名称、副标题和主题色；
   - `menu`：左侧业务菜单的分组方式、名称来源和标题精简规则；
   - `port`：外壳端口，默认 5190。

`branding` 示例：

```json
{
  "name": "RIMO Rental",
  "subtitle": "原型工作台",
  "themeColor": "#0879B0"
}
```

`menu` 示例：

```json
{
  "groupByFolder": true,
  "labelSource": "title",
  "compactTitle": true
}
```

默认按原型文件夹分组，菜单名称读取 HTML `<title>`，并自动去掉标题末尾的品牌后缀；完整页面标题仍保留在页面顶部和菜单悬浮提示中。

路径示例：如果服务器目录如下，配置应保持为相对路径：

```text
prototype-workspace/
├─ html-prototype-shell/
├─ 原型/
└─ PRD/
```

```json
{
  "prototypeRoot": "../原型",
  "docsRoot": "../PRD"
}
```

外壳服务会以 `server.mjs` 所在的 `html-prototype-shell` 目录为基准解析路径，并拒绝新的绝对路径配置。上传服务器时只要保持这个相对目录结构即可，不需要修改盘符。

2. 修改 `bindings.json`：

```json
[
  {
    "page": "营运端/dashboard.html",
    "document": "公务车/01_Dashboard.md",
    "anchor": "1. 页面范围",
    "title": "Dashboard PRD"
  }
]
```

同一个页面可以配置多条关联。标题栏会在多文档时显示选择器；`primary` 决定默认文档，`category` 用于分组，`order` 控制展示顺序：

```json
[
  {
    "page": "营运端/order_detail.html",
    "document": "门市租赁/订单/订单详情.md",
    "title": "门市租赁 · 订单详情",
    "primary": true,
    "category": "页面主 PRD",
    "order": 1
  },
  {
    "page": "营运端/order_detail.html",
    "document": "门市租赁/订单/订单取车.md",
    "title": "订单取车",
    "category": "履约流程",
    "order": 2
  }
]
```

3. 双击 `start-shell.cmd`。
4. 打开 `http://127.0.0.1:5190`。

页面关联配置和外壳代码都在当前文件夹内，历史 HTML、Vue 工程和 PRD 文件不会被写入。

## 本地管理模式

正常打开时只有页面与 PRD 阅读能力，不显示管理入口。按 `Ctrl + Alt + M` 后可以：

> `Ctrl + Shift + M` 会与 Chrome 的用户切换快捷键冲突，因此不建议继续使用。旧组合仍保留网页端兼容监听，但浏览器可能不会把该按键事件交给网页。

- 查看失效关联、重复主 PRD、未关联页面和未使用文档；
- 为当前页面新增、编辑、排序或删除 PRD 关联；
- 配置当前页面的内容根节点、额外隐藏区域和全局规则排除项；
- 配置外壳左上角项目名称、副标题和主题色；
- 配置左侧菜单是否按文件夹分组、菜单名称来源和标题精简规则；
- 查看内容区识别结果、资源加载错误和脚本异常；
- 临时查看未经外壳处理的原始 HTML，或要求页面重新执行布局适配。

管理操作只写入 `bindings.json`、`page-rules.json` 和外壳自己的 `config.json`。写入接口仅监听本机，并要求外壳管理请求标记；它不是面向公网的账号权限系统。

页面级规则示例：

```json
{
  "营运端/order_detail.html": {
    "contentRoot": ".main-content",
    "layoutMode": "content",
    "hideSelectors": [".legacy-header"],
    "excludeGlobalSelectors": [".topbar"]
  }
}
```

大多数页面应继续使用自动识别，只为结构特殊或自动识别不稳定的页面增加规则。

## 维护与检查

- 修改 `public`、关联配置或目录配置后刷新浏览器即可生效；修改 `server.mjs` 或 `config.json` 中的端口后请重启外壳服务。
- “重新扫描页面”会强制更新 HTML、PRD 元数据和关联配置；日常请求会复用未变化文件的扫描结果。
- 外壳只接受本机 GET 请求，文件路径会限制在 `prototypeRoot`、`docsRoot` 和外壳公共目录内。
- 提交代码前可在本目录的上级工程中执行：

```powershell
node --test html-prototype-shell/tests/server.test.mjs
npx eslint html-prototype-shell
```
