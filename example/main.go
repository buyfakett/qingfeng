package main

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	qingfeng "github.com/buyfakett/qingfeng"
)

// @title Example API
// @version 1.0
// @description This is a sample server.
// @host localhost:8080
// @BasePath /api/v1

func main() {
	r := gin.Default()

	// 注册青锋文档 UI
	// 方式1: 使用内置生成器（推荐，零依赖）
	r.GET("/doc/*any", qingfeng.Handler(qingfeng.Config{
		Title:        "示例项目 API",
		Description:  "这是一个示例项目的 API 文档 - 使用内置生成器自动生成 OpenAPI 3.0",
		Version:      "2.0.0",
		BasePath:     "/doc",
		AutoGenerate: true, // 启用内置生成器，无需安装 swag CLI
		EnableDebug:  true,
		UITheme:      qingfeng.ThemeModern,

		// 多环境配置（可选）
		Environments: []qingfeng.Environment{
			{Name: "本地开发", BaseURL: "/api/v1"},
			{Name: "测试环境", BaseURL: "https://test-api.example.com/api/v1"},
			{Name: "生产环境", BaseURL: "https://api.example.com/api/v1"},
		},
	}))

	// 方式2: 使用已有的 swagger.json 文件
	// r.GET("/doc/*any", qingfeng.Handler(qingfeng.Config{
	// 	DocPath: "./docs/swagger.json",
	// }))

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
		
		// 节点分组接口
		api.POST("/node/groups", createNodeGroup)
		
		// 文件上传接口
		api.POST("/upload/avatar", uploadAvatar)
		api.POST("/upload/files", uploadFiles)
		
		// 文件下载接口
		api.GET("/download/pdf", downloadPDF)
		api.GET("/download/excel", downloadExcel)
		api.GET("/download/image", downloadImage)
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
// @Tags Admin-User
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
// @Tags Admin-User
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
// @Tags Admin-User
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
// @Tags Admin-User
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
// @Tags Admin-User
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
// @Tags Admin-Auth
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
// @Tags Admin-Auth
// @Produce json
// @Param Authorization header string true "Bearer Token"
// @Success 200 {object} Response
// @Router /auth/logout [post]
func logout(c *gin.Context) {
	c.JSON(http.StatusOK, Response{Code: 200, Message: "登出成功"})
}

// NodeGroupRequest 节点分组请求
type NodeGroupRequest struct {
	GroupName string `json:"group_name" example:"测试分组"`
	RouteType int    `json:"route_type" example:"1" enums:"0,1"`
	Enabled   bool   `json:"enabled" example:"true"`
	AutoStart bool   `json:"auto_start" example:"false"`
}

// @Summary 创建节点分组
// @Description 创建一个新的节点分组，route_type: 0-普通路线, 1-优质路线
// @Tags Node
// @Accept json
// @Produce json
// @Param enable header bool true "true-启动长连接，false-停止长连接" Enums(true, false) default(true)
// @Param status header string true "启用状态" Enums(t1, t2, t3) default(t2)
// @Param debug header bool false "调试模式" default(true)
// @Param request body NodeGroupRequest true "分组信息"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Router /node/groups [post]
func createNodeGroup(c *gin.Context) {
	var req NodeGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, Response{Code: 400, Message: "参数错误: " + err.Error()})
		return
	}
	
	// 验证 route_type 必须是数字类型
	c.JSON(http.StatusOK, Response{
		Code:    200,
		Message: "创建成功",
		Data: map[string]interface{}{
			"group_name":      req.GroupName,
			"route_type":      req.RouteType,
			"route_type_type": fmt.Sprintf("%T", req.RouteType),
		},
	})
}

// UploadResponse 上传响应
type UploadResponse struct {
	Filename string `json:"filename" example:"avatar.png"`
	Size     int64  `json:"size" example:"102400"`
	URL      string `json:"url" example:"https://example.com/uploads/avatar.png"`
}

// @Summary 上传头像
// @Description 上传用户头像图片
// @Tags Upload
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "头像文件"
// @Param user_id formData int true "用户ID"
// @Success 200 {object} Response{data=UploadResponse}
// @Failure 400 {object} Response
// @Router /upload/avatar [post]
func uploadAvatar(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{Code: 400, Message: "请选择文件: " + err.Error()})
		return
	}
	
	userID := c.PostForm("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, Response{Code: 400, Message: "用户ID不能为空"})
		return
	}
	
	resp := UploadResponse{
		Filename: file.Filename,
		Size:     file.Size,
		URL:      "https://example.com/uploads/" + file.Filename,
	}
	c.JSON(http.StatusOK, Response{Code: 200, Message: "上传成功", Data: resp})
}

// @Summary 批量上传文件
// @Description 批量上传多个文件
// @Tags Upload
// @Accept multipart/form-data
// @Produce json
// @Param files formData file true "文件列表"
// @Param description formData string false "文件描述"
// @Success 200 {object} Response{data=[]UploadResponse}
// @Failure 400 {object} Response
// @Router /upload/files [post]
func uploadFiles(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{Code: 400, Message: "解析表单失败: " + err.Error()})
		return
	}
	
	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, Response{Code: 400, Message: "请选择文件"})
		return
	}
	
	var results []UploadResponse
	for _, file := range files {
		results = append(results, UploadResponse{
			Filename: file.Filename,
			Size:     file.Size,
			URL:      "https://example.com/uploads/" + file.Filename,
		})
	}
	
	c.JSON(http.StatusOK, Response{Code: 200, Message: "上传成功", Data: results})
}

// @Summary 下载PDF文件
// @Description 下载示例PDF文件
// @Tags Download
// @Produce application/pdf
// @Success 200 {file} file "PDF文件"
// @Router /download/pdf [get]
func downloadPDF(c *gin.Context) {
	// 模拟生成一个简单的PDF内容
	pdfContent := []byte("%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n199\n%%EOF")
	
	c.Header("Content-Disposition", "attachment; filename=example.pdf")
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Length", fmt.Sprintf("%d", len(pdfContent)))
	c.Data(http.StatusOK, "application/pdf", pdfContent)
}

// @Summary 下载Excel文件
// @Description 下载示例Excel文件
// @Tags Download
// @Produce application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
// @Param filename query string false "文件名" default(data.xlsx)
// @Success 200 {file} file "Excel文件"
// @Router /download/excel [get]
func downloadExcel(c *gin.Context) {
	filename := c.DefaultQuery("filename", "data.xlsx")
	
	// 模拟Excel文件内容（实际项目中应该使用excelize等库生成）
	excelContent := []byte("PK\x03\x04 Excel mock content for testing file download")
	
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Length", fmt.Sprintf("%d", len(excelContent)))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelContent)
}

// @Summary 下载图片
// @Description 下载示例图片文件
// @Tags Download
// @Produce image/png
// @Success 200 {file} file "图片文件"
// @Router /download/image [get]
func downloadImage(c *gin.Context) {
	// 1x1 透明PNG图片
	pngContent := []byte{
		0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
		0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
		0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
		0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
		0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
	}
	
	c.Header("Content-Disposition", "attachment; filename=example.png")
	c.Header("Content-Type", "image/png")
	c.Header("Content-Length", fmt.Sprintf("%d", len(pngContent)))
	c.Data(http.StatusOK, "image/png", pngContent)
}
