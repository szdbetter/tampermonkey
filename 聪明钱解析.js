// ==UserScript==
// @name         聪明钱解析 (增强版)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Collect smart money addresses with enhanced debugging and interaction
// @author       szdbetter
// @match        https://gmgn.ai/defi/quotation/v1/tokens/top_traders/*
// @grant        GM_xmlhttpRequest
// @connect      frontend-api-v3.pump.fun
// @connect      api.memego.ai
// @connect      chain.fm
// @connect      gmgn.ai
// @connect      debot.ai
// @connect      pump.news
// @connect      memego.ai
// @connect      dexscreen.com
// @connect      api.dexscreener.com
// @connect      dexscreener.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.5/xlsx.full.min.js
// ==/UserScript==

(function() {
    'use strict';

    // 全局配置常量
    const CONFIG = {
        // 最低实现利润阈值（美元）
        MIN_REALIZED_PROFIT: 3000,

        // 最大保留交易者数量
        MAX_TRADERS: 30,

        // 调试日志级别
        DEBUG_LEVEL: {
            INFO: 'info',
            WARNING: 'warning',
            ERROR: 'error'
        },

        // 外部API配置
        API: {
            TOKEN_SEARCH_URL: 'https://frontend-api-v3.pump.fun/coins/search',
            SEARCH_PARAMS: {
                offset: 0,
                limit: 50,
                sort: 'market_cap',
                includeNsfw: false,
                order: 'DESC'
            }
        }
    };

    // 调试日志工具
    const DebugLogger = {
        logElement: null,

        init() {
            this.logElement = document.createElement('div');
            this.logElement.style.cssText = `
                position: fixed;
                bottom: 10px;
                right: 10px;
                width: 800px;
                max-height: 350px;
                overflow-y: auto;
                background: rgba(0,0,0,0.8);
                color: #0f0;
                padding: 15px;
                font-size: 14px;
                z-index: 10000;
                border-radius: 10px;
                line-height: 1.5;
            `;
            document.body.appendChild(this.logElement);
        },

        log(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const logMessage = `[${timestamp}] ${message}`;

            const messageElement = document.createElement('div');
            messageElement.textContent = logMessage;

            switch(type) {
                case 'error':
                    messageElement.style.color = 'red';
                    break;
                case 'warning':
                    messageElement.style.color = 'yellow';
                    break;
                default:
                    messageElement.style.color = '#0f0';
            }

            this.logElement.prepend(messageElement);
            console.log(logMessage);
        },

        // 新增表格输出方法
        logTable(data, title = '数据详情') {
            console.table(data);
            const tableElement = document.createElement('div');
            tableElement.style.color = '#0ff';
            tableElement.innerHTML = `<strong>${title}:</strong>`;
            this.logElement.prepend(tableElement);
        }
    };

    class SmartMoneyDatabase {
        constructor() {
            this.dbName = 'SmartMoneyDB';
            this.storeName = 'traders';
            this.db = null;
        }

        async init() {
            return new Promise((resolve, reject) => {
                try {
                    // 检查浏览器支持
                    if (!window.indexedDB) {
                        const error = new Error('您的浏览器不支持 IndexedDB');
                        DebugLogger.log(error.message, CONFIG.DEBUG_LEVEL.ERROR);
                        reject(error);
                        return;
                    }

                    // 列出所有数据库
                    indexedDB.databases().then(databases => {
                        const existingDB = databases.find(db => db.name === this.dbName);
                        DebugLogger.log(`当前存在的数据库: ${JSON.stringify(databases)}`, CONFIG.DEBUG_LEVEL.INFO);
                        if (existingDB) {
                            DebugLogger.log(`发现已存在的数据库: ${this.dbName}, 版本: ${existingDB.version}`, CONFIG.DEBUG_LEVEL.INFO);
                        }
                    }).catch(error => {
                        DebugLogger.log(`无法列出数据库: ${error}`, CONFIG.DEBUG_LEVEL.WARNING);
                    });

                    // 直接打开或创建数据库
                    const request = indexedDB.open(this.dbName, 3);

                    request.onerror = (event) => {
                        const error = new Error(`数据库初始化错误: ${event.target.error}`);
                        DebugLogger.log(error.message, CONFIG.DEBUG_LEVEL.ERROR);
                        reject(error);
                    };

                    request.onblocked = (event) => {
                        const error = new Error('数据库被阻塞，请关闭其他标签页后重试');
                        DebugLogger.log(error.message, CONFIG.DEBUG_LEVEL.ERROR);
                        reject(error);
                    };

                    request.onsuccess = (event) => {
                        this.db = event.target.result;

                        // 添加错误处理
                        this.db.onerror = (event) => {
                            DebugLogger.log(`数据库错误: ${event.target.error}`, CONFIG.DEBUG_LEVEL.ERROR);
                        };

                        // 检查数据库是否正确创建
                        if (this.db.objectStoreNames.contains(this.storeName)) {
                            DebugLogger.log('数据库连接成功', CONFIG.DEBUG_LEVEL.INFO);

                            // 检查数据库中的记录数
                            const transaction = this.db.transaction([this.storeName], 'readonly');
                            const store = transaction.objectStore(this.storeName);
                            const countRequest = store.count();

                            countRequest.onsuccess = () => {
                                DebugLogger.log(`数据库中现有记录数: ${countRequest.result}`, CONFIG.DEBUG_LEVEL.INFO);
                            };
                        } else {
                            DebugLogger.log('数据表未正确创建', CONFIG.DEBUG_LEVEL.ERROR);
                        }

                        resolve();
                    };

                    request.onupgradeneeded = (event) => {
                        try {
                            const db = event.target.result;
                            DebugLogger.log(`数据库需要升级，当前版本: ${event.oldVersion}, 新版本: ${event.newVersion}`, CONFIG.DEBUG_LEVEL.INFO);

                            // 只在数据表不存在时创建
                            if (!db.objectStoreNames.contains(this.storeName)) {
                                DebugLogger.log('创建新的数据表', CONFIG.DEBUG_LEVEL.INFO);
                                const store = db.createObjectStore(this.storeName, {
                                    keyPath: ['ca', 'address']
                                });

                                // 创建索引
                                const indexes = [
                                    { name: 'ca', keyPath: 'ca', options: { unique: false } },
                                    { name: 'address', keyPath: 'address', options: { unique: false } },
                                    { name: 'update_time', keyPath: 'update_time', options: { unique: false } },
                                    { name: 'ca_address', keyPath: ['ca', 'address'], options: { unique: true } },
                                    { name: 'twitter_username', keyPath: 'twitter_username', options: { unique: false } },
                                    { name: 'user_name', keyPath: 'user_name', options: { unique: false } },
                                    { name: 'realized_profit', keyPath: 'realized_profit', options: { unique: false } },
                                    { name: 'profit_tag', keyPath: 'profit_tag', options: { unique: false } },
                                    { name: 'dev', keyPath: 'dev', options: { unique: false } },
                                    { name: 'create_time', keyPath: 'create_time', options: { unique: false } },
                                    { name: 'launch_time', keyPath: 'launch_time', options: { unique: false } },
                                    { name: 'sol_balance', keyPath: 'sol_balance', options: { unique: false } },
                                    { name: 'start_holding_at', keyPath: 'start_holding_at', options: { unique: false } },
                                    { name: 'end_holding_at', keyPath: 'end_holding_at', options: { unique: false } },
                                    { name: 'holding_period', keyPath: 'holding_period', options: { unique: false } },
                                    { name: 'tag_1', keyPath: 'tag_1', options: { unique: false } },
                                    { name: 'tag_2', keyPath: 'tag_2', options: { unique: false } },
                                    { name: 'tag_3', keyPath: 'tag_3', options: { unique: false } },
                                    { name: 'buy_after_launch_interval', keyPath: 'buy_after_launch_interval', options: { unique: false } }
                                ];

                                indexes.forEach(({ name, keyPath, options }) => {
                                    if (!store.indexNames.contains(name)) {
                                        store.createIndex(name, keyPath, options);
                                        DebugLogger.log(`创建索引: ${name}`, CONFIG.DEBUG_LEVEL.INFO);
                                    }
                                });

                                DebugLogger.log('数据库结构创建完成', CONFIG.DEBUG_LEVEL.INFO);
                            } else {
                                DebugLogger.log('数据表已存在，无需重新创建', CONFIG.DEBUG_LEVEL.INFO);
                            }
                        } catch (error) {
                            DebugLogger.log(`数据库升级失败: ${error}`, CONFIG.DEBUG_LEVEL.ERROR);
                            reject(error);
                        }
                    };
                } catch (error) {
                    DebugLogger.log(`数据库初始化过程出错: ${error}`, CONFIG.DEBUG_LEVEL.ERROR);
                    reject(error);
                }
            });
        }

        async upsertTrader(trader) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                const index = store.index('ca_address');
                const query = IDBKeyRange.only([trader.ca, trader.address]);

                const request = index.get(query);

                request.onsuccess = (event) => {
                    const existingTrader = event.target.result;

                    if (existingTrader) {
                        const updatedTrader = {
                            ...existingTrader,
                            buy_volume: trader.buy_volume,
                            sell_volume: trader.sell_volume,
                            realized_profit: trader.realized_profit,
                            twitter_username: trader.twitter_username,
                            user_name: trader.user_name,
                            profit_tag: trader.profit_tag,
                            update_time: trader.update_time,

                            // 新增字段
                            dev: trader.dev,
                            create_time: trader.create_time,
                            launch_time: trader.launch_time,

                            // 新增的字段
                            sol_balance: trader.sol_balance,
                            start_holding_at: trader.start_holding_at,
                            end_holding_at: trader.end_holding_at,
                            holding_period: trader.holding_period,

                            // 新增 buy_after_launch_interval 字段
                            buy_after_launch_interval: trader.buy_after_launch_interval
                        };
                        store.put(updatedTrader);
                        DebugLogger.log(`更新聪明钱: ${trader.address} (${trader.user_name || 'Unknown'}, 利润排名: ${trader.profit_tag})`, CONFIG.DEBUG_LEVEL.INFO);
                    } else {
                        store.put(trader);
                        DebugLogger.log(`新增聪明钱: ${trader.address} (${trader.user_name || 'Unknown'}, 利润排名: ${trader.profit_tag})`, CONFIG.DEBUG_LEVEL.INFO);
                    }
                    resolve();
                };

                request.onerror = () => {
                    DebugLogger.log(`存储聪明钱失败: ${trader.address}`, CONFIG.DEBUG_LEVEL.ERROR);
                    reject(request.error);
                };
            });
        }
    }

    class DataCollector {
        constructor(database) {
            this.db = database;
            this.currentCA = '';
            this.tokenName = '';
            this.progressBar = null;
            this.dataViewerModal = null;
            this.pageSize = 200; // 默认每页显示200条记录
            this.currentPage = 1;
            this.totalPages = 1;
            this.performanceMonitor = new PerformanceMonitor();
            this.currentSortColumn = null; // 当前排序的列
            this.isAscending = true; // 排序方向
            // 添加字段选择配置
            this.selectedFields = new Set([
                'NO.', '名称', '合约', '聪明钱', 'Dev', 'Pump内盘发射',
                'SOL余额', '最后活跃时间', '买入时间', '卖出时间', 'Pump到买入(秒)',
                '持有时长(分钟)', '买入金额', '卖出金额', '到手利润',
                'Twitter', '用户名', '排名', '标签1', '标签2', '标签3', '更新时间'
            ]); // 默认全选
        }

        createProgressBar() {
            this.progressBar = document.createElement('div');
            this.progressBar.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 0%;
                height: 4px;
                background-color: #4CAF50;
                z-index: 10000;
                transition: width 0.5s ease;
            `;
            document.body.appendChild(this.progressBar);
        }

        updateProgressBar(percentage) {
            if (this.progressBar) {
                this.progressBar.style.width = `${percentage}%`;
            }
        }

        extractCAFromUrl() {
            const pathParts = window.location.pathname.split('/');
            return pathParts[pathParts.length - 1];
        }

        getBeijingTime() {
            const options = {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            };
            return new Date().toLocaleString('zh-CN', options);
        }

        async fetchTokenName(ca) {
            try {
                // 检查CA是否以pump结尾
                if (ca.toLowerCase().endsWith('pump')) {
                    // 使用现有的PUMP.fun API
                    return new Promise((resolve, reject) => {
                        DebugLogger.log(`使用PUMP.fun API获取代币名称: ${ca}`);
                        GM_xmlhttpRequest({
                            method: 'GET',
                            url: `${CONFIG.API.TOKEN_SEARCH_URL}?offset=${CONFIG.API.SEARCH_PARAMS.offset}&limit=${CONFIG.API.SEARCH_PARAMS.limit}&sort=${CONFIG.API.SEARCH_PARAMS.sort}&includeNsfw=${CONFIG.API.SEARCH_PARAMS.includeNsfw}&order=${CONFIG.API.SEARCH_PARAMS.order}&searchTerm=${ca}&type=exact`,
                            onload: (response) => {
                                try {
                                    const data = JSON.parse(response.responseText);
                                    if (data && data.length > 0) {
                                        const tokenInfo = data[0];
                                        DebugLogger.log(`PUMP.fun API获取代币信息成功: ${JSON.stringify(tokenInfo)}`, CONFIG.DEBUG_LEVEL.INFO);
                                        resolve({
                                            symbol: tokenInfo.symbol || 'Unknown Token',
                                            dev: tokenInfo.creator,
                                            created_timestamp: tokenInfo.created_timestamp,
                                            launch_time: tokenInfo.last_trade_timestamp
                                        });
                                    } else {
                                        DebugLogger.log('PUMP.fun API未找到代币名称', CONFIG.DEBUG_LEVEL.WARNING);
                                        resolve({
                                            symbol: 'Unknown Token',
                                            dev: '',
                                            created_timestamp: null,
                                            launch_time: null
                                        });
                                    }
                                } catch (error) {
                                    DebugLogger.log(`PUMP.fun API解析代币名称失败: ${error}`, CONFIG.DEBUG_LEVEL.ERROR);
                                    resolve({
                                        symbol: 'Unknown Token',
                                        dev: '',
                                        created_timestamp: null,
                                        launch_time: null
                                    });
                                }
                            },
                            onerror: (error) => {
                                DebugLogger.log(`PUMP.fun API获取代币名称失败: ${error}`, CONFIG.DEBUG_LEVEL.ERROR);
                                reject(error);
                            }
                        });
                    });
                } else {
                    // 使用 DexScreener API
                    return new Promise((resolve, reject) => {
                        DebugLogger.log(`使用DexScreener API获取代币名称: ${ca}`);
                        GM_xmlhttpRequest({
                            method: 'GET',
                            url: `https://api.dexscreener.com/latest/dex/tokens/${ca}`,
                            onload: (response) => {
                                try {
                                    const data = JSON.parse(response.responseText);
                                    if (data && data.pairs && data.pairs.length > 0) {
                                        const tokenInfo = data.pairs[0].baseToken;
                                        DebugLogger.log(`DexScreener API获取代币信息成功: ${JSON.stringify(tokenInfo)}`, CONFIG.DEBUG_LEVEL.INFO);
                                        resolve({
                                            symbol: tokenInfo.symbol || 'Unknown Token',
                                            dev: '', // DexScreener API 没有提供 dev 信息
                                            created_timestamp: data.pairs[0].pairCreatedAt,
                                            launch_time: data.pairs[0].pairCreatedAt
                                        });
                                    } else {
                                        DebugLogger.log('DexScreener API未找到代币名称', CONFIG.DEBUG_LEVEL.WARNING);
                                        resolve({
                                            symbol: 'Unknown Token',
                                            dev: '',
                                            created_timestamp: null,
                                            launch_time: null
                                        });
                                    }
                                } catch (error) {
                                    DebugLogger.log(`DexScreener API解析代币名称失败: ${error}`, CONFIG.DEBUG_LEVEL.ERROR);
                                    resolve({
                                        symbol: 'Unknown Token',
                                        dev: '',
                                        created_timestamp: null,
                                        launch_time: null
                                    });
                                }
                            },
                            onerror: (error) => {
                                DebugLogger.log(`DexScreener API获取代币名称失败: ${error}`, CONFIG.DEBUG_LEVEL.ERROR);
                                reject(error);
                            }
                        });
                    });
                }
            } catch (error) {
                DebugLogger.log(`获取代币名称请求失败: ${error}`, CONFIG.DEBUG_LEVEL.ERROR);
                return {
                    symbol: 'Unknown Token',
                    dev: '',
                    created_timestamp: null,
                    launch_time: null
                };
            }
        }

        async parsePageData() {
            try {
                this.createProgressBar();
                DebugLogger.log('开始解析页面数据');
                this.updateProgressBar(10);

                this.currentCA = this.extractCAFromUrl();
                if (!this.currentCA) {
                    DebugLogger.log('未找到合约地址', CONFIG.DEBUG_LEVEL.ERROR);
                    return;
                }

                this.updateProgressBar(30);
                this.tokenName = await this.fetchTokenName(this.currentCA);

                // 更新JSON提取策略
                const extractJSON = (content) => {
                    try {
                        const jsonData = JSON.parse(content);
                        // 检查是否符合预期的数据结构
                        if (jsonData.code === 0 && Array.isArray(jsonData.data)) {
                            return jsonData.data;
                        }
                    } catch (parseError) {
                        DebugLogger.log(`JSON解析失败: ${parseError}`, CONFIG.DEBUG_LEVEL.ERROR);
                    }
                    return null;
                };

                // 尝试从不同来源提取JSON
                let data = null;
                const sources = [
                    // 尝试从<pre>标签中提取
                    () => {
                        const preElement = document.querySelector('pre[hidden]');
                        return preElement ? extractJSON(preElement.textContent) : null;
                    },
                    // 尝试从script标签中提取
                    () => {
                        const scripts = document.getElementsByTagName('script');
                        for (let script of scripts) {
                            const jsonData = extractJSON(script.textContent);
                            if (jsonData) return jsonData;
                        }
                        return null;
                    },
                    // 尝试从body的innerHTML中提取
                    () => extractJSON(document.body.innerHTML)
                ];

                for (let source of sources) {
                    data = source();
                    if (data) break;
                }

                if (!data) {
                    DebugLogger.log('未找到有效的JSON数据', CONFIG.DEBUG_LEVEL.ERROR);
                    return;
                }

                // 过滤掉低于最低利润阈值的交易者
                const filteredData = data.filter(item =>
                    (item.realized_profit || 0) >= CONFIG.MIN_REALIZED_PROFIT
                );

                // 按照realized_profit降序排序
                filteredData.sort((a, b) => (b.realized_profit || 0) - (a.realized_profit || 0));

                // 只保留前20名（或更少）
                const topTraders = filteredData.slice(0, CONFIG.MAX_TRADERS);

                DebugLogger.log(`解析到 ${data.length} 条交易数据，过滤后 ${filteredData.length} 条，保留前 ${topTraders.length} 名`, CONFIG.DEBUG_LEVEL.INFO);

                // 打印前5条数据的详细信息
                const previewData = topTraders.slice(0, 5).map((item, index) => ({
                    '排名': index + 1,
                    'Address': item.address,
                    '买入量': Math.round(item.buy_volume_cur || 0),
                    '卖出量': Math.round(item.sell_volume_cur || 0),
                    '实现利润': Math.round(item.realized_profit || 0),
                    '用户名': item.name || 'Unknown',
                    'Twitter用户名': item.twitter_username || 'N/A'
                }));
                DebugLogger.logTable(previewData, '交易数据预览（前5条）');

                this.updateProgressBar(70);

                const processedTraders = [];
                for (const [index, item] of topTraders.entries()) {
                    // 计算持有时间
                    const startHoldingAtTimestamp = item.start_holding_at * 1000; // 转换为毫秒
                    let holdingPeriod = null;
                    if (item.end_holding_at === null) {
                        // 如果没有卖出过，用当前时间计算
                        holdingPeriod = Math.round((Date.now() - startHoldingAtTimestamp) / 60000); // 转换为分钟
                    } else {
                        // 如果有卖出时间，使用卖出时间计算
                        const endHoldingAt = item.end_holding_at * 1000;
                        holdingPeriod = Math.round((endHoldingAt - startHoldingAtTimestamp) / 60000); // 转换为分钟
                    }

                    // 计算 buy_after_launch_interval
                    const createTime = this.tokenName.created_timestamp;
                    const launchTime = this.tokenName.launch_time;
                    let buyAfterLaunchInterval = null;

                    if (startHoldingAtTimestamp && createTime) {
                        if (launchTime && startHoldingAtTimestamp > launchTime) {
                            buyAfterLaunchInterval = Math.round((startHoldingAtTimestamp - launchTime) / 1000); // 转换为秒
                        } else {
                            buyAfterLaunchInterval = Math.round((startHoldingAtTimestamp - createTime) / 1000); // 转换为秒
                        }
                    }

                    const trader = {
                        token: this.tokenName.symbol,
                        ca: this.currentCA,
                        address: item.address,
                        buy_volume: Math.round(item.buy_volume_cur) || 0,
                        sell_volume: Math.round(item.sell_volume_cur) || 0,
                        realized_profit: Math.round(item.realized_profit) || 0,
                        twitter_username: item.twitter_username || '',
                        user_name: item.name || '',
                        profit_tag: index + 1, // 使用循环的索引i代替之前未定义的index
                        tag_1: '',
                        tag_2: '',
                        tag_3: '',
                        update_time: this.getBeijingTime(),
                        dev: this.tokenName.dev,
                        create_time: this.tokenName.created_timestamp,
                        launch_time: this.tokenName.launch_time ? new Date(this.tokenName.launch_time).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : null,
                        sol_balance: Number((item.sol_balance / Math.pow(10, 8)).toFixed(1)),
                        last_active_time: item.last_active_timestamp ? new Date(item.last_active_timestamp * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : null,
                        start_holding_at: new Date(item.start_holding_at * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
                        end_holding_at: item.end_holding_at
                            ? new Date(item.end_holding_at * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
                            : null,
                        holding_period: holdingPeriod,
                        buy_after_launch_interval: buyAfterLaunchInterval
                    };

                    await this.db.upsertTrader(trader);
                    processedTraders.push(trader);
                    this.updateProgressBar(70 + (index + 1) / topTraders.length * 30);
                }

                // 打印处理的交易者数据
                DebugLogger.logTable(processedTraders, '处理的交易者数据');

                DebugLogger.log('数据更新成功', CONFIG.DEBUG_LEVEL.INFO);
                this.updateProgressBar(100);
                setTimeout(() => {
                    if (this.progressBar) {
                        this.progressBar.remove();
                    }
                }, 2000);

            } catch (error) {
                DebugLogger.log(`处理数据失败: ${error}`, CONFIG.DEBUG_LEVEL.ERROR);
                if (this.progressBar) {
                    this.progressBar.remove();
                }
            }
        }

        /**
         * 从Excel导入数据
         */
        async importFromExcel(file) {
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    // 显示导入进度
                    const progressBar = document.createElement('div');
                    progressBar.style.cssText = `
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: white;
                        padding: 20px;
                        border-radius: 5px;
                        box-shadow: 0 0 10px rgba(0,0,0,0.5);
                        z-index: 10002;
                    `;
                    progressBar.textContent = '正在导入数据...';
                    document.body.appendChild(progressBar);

                    let importedCount = 0;
                    for (const row of jsonData) {
                        const trader = {
                            name: row['名称'],
                            ca: row['合约'],
                            address: row['聪明钱'],
                            dev: row['Dev'],
                            launch_time: row['Pump内盘发射'] !== 'N/A' ? new Date(row['Pump内盘发射']).getTime() : null,
                            sol_balance: row['SOL余额'] !== 'N/A' ? parseFloat(row['SOL余额']) : null,
                            last_active_time: row['最后活跃时间'],
                            start_holding_at: row['买入时间'],
                            end_holding_at: row['卖出时间'],
                            holding_period: row['持有时长(分钟)'] !== 'N/A' ? parseInt(row['持有时长(分钟)']) : null,
                            buy_volume: parseInt(row['买入金额'].replace(/,/g, '')),
                            sell_volume: parseInt(row['卖出金额'].replace(/,/g, '')),
                            realized_profit: parseInt(row['到手利润'].replace(/,/g, '')),
                            twitter_username: row['Twitter'],
                            user_name: row['用户名'],
                            profit_tag: parseInt(row['利润排名']),
                            update_time: row['更新时间'],

                            // 新增 buy_after_launch_interval 字段
                            buy_after_launch_interval: row['Pump到买入(秒)'] !== 'N/A' ? parseInt(row['Pump到买入(秒)']) : null
                        };

                        await this.db.upsertTrader(trader);
                        importedCount++;
                        progressBar.textContent = `正在导入数据... (${importedCount}/${jsonData.length})`;
                    }

                    document.body.removeChild(progressBar);
                    this.loadAndDisplayData(); // 刷新显示
                    alert(`成功导入 ${importedCount} 条数据`);

                } catch (error) {
                    console.error('导入失败:', error);
                    alert('导入失败: ' + error.message);
                }
            };
            reader.readAsArrayBuffer(file);
        }

        /**
         * 创建数据导出和查看的UI界面
         */
        createDataViewerUI() {
            // 创建遮罩层
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: none;
            `;

            // 创建模态框容器
            this.dataViewerModal = document.createElement('div');
            this.dataViewerModal.style.cssText = `
                position: fixed;
                top: 40%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 95%;
                max-width: 1800px;
                max-height: 90%;
                background: white;
                border: 2px solid #4CAF50;
                border-radius: 10px;
                padding: 20px;
                z-index: 10001;
                overflow: hidden;
                display: none;
                flex-direction: column;
            `;

            // 点击遮罩层关闭窗口
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    this.toggleDataViewer();
                }
            };

            // 将模态框添加到遮罩层中
            overlay.appendChild(this.dataViewerModal);
            document.body.appendChild(overlay);

            // 标题
            const title = document.createElement('h2');
            title.textContent = '聪明钱数据库';
            title.style.cssText = 'margin-bottom: 15px; text-align: center; color: #4CAF50;';
            this.dataViewerModal.appendChild(title);

            // 添加查询控件容器
            const queryContainer = document.createElement('div');
            queryContainer.style.cssText = 'display: flex; gap: 10px; margin-bottom: 15px; align-items: center;';

            // 添加查询类型选择
            const queryTypeSelect = document.createElement('select');
            queryTypeSelect.style.cssText = 'padding: 5px; border-radius: 4px; border: 1px solid #ddd;';
            ['名称', '合约', '聪明钱', 'Dev'].forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                queryTypeSelect.appendChild(option);
            });

            // 添加查询输入框
            const queryInput = document.createElement('input');
            queryInput.type = 'text';
            queryInput.placeholder = '请输入查询内容';
            queryInput.style.cssText = 'padding: 5px; border-radius: 4px; border: 1px solid #ddd; flex-grow: 1;';

            // 添加查询按钮
            const queryButton = document.createElement('button');
            queryButton.textContent = '查询';
            queryButton.style.cssText = 'background-color: #4CAF50; color: white; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer;';
            queryButton.onclick = () => this.loadAndDisplayData(queryTypeSelect.value, queryInput.value);

            // 添加重置按钮
            const resetButton = document.createElement('button');
            resetButton.textContent = '重置';
            resetButton.style.cssText = 'background-color: #f44336; color: white; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer;';
            resetButton.onclick = () => {
                queryInput.value = '';
                this.loadAndDisplayData();
            };

            // 添加页面大小选择器
            const pageSizeContainer = document.createElement('div');
            pageSizeContainer.style.cssText = 'display: flex; align-items: center; margin-right: 15px;';

            const pageSizeLabel = document.createElement('span');
            pageSizeLabel.textContent = '每页显示：';
            pageSizeLabel.style.marginRight = '5px';

            const pageSizeSelect = document.createElement('select');
            pageSizeSelect.style.cssText = 'padding: 5px; border-radius: 4px; border: 1px solid #ddd;';

            [200, 500, 1000, 'ALL'].forEach(size => {
                const option = document.createElement('option');
                option.value = size;
                option.textContent = size === 'ALL' ? '全部' : `${size}条`;
                pageSizeSelect.appendChild(option);
            });

            pageSizeSelect.value = this.pageSize;
            pageSizeSelect.onchange = () => {
                this.pageSize = pageSizeSelect.value === 'ALL' ? Number.MAX_SAFE_INTEGER : parseInt(pageSizeSelect.value);
                this.currentPage = 1;
                this.loadAndDisplayData();
            };

            pageSizeContainer.appendChild(pageSizeLabel);
            pageSizeContainer.appendChild(pageSizeSelect);
            queryContainer.appendChild(pageSizeContainer);

            queryContainer.appendChild(queryTypeSelect);
            queryContainer.appendChild(queryInput);
            queryContainer.appendChild(queryButton);
            queryContainer.appendChild(resetButton);

            // 在queryContainer中添加字段选择按钮
            const fieldSelectButton = document.createElement('button');
            fieldSelectButton.textContent = '选择显示字段';
            fieldSelectButton.style.cssText = `
                background-color: #2196F3;
                color: white;
                border: none;
                padding: 6px 15px;
                border-radius: 4px;
                cursor: pointer;
                margin-left: 10px;
            `;
            fieldSelectButton.onclick = () => this.showFieldSelector();
            queryContainer.appendChild(fieldSelectButton);

            this.dataViewerModal.appendChild(queryContainer);

            // 表格容器
            const tableContainer = document.createElement('div');
            tableContainer.style.cssText = 'overflow-x: auto; max-height: 600px; overflow-y: scroll;';
            this.dataViewerModal.appendChild(tableContainer);

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'display: flex; justify-content: center; gap: 10px; margin-top: 15px;';

            // 导入Excel按钮
            const importButton = document.createElement('button');
            importButton.textContent = '导入Excel';
            importButton.style.cssText = 'background-color: #2196F3; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;';

            // 隐藏的文件输入框
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.xlsx,.xls';
            fileInput.style.display = 'none';
            fileInput.onchange = (e) => this.importFromExcel(e.target.files[0]);

            importButton.onclick = () => fileInput.click();

            // 导出Excel按钮
            const exportButton = document.createElement('button');
            exportButton.textContent = '导出Excel';
            exportButton.style.cssText = 'background-color: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;';
            exportButton.onclick = () => this.exportToExcel();

            // 关闭按钮
            const closeButton = document.createElement('button');
            closeButton.textContent = '关闭';
            closeButton.style.cssText = 'background-color: #f44336; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;';
            closeButton.onclick = () => this.toggleDataViewer();

            // 添加数据源测试按钮
            const testDataSourceButton = document.createElement('button');
            testDataSourceButton.textContent = '数据源测试';
            testDataSourceButton.style.cssText = 'background-color: #9c27b0; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;';

            // 创建测试窗口
            testDataSourceButton.onclick = () => {
                document.body.appendChild(this.createTestWindow());
            };

            buttonContainer.appendChild(importButton);
            buttonContainer.appendChild(fileInput);
            buttonContainer.appendChild(exportButton);
            buttonContainer.appendChild(closeButton);
            buttonContainer.appendChild(testDataSourceButton);
            this.dataViewerModal.appendChild(buttonContainer);
        }

        /**
         * 切换数据查看器的显示/隐藏
         */
        toggleDataViewer() {
            try {
                if (!this.db || !this.db.db) {
                    console.error('数据库未初始化');
                    alert('数据库未初始化，请刷新页面重试');
                    return;
                }

                if (!this.dataViewerModal) {
                    this.createDataViewerUI();
                }

                const overlay = this.dataViewerModal.parentElement;
                const currentDisplay = overlay.style.display;
                if (currentDisplay === 'none' || currentDisplay === '') {
                    overlay.style.display = 'block';
                    this.dataViewerModal.style.display = 'flex';
                    this.loadAndDisplayData();
                } else {
                    overlay.style.display = 'none';
                    this.dataViewerModal.style.display = 'none';
                }
            } catch (error) {
                console.error('切换数据查看器失败:', error);
                alert('操作失败，请刷新页面重试');
            }
        }

        /**
         * 格式化数字为千位符显示
         * @param {number} num 要格式化的数字
         * @param {number} decimals 小数位数，默认为2
         * @returns {string} 格式化后的字符串
         */
        formatNumberWithCommas(num, decimals = 0) {
            if (num === null || num === undefined) return 'N/A';
            return num.toLocaleString('zh-CN', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
        }

        /**
         * 加载并显示数据库中的数据
         * @param {string} queryType 查询类型
         * @param {string} queryValue 查询值
         */
        async loadAndDisplayData(queryType = '', queryValue = '') {
            const tableContainer = this.dataViewerModal.children[2];
            const endTimer = this.performanceMonitor.startTimer('loadData');

            // 添加加载提示
            tableContainer.innerHTML = `
                <div class="loading-indicator" style="text-align: center; padding: 20px;">
                    <div style="font-size: 16px; color: #666;">正在加载数据...</div>
                </div>
            `;

            try {
                DebugLogger.log('开始加载数据...', 'info');
                const transaction = this.db.db.transaction([this.db.storeName], 'readonly');
                const store = transaction.objectStore(this.db.storeName);

                // 获取所有记录以计算总数
                const getAllRequest = store.getAll();

                getAllRequest.onsuccess = () => {
                    try {
                        const allRecords = getAllRequest.result;
                        const uniqueTokens = new Set(allRecords.map(record => record.token));
                        const totalRecords = allRecords.length;
                        const totalTokens = uniqueTokens.size;

                        // 更新标题显示总记录数和总代币数
                        const title = this.dataViewerModal.querySelector('h2');
                        title.textContent = `聪明钱数据库 (总计${totalTokens}个代币，${totalRecords}条记录)`;

                        // 继续原有的分页逻辑
                        const countRequest = store.count();

                        countRequest.onerror = (event) => {
                            const error = `获取记录数失败: ${event.target.error}`;
                            DebugLogger.log(error, 'error');
                            throw new Error(error);
                        };

                        countRequest.onsuccess = (event) => {
                            try {
                                const totalRecords = event.target.result;
                                DebugLogger.log(`总记录数: ${totalRecords}`, 'info');
                                this.totalPages = Math.ceil(totalRecords / this.pageSize);

                                // 获取当前页的数据
                                const offset = (this.currentPage - 1) * this.pageSize;
                                const cursorRequest = store.openCursor();
                                const pageData = [];
                                let count = 0;

                                cursorRequest.onerror = (event) => {
                                    const error = `打开游标失败: ${event.target.error}`;
                                    DebugLogger.log(error, 'error');
                                    throw new Error(error);
                                };

                                cursorRequest.onsuccess = (event) => {
                                    try {
                                        const cursor = event.target.result;
                                        if (cursor && count < offset) {
                                            count++;
                                            cursor.continue();
                                        } else if (cursor && pageData.length < this.pageSize) {
                                            // 应用查询过滤
                                            const trader = cursor.value;
                                            if (!queryType || !queryValue || this.matchesQuery(trader, queryType, queryValue)) {
                                                pageData.push(trader);
                                                DebugLogger.log(`加载记录: ${trader.ca} - ${trader.address}`, 'info');
                                            }
                                            cursor.continue();
                                        } else {
                                            // 清除加载提示
                                            const loadingIndicator = tableContainer.querySelector('.loading-indicator');
                                            if (loadingIndicator) {
                                                loadingIndicator.remove();
                                            }

                                            // 渲染数据和分页控件
                                            DebugLogger.log(`本页加载完成，共 ${pageData.length} 条记录`, 'info');
                                            this.renderTableWithData(pageData, tableContainer);

                                            // 移除旧的分页控件
                                            const oldPagination = this.dataViewerModal.querySelector('.pagination-container');
                                            if (oldPagination) {
                                                oldPagination.remove();
                                            }

                                            // 渲染新的分页控件
                                            this.renderPagination(totalRecords);

                                            const duration = endTimer();
                                            DebugLogger.log(`数据加载耗时: ${duration.toFixed(2)}ms`, 'info');
                                        }
                                    } catch (error) {
                                        DebugLogger.log(`处理游标数据失败: ${error}`, 'error');
                                        tableContainer.innerHTML = `
                                            <div style="text-align: center; padding: 20px; color: #f44336;">
                                                <div>数据处理失败: ${error.message || '未知错误'}</div>
                                                <button onclick="location.reload()" style="margin-top: 10px; padding: 5px 10px;">刷新页面</button>
                                            </div>
                                        `;
                                    }
                                };
                            } catch (error) {
                                DebugLogger.log(`处理记录数据失败: ${error}`, 'error');
                                throw error;
                            }
                        };

                    } catch (error) {
                        DebugLogger.log(`获取数据失败: ${error}`, 'error');
                        throw error;
                    }
                };

                getAllRequest.onerror = (event) => {
                    DebugLogger.log(`获取数据失败: ${event.target.error}`, 'error');
                    throw event.target.error;
                };

            } catch (error) {
                DebugLogger.log(`加载数据失败: ${error}`, 'error');
                tableContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #f44336;">
                        <div>数据加载失败: ${error.message || '未知错误'}</div>
                        <button onclick="location.reload()" style="margin-top: 10px; padding: 5px 10px;">刷新页面</button>
                    </div>
                `;
            }
        }

        // 添加分页控件渲染方法
        renderPagination(totalRecords) {
            const paginationContainer = document.createElement('div');
            paginationContainer.className = 'pagination-container';
            paginationContainer.style.cssText = `
                display: flex;
                justify-content: center;
                align-items: center;
                margin-top: 20px;
                gap: 10px;
            `;

            // 添加页码按钮
            const addPageButton = (text, page, disabled = false) => {
                const button = document.createElement('button');
                button.textContent = text;
                button.style.cssText = `
                    padding: 5px 10px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    background: ${disabled ? '#f5f5f5' : 'white'};
                    cursor: ${disabled ? 'default' : 'pointer'};
                    color: ${disabled ? '#999' : '#333'};
                `;
                if (!disabled) {
                    button.onclick = () => {
                        this.currentPage = page;
                        this.loadAndDisplayData();
                    };
                }
                paginationContainer.appendChild(button);
            };

            // 上一页
            addPageButton('上一页', this.currentPage - 1, this.currentPage === 1);

            // 页码
            for (let i = Math.max(1, this.currentPage - 2); i <= Math.min(this.totalPages, this.currentPage + 2); i++) {
                addPageButton(i.toString(), i, i === this.currentPage);
            }

            // 下一页
            addPageButton('下一页', this.currentPage + 1, this.currentPage === this.totalPages);

            // 显示总记录数和当前页信息
            const info = document.createElement('span');
            info.textContent = `共 ${totalRecords} 条记录，第 ${this.currentPage}/${this.totalPages} 页`;
            paginationContainer.appendChild(info);

            this.dataViewerModal.appendChild(paginationContainer);
        }

        // 添加查询匹配方法
        matchesQuery(trader, queryType, queryValue) {
            const queryMap = {
                '名称': 'token',
                '合约': 'ca',
                '聪明钱': 'address',
                'Dev': 'dev'
            };
            const field = queryMap[queryType];
            return String(trader[field]).toLowerCase().includes(queryValue.toLowerCase());
        }

        // 添加表格数据渲染方法
        renderTableWithData(traders, container) {
            const endTimer = this.performanceMonitor.startTimer('renderTable');

            // 创建表格
            const table = document.createElement('table');
            table.style.cssText = 'width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 14px;';

            // 获取当前的查询参数
            const queryTypeSelect = this.dataViewerModal.querySelector('select');
            const queryInput = this.dataViewerModal.querySelector('input[type="text"]');
            const currentQueryType = queryTypeSelect ? queryTypeSelect.value : '';
            const currentQueryValue = queryInput ? queryInput.value : '';

            // 定义列宽配置
            const columnWidths = {
                'NO.': '20px',  // 添加序号列的宽度
                '名称': '50px',
                '合约': '100px',
                '聪明钱': '100px',
                'Dev': '100px',
                'Pump内盘发射': '120px',
                'SOL余额': '80px',
                '最后活跃时间': '120px',
                '买入时间': '120px',
                '卖出时间': '120px',
                'Pump到买入(秒)': '100px',
                '持有时长(分钟)': '100px',
                '买入金额': '60px',
                '卖出金额': '60px',
                '到手利润': '70px',
                'Twitter': '50px',
                '用户名': '50px',
                '排名': '30px',
                '标签1': '50px',
                '标签2': '50px',
                '标签3': '50px',

                '更新时间': '120px'
            };

            // 创建表头
            const thead = document.createElement('thead');
            thead.style.cssText = 'background-color: #f2f2f2; position: sticky; top: 0; z-index: 1;';

            // 添加必要的样式
            const styleSheet = document.createElement('style');
            styleSheet.textContent = `
                .smart-money-row {
                    transition: background-color 0.2s ease;
                }
                .smart-money-row:hover {
                    background-color: #f5f5f5;
                }
                .smart-money-row.selected {
                    background-color: #e8f5e9;
                    border-left: 4px solid #4CAF50;
                }
            `;
            document.head.appendChild(styleSheet);

            const headerRow = document.createElement('tr');
            const headers = [
                'NO.',  // 添加序号列
                '名称', '合约', '聪明钱', 'Dev', 'Pump内盘发射',
                'SOL余额', '最后活跃时间', '买入时间', '卖出时间', 'Pump到买入(秒)', '持有时长(分钟)',
                '买入金额', '卖出金额', '到手利润',
                'Twitter', '用户名', '排名', '标签1', '标签2', '标签3', '更新时间'
            ];

            headers.forEach((headerText, index) => {
                if (this.selectedFields.has(headerText)) {
                    const th = document.createElement('th');
                    th.textContent = headerText;
                    th.style.cssText = `
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                        font-size: 14px;
                        background-color: #f2f2f2;
                        cursor: pointer;
                        width: ${columnWidths[headerText]};
                        position: relative;
                        user-select: none;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    `;

                    // 添加排序点击事件
                    th.onclick = () => this.sortTableByColumn(table, index);

                    // 添加拖拽调整宽度功能
                    const resizer = document.createElement('div');
                    resizer.style.cssText = `
                        width: 5px;
                        height: 100%;
                        background: #0000;
                        position: absolute;
                        right: 0;
                        top: 0;
                        cursor: col-resize;
                    `;
                    resizer.addEventListener('mousedown', (e) => this.initColumnResize(e, th));
                    th.appendChild(resizer);

                    headerRow.appendChild(th);
                }
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            // 创建表体
            const tbody = document.createElement('tbody');

            // 生成地址和Dev的颜色映射
            const addressColors = new Map();
            const devColors = new Map();
            const usedColors = new Set();
            const colors = [
                '#FFB6C1', '#98FB98', '#87CEFA', '#DDA0DD', '#F0E68C',
                '#E6E6FA', '#FFA07A', '#98FF98', '#B0E0E6', '#FFB6C1',
                '#FFDAB9', '#B0C4DE', '#F0FFF0', '#FFF0F5', '#F5F5DC'
            ];

            // 为重复的地址分配颜色
            traders.forEach(trader => {
                if (trader.address && !addressColors.has(trader.address)) {
                    const sameAddresses = traders.filter(t => t.address === trader.address);
                    if (sameAddresses.length > 1) {
                        let color;
                        do {
                            color = colors[Math.floor(Math.random() * colors.length)];
                        } while (usedColors.has(color));
                        usedColors.add(color);
                        addressColors.set(trader.address, color);
                    }
                }
            });

            // 为重复的Dev分配颜色
            traders.forEach(trader => {
                if (trader.dev && !devColors.has(trader.dev)) {
                    const sameDevs = traders.filter(t => t.dev === trader.dev);
                    if (sameDevs.length > 1) {
                        let color;
                        do {
                            color = colors[Math.floor(Math.random() * colors.length)];
                        } while (usedColors.has(color));
                        usedColors.add(color);
                        devColors.set(trader.dev, color);
                    }
                }
            });

            // 按照更新时间倒序、合约和profit_tag顺序排序
            const sortedTraders = traders.sort((a, b) => {
                const timeComparison = new Date(b.update_time) - new Date(a.update_time);
                if (timeComparison !== 0) return timeComparison;
                const caComparison = a.ca.localeCompare(b.ca);
                if (caComparison !== 0) return caComparison;
                return (a.profit_tag || 0) - (b.profit_tag || 0);
            });

            // 更新标题显示查询结果数量和代币数量
            const title = this.dataViewerModal.children[0];
            const totalCount = traders.length;
            const filteredCount = sortedTraders.length;
            const uniqueTokens = new Set(sortedTraders.map(trader => trader.token));
            const tokenCount = uniqueTokens.size;
            const totalUniqueTokens = new Set(traders.map(trader => trader.token)).size;

            // 使用正确获取的查询参数
            if (currentQueryType && currentQueryValue) {
                title.textContent = `聪明钱数据库 (查询到 ${filteredCount} 条记录，${tokenCount}个代币，总计${totalCount}条记录，${totalUniqueTokens}个代币)`;
            } else {
                title.textContent = `聪明钱数据库 (共${totalUniqueTokens}个代币，${totalCount}条记录)`;
            }

            // 创建表体
            sortedTraders.forEach((trader, index) => {
                const row = document.createElement('tr');
                row.className = 'smart-money-row';
                row.style.cssText = 'border-bottom: 1px solid #ddd;';

                // 添加行点击事件
                row.onclick = (e) => {
                    // 如果点击的是链接或输入框，不触发行选择
                    if (e.target.tagName === 'A' || e.target.tagName === 'INPUT') return;

                    // 移除其他行的选中状态
                    tbody.querySelectorAll('.smart-money-row').forEach(r => {
                        r.classList.remove('selected');
                    });
                    // 添加当前行的选中状态
                    row.classList.add('selected');
                };

                const rowData = [
                    (this.currentPage - 1) * this.pageSize + index + 1,  // 添加序号
                    trader.token,
                    trader.ca,
                    trader.address,
                    trader.dev || 'N/A',
                    trader.launch_time ? new Date(trader.launch_time).toLocaleString() : 'N/A',

                    // 新增字段
                    this.formatNumberWithCommas(trader.sol_balance, 1) || 'N/A',
                    trader.last_active_time || 'N/A',
                    trader.start_holding_at || 'N/A',
                    trader.end_holding_at || 'N/A',
                    trader.buy_after_launch_interval !== undefined ? this.formatNumberWithCommas(trader.buy_after_launch_interval) : 'N/A',

                    trader.holding_period !== undefined ? this.formatNumberWithCommas(trader.holding_period) : 'N/A',

                    this.formatNumberWithCommas(trader.buy_volume),
                    this.formatNumberWithCommas(trader.sell_volume),
                    this.formatNumberWithCommas(trader.realized_profit),
                    trader.twitter_username || 'N/A',
                    trader.user_name || 'N/A',
                    trader.profit_tag || 'N/A',
                    trader.tag_1 || '',
                    trader.tag_2 || '',
                    trader.tag_3 || '',
                    trader.update_time,
                ];

                rowData.forEach((cellData, index) => {
                    if (this.selectedFields.has(headers[index])) {
                        const td = document.createElement('td');
                        td.dataset.columnIndex = index;
                        td.dataset.originalValue = cellData;

                        // 可编辑的列（除了某些特殊列）
                        const editableColumns = [0, 3, 18, 19, 20]; // 名称、Dev、标签1、标签2、标签3

                        // 处理Twitter链接
                        if (index === 15 && cellData !== 'N/A') {  // Twitter列
                            const link = document.createElement('a');
                            link.href = `https://x.com/${cellData}`;
                            link.target = '_blank';
                            link.textContent = cellData;
                            link.style.cssText = `
                                color: #1DA1F2;
                                text-decoration: none;
                            `;
                            link.onmouseover = () => link.style.textDecoration = 'underline';
                            link.onmouseout = () => link.style.textDecoration = 'none';
                            td.appendChild(link);
                        } else {
                            // 可编辑单元格的处理
                            if (editableColumns.includes(index)) {
                                td.style.cursor = 'text';
                                td.textContent = cellData;

                                td.ondblclick = (e) => {
                                    const currentTrader = trader; // 保存当前行的 trader 数据
                                    // 创建输入框
                                    const input = document.createElement('input');
                                    input.type = 'text';
                                    input.value = cellData;
                                    input.style.cssText = `
                                        width: 100%;
                                        border: 1px solid #4CAF50;
                                        padding: 4px;
                                        box-sizing: border-box;
                                    `;

                                    // 创建操作按钮容器
                                    const actionContainer = document.createElement('div');
                                    actionContainer.style.cssText = `
                                        display: flex;
                                        margin-left: 5px;
                                    `;

                                    // 确认按钮
                                    const confirmBtn = document.createElement('button');
                                    confirmBtn.innerHTML = '✓';
                                    confirmBtn.style.cssText = `
                                        background-color: green;
                                        color: white;
                                        border: none;
                                        padding: 4px 8px;
                                        margin-right: 5px;
                                        cursor: pointer;
                                    `;

                                    // 取消按钮
                                    const cancelBtn = document.createElement('button');
                                    cancelBtn.innerHTML = '✗';
                                    cancelBtn.style.cssText = `
                                        background-color: red;
                                        color: white;
                                        border: none;
                                        padding: 4px 8px;
                                        cursor: pointer;
                                    `;

                                    // 替换单元格内容
                                    td.innerHTML = '';
                                    td.appendChild(input);
                                    actionContainer.appendChild(confirmBtn);
                                    actionContainer.appendChild(cancelBtn);
                                    td.appendChild(actionContainer);

                                    input.focus();

                                    // 确认更新
                                    confirmBtn.onclick = async () => {
                                        const newValue = input.value;

                                        // 更新数据库
                                        try {
                                            const transaction = this.db.db.transaction([this.db.storeName], 'readwrite');
                                            const store = transaction.objectStore(this.db.storeName);

                                            // 根据列类型执行不同的更新逻辑
                                            let addressIndex;
                                            let addressRequest;
                                            let tagField;

                                            switch(index) {
                                                case 0: // token名称列
                                                    {
                                                        // 获取所有相同CA的记录
                                                        const caIndex = store.index('ca');
                                                        const caRequest = caIndex.getAll(IDBKeyRange.only(currentTrader.ca));

                                                        caRequest.onsuccess = async () => {
                                                            const tradersWithSameCA = caRequest.result;
                                                            for (const trader of tradersWithSameCA) {
                                                                trader.token = newValue;
                                                                await store.put(trader);
                                                            }
                                                            DebugLogger.log(`批量更新token名称成功: ${tradersWithSameCA.length}条记录`, CONFIG.DEBUG_LEVEL.INFO);
                                                            // 刷新表格显示
                                                            this.loadAndDisplayData();
                                                        };
                                                    }
                                                    break;

                                                case 3: // Dev列
                                                    {
                                                        // 获取所有相同CA的记录
                                                        const caIndex = store.index('ca');
                                                        const caRequest = caIndex.getAll(IDBKeyRange.only(currentTrader.ca));

                                                        caRequest.onsuccess = async () => {
                                                            const tradersWithSameCA = caRequest.result;
                                                            for (const trader of tradersWithSameCA) {
                                                                trader.dev = newValue;
                                                                await store.put(trader);
                                                            }
                                                            DebugLogger.log(`批量更新Dev成功: ${tradersWithSameCA.length}条记录`, CONFIG.DEBUG_LEVEL.INFO);
                                                            // 刷新表格显示
                                                            this.loadAndDisplayData();
                                                        };
                                                    }
                                                    break;

                                                case 17: // tag_1
                                                case 18: // tag_2
                                                case 19: // tag_3
                                                    {
                                                        addressIndex = store.index('address');
                                                        addressRequest = addressIndex.getAll(IDBKeyRange.only(currentTrader.address));
                                                        tagField = index === 17 ? 'tag_1' : (index === 18 ? 'tag_2' : 'tag_3');

                                                        addressRequest.onsuccess = async () => {
                                                            const tradersWithSameAddress = addressRequest.result;
                                                            for (const trader of tradersWithSameAddress) {
                                                                trader[tagField] = newValue;
                                                                await store.put(trader);
                                                            }
                                                            DebugLogger.log(`批量更新${tagField}成功: ${tradersWithSameAddress.length}条记录`, CONFIG.DEBUG_LEVEL.INFO);
                                                            // 刷新表格显示
                                                            this.loadAndDisplayData();
                                                        };
                                                    }
                                                    break;

                                                default:
                                                    {
                                                        // 其他列的单条更新逻辑
                                                        const traderIndex = store.index('ca_address');
                                                        const request = traderIndex.get(IDBKeyRange.only([currentTrader.ca, currentTrader.address]));

                                                        request.onsuccess = () => {
                                                            const traderToUpdate = request.result;
                                                            if (traderToUpdate) {
                                                                // 根据列更新不同的字段
                                                                switch(index) {
                                                                    case 3: traderToUpdate.dev = newValue; break;
                                                                }

                                                                // 更新数据库记录
                                                                const updateRequest = store.put(traderToUpdate);
                                                                updateRequest.onsuccess = () => {
                                                                    td.textContent = newValue;
                                                                    td.dataset.originalValue = newValue;
                                                                    DebugLogger.log(`更新成功: ${newValue}`, CONFIG.DEBUG_LEVEL.INFO);
                                                                };
                                                                updateRequest.onerror = () => {
                                                                    DebugLogger.log('更新失败', CONFIG.DEBUG_LEVEL.ERROR);
                                                                    td.textContent = cellData; // 恢复原值
                                                                };
                                                            }
                                                        };
                                                    }
                                            }

                                        } catch (error) {
                                            DebugLogger.log(`更新错误: ${error}`, CONFIG.DEBUG_LEVEL.ERROR);
                                            td.textContent = cellData; // 恢复原值
                                        }
                                    };

                                    // 取消编辑
                                    cancelBtn.onclick = () => {
                                        td.textContent = cellData;
                                    };
                                };
                            } else {
                                td.textContent = cellData;
                            }
                        }

                        td.style.cssText = `
                            border: 1px solid #ddd;
                            padding: 8px;
                            font-size: 12px;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        `;

                        // 处理利润高亮
                        if (index === 14) {// realized_profit列
                            const profit = parseFloat(cellData.replace(/,/g, ''));
                            if (!isNaN(profit)) {// 确保转换后是有效数字
                                if (profit >= 100000) {
                                    // 超过10万的更醒目显示
                                    td.style.cssText += `
                                        color: #ff0000 !important;
                                        font-weight: bold !important;
                                        background-color: #fff0f0 !important;
                                        font-size: 14px !important;
                                        text-shadow: 0 0 1px rgba(255,0,0,0.3) !important;
                                        border-left: 3px solid #ff0000 !important;
                                    `;
                                } else if (profit >= 10000) {
                                    // 超过1万的红色显示
                                    td.style.cssText += `
                                        color: #ff0000 !important;
                                        font-weight: bold !important;
                                    `;
                                }
                            }
                        }

                        // 为地址和Dev添加背景色
                        if (index === 2 && addressColors.has(cellData)) {
                            td.style.backgroundColor = addressColors.get(cellData);
                        } else if (index === 3 && devColors.has(cellData)) {
                            td.style.backgroundColor = devColors.get(cellData);
                        }

                        // 如果是查询的字段，添加高亮
                        if (currentQueryType && currentQueryValue && currentQueryType === headers[index] &&
                            String(cellData).toLowerCase().includes(currentQueryValue.toLowerCase())) {
                            td.style.fontWeight = 'bold';
                            td.style.color = '#1a73e8';
                        }

                        td.title = cellData;
                        row.appendChild(td);
                    }
                });

                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            container.appendChild(table);

            const duration = endTimer();
            if (duration > 500) {
                DebugLogger.log(`性能警告: 表格渲染耗时 ${duration.toFixed(2)}ms`, 'warning');
            }
        }

        /**
         * 导出数据到Excel
         */
        exportToExcel() {
            const transaction = this.db.db.transaction([this.db.storeName], 'readonly');
            const store = transaction.objectStore(this.db.storeName);
            const request = store.getAll();

            request.onsuccess = (event) => {
                const traders = event.target.result;
                const worksheet = XLSX.utils.json_to_sheet(traders.map(trader => ({
                    '名称': trader.token,
                    '合约': trader.ca,
                    'Dev': trader.dev || 'N/A',
                    'Pump内盘发射': trader.launch_time ? new Date(trader.launch_time).toLocaleString() : 'N/A',
                    '聪明钱': trader.address,

                    // 新增字段
                    'SOL余额': trader.sol_balance || 'N/A',
                    '最后活跃时间': trader.last_active_time || 'N/A',
                    '买入时间': trader.start_holding_at || 'N/A',
                    '卖出时间': trader.end_holding_at || 'N/A',
                    '持有时长(分钟)': trader.holding_period !== undefined ? trader.holding_period : 'N/A',

                    '买入金额': this.formatNumberWithCommas(trader.buy_volume),
                    '卖出金额': this.formatNumberWithCommas(trader.sell_volume),
                    '到手利润': this.formatNumberWithCommas(trader.realized_profit),
                    'Twitter': trader.twitter_username || 'N/A',
                    '用户名': trader.user_name || 'N/A',
                    '利润排名': trader.profit_tag || 'N/A',
                    '标签1': trader.tag_1 || '',
                    '标签2': trader.tag_2 || '',
                    '标签3': trader.tag_3 || '',
                    'Pump到买入(秒)': trader.buy_after_launch_interval !== undefined ? trader.buy_after_launch_interval : 'N/A',
                    '更新时间': trader.update_time,
                })));

                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, '聪明钱数据库');
                XLSX.writeFile(workbook, `traders_data_${new Date().toISOString().split('T')[0]}.xlsx`);
            };
        }

        /**
         * 在UI中增加数据查看按钮
         */
        createUI() {
            const container = document.createElement('div');
            container.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 9999;
                background: white;
                padding: 10px;
                border: 1px solid #ccc;
                border-radius: 5px;
                display: flex;
                flex-direction: column;
            `;

            const collectButton = document.createElement('button');
            collectButton.textContent = '采集数据';
            collectButton.style.marginBottom = '5px';
            collectButton.onclick = () => this.parsePageData();

            // 新增批量采集按钮
            const batchCollectButton = document.createElement('button');
            batchCollectButton.textContent = '批量采集';
            batchCollectButton.style.cssText = `
                margin-bottom: 5px;
                background-color: #FF4081;
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                transition: all 0.3s ease;
            `;
            batchCollectButton.onmouseover = () => {
                batchCollectButton.style.backgroundColor = '#F50057';
                batchCollectButton.style.transform = 'translateY(-2px)';
            };
            batchCollectButton.onmouseout = () => {
                batchCollectButton.style.backgroundColor = '#FF4081';
                batchCollectButton.style.transform = 'translateY(0)';
            };
            batchCollectButton.onclick = () => this.showBatchCollectWindow();

            const debugButton = document.createElement('button');
            debugButton.textContent = '显示/隐藏日志';
            debugButton.style.marginBottom = '5px';
            debugButton.onclick = () => {
                DebugLogger.logElement.style.display =
                    DebugLogger.logElement.style.display === 'none' ? 'block' : 'none';
            };

            const viewDataButton = document.createElement('button');
            viewDataButton.textContent = '查看数据库';
            viewDataButton.onclick = () => this.toggleDataViewer();

            const testDataSourceButton = document.createElement('button');
            testDataSourceButton.textContent = '数据源测试';
            testDataSourceButton.style.cssText = 'background-color: #9c27b0; color: white; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer; margin-top: 5px;';
            testDataSourceButton.onclick = () => {
                document.body.appendChild(this.createTestWindow());
            };

            container.appendChild(collectButton);
            container.appendChild(batchCollectButton);
            container.appendChild(debugButton);
            container.appendChild(viewDataButton);
            container.appendChild(testDataSourceButton);
            document.body.appendChild(container);
        }

        /**
         * 初始化列宽调整功能
         */
        initColumnResize(e, th) {
            const startX = e.pageX;
            const startWidth = th.offsetWidth;

            const mouseMoveHandler = (e) => {
                const width = startWidth + (e.pageX - startX);
                th.style.width = `${width}px`;
            };

            const mouseUpHandler = () => {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            };

            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        }

        /**
         * 表格列排序功能
         */
        sortTableByColumn(table, columnIndex) {
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const ths = table.querySelectorAll('th');
            const currentTh = ths[columnIndex];

            // 切换排序方向
            const isAscending = currentTh.classList.contains('asc');

            // 清除所有表头的排序标记
            ths.forEach(th => {
                th.classList.remove('asc', 'desc');
                th.style.backgroundColor = '#f2f2f2';
            });

            // 设置当前列的排序标记
            currentTh.classList.add(isAscending ? 'desc' : 'asc');
            currentTh.style.backgroundColor = '#e0e0e0';

            // 排序行
            rows.sort((rowA, rowB) => {
                const cellA = rowA.cells[columnIndex].textContent;
                const cellB = rowB.cells[columnIndex].textContent;

                // 检查是否为数字
                const numA = parseFloat(cellA.replace(/,/g, ''));
                const numB = parseFloat(cellB.replace(/,/g, ''));

                if (!isNaN(numA) && !isNaN(numB)) {
                    return isAscending ? numB - numA : numA - numB;
                }

                // 如果不是数字，按字符串排序
                return isAscending ?
                    cellB.localeCompare(cellA, 'zh-CN') :
                    cellA.localeCompare(cellB, 'zh-CN');
            });

            // 重新插入排序后的行
            rows.forEach(row => tbody.appendChild(row));
        }

        // 添加createTestWindow作为类方法
        createTestWindow() {
            const testWindow = document.createElement('div');
            testWindow.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 80%;
                max-width: 800px;
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                z-index: 10002;
                display: flex;
                flex-direction: column;
                gap: 15px;
            `;

            // 标题
            const title = document.createElement('h3');
            title.textContent = '数据源测试';
            title.style.cssText = 'margin: 0; color: #333; text-align: center; padding-bottom: 15px; border-bottom: 1px solid #eee;';

            // 输入区域容器
            const inputContainer = document.createElement('div');
            inputContainer.style.cssText = 'display: flex; gap: 10px; align-items: center;';

            // API输入框
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = '请输入API地址';
            input.value = 'https://frontend-api-v3.pump.fun/coins/search';
            input.style.cssText = `
                flex: 1;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 5px;
                font-size: 14px;
                transition: border-color 0.3s;
            `;
            input.onfocus = () => input.style.borderColor = '#9c27b0';
            input.onblur = () => input.style.borderColor = '#ddd';

            // 查询按钮
            const queryButton = document.createElement('button');
            queryButton.textContent = '获取数据';
            queryButton.style.cssText = `
                padding: 10px 20px;
                background: #9c27b0;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                transition: background 0.3s;
            `;
            queryButton.onmouseover = () => queryButton.style.background = '#7b1fa2';
            queryButton.onmouseout = () => queryButton.style.background = '#9c27b0';

            // 结果显示区域
            const resultArea = document.createElement('div');
            resultArea.style.cssText = `
                margin-top: 15px;
                padding: 15px;
                border: 1px solid #eee;
                border-radius: 5px;
                max-height: 400px;
                overflow-y: auto;
                background: #f8f9fa;
                font-family: monospace;
                font-size: 14px;
                white-space: pre-wrap;
                word-break: break-all;
            `;

            // 关闭按钮
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                padding: 5px;
                line-height: 1;
            `;
            closeBtn.onclick = () => document.body.removeChild(testWindow);

            // 查询按钮点击事件
            queryButton.onclick = () => {
                resultArea.textContent = '正在获取数据...';
                resultArea.style.color = '#666';

                GM_xmlhttpRequest({
                    method: 'GET',
                    url: input.value,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                        'Origin': 'https://gmgn.ai',
                        'Referer': 'https://gmgn.ai/',
                        'Sec-Fetch-Dest': 'empty',
                        'Sec-Fetch-Mode': 'cors',
                        'Sec-Fetch-Site': 'cross-site'
                    },
                    onload: (response) => {
                        try {
                            const data = JSON.parse(response.responseText);
                            resultArea.innerHTML = `<span style="color: #4CAF50;">✓ 获取成功</span>
<strong>状态码:</strong> ${response.status}
<strong>响应头:</strong>
${response.responseHeaders}

<strong>原始响应内容:</strong>
${response.responseText}

<strong>解析后的JSON数据:</strong>
${JSON.stringify(data, null, 2)}`;
                        } catch (error) {
                            resultArea.innerHTML = `<span style="color: #f44336;">✗ 数据解析错误</span>
<strong>错误详情:</strong> ${error.toString()}
<strong>错误堆栈:</strong>
${error.stack || '无堆栈信息'}

<strong>状态码:</strong> ${response.status}
<strong>响应头:</strong>
${response.responseHeaders}

<strong>原始响应内容:</strong>
${response.responseText}`;
                        }
                    },
                    onerror: (error) => {
                        resultArea.innerHTML = `<span style="color: #f44336;">✗ 请求失败</span>
<strong>错误详情:</strong> ${error.toString()}
<strong>错误信息:</strong> ${error.message || '未知错误'}
<strong>错误堆栈:</strong>
${error.stack || '无堆栈信息'}

<strong>完整错误对象:</strong>
${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`;
                    }
                });
            };

            // 组装界面
            inputContainer.appendChild(input);
            inputContainer.appendChild(queryButton);
            testWindow.appendChild(closeBtn);
            testWindow.appendChild(title);
            testWindow.appendChild(inputContainer);
            testWindow.appendChild(resultArea);

            return testWindow;
        }

        // 获取数据库统计信息
        async getDBStats() {
            return new Promise((resolve, reject) => {
                const transaction = this.db.db.transaction([this.db.storeName], 'readonly');
                const store = transaction.objectStore(this.db.storeName);
                const request = store.getAll();

                request.onsuccess = () => {
                    const records = request.result;
                    const uniqueCAs = new Set(records.map(r => r.ca));
                    resolve({
                        caCount: uniqueCAs.size,
                        recordCount: records.length
                    });
                };

                request.onerror = () => reject(request.error);
            });
        }

        // 处理单个CA的数据
        async processTraderData(ca, data) {
            let inserted = 0;
            let updated = 0;

            // 过滤和处理数据的逻辑
            const filteredData = data.filter(item =>
                (item.realized_profit || 0) >= CONFIG.MIN_REALIZED_PROFIT
            ).sort((a, b) => (b.realized_profit || 0) - (a.realized_profit || 0))
             .slice(0, CONFIG.MAX_TRADERS);

            const tokenInfo = await this.fetchTokenName(ca);

            for (let i = 0; i < filteredData.length; i++) {
                const item = filteredData[i];
                // 计算持有时间
                const startHoldingAtTimestamp = item.start_holding_at * 1000; // 转换为毫秒
                let holdingPeriod = null;
                if (item.end_holding_at === null) {
                    // 如果没有卖出过，用当前时间计算
                    holdingPeriod = Math.round((Date.now() - startHoldingAtTimestamp) / 60000); // 转换为分钟
                } else {
                    // 如果有卖出时间，使用卖出时间计算
                    const endHoldingAt = item.end_holding_at * 1000;
                    holdingPeriod = Math.round((endHoldingAt - startHoldingAtTimestamp) / 60000); // 转换为分钟
                }

                // 计算 buy_after_launch_interval
                const createTime = tokenInfo.created_timestamp;
                const launchTime = tokenInfo.launch_time;
                let buyAfterLaunchInterval = null;

                if (startHoldingAtTimestamp && createTime) {
                    if (launchTime && startHoldingAtTimestamp > launchTime) {
                        buyAfterLaunchInterval = Math.round((startHoldingAtTimestamp - launchTime) / 1000); // 转换为秒
                    } else {
                        buyAfterLaunchInterval = Math.round((startHoldingAtTimestamp - createTime) / 1000); // 转换为秒
                    }
                }

                const trader = {
                    token: tokenInfo.symbol,
                    ca: ca,
                    address: item.address,
                    buy_volume: Math.round(item.buy_volume_cur) || 0,
                    sell_volume: Math.round(item.sell_volume_cur) || 0,
                    realized_profit: Math.round(item.realized_profit) || 0,
                    twitter_username: item.twitter_username || '',
                    user_name: item.name || '',
                    profit_tag: i + 1, // 使用循环的索引i代替之前未定义的index
                    tag_1: '',
                    tag_2: '',
                    tag_3: '',
                    update_time: this.getBeijingTime(),
                    dev: tokenInfo.dev,
                    create_time: tokenInfo.created_timestamp,
                    launch_time: tokenInfo.launch_time ? new Date(tokenInfo.launch_time).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : null,
                    sol_balance: Number((item.sol_balance / Math.pow(10, 8)).toFixed(1)),
                    last_active_time: item.last_active_timestamp ? new Date(item.last_active_timestamp * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : null,
                    start_holding_at: new Date(item.start_holding_at * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
                    end_holding_at: item.end_holding_at
                        ? new Date(item.end_holding_at * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
                        : null,
                    holding_period: holdingPeriod,
                    buy_after_launch_interval: buyAfterLaunchInterval
                };

                // 检查是否存在
                const exists = await this.checkTraderExists(ca, item.address);
                if (exists) {
                    updated++;
                } else {
                    inserted++;
                }
                await this.db.upsertTrader(trader);
                DebugLogger.log(`处理记录: ${exists ? '更新' : '新增'} CA=${ca}, Address=${item.address}`, CONFIG.DEBUG_LEVEL.INFO);
            }

            return { inserted, updated };
        }

        // 检查交易者是否存在
        async checkTraderExists(ca, address) {
            return new Promise((resolve) => {
                const transaction = this.db.db.transaction([this.db.storeName], 'readonly');
                const store = transaction.objectStore(this.db.storeName);
                const index = store.index('ca_address');
                const request = index.get(IDBKeyRange.only([ca, address]));

                request.onsuccess = () => resolve(!!request.result);
                request.onerror = () => resolve(false);
            });
        }

        // 采集单个CA的数据
        async collectSingleCA(ca) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: `https://gmgn.ai/defi/quotation/v1/tokens/top_traders/sol/${ca}?orderby=profit&direction=desc`,
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                        'Origin': 'https://gmgn.ai',
                        'Referer': 'https://gmgn.ai/'
                    },
                    onload: async (response) => {
                        try {
                            const responseData = JSON.parse(response.responseText);
                            if (responseData.code !== 0 || !Array.isArray(responseData.data)) {
                                reject(new Error('API返回数据格式错误'));
                                return;
                            }
                            const result = await this.processTraderData(ca, responseData.data);
                            resolve(result);
                        } catch (error) {
                            reject(new Error(`数据处理失败: ${error.message}`));
                        }
                    },
                    onerror: (error) => reject(new Error(`请求失败: ${error.message}`))
                });
            });
        }

        // 显示批量采集窗口
        showBatchCollectWindow() {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 80%;
                max-width: 1200px;
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                z-index: 10002;
                display: flex;
                gap: 20px;
            `;

            // 左侧输入区域
            const leftPanel = document.createElement('div');
            leftPanel.style.cssText = `
                flex: 2;
                min-width: 600px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;

            const title = document.createElement('h3');
            title.textContent = '批量采集';
            title.style.cssText = 'margin: 0; color: #333;';

            const textarea = document.createElement('textarea');
            textarea.placeholder = '请输入CA地址，每行一个';
            textarea.style.cssText = `
                width: 100%;
                height: 300px;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 5px;
                resize: none;
                font-family: monospace;
            `;

            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'display: flex; gap: 10px;';

            const startButton = document.createElement('button');
            startButton.textContent = '开始采集';
            startButton.style.cssText = `
                padding: 10px 20px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            `;

            const closeButton = document.createElement('button');
            closeButton.textContent = '关闭';
            closeButton.style.cssText = `
                padding: 10px 20px;
                background: #f44336;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            `;

            // 添加GMGN 24H热点按钮
            const gmgnHotButton = document.createElement('button');
            gmgnHotButton.textContent = 'GMGN 24H热点';
            gmgnHotButton.style.cssText = `
                padding: 10px 20px;
                background: #2196F3;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            `;

            // 右侧状态显示区域
            const rightPanel = document.createElement('div');
            rightPanel.style.cssText = `
                flex: 1;
                border-left: 1px solid #eee;
                padding-left: 20px;
                display: flex;
                flex-direction: column;
            `;

            const statusTitle = document.createElement('h3');
            statusTitle.textContent = '采集状态';
            statusTitle.style.cssText = 'margin: 0; color: #333;';

            const statusContainer = document.createElement('div');
            statusContainer.style.cssText = `
                flex: 1;
                overflow-y: auto;
                margin-top: 10px;
                border: 1px solid #eee;
                border-radius: 5px;
                padding: 10px;
            `;

            const summaryContainer = document.createElement('div');
            summaryContainer.style.cssText = `
                margin-top: 10px;
                padding: 10px;
                background: #f5f5f5;
                border-radius: 5px;
            `;

            // GMGN热点数据表格容器
            const gmgnTableContainer = document.createElement('div');
            gmgnTableContainer.style.cssText = `
                display: none;
                margin-top: 10px;
                max-height: 500px;
                overflow-y: auto;
            `;

            // 格式化数字为K/M单位
            const formatNumber = (num) => {
                if (num >= 1000000) {
                    return (num / 1000000).toFixed(2) + 'M';
                } else if (num >= 1000) {
                    return (num / 1000).toFixed(2) + 'K';
                }
                return num.toString();
            };

            // 创建GMGN热点数据表格
            const createGmgnTable = (data) => {
                const table = document.createElement('table');
                table.style.cssText = `
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                `;

                // 表头
                const thead = document.createElement('thead');
                thead.innerHTML = `
                    <tr>
                        <th style="width: 30px;"><input type="checkbox" id="selectAll"></th>
                        <th style="width: 50px;">NO.</th>
                        <th style="width: 50px;">Logo</th>
                        <th style="width: 100px;">名称</th>
                        <th style="width: 200px;">CA</th>
                        <th style="width: 100px;">持有人</th>
                        <th style="width: 100px;">市值</th>
                        <th style="width: 100px;">VOL</th>
                    </tr>
                `;
                thead.style.cssText = `
                    background: #f5f5f5;
                    position: sticky;
                    top: 0;
                `;

                // 表体
                const tbody = document.createElement('tbody');
                const filteredData = data.filter(item => 
                    item.holder_count > 3000 && item.market_cap > 1000000
                );

                filteredData.forEach((item, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><input type="checkbox" class="tokenCheckbox" data-ca="${item.address}"></td>
                        <td>${index + 1}</td>
                        <td><img src="${item.logo}" style="width: 24px; height: 24px; border-radius: 12px;"></td>
                        <td>${item.symbol}</td>
                        <td>${item.address}</td>
                        <td>${item.holder_count.toLocaleString()}</td>
                        <td>${formatNumber(item.market_cap)}</td>
                        <td>${formatNumber(item.volume)}</td>
                    `;
                    row.style.cssText = 'border-bottom: 1px solid #eee;';
                    tbody.appendChild(row);
                });

                table.appendChild(thead);
                table.appendChild(tbody);

                // 全选/取消全选功能
                const selectAllCheckbox = table.querySelector('#selectAll');
                selectAllCheckbox.onchange = (e) => {
                    const checkboxes = table.querySelectorAll('.tokenCheckbox');
                    checkboxes.forEach(cb => cb.checked = e.target.checked);
                };

                return table;
            };

            // GMGN热点按钮点击事件
            gmgnHotButton.onclick = async () => {
                try {
                    gmgnHotButton.disabled = true;
                    gmgnHotButton.textContent = '加载中...';
                    statusContainer.innerHTML = '正在获取GMGN 24H热点数据...';

                    const response = await new Promise((resolve, reject) => {
                        GM_xmlhttpRequest({
                            method: 'GET',
                            url: 'https://gmgn.ai/defi/quotation/v1/rank/sol/swaps/24h?orderby=marketcap&direction=desc&filters[]=renounced&filters[]=frozen',
                            headers: {
                                'Accept': 'application/json',
                                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                                'Origin': 'https://gmgn.ai',
                                'Referer': 'https://gmgn.ai/',
                                'Sec-Fetch-Dest': 'empty',
                                'Sec-Fetch-Mode': 'cors',
                                'Sec-Fetch-Site': 'cross-site'
                            },
                            onload: (response) => {
                                try {
                                    const contentType = response.responseHeaders.match(/content-type:\s*(.*?)(?:\r\n|\r|\n|$)/i);
                                    if (contentType && contentType[1].includes('application/json')) {
                                        resolve(response);
                                    } else {
                                        DebugLogger.log(`API返回的不是JSON格式: ${contentType ? contentType[1] : '未知类型'}`, CONFIG.DEBUG_LEVEL.ERROR);
                                        reject(new Error('API返回的不是JSON格式'));
                                    }
                                } catch (error) {
                                    reject(error);
                                }
                            },
                            onerror: (error) => reject(error)
                        });
                    });

                    const responseData = JSON.parse(response.responseText);
                    
                    // 添加详细的数据结构检查和错误报告
                    if (typeof responseData !== 'object') {
                        throw new Error(`返回数据不是对象，而是 ${typeof responseData}`);
                    }
                    
                    if (responseData.code !== 0) {
                        throw new Error(`API返回错误代码: ${responseData.code}, 消息: ${responseData.msg}`);
                    }
                    
                    if (!responseData.data) {
                        throw new Error('返回数据缺少 data 字段');
                    }
                    
                    if (!responseData.data.rank || !Array.isArray(responseData.data.rank)) {
                        throw new Error(`data.rank 不是数组: ${JSON.stringify(responseData.data)}`);
                    }
                    
                    DebugLogger.log(`成功获取数据：总计 ${responseData.data.rank.length} 条记录`, CONFIG.DEBUG_LEVEL.INFO);
                    
                    // 使用 data.rank 作为数据源
                    const data = responseData.data.rank;

                    // 过滤数据
                    const filteredData = data.filter(item => 
                        item.holder_count > 3000 && 
                        item.market_cap > 1000000
                    );

                    DebugLogger.log(`过滤后剩余 ${filteredData.length} 条记录`, CONFIG.DEBUG_LEVEL.INFO);

                    gmgnTableContainer.style.display = 'block';
                    gmgnTableContainer.innerHTML = '';
                    gmgnTableContainer.appendChild(createGmgnTable(filteredData));

                    // 添加批量采集按钮
                    const batchCollectSelectedButton = document.createElement('button');
                    batchCollectSelectedButton.textContent = '采集选中项';
                    batchCollectSelectedButton.style.cssText = `
                        margin-top: 10px;
                        padding: 10px 20px;
                        background: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    `;

                    batchCollectSelectedButton.onclick = () => {
                        const selectedCAs = Array.from(gmgnTableContainer.querySelectorAll('.tokenCheckbox:checked'))
                            .map(cb => cb.dataset.ca);
                        
                        if (selectedCAs.length === 0) {
                            alert('请至少选择一个代币');
                            return;
                        }

                        textarea.value = selectedCAs.join('\n');
                        gmgnTableContainer.style.display = 'none';
                        statusContainer.innerHTML = '';
                    };

                    gmgnTableContainer.appendChild(batchCollectSelectedButton);
                    statusContainer.innerHTML = '数据加载完成，请选择要采集的代币';

                } catch (error) {
                    statusContainer.innerHTML = `获取数据失败: ${error.message}`;
                    console.error('GMGN数据获取失败:', error);
                } finally {
                    gmgnHotButton.disabled = false;
                    gmgnHotButton.textContent = 'GMGN 24H热点';
                }
            };

            // 组装UI
            buttonContainer.appendChild(startButton);
            buttonContainer.appendChild(gmgnHotButton);
            buttonContainer.appendChild(closeButton);

            leftPanel.appendChild(title);
            leftPanel.appendChild(textarea);
            leftPanel.appendChild(buttonContainer);

            rightPanel.appendChild(statusTitle);
            rightPanel.appendChild(statusContainer);
            rightPanel.appendChild(summaryContainer);
            rightPanel.appendChild(gmgnTableContainer);

            modal.appendChild(leftPanel);
            modal.appendChild(rightPanel);

            // 关闭按钮事件
            closeButton.onclick = () => {
                document.body.removeChild(modal);
            };

            // 开始采集按钮事件
            startButton.onclick = async () => {
                const cas = textarea.value.trim().split('\n').filter(ca => ca.trim());
                if (cas.length === 0) {
                    alert('请输入至少一个CA地址');
                    return;
                }

                startButton.disabled = true;
                startButton.style.opacity = '0.5';
                statusContainer.innerHTML = '';
                summaryContainer.innerHTML = '';

                let totalSuccess = 0;
                let totalInserted = 0;
                let totalUpdated = 0;
                let totalFailed = 0;

                for (let i = 0; i < cas.length; i++) {
                    const ca = cas[i].trim();
                    DebugLogger.log(`开始处理第 ${i + 1}/${cas.length} 个CA: ${ca}`, CONFIG.DEBUG_LEVEL.INFO);

                    const statusRow = document.createElement('div');
                    statusRow.style.cssText = `
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 5px;
                        border-bottom: 1px solid #eee;
                    `;

                    const caText = document.createElement('div');
                    caText.textContent = ca;
                    caText.style.cssText = 'font-family: monospace; flex: 1;';

                    const status = document.createElement('div');
                    status.style.cssText = 'margin-left: 10px; display: flex; align-items: center;';

                    const retryButton = document.createElement('button');
                    retryButton.textContent = '重试';
                    retryButton.style.cssText = `
                        padding: 2px 8px;
                        background: #2196F3;
                        color: white;
                        border: none;
                        border-radius: 3px;
                        cursor: pointer;
                        margin-left: 10px;
                        display: none;
                    `;

                    status.appendChild(retryButton);
                    statusRow.appendChild(caText);
                    statusRow.appendChild(status);
                    statusContainer.appendChild(statusRow);

                    try {
                        status.textContent = '正在采集...';
                        DebugLogger.log(`正在请求API数据...`, CONFIG.DEBUG_LEVEL.INFO);

                        const result = await new Promise((resolve, reject) => {
                            GM_xmlhttpRequest({
                                method: 'GET',
                                url: `https://gmgn.ai/defi/quotation/v1/tokens/top_traders/sol/${ca}?orderby=profit&direction=desc`,
                                headers: {
                                    'Accept': 'application/json',
                                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                                    'Origin': 'https://gmgn.ai',
                                    'Referer': 'https://gmgn.ai/'
                                },
                                onload: async (response) => {
                                    try {
                                        DebugLogger.log(`收到API响应: ${response.status}`, CONFIG.DEBUG_LEVEL.INFO);
                                        DebugLogger.log(`响应内容: ${response.responseText.substring(0, 200)}...`, CONFIG.DEBUG_LEVEL.INFO);

                                        const responseData = JSON.parse(response.responseText);
                                        if (responseData.code !== 0 || !Array.isArray(responseData.data)) {
                                            const error = new Error(`API返回数据格式错误: ${JSON.stringify(responseData)}`);
                                            DebugLogger.log(error.message, CONFIG.DEBUG_LEVEL.ERROR);
                                            reject(error);
                                            return;
                                        }

                                        DebugLogger.log(`成功解析数据，开始处理...`, CONFIG.DEBUG_LEVEL.INFO);
                                        const processedCount = await this.processTraderData(ca, responseData.data);
                                        resolve(processedCount);
                                    } catch (error) {
                                        DebugLogger.log(`数据处理失败: ${error.message}`, CONFIG.DEBUG_LEVEL.ERROR);
                                        reject(new Error(`数据处理失败: ${error.message}`));
                                    }
                                },
                                onerror: (error) => {
                                    DebugLogger.log(`API请求失败: ${error.message}`, CONFIG.DEBUG_LEVEL.ERROR);
                                    reject(new Error(`请求失败: ${error.message}`));
                                }
                            });
                        });

                        status.textContent = `✓ 成功 (${result.inserted}新增, ${result.updated}更新)`;
                        status.style.color = '#4CAF50';
                        totalSuccess++;
                        totalInserted += result.inserted;
                        totalUpdated += result.updated;
                        DebugLogger.log(`处理完成: 新增${result.inserted}条，更新${result.updated}条`, CONFIG.DEBUG_LEVEL.INFO);
                    } catch (error) {
                        DebugLogger.log(`处理失败: ${error.message}`, CONFIG.DEBUG_LEVEL.ERROR);
                        status.textContent = `✗ 失败: ${error.message}`;
                        status.style.color = '#f44336';
                        retryButton.style.display = 'inline-block';
                        totalFailed++;

                        // 重试按钮事件
                        retryButton.onclick = async () => {
                            retryButton.disabled = true;
                            status.textContent = '重试中...';
                            status.style.color = '';
                            DebugLogger.log(`开始重试CA: ${ca}`, CONFIG.DEBUG_LEVEL.INFO);
                            try {
                                const result = await this.collectSingleCA(ca);
                                status.textContent = `✓ 成功 (${result.inserted}新增, ${result.updated}更新)`;
                                status.style.color = '#4CAF50';
                                retryButton.style.display = 'none';
                                totalSuccess++;
                                totalFailed--;
                                totalInserted += result.inserted;
                                totalUpdated += result.updated;
                                updateSummary();
                                DebugLogger.log(`重试成功: 新增${result.inserted}条，更新${result.updated}条`, CONFIG.DEBUG_LEVEL.INFO);
                            } catch (error) {
                                DebugLogger.log(`重试失败: ${error.message}`, CONFIG.DEBUG_LEVEL.ERROR);
                                status.textContent = `✗ 失败: ${error.message}`;
                                status.style.color = '#f44336';
                                retryButton.disabled = false;
                            }
                        };
                    }

                    // 更新汇总信息
                    const updateSummary = async () => {
                        const dbStats = await this.getDBStats();
                        summaryContainer.innerHTML = `
                            <div style="font-weight: bold; margin-bottom: 5px;">采集统计</div>
                            <div>本次采集${cas.length}个CA，成功${totalSuccess}个，失败${totalFailed}个</div>
                            <div>新插入${totalInserted}条记录，更新${totalUpdated}条记录</div>
                            <div>数据库现有${dbStats.caCount}个CA，${dbStats.recordCount}条记录</div>
                        `;
                        DebugLogger.log(`更新统计信息: 成功${totalSuccess}个，失败${totalFailed}个`, CONFIG.DEBUG_LEVEL.INFO);
                    };
                    await updateSummary();
                }

                startButton.disabled = false;
                startButton.style.opacity = '1';
                DebugLogger.log('批量采集完成', CONFIG.DEBUG_LEVEL.INFO);
            };

            document.body.appendChild(modal);
        }

        // 添加字段选择器方法
        showFieldSelector() {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                z-index: 10003;
                width: 400px;
                max-height: 80vh;
                overflow-y: auto;
            `;

            const title = document.createElement('h3');
            title.textContent = '选择显示字段';
            title.style.cssText = 'margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 1px solid #eee;';

            const fieldsContainer = document.createElement('div');
            fieldsContainer.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;';

            // 所有可用字段
            const allFields = [
                'NO.', '名称', '合约', '聪明钱', 'Dev', 'Pump内盘发射',
                'SOL余额', '最后活跃时间', '买入时间', '卖出时间', 'Pump到买入(秒)',
                '持有时长(分钟)', '买入金额', '卖出金额', '到手利润',
                'Twitter', '用户名', '排名', '标签1', '标签2', '标签3', '更新时间'
            ];

            // 创建全选/取消全选按钮
            const selectAllContainer = document.createElement('div');
            selectAllContainer.style.cssText = 'margin-bottom: 15px; display: flex; gap: 10px;';

            const selectAllBtn = document.createElement('button');
            selectAllBtn.textContent = '全选';
            selectAllBtn.style.cssText = 'padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;';

            const deselectAllBtn = document.createElement('button');
            deselectAllBtn.textContent = '取消全选';
            deselectAllBtn.style.cssText = 'padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;';

            selectAllContainer.appendChild(selectAllBtn);
            selectAllContainer.appendChild(deselectAllBtn);

            // 创建字段选择框
            const checkboxes = new Map();
            allFields.forEach(field => {
                const container = document.createElement('div');
                container.style.cssText = 'display: flex; align-items: center; margin: 5px 0;';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `field-${field}`;
                checkbox.checked = this.selectedFields.has(field);
                checkbox.style.marginRight = '8px';
                checkboxes.set(field, checkbox);

                const label = document.createElement('label');
                label.htmlFor = `field-${field}`;
                label.textContent = field;
                label.style.cssText = 'user-select: none; cursor: pointer;';

                container.appendChild(checkbox);
                container.appendChild(label);
                fieldsContainer.appendChild(container);
            });

            // 全选/取消全选功能
            selectAllBtn.onclick = () => {
                checkboxes.forEach(checkbox => checkbox.checked = true);
            };

            deselectAllBtn.onclick = () => {
                checkboxes.forEach(checkbox => checkbox.checked = false);
            };

            // 确认和取消按钮
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;';

            const confirmButton = document.createElement('button');
            confirmButton.textContent = '确认';
            confirmButton.style.cssText = 'padding: 8px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;';

            const cancelButton = document.createElement('button');
            cancelButton.textContent = '取消';
            cancelButton.style.cssText = 'padding: 8px 20px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;';

            confirmButton.onclick = () => {
                this.selectedFields.clear();
                checkboxes.forEach((checkbox, field) => {
                    if (checkbox.checked) {
                        this.selectedFields.add(field);
                    }
                });
                this.loadAndDisplayData(); // 重新加载数据
                document.body.removeChild(modal);
            };

            cancelButton.onclick = () => {
                document.body.removeChild(modal);
            };

            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(confirmButton);

            modal.appendChild(title);
            modal.appendChild(selectAllContainer);
            modal.appendChild(fieldsContainer);
            modal.appendChild(buttonContainer);

            document.body.appendChild(modal);
        }
    }

    // 添加性能监控类
    class PerformanceMonitor {
        constructor() {
            this.metrics = new Map();
            this.warnings = [];
            this.thresholds = {
                loadData: 1000, // 加载数据超过1秒报警
                renderTable: 500, // 渲染表格超过500ms报警
                dbOperation: 200 // 数据库操作超过200ms报警
            };
        }

        startTimer(operation) {
            const startTime = performance.now();
            return () => {
                const endTime = performance.now();
                const duration = endTime - startTime;

                if (!this.metrics.has(operation)) {
                    this.metrics.set(operation, []);
                }
                this.metrics.get(operation).push(duration);

                // 检查是否超过阈值
                if (this.thresholds[operation] && duration > this.thresholds[operation]) {
                    const warning = `性能警告: ${operation} 操作耗时 ${duration.toFixed(2)}ms，超过阈值 ${this.thresholds[operation]}ms`;
                    this.warnings.push(warning);
                    DebugLogger.log(warning, 'warning');
                }

                return duration;
            };
        }

        getAverageTime(operation) {
            const times = this.metrics.get(operation);
            if (!times || times.length === 0) return 0;
            return times.reduce((a, b) => a + b, 0) / times.length;
        }

        getWarnings() {
            return this.warnings;
        }

        clearMetrics() {
            this.metrics.clear();
            this.warnings = [];
        }
    }

    async function main() {
        try {
            DebugLogger.init();

            const db = new SmartMoneyDatabase();
            await db.init();

            const collector = new DataCollector(db);
            collector.createUI();

            let lastUrl = location.href;
            const observer = new MutationObserver(() => {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    collector.parsePageData();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            collector.parsePageData();

        } catch (error) {
            DebugLogger.log(`初始化失败: ${error}`, CONFIG.DEBUG_LEVEL.ERROR);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
})();