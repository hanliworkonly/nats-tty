# NATS 串口终端 (NATS-TTY)

一个基于 NATS 消息系统的浏览器端串口交互应用，允许通过 WebSocket 在浏览器中与远程设备的串口进行通信。

## 功能特性

- **NATS WebSocket 连接**：通过 NATS.ws 库连接到 NATS 服务器
- **串口配置**：支持配置波特率、数据位、停止位、校验位
- **实时通信**：发送和接收串口数据
- **终端界面**：类似终端的交互界面，支持命令输入和数据显示
- **十六进制模式**：支持以十六进制格式发送和显示数据
- **时间戳显示**：可选显示每条消息的时间戳
- **统计信息**：实时显示发送/接收字节数、消息数量、连接时长
- **自动滚动**：终端自动滚动到最新消息
- **响应式设计**：适配不同屏幕尺寸

## 技术栈

- **前端**：原生 JavaScript (ES6+)
- **UI**：HTML5 + CSS3
- **通信**：NATS.ws (WebSocket)
- **编码**：TextEncoder/TextDecoder API

## 文件结构

```
nats-tty/
├── public/              # Cloudflare Pages 部署目录
│   ├── index.html      # 主页面
│   ├── styles.css      # 样式文件
│   ├── app.js          # 应用逻辑
│   └── _headers        # Cloudflare 自定义头
├── index.html          # 主页面（开发）
├── styles.css          # 样式文件（开发）
├── app.js              # 应用逻辑（开发）
├── serial-bridge.js    # 后端串口桥接服务
├── deploy.sh           # Cloudflare Pages 部署脚本
├── wrangler.toml       # Cloudflare 配置文件
├── package.json        # Node.js 项目配置
└── README.md           # 文档
```

## 快速开始

### 方式一：部署到 Cloudflare Pages（推荐）

1. **安装 Wrangler CLI**

```bash
npm install -g wrangler
```

2. **登录 Cloudflare 账户**

```bash
wrangler login
```

3. **部署应用**

```bash
# 使用部署脚本
./deploy.sh

# 或手动部署
wrangler pages deploy public --project-name=nats-tty
```

4. **访问应用**

部署成功后，访问：`https://nats-tty.pages.dev`

或通过 Cloudflare Dashboard 绑定自定义域名。

5. **配置环境**

- 确保你的 NATS 服务器可以从公网访问（使用公网 IP 或域名）
- 在远程服务器上运行 `serial-bridge.js` 服务
- 在网页中输入 NATS 服务器的公网地址（如 `wss://your-nats-server.com:4222`）

### 方式二：本地运行

### 1. 启动 NATS 服务器

确保 NATS 服务器支持 WebSocket 连接。可以使用以下命令启动：

```bash
# 使用 Docker 启动 NATS 服务器
docker run -p 4222:4222 -p 8222:8222 -p 6222:6222 nats:latest -js

# 或下载并运行 NATS 服务器
nats-server -c nats-server.conf
```

NATS 配置文件示例 (`nats-server.conf`):

```conf
port: 4222
http_port: 8222

websocket {
  port: 4222
  no_tls: true
}

jetstream {
  store_dir: /tmp/nats
}
```

### 2. 设置串口代理服务

需要一个后端服务来处理 NATS 消息和实际的串口通信。该服务需要：

1. 连接到 NATS 服务器
2. 订阅控制主题：`serial.{device}.control`
3. 订阅输入主题：`serial.{device}.in`
4. 发布输出主题：`serial.{device}.out`

**NATS 主题约定**：

- `serial.{device}.control` - 控制命令（打开/关闭串口、配置参数）
- `serial.{device}.in` - 发送到串口的数据
- `serial.{device}.out` - 从串口接收的数据

**控制消息格式**（JSON）：

```json
{
  "action": "open",
  "device": "/dev/ttyUSB0",
  "baudRate": 115200,
  "dataBits": 8,
  "stopBits": 1,
  "parity": "none"
}
```

```json
{
  "action": "close",
  "device": "/dev/ttyUSB0"
}
```

### 3. 打开网页应用

使用任何 Web 服务器提供静态文件服务，或直接在浏览器中打开 `index.html`：

```bash
# 使用 Python 3 启动简单 HTTP 服务器
python3 -m http.server 8000

# 或使用 Node.js http-server
npx http-server -p 8000
```

然后在浏览器中访问：`http://localhost:8000`

## 使用说明

### 1. 连接到 NATS 服务器

1. 在 "NATS 连接配置" 面板中输入 NATS 服务器地址（默认：`ws://localhost:4222`）
2. 如果需要认证，输入用户名和密码
3. 点击 "连接 NATS" 按钮
4. 连接成功后，状态栏显示 "已连接"

### 2. 打开串口

1. 在 "串口配置" 面板中输入串口设备名称（如 `/dev/ttyUSB0` 或 `COM1`）
2. 选择波特率、数据位、停止位、校验位
3. 点击 "打开串口" 按钮
4. 应用会发送打开串口的命令到后端服务

### 3. 发送和接收数据

1. 在终端输入框中输入要发送的数据
2. 选择行尾符（可选）：无、LF、CR、CRLF
3. 点击 "发送" 按钮或按 Enter 键
4. 接收到的数据会显示在终端窗口中

### 4. 高级功能

- **清空终端**：点击 "清空" 按钮清除终端显示
- **自动滚动**：勾选后终端会自动滚动到最新消息
- **显示时间戳**：在每条消息前显示时间戳
- **十六进制模式**：以十六进制格式发送和显示数据
- **统计信息**：查看发送/接收字节数、消息数量、连接时长

## 后端服务示例

这里提供一个简单的 Node.js 后端服务示例，用于处理 NATS 消息和串口通信：

