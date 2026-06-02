//go:build ignore

package main

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	qingfeng "github.com/buyfakett/qingfeng"
)

// @title Chi 框架示例
// @version 1.0
// @description 使用 Chi 框架的示例
// @host localhost:8080
// @BasePath /api

func main() {
	r := chi.NewRouter()

	// 注册青锋文档
	r.Handle("/doc/*", qingfeng.HTTPHandler(qingfeng.Config{
		Title:        "Chi API",
		Description:  "使用 Chi 框架",
		Version:      "1.0.0",
		Host:         "localhost:8080",
		BasePath:     "/doc",
		AutoGenerate: true,
		EnableDebug:  true,
	}))

	// API 路由
	r.Route("/api", func(r chi.Router) {
		r.Get("/users", getUsers)
		r.Get("/health", getHealth)
	})

	http.ListenAndServe(":8080", r)
}

// @Summary 获取用户列表
// @Tags User
// @Produce json
// @Success 200 {array} map[string]interface{}
// @Router /users [get]
func getUsers(w http.ResponseWriter, r *http.Request) {
	users := []map[string]interface{}{
		{"id": 1, "name": "张三"},
		{"id": 2, "name": "李四"},
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// @Summary 健康检查
// @Tags System
// @Produce json
// @Success 200 {object} map[string]string
// @Router /health [get]
func getHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
