# 贡献指南

感谢你对青峰 Swagger 的关注！我们欢迎任何形式的贡献。

## 如何贡献

### 报告 Bug

如果你发现了 Bug，请在 [GitHub Issues](https://github.com/buyfakett/qingfeng/issues) 中提交，并包含：

- 问题描述
- 复现步骤
- 期望行为
- 实际行为
- 环境信息（Go 版本、操作系统等）
- 截图（如果有）

### 功能建议

欢迎提交功能建议！请在 Issue 中描述：

- 功能描述
- 使用场景
- 期望的实现方式

### 提交代码

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的修改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- Go 代码遵循 [Effective Go](https://golang.org/doc/effective_go.html)
- 使用 `gofmt` 格式化代码
- 添加必要的注释（中英文皆可）
- 前端代码保持简洁，避免引入额外依赖

### 提交信息规范

提交信息请遵循以下格式：

```
<type>: <description>

[optional body]
```

Type 类型：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

示例：
```
feat: 添加多环境切换功能
fix: 修复移动端侧边栏无法关闭的问题
docs: 更新 README 添加移动端截图
```

## 开发环境

### 前置要求

- Go 1.20+
- swag (`go install github.com/swaggo/swag/cmd/swag@latest`)

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/buyfakett/qingfeng.git
cd qingfeng

# 运行示例
cd example
go run main.go

# 访问 http://localhost:8080/doc/
```

### 项目结构

```
QingFeng/
├── qingfeng.go      # 主要代码
├── ui/              # 前端 UI
│   ├── default/     # 默认主题
│   ├── minimal/     # 简约主题
│   └── modern/      # 现代主题
├── example/         # 示例项目
├── screenshots/     # 截图
└── README.md
```

## 许可证

通过贡献代码，你同意你的贡献将按照 MIT 许可证进行授权。

## 联系方式

如有问题，可以通过以下方式联系：

- GitHub Issues
- Email: [your-email@example.com]

再次感谢你的贡献！🎉
