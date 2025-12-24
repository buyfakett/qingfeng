# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.2] - 2024-12-25

### Added
- 📁 **文件上传支持** - formData 类型的 file 参数现在显示文件选择器，支持选择本地文件上传 (#5)
- 🔧 **FormData 请求** - 自动检测文件参数，使用 multipart/form-data 发送请求
- 📋 **cURL 文件支持** - 复制 cURL 命令时正确处理文件参数 (-F 格式)

### Changed
- 优化参数输入区域，文件类型参数显示 "file" 标签

## [1.4.0] - 2024-12-24

### Added
- 📊 **响应结构展示** - 支持查看响应数据的 Model 结构，包含字段类型和注释 (#1)
- 📝 **请求体结构化** - 请求体 body 参数结构化展示，显示字段名、类型、必填、说明 (#2)
- ⚙️ **自定义 swag 参数** - 支持配置 SwagArgs 传入任意 swag init 参数 (#3)
- 📁 **多级目录** - 支持通过 tag 分隔符实现多级目录结构 (#4)

### Changed
- 请求体支持表单模式和 JSON 模式切换
- Example Value 和 Model 视图切换
- 修复 allOf 合并时 Example Value 显示为空的问题

### Contributors
- @JustGopher - 提出 #1, #2, #3, #4 issues

## [1.3.0] - 2024-12-22

### Added
- 🌍 **多环境支持** - 配置多个环境（开发/测试/生产），一键切换 baseUrl
- 📝 **请求体模板** - 保存常用的请求体为模板，快速加载
- 🎨 **自定义 Logo** - 支持配置自定义 Logo 和点击链接
- 📋 **复制 cURL** - 一键复制 cURL 命令到终端调试
- 🔄 **格式化切换** - JSON 响应格式化/压缩一键切换
- 📊 **响应头显示** - 查看完整的 HTTP 响应头
- 📦 **响应体折叠** - 大响应自动折叠，避免页面卡顿
- ✅ **必填校验** - 发送前自动检查必填参数
- 💾 **分组折叠记忆** - 记住接口分组的展开/折叠状态
- ⌨️ **快捷键支持** - Ctrl+K 聚焦搜索，Ctrl+Enter 发送请求

### Changed
- 版本号从后端注入，不再硬编码
- 优化移动端交互体验

## [1.2.0] - 2024-12-21

### Added
- 📱 **移动端适配** - 完美支持手机访问，抽屉式侧边栏
- 💾 **调试数据持久化** - 切换接口时保留输入的参数和响应
- ✨ **JSON 语法高亮** - 响应结果彩色显示
- 📋 **复制响应** - 一键复制 JSON 响应内容
- 🔔 **Toast 通知** - 操作反馈提示

### Changed
- UI 风格选择持久化到 localStorage
- 优化加载状态和错误提示

## [1.1.0] - 2024-12-20

### Added
- 🎨 **多主题支持** - Default、Minimal、Modern 三种 UI 风格
- 🌓 **深色模式** - 支持深色/浅色主题切换
- 🎯 **主题色** - 6 种主题色可选
- 🪄 **Token 自动提取** - 从响应中自动提取 Token
- 🔑 **全局请求头** - 配置全局 Headers

## [1.0.0] - 2024-12-19

### Added
- 🚀 初始版本发布
- 📖 Swagger UI 替代方案
- 🔍 接口搜索
- 🐛 在线调试
- 🔄 自动生成文档 (swag init)
