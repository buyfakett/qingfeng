//go:build ignore

package main

import (
	"net/http"

	"github.com/labstack/echo/v4"
	qingfeng "github.com/buyfakett/qingfeng"
)

// @title Echo 框架示例
// @version 1.0
// @description 使用 Echo 框架的示例
// @host localhost:8080
// @BasePath /api

func main() {
	e := echo.New()

	// 注册青锋文档
	e.GET("/doc/*", echo.WrapHandler(qingfeng.HTTPHandler(qingfeng.Config{
		Title:        "Echo API",
		Description:  "使用 Echo 框架",
		Version:      "1.0.0",
		Host:         "localhost:8080",
		BasePath:     "/doc",
		AutoGenerate: true,
		EnableDebug:  true,
	})))

	// API 路由
	api := e.Group("/api")
	api.GET("/users", getUsers)
	api.GET("/health", getHealth)

	e.Start(":8080")
}

// @Summary 获取用户列表
// @Tags User
// @Produce json
// @Success 200 {array} map[string]interface{}
// @Router /users [get]
func getUsers(c echo.Context) error {
	users := []map[string]interface{}{
		{"id": 1, "name": "张三"},
		{"id": 2, "name": "李四"},
	}
	return c.JSON(http.StatusOK, users)
}

// @Summary 健康检查
// @Tags System
// @Produce json
// @Success 200 {object} map[string]string
// @Router /health [get]
func getHealth(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}
