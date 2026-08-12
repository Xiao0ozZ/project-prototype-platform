# Platform Client

共用平台的框架无关数据访问层。Vue 迁移期和 React 平台使用同一套请求、错误和响应规范化逻辑。

客户端通过构造参数接收 `fetch`、`baseUrl` 和运行环境，不依赖 Vue、React 或 Vite。静态部署的只读边界由客户端统一处理。
