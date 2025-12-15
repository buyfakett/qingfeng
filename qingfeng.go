// Package qingfeng provides a beautiful Swagger UI replacement for Go Gin framework
// 青锋 - 青出于蓝，锋芒毕露
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

//go:embed ui/dist/*
var uiFS embed.FS

// Header represents a custom HTTP header with key-value pair
// 自定义 HTTP 请求头
type Header struct {
	// Key is the header name (e.g., "Authorization", "X-API-Key")
	Key string `json:"key"`
	// Value is the header value (e.g., "Bearer xxx", "your-api-key")
	Value string `json:"value"`
}

// Config holds the configuration for knife4j UI
type Config struct {
	// Title of the API documentation
	Title string
	// Description of the API
	Description string
	// Version of the API
	Version string
	// BasePath prefix for the documentation routes
	BasePath string
	// DocPath is the path to swagger.json file (swagger.json 文件路径)
	DocPath string
	// DocJSON allows passing swagger spec directly as JSON bytes
	DocJSON []byte
	// EnableDebug enables the API debug/testing feature
	EnableDebug bool
	// DarkMode enables dark theme by default
	DarkMode bool
	// GlobalHeaders are custom headers that will be sent with every API request
	// 全局请求头，会在每个 API 请求中自动添加
	GlobalHeaders []Header
}

// DefaultConfig returns a default configuration
func DefaultConfig() Config {
	return Config{
		Title:       "API Documentation",
		Description: "API Documentation powered by QingFeng (青锋)",
		Version:     "1.0.0",
		BasePath:    "/doc",
		DocPath:     "./docs/swagger.json",
		EnableDebug: true,
		DarkMode:    false,
	}
}

// Handler returns a Gin handler group for knife4j UI
func Handler(cfg Config) gin.HandlerFunc {
	if cfg.BasePath == "" {
		cfg.BasePath = "/doc"
	}
	if cfg.DocPath == "" {
		cfg.DocPath = "./docs/swagger.json"
	}

	subFS, _ := fs.Sub(uiFS, "ui/dist")
	fileServer := http.FileServer(http.FS(subFS))

	// Prepare config JSON for frontend
	configJSON, _ := json.Marshal(map[string]interface{}{
		"title":         cfg.Title,
		"description":   cfg.Description,
		"version":       cfg.Version,
		"enableDebug":   cfg.EnableDebug,
		"darkMode":      cfg.DarkMode,
		"globalHeaders": cfg.GlobalHeaders,
	})

	return func(c *gin.Context) {
		path := c.Request.URL.Path

		// Remove base path prefix
		if cfg.BasePath != "" && cfg.BasePath != "/" {
			path = strings.TrimPrefix(path, cfg.BasePath)
		}

		// Serve swagger.json
		if path == "/swagger.json" || path == "/api-docs" {
			if cfg.DocJSON != nil {
				c.Data(http.StatusOK, "application/json", cfg.DocJSON)
				return
			}
			data, err := os.ReadFile(cfg.DocPath)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "swagger.json not found"})
				return
			}
			c.Data(http.StatusOK, "application/json", data)
			return
		}

		// Serve config
		if path == "/config.json" {
			c.Data(http.StatusOK, "application/json", configJSON)
			return
		}

		// Serve static files
		c.Request.URL.Path = path
		fileServer.ServeHTTP(c.Writer, c.Request)
	}
}

// RegisterRoutes registers knife4j routes to a Gin router group
func RegisterRoutes(router *gin.RouterGroup, cfg Config) {
	handler := Handler(cfg)
	router.GET("/*filepath", handler)
}
