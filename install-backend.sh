#!/bin/bash

# NATS-TTY 后端一键安装脚本
# 适用于 Ubuntu 20.04+ / Debian 11+

set -e

echo "========================================"
echo "  NATS-TTY 后端服务一键安装"
echo "========================================"
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "错误: 请使用 root 权限运行此脚本"
    echo "使用: sudo $0"
    exit 1
fi

# 检查系统
if [ ! -f /etc/os-release ]; then
    echo "错误: 无法检测操作系统"
    exit 1
fi

source /etc/os-release

echo "检测到系统: $PRETTY_NAME"
echo ""

# 更新系统
echo "步骤 1/6: 更新系统包..."
apt update && apt upgrade -y

# 安装 Node.js
echo ""
echo "步骤 2/6: 安装 Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo "✓ Node.js $NODE_VERSION 已安装"
echo "✓ npm $NPM_VERSION 已安装"

# 安装 NATS Server
echo ""
echo "步骤 3/6: 安装 NATS Server..."
NATS_VERSION="v2.10.9"
if ! command -v nats-server &> /dev/null; then
    cd /tmp
    wget -q https://github.com/nats-io/nats-server/releases/download/${NATS_VERSION}/nats-server-${NATS_VERSION}-linux-amd64.tar.gz
    tar -xzf nats-server-${NATS_VERSION}-linux-amd64.tar.gz
    mv nats-server-${NATS_VERSION}-linux-amd64/nats-server /usr/local/bin/
    rm -rf nats-server-${NATS_VERSION}-linux-amd64*
fi

NATS_VER=$(nats-server --version)
echo "✓ NATS Server 已安装: $NATS_VER"

# 克隆或更新项目
echo ""
echo "步骤 4/6: 安装 NATS-TTY 项目..."
INSTALL_DIR="/opt/nats-tty"

if [ -d "$INSTALL_DIR" ]; then
    echo "检测到已存在的安装，正在更新..."
    cd $INSTALL_DIR
    git pull
else
    echo "正在克隆项目..."
    git clone https://github.com/hanliworkonly/nats-tty.git $INSTALL_DIR
    cd $INSTALL_DIR
fi

# 安装 Node.js 依赖
echo "安装依赖..."
npm install

echo "✓ 项目已安装到 $INSTALL_DIR"

# 创建 NATS 用户和目录
echo ""
echo "步骤 5/6: 配置 NATS Server..."
if ! id -u nats &> /dev/null; then
    useradd -r -s /bin/false nats
fi

mkdir -p /var/lib/nats
chown -R nats:nats /var/lib/nats

# 创建 NATS 配置文件
cat > /etc/nats-server.conf <<'EOF'
# NATS Server 配置

port: 4222
http_port: 8222

# WebSocket 支持
websocket {
  port: 4222
  no_tls: true
  # 生产环境请启用 TLS:
  # tls {
  #   cert_file: "/etc/letsencrypt/live/your-domain.com/fullchain.pem"
  #   key_file: "/etc/letsencrypt/live/your-domain.com/privkey.pem"
  # }
}

# 认证配置（强烈建议启用）
# 取消注释以下行并修改用户名密码
# authorization {
#   user: "admin"
#   password: "change_this_password"
# }

# JetStream
jetstream {
  store_dir: "/var/lib/nats"
  max_memory_store: 1GB
  max_file_store: 10GB
}

# 日志
logfile: "/var/log/nats-server.log"
log_size_limit: 100MB

# 连接限制
max_connections: 1000
max_payload: 1048576
EOF

echo "✓ NATS 配置文件已创建: /etc/nats-server.conf"

# 创建 systemd 服务文件
echo ""
echo "步骤 6/6: 配置 systemd 服务..."

# NATS Server 服务
cat > /etc/systemd/system/nats-server.service <<'EOF'
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
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Serial Bridge 服务
cat > /etc/systemd/system/serial-bridge.service <<'EOF'
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
EOF

echo "✓ systemd 服务文件已创建"

# 重载 systemd
systemctl daemon-reload

# 启动服务
echo ""
echo "启动服务..."
systemctl enable nats-server
systemctl start nats-server
sleep 2

systemctl enable serial-bridge
systemctl start serial-bridge
sleep 2

# 检查服务状态
echo ""
echo "========================================"
echo "  安装完成！"
echo "========================================"
echo ""
echo "服务状态:"
echo ""

if systemctl is-active --quiet nats-server; then
    echo "✓ NATS Server: 运行中"
else
    echo "✗ NATS Server: 未运行"
fi

if systemctl is-active --quiet serial-bridge; then
    echo "✓ Serial Bridge: 运行中"
else
    echo "✗ Serial Bridge: 未运行"
fi

echo ""
echo "配置文件位置:"
echo "  - NATS 配置: /etc/nats-server.conf"
echo "  - 项目目录: /opt/nats-tty"
echo ""
echo "常用命令:"
echo "  - 查看 NATS 状态: systemctl status nats-server"
echo "  - 查看 Bridge 状态: systemctl status serial-bridge"
echo "  - 查看 NATS 日志: journalctl -u nats-server -f"
echo "  - 查看 Bridge 日志: journalctl -u serial-bridge -f"
echo "  - 重启服务: systemctl restart nats-server serial-bridge"
echo ""
echo "下一步:"
echo "  1. 配置防火墙: ufw allow 4222/tcp"
echo "  2. 编辑 /etc/nats-server.conf 启用认证（生产环境必需）"
echo "  3. 配置 SSL/TLS 证书（生产环境必需）"
echo "  4. 在浏览器中访问应用并连接到此服务器"
echo ""
echo "服务器地址: ws://$(hostname -I | awk '{print $1}'):4222"
echo ""
echo "安装完成！"
