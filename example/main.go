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
		Title:        "示例项目 API",
		Description:  "这是一个示例项目的API文档",
		Version:      "1.0.0",
		BasePath:     "/doc",
		DocPath:      "./docs/swagger.json",
		EnableDebug:  true,
		DarkMode:     false,
		AutoGenerate: true, // 启动时自动生成 swagger 文档，无需手动运行 swag init
	}))

	// API routes
	api := r.Group("/api/v1")
	{
		// 认证接口
		api.POST("/auth/login", login)
		api.POST("/auth/logout", logout)

		// 用户接口 (需要认证)
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

// LoginRequest 登录请求
type LoginRequest struct {
	Username string `json:"username" example:"admin"`
	Password string `json:"password" example:"123456"`
}

// LoginResponse 登录响应
type LoginResponse struct {
	Token     string `json:"token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
	ExpiresIn int    `json:"expires_in" example:"7200"`
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
// @Param Authorization header string true "Bearer Token"
// @Param id path int true "用户ID"
// @Success 200 {object} Response
// @Failure 404 {object} Response
// @Router /users/{id} [delete]
func deleteUser(c *gin.Context) {
	c.JSON(http.StatusOK, Response{Code: 200, Message: "删除成功"})
}

// @Summary 用户登录
// @Description 用户登录获取 Token
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body LoginRequest true "登录信息"
// @Success 200 {object} Response{data=LoginResponse}
// @Failure 400 {object} Response
// @Router /auth/login [post]
func login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, Response{Code: 400, Message: err.Error()})
		return
	}

	// 模拟验证 (实际项目中应该验证用户名密码)
	if req.Username == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, Response{Code: 400, Message: "用户名或密码不能为空"})
		return
	}

	// 返回模拟的 Token
	resp := LoginResponse{
		Token:     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwiZXhwIjoxNzM0NTAwMDAwfQ.qingfeng_mock_token",
		ExpiresIn: 7200,
	}
	c.JSON(http.StatusOK, Response{Code: 200, Message: "登录成功", Data: resp})
}

// @Summary 用户登出
// @Description 用户登出，使 Token 失效
// @Tags 认证
// @Produce json
// @Param Authorization header string true "Bearer Token"
// @Success 200 {object} Response
// @Router /auth/logout [post]
func logout(c *gin.Context) {
	c.JSON(http.StatusOK, Response{Code: 200, Message: "登出成功"})
}
