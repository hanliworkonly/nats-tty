#!/usr/bin/env node

/**
 * NATS 串口桥接服务
 *
 * 这个服务连接 NATS 服务器和本地串口设备，实现浏览器与串口的通信桥梁
 *
 * 依赖安装：
 * npm install nats serialport
 *
 * 使用方法：
 * node serial-bridge.js
 */

const { connect } = require('nats');
const { SerialPort } = require('serialport');

class SerialBridge {
    constructor() {
        this.nc = null;
        this.serialPorts = new Map(); // 存储多个串口连接
    }

    async start(natsServer = 'localhost:4222') {
        try {
            // 连接到 NATS 服务器
            console.log(`正在连接到 NATS 服务器: ${natsServer}...`);
            this.nc = await connect({ servers: natsServer });
            console.log('✓ 成功连接到 NATS 服务器');

            // 监听 NATS 连接状态
            (async () => {
                for await (const status of this.nc.status()) {
                    console.log(`NATS 状态: ${status.type}`);
                }
            })();

            // 订阅控制消息
            await this.subscribeControl();

            // 订阅输入数据
            await this.subscribeInput();

            console.log('✓ 串口桥接服务已启动');
            console.log('  - 等待来自浏览器的连接请求...\n');

        } catch (error) {
            console.error('启动失败:', error);
            process.exit(1);
        }
    }

    async subscribeControl() {
        const sub = this.nc.subscribe('serial.*.control');

        (async () => {
            for await (const msg of sub) {
                try {
                    const config = JSON.parse(new TextDecoder().decode(msg.data));
                    await this.handleControlCommand(config);
                } catch (error) {
                    console.error('处理控制命令错误:', error);
                }
            }
        })();

        console.log('✓ 已订阅控制主题: serial.*.control');
    }

    async subscribeInput() {
        const sub = this.nc.subscribe('serial.*.in');

        (async () => {
            for await (const msg of sub) {
                try {
                    // 从主题中提取设备名称
                    const subject = msg.subject;
                    const match = subject.match(/serial\.(.+)\.in/);
                    if (match) {
                        const deviceKey = match[1];
                        await this.handleInputData(deviceKey, msg.data);
                    }
                } catch (error) {
                    console.error('处理输入数据错误:', error);
                }
            }
        })();

        console.log('✓ 已订阅输入主题: serial.*.in');
    }

    async handleControlCommand(config) {
        const { action, device, baudRate, dataBits, stopBits, parity } = config;

        if (action === 'open') {
            await this.openSerialPort(device, {
                baudRate: baudRate || 115200,
                dataBits: dataBits || 8,
                stopBits: stopBits || 1,
                parity: parity || 'none'
            });
        } else if (action === 'close') {
            await this.closeSerialPort(device);
        }
    }

    async openSerialPort(device, options) {
        const deviceKey = this.sanitizeDeviceName(device);

        // 如果串口已经打开，先关闭
        if (this.serialPorts.has(deviceKey)) {
            console.log(`串口 ${device} 已打开，先关闭...`);
            await this.closeSerialPort(device);
        }

        try {
            console.log(`正在打开串口: ${device}`);
            console.log(`  配置: ${options.baudRate} ${options.dataBits}${options.parity[0].toUpperCase()}${options.stopBits}`);

            const port = new SerialPort({
                path: device,
                baudRate: options.baudRate,
                dataBits: options.dataBits,
                stopBits: options.stopBits,
                parity: options.parity
            });

            // 串口打开事件
            port.on('open', () => {
                console.log(`✓ 串口已打开: ${device}`);
            });

            // 串口数据接收事件
            port.on('data', (data) => {
                // 发布到 NATS
                const outputSubject = `serial.${deviceKey}.out`;
                this.nc.publish(outputSubject, data);

                // 日志输出（可选）
                const preview = data.length > 50 ?
                    `${data.toString('hex', 0, 50)}... (${data.length} bytes)` :
                    data.toString('hex');
                console.log(`← [${device}] 接收: ${preview}`);
            });

            // 串口错误事件
            port.on('error', (err) => {
                console.error(`✗ 串口错误 [${device}]:`, err.message);
            });

            // 串口关闭事件
            port.on('close', () => {
                console.log(`✗ 串口已关闭: ${device}`);
                this.serialPorts.delete(deviceKey);
            });

            // 保存串口实例
            this.serialPorts.set(deviceKey, { port, device, options });

        } catch (error) {
            console.error(`✗ 打开串口失败 [${device}]:`, error.message);
        }
    }

    async closeSerialPort(device) {
        const deviceKey = this.sanitizeDeviceName(device);
        const portInfo = this.serialPorts.get(deviceKey);

        if (!portInfo) {
            console.log(`串口 ${device} 未打开`);
            return;
        }

        try {
            console.log(`正在关闭串口: ${device}`);

            if (portInfo.port.isOpen) {
                await new Promise((resolve, reject) => {
                    portInfo.port.close((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }

            this.serialPorts.delete(deviceKey);
            console.log(`✓ 串口已关闭: ${device}`);

        } catch (error) {
            console.error(`✗ 关闭串口失败 [${device}]:`, error.message);
        }
    }

    async handleInputData(deviceKey, data) {
        const portInfo = this.serialPorts.get(deviceKey);

        if (!portInfo) {
            console.error(`串口未打开: ${deviceKey}`);
            return;
        }

        if (!portInfo.port.isOpen) {
            console.error(`串口未就绪: ${deviceKey}`);
            return;
        }

        try {
            // 写入串口
            portInfo.port.write(data);

            // 日志输出（可选）
            const preview = data.length > 50 ?
                `${Buffer.from(data).toString('hex', 0, 50)}... (${data.length} bytes)` :
                Buffer.from(data).toString('hex');
            console.log(`→ [${portInfo.device}] 发送: ${preview}`);

        } catch (error) {
            console.error(`写入串口失败 [${deviceKey}]:`, error.message);
        }
    }

    sanitizeDeviceName(device) {
        return device.replace(/[^a-zA-Z0-9]/g, '_');
    }

    async shutdown() {
        console.log('\n正在关闭服务...');

        // 关闭所有串口
        for (const [deviceKey, portInfo] of this.serialPorts.entries()) {
            await this.closeSerialPort(portInfo.device);
        }

        // 关闭 NATS 连接
        if (this.nc) {
            await this.nc.drain();
            console.log('✓ NATS 连接已关闭');
        }

        console.log('✓ 服务已停止');
        process.exit(0);
    }
}

// 主程序
async function main() {
    console.log('========================================');
    console.log('  NATS 串口桥接服务');
    console.log('========================================\n');

    const natsServer = process.env.NATS_SERVER || 'localhost:4222';
    const bridge = new SerialBridge();

    // 处理退出信号
    process.on('SIGINT', () => bridge.shutdown());
    process.on('SIGTERM', () => bridge.shutdown());

    // 启动服务
    await bridge.start(natsServer);
}

// 运行主程序
if (require.main === module) {
    main().catch(console.error);
}

module.exports = SerialBridge;
