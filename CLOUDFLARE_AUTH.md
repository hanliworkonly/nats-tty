# Cloudflare Pages 部署认证指南

## 当前状态

Wrangler CLI 已安装（v4.47.0），但需要进行 Cloudflare 认证才能部署。

## 认证方式

### 方式 1：使用 API Token（推荐）

#### 步骤 1：获取 API Token

1. 访问 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 "Create Token"
3. 使用 "Edit Cloudflare Workers" 模板
4. 配置权限：
   - Account → Cloudflare Pages → Edit
5. 点击 "Continue to summary" → "Create Token"
6. 复制生成的 Token

#### 步骤 2：使用 Token 部署

```bash
# 方法 A：设置环境变量
export CLOUDFLARE_API_TOKEN="your-api-token-here"
wrangler pages deploy public --project-name=nats-tty

# 方法 B：直接在命令中使用
CLOUDFLARE_API_TOKEN="your-api-token-here" wrangler pages deploy public --project-name=nats-tty
```

### 方式 2：使用 Account ID + API Token

如果需要更精确的控制：

```bash
export CLOUDFLARE_API_TOKEN="your-api-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
wrangler pages deploy public --project-name=nats-tty
```

Account ID 可以在 Cloudflare Dashboard 右侧边栏找到。

### 方式 3：交互式登录（需要浏览器）

```bash
wrangler login
```

这会打开浏览器进行 OAuth 认证。

## 快速部署命令

一旦设置好认证，运行：

```bash
# 使用部署脚本（已包含文件准备步骤）
./deploy.sh

# 或直接部署
wrangler pages deploy public --project-name=nats-tty
```

## 故障排除

### 错误：未认证

```
You are not authenticated. Please run `wrangler login`.
```

**解决方案**：设置 CLOUDFLARE_API_TOKEN 环境变量

### 错误：权限不足

```
Authentication error
```

**解决方案**：确保 API Token 有 "Cloudflare Pages - Edit" 权限

### 错误：项目不存在

首次部署时，Wrangler 会自动创建项目。如果遇到问题，可以先在 Cloudflare Dashboard 手动创建 Pages 项目。

## 完整部署流程

```bash
# 1. 设置 API Token
export CLOUDFLARE_API_TOKEN="your-token-here"

# 2. 确认登录状态
wrangler whoami

# 3. 部署
wrangler pages deploy public --project-name=nats-tty

# 4. 部署成功后会显示 URL
# 例如：https://nats-tty.pages.dev
```

## 后续步骤

部署成功后：

1. 访问显示的 URL 测试应用
2. 在 Cloudflare Dashboard 中绑定自定义域名（可选）
3. 配置 GitHub Actions 自动部署（可选）
4. 部署后端服务（必需）

## 自动化部署

为了避免每次都输入 Token，可以：

1. 将 Token 添加到 GitHub Secrets（用于 GitHub Actions）
2. 在本地 `.bashrc` 或 `.zshrc` 中导出环境变量
3. 使用 `.env` 文件（不要提交到 Git）

```bash
# .env 文件
CLOUDFLARE_API_TOKEN=your-token-here
CLOUDFLARE_ACCOUNT_ID=your-account-id
```

然后在部署前：
```bash
source .env
./deploy.sh
```
