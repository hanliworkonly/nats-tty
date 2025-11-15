# Cloudflare Pages 部署指南

本文档提供 NATS-TTY 应用部署到 Cloudflare Pages 的详细步骤。

## 目录

1. [前提条件](#前提条件)
2. [方法一：GitHub Actions 自动部署](#方法一github-actions-自动部署)
3. [方法二：Wrangler CLI 手动部署](#方法二wrangler-cli-手动部署)
4. [方法三：Cloudflare Dashboard 部署](#方法三cloudflare-dashboard-部署)
5. [后端服务部署](#后端服务部署)
6. [自定义域名配置](#自定义域名配置)
7. [故障排除](#故障排除)

## 前提条件

- Cloudflare 账户（免费账户即可）
- GitHub 账户（用于 GitHub Actions 部署）
- Node.js 14+ （用于运行后端服务）
- 可公网访问的服务器（用于运行 NATS 服务器和串口桥接服务）

## 方法一：GitHub Actions 自动部署

这是最推荐的方法，每次推送代码到主分支时自动部署。

### 1. 获取 Cloudflare API Token

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 点击右上角头像 → "My Profile"
3. 选择 "API Tokens"
4. 点击 "Create Token"
5. 使用 "Edit Cloudflare Workers" 模板
6. 配置权限：
   - Account → Cloudflare Pages → Edit
7. 点击 "Continue to summary" → "Create Token"
8. 复制生成的 Token（只显示一次）

### 2. 获取 Cloudflare Account ID

1. 在 Cloudflare Dashboard 主页
2. 选择任意域名
3. 右侧边栏可以看到 "Account ID"
4. 复制该 ID

### 3. 配置 GitHub Secrets

1. 进入你的 GitHub 仓库
2. 点击 "Settings" → "Secrets and variables" → "Actions"
3. 点击 "New repository secret" 添加以下两个密钥：
   - Name: `CLOUDFLARE_API_TOKEN`, Value: 步骤 1 中获取的 Token
   - Name: `CLOUDFLARE_ACCOUNT_ID`, Value: 步骤 2 中获取的 Account ID

### 4. 推送代码触发部署

```bash
git add .
git commit -m "Setup Cloudflare Pages deployment"
git push origin main
```

推送后，GitHub Actions 会自动运行部署工作流。

### 5. 查看部署状态

- 在 GitHub 仓库的 "Actions" 标签页查看工作流运行状态
- 在 Cloudflare Dashboard 的 "Pages" 部分查看部署详情

## 方法二：Wrangler CLI 手动部署

适合快速测试和本地部署。

### 1. 安装 Wrangler

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

这会打开浏览器进行授权。

### 3. 运行部署脚本

```bash
./deploy.sh
```

或手动部署：

```bash
# 准备文件
mkdir -p public
cp index.html styles.css app.js _headers public/

# 部署
wrangler pages deploy public --project-name=nats-tty
```

### 4. 访问部署的应用

部署成功后，终端会显示部署的 URL，通常是：
```
https://nats-tty.pages.dev
```

## 方法三：Cloudflare Dashboard 部署

通过 Cloudflare 网页界面连接 GitHub 仓库。

### 1. 创建 Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择 "Pages"
3. 点击 "Create a project"
4. 选择 "Connect to Git"

### 2. 连接 GitHub 仓库

1. 授权 Cloudflare 访问你的 GitHub
2. 选择 `nats-tty` 仓库
3. 点击 "Begin setup"

### 3. 配置构建设置

- **Project name**: nats-tty
- **Production branch**: main 或 master
- **Build command**: `mkdir -p public && cp index.html styles.css app.js _headers public/`
- **Build output directory**: `public`
- **Root directory**: `/`（留空或 /）

### 4. 部署

点击 "Save and Deploy"，等待部署完成。

## 后端服务部署

前端部署到 Cloudflare Pages 后，还需要部署后端服务。

### 1. 准备服务器

需要一台可公网访问的 Linux 服务器（VPS），推荐配置：
- CPU: 1 核
- RAM: 512MB+
- 系统: Ubuntu 20.04+ / Debian 11+

### 2. 安装依赖

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 NATS Server
curl -L https://github.com/nats-io/nats-server/releases/download/v2.10.9/nats-server-v2.10.9-linux-amd64.tar.gz -o nats-server.tar.gz
tar -xzf nats-server.tar.gz
sudo mv nats-server-v2.10.9-linux-amd64/nats-server /usr/local/bin/
```

### 3. 克隆项目

```bash
cd /opt
sudo git clone https://github.com/your-username/nats-tty.git
cd nats-tty
sudo npm install
```

### 4. 配置 NATS 服务器

创建 `/etc/nats-server.conf`:

```conf
port: 4222
http_port: 8222

websocket {
  port: 4222
  no_tls: true
  # 生产环境建议启用 TLS
  # tls {
  #   cert_file: "/etc/letsencrypt/live/your-domain.com/fullchain.pem"
  #   key_file: "/etc/letsencrypt/live/your-domain.com/privkey.pem"
  # }
}

# 启用认证（建议）
authorization {
  user: "your_username"
  password: "your_strong_password"
}

# JetStream（可选）
jetstream {
  store_dir: "/var/lib/nats"
  max_memory_store: 1GB
  max_file_store: 10GB
}
```

### 5. 创建 systemd 服务

**NATS Server 服务** (`/etc/systemd/system/nats-server.service`):

```ini
[Unit]
Description=NATS Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/nats-server -c /etc/nats-server.conf
Restart=always
RestartSec=5
User=nats
Group=nats

[Install]
WantedBy=multi-user.target
```

**Serial Bridge 服务** (`/etc/systemd/system/serial-bridge.service`):

```ini
[Unit]
Description=NATS Serial Bridge Service
After=network.target nats-server.service
Requires=nats-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/nats-tty
Environment="NATS_SERVER=localhost:4222"
ExecStart=/usr/bin/node serial-bridge.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 6. 启动服务

```bash
# 创建 NATS 用户
sudo useradd -r -s /bin/false nats
sudo mkdir -p /var/lib/nats
sudo chown nats:nats /var/lib/nats

# 启动 NATS Server
sudo systemctl enable nats-server
sudo systemctl start nats-server
sudo systemctl status nats-server

# 启动 Serial Bridge
sudo systemctl enable serial-bridge
sudo systemctl start serial-bridge
sudo systemctl status serial-bridge
```

### 7. 配置防火墙

```bash
# 允许 NATS 端口
sudo ufw allow 4222/tcp
sudo ufw allow 8222/tcp
sudo ufw enable
```

### 8. 配置 SSL/TLS（生产环境强烈建议）

使用 Let's Encrypt 获取免费 SSL 证书：

```bash
# 安装 Certbot
sudo apt install certbot

# 获取证书（需要域名）
sudo certbot certonly --standalone -d your-nats-domain.com

# 证书路径
# 证书: /etc/letsencrypt/live/your-nats-domain.com/fullchain.pem
# 私钥: /etc/letsencrypt/live/your-nats-domain.com/privkey.pem
```

然后更新 `/etc/nats-server.conf` 启用 TLS。

## 自定义域名配置

### 1. 在 Cloudflare Pages 中添加域名

1. 进入 Cloudflare Pages 项目
2. 点击 "Custom domains"
3. 点击 "Set up a custom domain"
4. 输入你的域名（例如：`nats-tty.example.com`）
5. Cloudflare 会自动配置 DNS

### 2. 验证域名

如果域名已在 Cloudflare 管理：
- DNS 记录会自动创建
- HTTPS 证书自动配置

如果域名不在 Cloudflare：
- 添加提供的 CNAME 记录到你的 DNS 提供商
- 等待 DNS 传播（可能需要几分钟到几小时）

### 3. 访问应用

配置完成后，通过自定义域名访问应用。

## 故障排除

### 部署失败

**问题**: GitHub Actions 部署失败

**解决方案**:
- 检查 Secrets 是否正确配置
- 验证 API Token 权限
- 查看 Actions 日志获取详细错误信息

### 无法连接 NATS

**问题**: 浏览器无法连接到 NATS 服务器

**解决方案**:
- 确认 NATS 服务器正在运行：`systemctl status nats-server`
- 检查防火墙规则
- 确认浏览器支持 WebSocket
- 检查浏览器控制台错误信息
- 如果使用 HTTPS 页面，NATS 也必须使用 WSS（TLS）

### 串口权限问题

**问题**: 串口无法打开，权限被拒绝

**解决方案**:
```bash
# 将服务运行用户添加到 dialout 组
sudo usermod -a -G dialout $USER

# 或修改串口设备权限
sudo chmod 666 /dev/ttyUSB0

# 重启服务
sudo systemctl restart serial-bridge
```

### CORS 错误

**问题**: 浏览器显示 CORS 错误

**解决方案**:
- Cloudflare Pages 已配置 CORS 头（在 `_headers` 文件中）
- 如果问题仍存在，检查 NATS 服务器配置
- 确保使用 HTTPS 访问页面

## 监控和维护

### 查看日志

```bash
# NATS Server 日志
sudo journalctl -u nats-server -f

# Serial Bridge 日志
sudo journalctl -u serial-bridge -f
```

### 更新应用

```bash
# 拉取最新代码
cd /opt/nats-tty
sudo git pull

# 重启服务
sudo systemctl restart serial-bridge
```

### 备份配置

定期备份重要配置文件：
- `/etc/nats-server.conf`
- `/etc/systemd/system/nats-server.service`
- `/etc/systemd/system/serial-bridge.service`

## 性能优化

### Cloudflare 缓存

Cloudflare Pages 会自动缓存静态资源。`_headers` 文件已配置了合适的缓存策略。

### NATS 优化

对于高并发场景，在 `nats-server.conf` 中调整：

```conf
max_connections: 1000
max_payload: 1048576
```

## 安全建议

1. **启用 NATS 认证**: 在生产环境必须启用
2. **使用 TLS/SSL**: NATS 和网页都应使用加密连接
3. **限制串口访问**: 只允许必要的串口设备
4. **定期更新**: 保持系统和依赖包最新
5. **监控日志**: 定期检查异常访问

## 成本估算

- **Cloudflare Pages**: 免费（包含无限流量）
- **VPS 服务器**: $5-10/月（Digital Ocean, Vultr, Linode 等）
- **域名**: $10-15/年（可选）

总计：约 $5-10/月（不包括域名）

## 支持

如有问题，请提交 Issue 到 GitHub 仓库。
