// NATS TTY - 浏览器端串口交互应用
class NATSSerialTerminal {
    constructor() {
        this.nc = null; // NATS 连接
        this.subscription = null; // NATS 订阅
        this.isNatsConnected = false;
        this.isSerialOpen = false;
        this.currentDevice = null;

        // 统计信息
        this.stats = {
            bytesSent: 0,
            bytesReceived: 0,
            natsMessages: 0,
            connectionStartTime: null
        };

        // 定时器
        this.connectionTimer = null;

        // 初始化 UI 元素
        this.initElements();
        this.bindEvents();
        this.updateUI();
    }

    initElements() {
        // NATS 配置
        this.natsServer = document.getElementById('nats-server');
        this.natsUser = document.getElementById('nats-user');
        this.natsPass = document.getElementById('nats-pass');
        this.connectNatsBtn = document.getElementById('connect-nats');
        this.disconnectNatsBtn = document.getElementById('disconnect-nats');
        this.natsStatus = document.getElementById('nats-status');

        // 串口配置
        this.serialDevice = document.getElementById('serial-device');
        this.baudRate = document.getElementById('baud-rate');
        this.dataBits = document.getElementById('data-bits');
        this.stopBits = document.getElementById('stop-bits');
        this.parity = document.getElementById('parity');
        this.openSerialBtn = document.getElementById('open-serial');
        this.closeSerialBtn = document.getElementById('close-serial');
        this.serialStatus = document.getElementById('serial-status');

        // 终端
        this.terminal = document.getElementById('terminal');
        this.terminalInput = document.getElementById('terminal-input');
        this.sendDataBtn = document.getElementById('send-data');
        this.clearTerminalBtn = document.getElementById('clear-terminal');
        this.autoScroll = document.getElementById('auto-scroll');
        this.showTimestamp = document.getElementById('show-timestamp');
        this.hexMode = document.getElementById('hex-mode');
        this.lineEnding = document.getElementById('line-ending');

        // 统计信息
        this.bytesSentEl = document.getElementById('bytes-sent');
        this.bytesReceivedEl = document.getElementById('bytes-received');
        this.natsMessagesEl = document.getElementById('nats-messages');
        this.connectionTimeEl = document.getElementById('connection-time');
        this.resetStatsBtn = document.getElementById('reset-stats');
    }

