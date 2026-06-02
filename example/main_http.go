//go:build ignore

package main

import (
	"encoding/json"
	"log"
	"net/http"

	qingfeng "github.com/buyfakett/qingfeng"
)

// @title 标准库 HTTP 示例
// @version 1.0
// @description 使用 net/http 标准库的示例
// @host localhost:8080
// @BasePath /api

func main() {
	mux := http.NewServeMux()

	// 注册青锋文档
	mux.Handle("/doc/", qingfeng.HTTPHandler(qingfeng.Config{
		Title:        "标准库 HTTP API",
		Description:  "使用 net/http 标准库",
		Version:      "1.0.0",
		Host:         "localhost:8080",
		BasePath:     "/doc",
		AutoGenerate: true,
		EnableDebug:  true,
	}))

	// API 路由
	mux.HandleFunc("/api/users", handleUsers)
	mux.HandleFunc("/api/health", handleHealth)

	log.Println("Server starting on :8080")
	http.ListenAndServe(":8080", mux)
}

// @Summary 获取用户列表
// @Tags User
// @Produce json
// @Success 200 {array} map[string]interface{}
// @Router /users [get]
func handleUsers(w http.ResponseWriter, r *http.Request) {
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
func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