```javascript
const { connect, StringCodec } = require('nats');
const SerialPort = require('serialport');

let serialPort = null;

async function main() {
  // 连接到 NATS
  const nc = await connect({ servers: 'localhost:4222' });
  const sc = StringCodec();

  console.log('已连接到 NATS 服务器');

  // 订阅控制命令
  const controlSub = nc.subscribe('serial.*.control');
  (async () => {
    for await (const msg of controlSub) {
      const config = JSON.parse(sc.decode(msg.data));

      if (config.action === 'open') {
        // 打开串口
        serialPort = new SerialPort(config.device, {
          baudRate: config.baudRate || 115200,
          dataBits: config.dataBits || 8,
          stopBits: config.stopBits || 1,
          parity: config.parity || 'none'
        });

        const deviceName = config.device.replace(/[^a-zA-Z0-9]/g, '_');

        // 监听串口数据并发布到 NATS
        serialPort.on('data', (data) => {
          nc.publish(`serial.${deviceName}.out`, data);
        });

        console.log(`串口已打开: ${config.device}`);

      } else if (config.action === 'close') {
        // 关闭串口
        if (serialPort && serialPort.isOpen) {
          serialPort.close();
          serialPort = null;
          console.log(`串口已关闭: ${config.device}`);
        }
      }
    }
  })();

  // 订阅输入数据
  const inputSub = nc.subscribe('serial.*.in');
  (async () => {
    for await (const msg of inputSub) {
      if (serialPort && serialPort.isOpen) {
        serialPort.write(msg.data);
      }
    }
  })();
}

main().catch(console.error);
```

## 浏览器兼容性

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

需要支持 ES6+、WebSocket、TextEncoder/TextDecoder API。

## 安全注意事项

1. **生产环境**：建议使用 TLS/SSL 加密 NATS 连接（`wss://`）
2. **认证**：配置 NATS 服务器的用户认证
3. **访问控制**：限制可访问的串口设备
4. **输入验证**：后端服务应验证所有输入参数

## 故障排除

### 无法连接到 NATS 服务器

- 检查 NATS 服务器是否运行
- 确认 WebSocket 端口配置正确
- 检查浏览器控制台的错误信息
- 确保没有防火墙阻止连接

### 串口无响应

- 确认后端串口代理服务正在运行
- 检查串口设备名称是否正确
- 验证串口配置参数（波特率等）
- 查看后端服务日志

### CORS 错误

- 确保使用 HTTP 服务器提供文件，而不是直接打开文件
- 配置 NATS 服务器允许跨域请求

## Cloudflare Pages 部署详细说明

### GitHub 集成（自动部署）

1. **在 Cloudflare Dashboard 中创建 Pages 项目**
   - 访问 [Cloudflare Pages](https://pages.cloudflare.com/)
   - 点击 "Create a project"
   - 连接你的 GitHub 仓库
   - 选择 `nats-tty` 仓库

2. **配置构建设置**
   - Build command: `mkdir -p public && cp index.html styles.css app.js _headers public/`
   - Build output directory: `public`
   - Root directory: `/`

3. **部署**
   - 每次推送到主分支时，Cloudflare Pages 会自动构建和部署

### 手动部署（Wrangler CLI）

```bash
# 安装依赖
npm install -g wrangler

# 登录
wrangler login

# 部署
./deploy.sh
```

### 自定义域名

1. 在 Cloudflare Pages 项目设置中
2. 转到 "Custom domains"
3. 添加你的域名
4. Cloudflare 会自动配置 DNS 和 SSL

### 环境变量（可选）

如果需要配置默认的 NATS 服务器地址，可以在 Cloudflare Pages 设置中添加环境变量，然后修改 `app.js` 读取这些变量。

## 生产环境部署架构

```
┌──────────────┐         ┌──────────────────┐         ┌─────────────┐
│   浏览器     │ HTTPS   │ Cloudflare Pages │         │ NATS Server │
│ (用户端)     │────────▶│   (静态托管)      │         │   (公网)    │
└──────────────┘         └──────────────────┘         └─────────────┘
                                                              │
                                                              │ NATS
                                                              │
                                                       ┌──────▼──────┐
                                                       │ Serial      │
                                                       │ Bridge      │
                                                       │ Service     │
                                                       └──────┬──────┘
                                                              │
                                                       ┌──────▼──────┐
                                                       │ 串口设备    │
                                                       │ (本地/远程) │
                                                       └─────────────┘
```

### 生产环境建议

1. **NATS 服务器**
   - 使用 TLS/SSL 加密（wss://）
   - 启用用户认证
   - 配置防火墙规则
   - 考虑使用 NATS 集群提高可用性

2. **串口桥接服务**
   - 使用 PM2 或 systemd 管理进程
   - 配置日志轮转
   - 实现错误处理和自动重连
   - 添加健康检查端点

3. **安全性**
   - 使用强密码或 Token 认证
   - 限制允许的串口设备列表
   - 实现访问日志和审计
   - 定期更新依赖包

4. **示例 systemd 服务配置**

创建 `/etc/systemd/system/serial-bridge.service`:

```ini
[Unit]
Description=NATS Serial Bridge Service
After=network.target

[Service]
Type=simple
User=serialuser
WorkingDirectory=/opt/nats-tty
Environment="NATS_SERVER=localhost:4222"
ExecStart=/usr/bin/node serial-bridge.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl enable serial-bridge
sudo systemctl start serial-bridge
sudo systemctl status serial-bridge
```

## 开发计划

- [ ] 支持多个串口同时连接
- [ ] 数据日志保存和导出
- [ ] 自定义命令快捷键
- [ ] 串口数据解析和可视化
- [ ] 支持更多串口参数配置
- [x] Cloudflare Pages 部署支持

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