    bindEvents() {
        // NATS 连接事件
        this.connectNatsBtn.addEventListener('click', () => this.connectNATS());
        this.disconnectNatsBtn.addEventListener('click', () => this.disconnectNATS());

        // 串口事件
        this.openSerialBtn.addEventListener('click', () => this.openSerial());
        this.closeSerialBtn.addEventListener('click', () => this.closeSerial());

        // 终端事件
        this.sendDataBtn.addEventListener('click', () => this.sendData());
        this.terminalInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendData();
            }
        });
        this.clearTerminalBtn.addEventListener('click', () => this.clearTerminal());

        // 统计事件
        this.resetStatsBtn.addEventListener('click', () => this.resetStats());
    }

    async connectNATS() {
        try {
            this.addTerminalLine('正在连接到 NATS 服务器...', 'info');

            const server = this.natsServer.value.trim();
            const user = this.natsUser.value.trim();
            const pass = this.natsPass.value.trim();

            const options = { servers: server };
            if (user && pass) {
                options.user = user;
                options.pass = pass;
            }

            // 连接到 NATS
            this.nc = await nats.connect(options);
            this.isNatsConnected = true;

            this.addTerminalLine(`成功连接到 NATS 服务器: ${server}`, 'info');
            this.updateStatus('nats', true);
            this.updateUI();

            // 启动连接时间计时器
            this.stats.connectionStartTime = Date.now();
            this.startConnectionTimer();

            // 监听连接关闭
            (async () => {
                for await (const status of this.nc.status()) {
                    if (status.type === 'disconnect' || status.type === 'error') {
                        this.addTerminalLine(`NATS 连接异常: ${status.type}`, 'error');
                        if (this.isNatsConnected) {
                            this.disconnectNATS();
                        }
                    }
                }
            })();

        } catch (error) {
            this.addTerminalLine(`连接失败: ${error.message}`, 'error');
            console.error('NATS 连接错误:', error);
        }
    }

    async disconnectNATS() {
        try {
            if (this.isSerialOpen) {
                await this.closeSerial();
            }

            if (this.subscription) {
                this.subscription.unsubscribe();
                this.subscription = null;
            }

            if (this.nc) {
                await this.nc.drain();
                this.nc = null;
            }

            this.isNatsConnected = false;
            this.updateStatus('nats', false);
            this.addTerminalLine('已断开 NATS 连接', 'info');
            this.updateUI();
            this.stopConnectionTimer();

        } catch (error) {
            this.addTerminalLine(`断开连接出错: ${error.message}`, 'error');
            console.error('断开连接错误:', error);
        }
    }

    async openSerial() {
        if (!this.isNatsConnected) {
            this.addTerminalLine('请先连接到 NATS 服务器', 'error');
            return;
        }

        try {
            const device = this.serialDevice.value.trim();
            if (!device) {
                this.addTerminalLine('请输入串口设备名称', 'error');
                return;
            }

            this.currentDevice = device;

            // 发送打开串口的配置命令
            const config = {
                action: 'open',
                device: device,
                baudRate: parseInt(this.baudRate.value),
                dataBits: parseInt(this.dataBits.value),
                stopBits: parseInt(this.stopBits.value),
                parity: this.parity.value
            };

            const controlSubject = `serial.${this.sanitizeDeviceName(device)}.control`;
            this.nc.publish(controlSubject, JSON.stringify(config));

            this.addTerminalLine(`发送打开串口命令: ${device}`, 'info');
            this.addTerminalLine(`配置: ${config.baudRate} 8N1`, 'info');

            // 订阅串口输出
            const outputSubject = `serial.${this.sanitizeDeviceName(device)}.out`;
            this.subscription = this.nc.subscribe(outputSubject);

            (async () => {
                for await (const msg of this.subscription) {
                    this.handleSerialData(msg.data);
                }
            })();

            this.addTerminalLine(`已订阅: ${outputSubject}`, 'info');

            // 标记串口为打开状态（实际状态需要后端确认）
            this.isSerialOpen = true;
            this.updateStatus('serial', true);
            this.updateUI();

        } catch (error) {
            this.addTerminalLine(`打开串口失败: ${error.message}`, 'error');
            console.error('打开串口错误:', error);
        }
    }

    async closeSerial() {
        if (!this.isNatsConnected || !this.currentDevice) {
            return;
        }

        try {
            // 发送关闭串口命令
            const config = {
                action: 'close',
                device: this.currentDevice
            };

            const controlSubject = `serial.${this.sanitizeDeviceName(this.currentDevice)}.control`;
            this.nc.publish(controlSubject, JSON.stringify(config));

            this.addTerminalLine(`发送关闭串口命令: ${this.currentDevice}`, 'info');

            // 取消订阅
            if (this.subscription) {
                this.subscription.unsubscribe();
                this.subscription = null;
            }

            this.isSerialOpen = false;
            this.currentDevice = null;
            this.updateStatus('serial', false);
            this.updateUI();

        } catch (error) {
            this.addTerminalLine(`关闭串口失败: ${error.message}`, 'error');
            console.error('关闭串口错误:', error);
        }
    }

    sendData() {
        if (!this.isNatsConnected || !this.isSerialOpen) {
            this.addTerminalLine('请先打开串口连接', 'error');
            return;
        }

        let data = this.terminalInput.value;
        if (!data) return;

        try {
            // 添加行尾符
            const ending = this.lineEnding.value;
            if (ending) {
                data += ending;
            }

            // 发送数据到串口
            const inputSubject = `serial.${this.sanitizeDeviceName(this.currentDevice)}.in`;

            if (this.hexMode.checked) {
                // 十六进制模式
                const hexData = data.replace(/\s+/g, '');
                const bytes = new Uint8Array(hexData.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                this.nc.publish(inputSubject, bytes);
                this.addTerminalLine(`发送 (HEX): ${hexData}`, 'sent');
                this.stats.bytesSent += bytes.length;
            } else {
                // 文本模式
                const encoder = new TextEncoder();
                const bytes = encoder.encode(data);
                this.nc.publish(inputSubject, bytes);
                this.addTerminalLine(`发送: ${data.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}`, 'sent');
                this.stats.bytesSent += bytes.length;
            }

            this.terminalInput.value = '';
            this.updateStats();

        } catch (error) {
            this.addTerminalLine(`发送数据失败: ${error.message}`, 'error');
            console.error('发送数据错误:', error);
        }
    }

    handleSerialData(data) {
        try {
            this.stats.natsMessages++;
            this.stats.bytesReceived += data.length;

            if (this.hexMode.checked) {
                // 十六进制模式显示
                const hexStr = Array.from(new Uint8Array(data))
                    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
                    .join(' ');
                this.addTerminalLine(`接收 (HEX): ${hexStr}`, 'received');
            } else {
                // 文本模式显示
                const decoder = new TextDecoder();
                const text = decoder.decode(data);
                this.addTerminalLine(`接收: ${text}`, 'received');
            }

            this.updateStats();

        } catch (error) {
            this.addTerminalLine(`处理数据失败: ${error.message}`, 'error');
            console.error('处理数据错误:', error);
        }
    }

    addTerminalLine(text, type = 'info') {
        const line = document.createElement('div');
        line.className = `terminal-line ${type}`;

        if (this.showTimestamp.checked) {
            const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
            const tsSpan = document.createElement('span');
            tsSpan.className = 'timestamp';
            tsSpan.textContent = `[${timestamp}]`;
            line.appendChild(tsSpan);
        }

        const textNode = document.createTextNode(text);
        line.appendChild(textNode);

        this.terminal.appendChild(line);

        if (this.autoScroll.checked) {
            this.terminal.scrollTop = this.terminal.scrollHeight;
        }
    }

    clearTerminal() {
        this.terminal.innerHTML = '';
    }

    updateStatus(type, connected) {
        const statusEl = type === 'nats' ? this.natsStatus : this.serialStatus;
        statusEl.textContent = connected ? '已连接' : '未连接';
        statusEl.className = connected ? 'status-value connected' : 'status-value disconnected';
    }

    updateUI() {
        // NATS 按钮状态
        this.connectNatsBtn.disabled = this.isNatsConnected;
        this.disconnectNatsBtn.disabled = !this.isNatsConnected;

        // 串口按钮状态
        this.openSerialBtn.disabled = !this.isNatsConnected || this.isSerialOpen;
        this.closeSerialBtn.disabled = !this.isSerialOpen;

        // 终端输入状态
        this.terminalInput.disabled = !this.isSerialOpen;
        this.sendDataBtn.disabled = !this.isSerialOpen;
    }

    updateStats() {
        this.bytesSentEl.textContent = `${this.stats.bytesSent} 字节`;
        this.bytesReceivedEl.textContent = `${this.stats.bytesReceived} 字节`;
        this.natsMessagesEl.textContent = this.stats.natsMessages;
    }

    resetStats() {
        this.stats.bytesSent = 0;
        this.stats.bytesReceived = 0;
        this.stats.natsMessages = 0;
        this.updateStats();
    }

    startConnectionTimer() {
        this.connectionTimer = setInterval(() => {
            if (this.stats.connectionStartTime) {
                const elapsed = Date.now() - this.stats.connectionStartTime;
                const hours = Math.floor(elapsed / 3600000);
                const minutes = Math.floor((elapsed % 3600000) / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);

                this.connectionTimeEl.textContent =
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    stopConnectionTimer() {
        if (this.connectionTimer) {
            clearInterval(this.connectionTimer);
            this.connectionTimer = null;
        }
        this.stats.connectionStartTime = null;
        this.connectionTimeEl.textContent = '00:00:00';
    }

    // 清理设备名称，用于 NATS 主题
    sanitizeDeviceName(device) {
        return device.replace(/[^a-zA-Z0-9]/g, '_');
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new NATSSerialTerminal();
    console.log('NATS 串口终端已初始化');
});
