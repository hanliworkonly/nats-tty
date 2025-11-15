#!/bin/bash

# NATS-TTY Cloudflare Pages 部署脚本

echo "========================================="
echo "  NATS-TTY Cloudflare Pages 部署"
echo "========================================="
echo ""

# 检查是否安装了 wrangler
if ! command -v wrangler &> /dev/null; then
    echo "错误: 未找到 wrangler CLI"
    echo "请安装: npm install -g wrangler"
    exit 1
fi

# 确保 public 目录存在
if [ ! -d "public" ]; then
    echo "创建 public 目录..."
    mkdir -p public
fi

# 复制文件到 public 目录
echo "准备部署文件..."
cp index.html public/ 2>/dev/null || true
cp styles.css public/ 2>/dev/null || true
cp app.js public/ 2>/dev/null || true
cp _headers public/ 2>/dev/null || true

echo "✓ 文件已准备就绪"
echo ""

# 检查是否已登录
echo "检查 Cloudflare 登录状态..."
if ! wrangler whoami &> /dev/null; then
    echo "请登录 Cloudflare 账户..."
    wrangler login
fi

echo ""
echo "开始部署到 Cloudflare Pages..."
echo ""

# 部署到 Cloudflare Pages
wrangler pages deploy public --project-name=nats-tty

echo ""
echo "========================================="
echo "  部署完成！"
echo "========================================="
echo ""
echo "您的应用已部署到 Cloudflare Pages"
echo "访问 https://nats-tty.pages.dev 查看"
echo ""
