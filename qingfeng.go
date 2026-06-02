// Package qingfeng provides a beautiful Swagger UI replacement for Go web frameworks
// 青锋 - 青出于蓝，锋芒毕露
//
// 特性:
//   - 内置 OpenAPI 3.0 文档生成器，零外部依赖
//   - 支持 Swagger 2.0 和 OpenAPI 3.0/3.1 文档
//   - 多主题支持（default, minimal, modern）
//   - 在线调试、深色模式、多环境切换
//   - 兼容所有 Go Web 框架（Gin, Echo, Fiber, Chi 等）
package qingfeng

import (
	"embed"
	"encoding/json"
	"io/fs"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// Version is the current version of QingFeng
const Version = "2.0.0"

//go:embed ui/default/* ui/minimal/* ui/modern/* ui/assets/css/* ui/assets/webfonts/*
var uiFS embed.FS

// UITheme represents available UI themes
// UI 主题类型
type UITheme string

const (
	// ThemeDefault is the default theme (原默认主题)
	ThemeDefault UITheme = "default"
	// ThemeMinimal is a minimal/clean theme (简约主题)
	ThemeMinimal UITheme = "minimal"
	// ThemeModern is a modern theme with gradients (现代主题)
	ThemeModern UITheme = "modern"
)

// Header represents a custom HTTP header with key-value pair
// 自定义 HTTP 请求头
type Header struct {
	// Key is the header name (e.g., "Authorization", "X-API-Key")
	Key string `json:"key"`
	// Value is the header value (e.g., "Bearer xxx", "your-api-key")
	Value string `json:"value"`
}

// Environment represents a deployment environment configuration
// 环境配置
type Environment struct {
	// Name is the display name (e.g., "开发环境", "Production")
	Name string `json:"name"`
	// BaseURL is the API base URL for this environment
	BaseURL string `json:"baseUrl"`
}

// Config holds the configuration for QingFeng UI
// 青锋配置
type Config struct {
	// Title of the API documentation (API 文档标题)
	Title string
	// Description of the API (API 描述)
	Description string
	// Version of the API (API 版本)
	Version string
	// Host is the server host for documentation URL display (服务地址，用于显示文档 URL)
	// 例如: "localhost:8080" 或 "api.example.com"
	Host string
	// BasePath prefix for the documentation routes (文档路由前缀，默认 /doc)
	BasePath string
	// DocPath is the path to swagger.json/openapi.json file (文档文件路径)
	// 支持 Swagger 2.0 和 OpenAPI 3.0 格式
	DocPath string
	// DocJSON allows passing swagger spec directly as JSON bytes (直接传入文档 JSON)
	DocJSON []byte
	// EnableDebug enables the API debug/testing feature (启用在线调试功能)
	EnableDebug bool
	// DarkMode enables dark theme by default (默认启用深色模式)
	DarkMode bool
	// PersistParams enables saving debug parameters to sessionStorage (default: true)
	// 是否将调试参数保存到 sessionStorage（默认: true）
	PersistParams *bool
	// GlobalHeaders are custom headers that will be sent with every API request
	// 全局请求头，会在每个 API 请求中自动添加
	GlobalHeaders []Header
	// AutoGenerate automatically generates API documentation on startup
	// 启动时自动生成 API 文档（使用内置生成器，无需安装 swag CLI）
	AutoGenerate bool
	// SwagSearchDir is the directory to search for swagger comments (default: ".")
	// 搜索目录，默认为当前目录
	SwagSearchDir string
	// SwagOutputDir is the output directory for generated files (default: "./docs")
	// 输出目录，默认为 ./docs
	SwagOutputDir string
	// SwagArgs is deprecated, use AutoGenerate instead
	// Deprecated: 已废弃，内置生成器不需要额外参数
	SwagArgs []string
	// UITheme selects the UI theme: "default", "minimal", "modern" (UI 主题选择)
	UITheme UITheme
	// Logo is the URL or base64 of custom logo image (自定义 Logo)
	Logo string
	// LogoLink is the URL to navigate when clicking the logo (Logo 点击跳转链接)
	LogoLink string
	// Environments is a list of environment configurations for switching baseUrl
	// 环境配置列表，用于切换不同环境的 baseUrl
	Environments []Environment
}

// DefaultConfig returns a default configuration
func DefaultConfig() Config {
	return Config{
		Title:       "API Documentation",
		Description: "API Documentation powered by QingFeng (青锋)",
		Version:     "1.0.0",
		BasePath:    "/doc",
		EnableDebug: true,
		DarkMode:    false,
	}
}

// Handler returns a Gin handler for QingFeng UI
// 返回 Gin 框架的 handler，内部调用 HTTPHandler
func Handler(cfg Config) gin.HandlerFunc {
	httpHandler := HTTPHandler(cfg)

	return func(c *gin.Context) {
		httpHandler.ServeHTTP(c.Writer, c.Request)
	}
}

// RegisterRoutes registers QingFeng routes to a Gin router group
func RegisterRoutes(router *gin.RouterGroup, cfg Config) {
	handler := Handler(cfg)
	router.GET("/*filepath", handler)
}

// HTTPHandler returns a standard http.Handler for use with any Go web framework
// 返回标准 http.Handler，可用于任何 Go Web 框架
//
// 使用示例:
//   - 标准库: http.Handle("/doc/", qingfeng.HTTPHandler(cfg))
//   - Echo: e.GET("/doc/*", echo.WrapHandler(qingfeng.HTTPHandler(cfg)))
//   - Fiber: app.Use("/doc", adaptor.HTTPHandler(qingfeng.HTTPHandler(cfg)))
//   - Chi: r.Handle("/doc/*", qingfeng.HTTPHandler(cfg))
func HTTPHandler(cfg Config) http.Handler {
	if cfg.BasePath == "" {
		cfg.BasePath = "/doc"
	}

	// 获取文档 JSON（优先级：DocJSON > DocPath > 自动生成）
	var specJSON []byte
	if cfg.DocJSON != nil {
		specJSON = cfg.DocJSON
	} else if cfg.DocPath != "" {
		if data, err := os.ReadFile(cfg.DocPath); err == nil {
			specJSON = data
		}
	}

	// 如果启用自动生成且没有文档，则生成
	if cfg.AutoGenerate && specJSON == nil {
		if data, err := generateSpec(cfg); err == nil {
			specJSON = data
		}
	}

	// Prepare file servers for each theme
	defaultFS, _ := fs.Sub(uiFS, "ui/default")
	minimalFS, _ := fs.Sub(uiFS, "ui/minimal")
	modernFS, _ := fs.Sub(uiFS, "ui/modern")
	assetsFS, _ := fs.Sub(uiFS, "ui/assets")

	fileServers := map[string]http.Handler{
		"default": http.FileServer(http.FS(defaultFS)),
		"minimal": http.FileServer(http.FS(minimalFS)),
		"modern":  http.FileServer(http.FS(modernFS)),
	}
	assetsServer := http.FileServer(http.FS(assetsFS))

	// Default theme from config
	defaultTheme := string(cfg.UITheme)
	if defaultTheme == "" {
		defaultTheme = "default"
	}

	// PersistParams default to true
	persistParams := true
	if cfg.PersistParams != nil {
		persistParams = *cfg.PersistParams
	}

	// Prepare config JSON for frontend
	configJSON, _ := json.Marshal(map[string]interface{}{
		"title":           cfg.Title,
		"description":     cfg.Description,
		"version":         cfg.Version,
		"enableDebug":     cfg.EnableDebug,
		"darkMode":        cfg.DarkMode,
		"globalHeaders":   cfg.GlobalHeaders,
		"defaultTheme":    defaultTheme,
		"themes":          []string{"default", "minimal", "modern"},
		"qingfengVersion": Version,
		"logo":            cfg.Logo,
		"logoLink":        cfg.LogoLink,
		"environments":    cfg.Environments,
		"persistParams":   persistParams,
	})

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Remove base path prefix
		if cfg.BasePath != "" && cfg.BasePath != "/" {
			path = strings.TrimPrefix(path, cfg.BasePath)
		}
		if path == "" {
			path = "/"
		}

		// Get theme from query parameter or use default
		theme := r.URL.Query().Get("theme")
		if theme == "" {
			theme = defaultTheme
		}
		if _, ok := fileServers[theme]; !ok {
			theme = defaultTheme
		}

		// Serve swagger.json / openapi.json
		if path == "/swagger.json" || path == "/openapi.json" || path == "/api-docs" || path == "/doc.json" {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Access-Control-Allow-Origin", "*")
			if specJSON != nil {
				w.Write(specJSON)
				return
			}
			// 尝试从文件读取
			if cfg.DocPath != "" {
				if data, err := os.ReadFile(cfg.DocPath); err == nil {
					w.Write(data)
					return
				}
			}
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"error": "API documentation not found. Enable AutoGenerate or provide DocPath/DocJSON."}`))
			return
		}

		// Serve config
		if path == "/config.json" {
			w.Header().Set("Content-Type", "application/json")
			w.Write(configJSON)
			return
		}

		// Serve assets (CSS, fonts)
		if strings.HasPrefix(path, "/assets/") {
			r.URL.Path = strings.TrimPrefix(path, "/assets")
			assetsServer.ServeHTTP(w, r)
			return
		}

		// Serve static files using selected theme
		r.URL.Path = path
		fileServers[theme].ServeHTTP(w, r)
	})
}

// truncateString 截断字符串（按字符而非字节，正确处理中文）
func truncateString(s string, maxLen int) string {
	r := []rune(s)
	if len(r) <= maxLen {
		return s
	}
	return string(r[:maxLen-3]) + "..."
}
