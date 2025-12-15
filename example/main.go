package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	qingfeng "github.com/delfDog/QingFeng"
)

// @title Example API
// @version 1.0
// @description This is a sample server.
// @host localhost:8080
// @BasePath /api/v1

func main() {
	r := gin.Default()

	// Register QingFeng documentation UI (注册青锋文档 UI)
	r.GET("/doc/*any", qingfeng.Handler(qingfeng.Config{
		Title:       "示例项目 API",
		Description: "这是一个示例项目的API文档",
		Version:     "1.0.0",
		BasePath:    "/doc",
		DocPath:     "./docs/swagger.json",
		EnableDebug: true,
		DarkMode:    false,
		// 可选：预设全局请求头，用户也可以在 UI 上动态配置
		// GlobalHeaders: []qingfeng.Header{
		// 	{Key: "Authorization", Value: "Bearer your-token-here"},
		// },
	}))

	// API routes
	api := r.Group("/api/v1")
	{
		api.GET("/users", getUsers)
		api.GET("/users/:id", getUser)
		api.POST("/users", createUser)
		api.PUT("/users/:id", updateUser)
		api.DELETE("/users/:id", deleteUser)
	}

	r.Run(":8080")
}

// User model
type User struct {
	ID    int    `json:"id" example:"1"`
	Name  string `json:"name" example:"张三"`
	Email string `json:"email" example:"zhangsan@example.com"`
	Age   int    `json:"age" example:"25"`
}

// Response model
type Response struct {
	Code    int         `json:"code" example:"200"`
	Message string      `json:"message" example:"success"`
	Data    interface{} `json:"data"`
}

// @Summary 获取用户列表
// @Description 获取所有用户的列表
// @Tags 用户管理
// @Accept json
// @Produce json
// @Param page query int false "页码" default(1)
// @Param size query int false "每页数量" default(10)
// @Success 200 {object} Response{data=[]User}
// @Router /users [get]
func getUsers(c *gin.Context) {
	users := []User{
		{ID: 1, Name: "张三", Email: "zhangsan@example.com", Age: 25},
		{ID: 2, Name: "李四", Email: "lisi@example.com", Age: 30},
	}
	c.JSON(http.StatusOK, Response{Code: 200, Message: "success", Data: users})
}

// @Summary 获取单个用户
// @Description 根据ID获取用户详情
// @Tags 用户管理
// @Accept json
// @Produce json
// @Param id path int true "用户ID"
// @Success 200 {object} Response{data=User}
// @Failure 404 {object} Response
// @Router /users/{id} [get]
func getUser(c *gin.Context) {
	user := User{ID: 1, Name: "张三", Email: "zhangsan@example.com", Age: 25}
	c.JSON(http.StatusOK, Response{Code: 200, Message: "success", Data: user})
}

// @Summary 创建用户
// @Description 创建一个新用户
// @Tags 用户管理
// @Accept json
// @Produce json
// @Param user body User true "用户信息"
// @Success 200 {object} Response{data=User}
// @Failure 400 {object} Response
// @Router /users [post]
func createUser(c *gin.Context) {
	var user User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, Response{Code: 400, Message: err.Error()})
		return
	}
	user.ID = 3
	c.JSON(http.StatusOK, Response{Code: 200, Message: "success", Data: user})
}

// @Summary 更新用户
// @Description 更新用户信息
// @Tags 用户管理
// @Accept json
// @Produce json
// @Param id path int true "用户ID"
// @Param user body User true "用户信息"
// @Success 200 {object} Response{data=User}
// @Failure 400 {object} Response
// @Router /users/{id} [put]
func updateUser(c *gin.Context) {
	var user User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, Response{Code: 400, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, Response{Code: 200, Message: "success", Data: user})
}

// @Summary 删除用户
// @Description 删除指定用户
// @Tags 用户管理
// @Accept json
// @Produce json
// @Param id path int true "用户ID"
// @Success 200 {object} Response
// @Failure 404 {object} Response
// @Router /users/{id} [delete]
func deleteUser(c *gin.Context) {
	c.JSON(http.StatusOK, Response{Code: 200, Message: "删除成功"})
}
