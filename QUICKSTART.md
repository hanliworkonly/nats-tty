# 快速开始：5 分钟部署到 Cloudflare Pages

本指南帮助你在 5 分钟内将 NATS-TTY 部署到 Cloudflare Pages。

## 步骤 1：准备 Cloudflare 账户

1. 访问 [Cloudflare](https://dash.cloudflare.com/sign-up) 注册免费账户
2. 登录到 Cloudflare Dashboard

## 步骤 2：三种部署方式任选其一

### 🚀 方式 A：一键部署（最简单）

使用 Cloudflare Dashboard 直接部署：

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages** → **Create a project**
3. 选择 **Connect to Git** → 连接 GitHub → 选择 `nats-tty` 仓库
4. 配置构建：
   ```
   Build command: mkdir -p public && cp index.html styles.css app.js _headers public/
   Build output directory: public
   ```
5. 点击 **Save and Deploy**
6. 等待 2-3 分钟，完成！

访问：`https://nats-tty.pages.dev`

---

### 💻 方式 B：命令行部署（推荐给开发者）

```bash
# 1. 安装 Wrangler CLI
npm install -g wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. 部署（一行命令）
./deploy.sh
```

部署完成后会显示 URL。

---

### 🤖 方式 C：GitHub Actions 自动部署（推荐生产环境）

配置一次，以后每次推送代码自动部署：

#### 1. 获取 Cloudflare API Token

```bash
# 访问：https://dash.cloudflare.com/profile/api-tokens
# 点击 "Create Token" → "Edit Cloudflare Workers" 模板
# 权限：Account > Cloudflare Pages > Edit
# 复制生成的 Token
```

#### 2. 获取 Account ID

```bash
# 在 Cloudflare Dashboard 右侧边栏可以看到 "Account ID"
```

#### 3. 配置 GitHub Secrets

在 GitHub 仓库设置中添加：
- `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

添加两个 Secrets：
```
CLOUDFLARE_API_TOKEN = <你的 API Token>
CLOUDFLARE_ACCOUNT_ID = <你的 Account ID>
```

#### 4. 推送代码触发部署

```bash
git push origin main
```

完成！每次推送都会自动部署。

---

## 步骤 3：部署后端服务（必需）

前端部署后，需要部署后端才能连接串口。

### 方式 1：使用云服务器（推荐）

推荐使用：Digital Ocean, Vultr, Linode, AWS EC2, 腾讯云, 阿里云等

#### 快速部署脚本：

```bash
# SSH 连接到你的服务器后，运行：

# 1. 下载并运行一键安装脚本
curl -fsSL https://raw.githubusercontent.com/your-username/nats-tty/main/install-backend.sh | bash

# 2. 或手动安装：
sudo apt update && sudo apt install -y nodejs npm git

# 安装 NATS Server
curl -L https://github.com/nats-io/nats-server/releases/download/v2.10.9/nats-server-v2.10.9-linux-amd64.tar.gz -o nats-server.tar.gz
tar -xzf nats-server.tar.gz
sudo mv nats-server-v2.10.9-linux-amd64/nats-server /usr/local/bin/

# 克隆项目
git clone https://github.com/your-username/nats-tty.git /opt/nats-tty
cd /opt/nats-tty
npm install

# 启动 NATS Server
nats-server -js &

# 启动串口桥接服务
node serial-bridge.js
```

#### 配置 systemd 自动启动：

```bash
# 复制服务文件
sudo cp /opt/nats-tty/systemd/*.service /etc/systemd/system/

# 启动服务
sudo systemctl enable nats-server serial-bridge
sudo systemctl start nats-server serial-bridge

# 检查状态
sudo systemctl status nats-server
sudo systemctl status serial-bridge
```

### 方式 2：本地电脑（测试用）

```bash
# 安装 NATS Server
# macOS:
brew install nats-server

# Windows:
choco install nats-server

# Linux:
# 参考上面的服务器安装命令

# 启动服务
nats-server -js &
node serial-bridge.js
```

## 步骤 4：配置并使用

1. 打开浏览器访问：`https://nats-tty.pages.dev`

2. 填写 NATS 服务器地址：
   - 本地测试：`ws://localhost:4222`
   - 云服务器：`ws://your-server-ip:4222`
   - 生产环境：`wss://your-domain.com:4222` (使用 SSL)

3. 点击 **连接 NATS**

4. 配置串口参数并点击 **打开串口**

5. 开始发送和接收数据！

## 🔒 生产环境安全建议

如果要在生产环境使用，请务必：

### 1. 启用 NATS 认证

编辑 `/etc/nats-server.conf`:
```conf
authorization {
  user: "your_username"
  password: "your_strong_password"
}
```

在网页中填写用户名和密码。

### 2. 启用 SSL/TLS

```bash
# 安装 Certbot
sudo apt install certbot

# 获取免费 SSL 证书
sudo certbot certonly --standalone -d your-domain.com

# 更新 NATS 配置启用 TLS
```

在网页中使用 `wss://` 而不是 `ws://`

### 3. 配置防火墙

```bash
# 只允许必要的端口
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 4222/tcp # NATS
sudo ufw enable
```

## 📊 验证部署

### 前端验证

访问 `https://nats-tty.pages.dev`，应该看到登录界面。

### 后端验证

```bash
# 检查 NATS Server
curl http://your-server:8222/varz

# 检查串口桥接服务
sudo systemctl status serial-bridge
sudo journalctl -u serial-bridge -f
```

## 🎯 完整架构

```
浏览器
  ↓ HTTPS
Cloudflare Pages (前端)
  ↓ WebSocket
NATS Server (你的服务器)
  ↓ NATS Protocol
Serial Bridge Service (你的服务器)
  ↓ Serial Port
串口设备 (本地/远程)
```

## 💰 成本

- **Cloudflare Pages**: 完全免费（包含无限流量和 SSL）
- **VPS 服务器**: $5-10/月
- **域名**: $10-15/年（可选）

## 🆘 常见问题

### Q: 部署后显示 404

A: 等待 2-3 分钟让 DNS 传播，或清除浏览器缓存。

### Q: 无法连接到 NATS

A: 检查：
1. NATS Server 是否运行：`sudo systemctl status nats-server`
2. 防火墙是否开放 4222 端口
3. 浏览器控制台的错误信息

### Q: 串口无法打开

A: 检查：
1. 串口设备名称是否正确（Linux: `/dev/ttyUSB0`, Windows: `COM1`）
2. 用户权限：`sudo usermod -a -G dialout $USER`
3. Serial Bridge 日志：`sudo journalctl -u serial-bridge -f`

### Q: HTTPS 页面无法连接 WS://

A: HTTPS 页面只能连接 WSS://（加密的 WebSocket）。需要为 NATS Server 配置 SSL 证书。

## 📚 更多资源

- [完整部署文档](DEPLOYMENT.md)
- [README](README.md)
- [GitHub 仓库](https://github.com/your-username/nats-tty)

## 🎉 部署成功！

恭喜！你的 NATS-TTY 应用现在已经在 Cloudflare 的全球 CDN 上运行了。

接下来：
- 配置自定义域名
- 启用 SSL/TLS 加密
- 添加更多串口设备
- 自定义界面主题

祝使用愉快！
