//go:build ignore

package main

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/adaptor"
	qingfeng "github.com/buyfakett/qingfeng"
)

// @title Fiber 框架示例
// @version 1.0
// @description 使用 Fiber 框架的示例
// @host localhost:8080
// @BasePath /api

func main() {
	app := fiber.New()

	// 注册青锋文档
	app.Use("/doc", adaptor.HTTPHandler(qingfeng.HTTPHandler(qingfeng.Config{
		Title:        "Fiber API",
		Description:  "使用 Fiber 框架",
		Version:      "1.0.0",
		Host:         "localhost:8080",
		BasePath:     "/doc",
		AutoGenerate: true,
		EnableDebug:  true,
	})))

	// API 路由
	api := app.Group("/api")
	api.Get("/users", getUsers)
	api.Get("/health", getHealth)

	app.Listen(":8080")
}

// @Summary 获取用户列表
// @Tags User
// @Produce json
// @Success 200 {array} map[string]interface{}
// @Router /users [get]
func getUsers(c *fiber.Ctx) error {
	users := []map[string]interface{}{
		{"id": 1, "name": "张三"},
		{"id": 2, "name": "李四"},
	}
	return c.JSON(users)
}

// @Summary 健康检查
// @Tags System
// @Produce json
// @Success 200 {object} map[string]string
// @Router /health [get]
func getHealth(c *fiber.Ctx) error {
	return c.JSON(map[string]string{"status": "ok"})
}
